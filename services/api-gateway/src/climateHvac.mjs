import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findDevice, loadDeviceRegistry } from "./deviceRegistry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const climatePath = resolve(here, "../../../packages/climate-hvac/climate-hvac.json");

export function loadClimateHvac() {
  return JSON.parse(readFileSync(climatePath, "utf8"));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function actorProfile(actor = {}) {
  return {
    subject: actor.subject || "local-dev-operator",
    name: actor.name || "Local Development Operator",
    roles: safeArray(actor.roles),
  };
}

function countBy(items, field) {
  return items.reduce((acc, item) => {
    const value = item[field] || "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function zoneMap(climate) {
  return new Map(safeArray(climate.zones).map((zone) => [zone.id, zone]));
}

function profileMap(climate) {
  return new Map(safeArray(climate.profiles).map((profile) => [profile.id, profile]));
}

function policyById(climate, id) {
  return safeArray(climate.policies).find((policy) => policy.id === id) || null;
}

function safeSetpointPolicy(climate) {
  return policyById(climate, "safe-setpoint-range") || {
    minHeatC: 16,
    maxHeatC: 23,
    minCoolC: 18,
    maxCoolC: 26,
  };
}

function targetInSafeRange(climate, target) {
  const policy = safeSetpointPolicy(climate);
  const setpoint = Number(target.setpointC);
  const mode = target.mode || "heat";
  if (!Number.isFinite(setpoint)) return false;
  if (mode === "cool") return setpoint >= Number(policy.minCoolC) && setpoint <= Number(policy.maxCoolC);
  return setpoint >= Number(policy.minHeatC) && setpoint <= Number(policy.maxHeatC);
}

function selectedPath(device) {
  if (device?.adapter === "matter") return "lan";
  if (device?.adapter === "mqtt") return "lan";
  if (device?.adapter === "modbus") return "lan";
  return device?.adapter || "lan";
}

function commandStatus({ climate, zone, device, target, apply }) {
  if (!zone) return { status: "blocked_zone_missing", canExecute: false, reason: "zone_missing" };
  if (!device) return { status: "blocked_missing_device", canExecute: false, reason: "device_not_found" };
  if (!safeArray(device.capabilities).includes("thermostat")) {
    return { status: "blocked_sensor_only", canExecute: false, reason: "sensor_only" };
  }
  if (device.status !== "online") return { status: "blocked_device_offline", canExecute: false, reason: "device_offline" };
  if (device.observedState?.manualOverride === true) return { status: "blocked_manual_override", canExecute: false, reason: "manual_override" };
  if (!targetInSafeRange(climate, target)) return { status: "blocked_unsafe_setpoint", canExecute: false, reason: "unsafe_setpoint" };
  return { status: apply ? "executed_simulated" : "ready_to_execute", canExecute: true, reason: "policy_passed" };
}

function buildClimateCommand({ climate, profile, zone, target, device, index, apply }) {
  const policy = commandStatus({ climate, zone, device, target, apply });
  const encodedBytes = Math.max(34, Math.ceil(Number(profile.commandProfile?.encodedBytes || 72) / Math.max(1, safeArray(profile.zoneTargets).length)));
  return {
    id: `${profile.id}-cmd-${index + 1}`,
    profileId: profile.id,
    zoneId: zone?.id || target.zoneId,
    deviceId: device?.id || zone?.thermostatDeviceId || null,
    deviceName: device?.name || zone?.name || target.zoneId,
    type: "set_state",
    moduleId: "climate-hvac",
    capability: "thermostat",
    desiredState: {
      setpointC: Number(target.setpointC),
      mode: target.mode || profile.mode || "heat",
      holdMinutes: Number(target.holdMinutes || 60),
    },
    observedState: device?.observedState || {},
    trafficClass: profile.trafficClass,
    selectedPath: selectedPath(device),
    encodedBytes,
    ackRequired: Boolean(profile.commandProfile?.ackRequired),
    status: policy.status,
    canExecute: policy.canExecute,
    policyDecision: policy.canExecute ? "allow" : "blocked",
    policyReasons: [policy.reason, ...safeArray(profile.policies)],
  };
}

function policyResult(climate, profile, commands) {
  const selectedPolicies = new Set(safeArray(profile.policies));
  const policies = safeArray(climate.policies).filter((policy) => selectedPolicies.has(policy.id));
  const blocked = commands.filter((command) => !command.canExecute);
  const humidityOutOfBand = commands.some((command) => {
    const humidity = Number(command.observedState?.humidity);
    const policy = policyById(climate, "humidity-comfort-guard");
    return Number.isFinite(humidity) && policy && (humidity < Number(policy.minHumidity) || humidity > Number(policy.maxHumidity));
  });

  return {
    result: blocked.length > 0 ? "blocked" : humidityOutOfBand ? "ready_with_humidity_notice" : "ready",
    canApply: blocked.length === 0,
    requiresApproval: Boolean(profile.requiresApproval),
    policies: policies.map((policy) => ({
      id: policy.id,
      name: policy.name,
      risk: policy.risk,
      message: policy.message,
    })),
    criteria: [
      { id: "safe_setpoint_range", label: "Safe setpoint range", passed: !commands.some((command) => command.policyReasons.includes("unsafe_setpoint")) },
      { id: "manual_override_clear", label: "Manual override clear", passed: !commands.some((command) => command.policyReasons.includes("manual_override")) },
      { id: "thermostats_online", label: "Thermostats online", passed: !commands.some((command) => command.policyReasons.includes("device_offline") || command.policyReasons.includes("device_not_found")) },
      { id: "controllable_thermostats", label: "Controllable thermostats", passed: !commands.some((command) => command.policyReasons.includes("sensor_only")) },
      { id: "audit_required", label: "Audit event generated", passed: true },
    ],
  };
}

function buildClimateEvent({ profile, actor, status, commandCount, action }) {
  return {
    id: `climate-${profile.id}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    tenant: "vendorlogic.io",
    siteId: "home-hq",
    zoneId: null,
    deviceId: null,
    moduleId: "climate-hvac",
    stream: "command",
    severity: status === "blocked" ? "warning" : "info",
    actor: {
      type: "human",
      id: actor.subject,
      displayName: actor.name,
    },
    action,
    summary: `${profile.name} ${status.replace(/_/g, " ")} with ${commandCount} climate command(s).`,
    status,
    trafficClass: profile.trafficClass,
    auditRequired: true,
    payload: {
      profileId: profile.id,
      commandCount,
      executionBoundary: "simulated-climate-command-plan-only",
    },
  };
}

export function summarizeClimateHvac(climate = loadClimateHvac(), deviceRegistry = loadDeviceRegistry()) {
  const zones = safeArray(climate.zones);
  const zoneDevices = zones.map((zone) => findDevice(deviceRegistry, zone.thermostatDeviceId)).filter(Boolean);
  const controllable = zoneDevices.filter((device) => safeArray(device.capabilities).includes("thermostat"));
  const online = controllable.filter((device) => device.status === "online");
  const totalTemperature = zoneDevices.reduce((sum, device) => sum + Number(device.observedState?.temperatureC || 0), 0);
  const totalSetpoint = controllable.reduce((sum, device) => sum + Number(device.observedState?.setpointC || 0), 0);

  return {
    schemaVersion: climate.schemaVersion,
    zoneCount: zones.length,
    controllableZoneCount: controllable.length,
    onlineThermostatCount: online.length,
    profileCount: safeArray(climate.profiles).length,
    enabledProfileCount: safeArray(climate.profiles).filter((profile) => profile.status === "enabled").length,
    scheduleCount: safeArray(climate.schedules).length,
    enabledScheduleCount: safeArray(climate.schedules).filter((schedule) => schedule.status === "enabled").length,
    policyCount: safeArray(climate.policies).length,
    intentRecipeCount: safeArray(climate.intentRecipes).length,
    recentRunCount: safeArray(climate.recentProfileRuns).length,
    averageTemperatureC: zoneDevices.length > 0 ? Number((totalTemperature / zoneDevices.length).toFixed(1)) : 0,
    averageSetpointC: controllable.length > 0 ? Number((totalSetpoint / controllable.length).toFixed(1)) : 0,
    byMode: countBy(safeArray(climate.profiles), "mode"),
    byAdapter: countBy(zoneDevices, "adapter"),
  };
}

export function findClimateProfile(climate = loadClimateHvac(), profileId) {
  return profileMap(climate).get(profileId) || null;
}

export function buildClimateDashboard({
  climate = loadClimateHvac(),
  deviceRegistry = loadDeviceRegistry(),
} = {}) {
  const zones = safeArray(climate.zones).map((zone) => {
    const device = findDevice(deviceRegistry, zone.thermostatDeviceId);
    const sensors = safeArray(zone.sensorDeviceIds).map((id) => findDevice(deviceRegistry, id)).filter(Boolean);
    return {
      ...zone,
      thermostat: device
        ? {
            id: device.id,
            name: device.name,
            status: device.status,
            adapter: device.adapter,
            capabilities: device.capabilities || [],
            observedState: device.observedState || {},
            desiredState: device.desiredState || {},
          }
        : null,
      sensors: sensors.map((sensor) => ({
        id: sensor.id,
        name: sensor.name,
        status: sensor.status,
        adapter: sensor.adapter,
        observedState: sensor.observedState || {},
      })),
      controllable: Boolean(device && safeArray(device.capabilities).includes("thermostat") && device.status === "online"),
    };
  });

  return {
    service: climate.service,
    featureModule: climate.featureModule,
    summary: summarizeClimateHvac(climate, deviceRegistry),
    zones,
    profiles: safeArray(climate.profiles),
    schedules: safeArray(climate.schedules),
    policies: safeArray(climate.policies),
    intentRecipes: safeArray(climate.intentRecipes),
    recentProfileRuns: safeArray(climate.recentProfileRuns),
    rule: climate.service?.rule,
  };
}

export function previewClimateProfile({
  climate = loadClimateHvac(),
  deviceRegistry = loadDeviceRegistry(),
  profileId,
  actor = {},
  apply = false,
} = {}) {
  const profile = findClimateProfile(climate, profileId || climate.service?.defaultProfileId || "profile-evening-comfort");
  if (!profile) {
    return {
      error: "climate_profile_not_found",
      id: profileId || climate.service?.defaultProfileId,
    };
  }

  const zones = zoneMap(climate);
  const commands = safeArray(profile.zoneTargets).map((target, index) => {
    const zone = zones.get(target.zoneId);
    return buildClimateCommand({
      climate,
      profile,
      zone,
      target,
      device: zone ? findDevice(deviceRegistry, zone.thermostatDeviceId) : null,
      index,
      apply,
    });
  });
  const policy = policyResult(climate, profile, commands);
  const status = policy.canApply ? (apply ? "executed_simulated" : "ready") : "blocked";
  const actorInfo = actorProfile(actor);

  return {
    previewId: `climate_preview_${profile.id}_${Date.now()}`,
    createdAt: new Date().toISOString(),
    tenant: climate.tenant,
    service: climate.service,
    profile: {
      id: profile.id,
      name: profile.name,
      mode: profile.mode,
      status: profile.status,
      trafficClass: profile.trafficClass,
      requiresApproval: Boolean(profile.requiresApproval),
    },
    actor: actorInfo,
    status,
    summary: {
      commandCount: commands.length,
      readyCount: commands.filter((command) => command.canExecute).length,
      blockedCount: commands.filter((command) => !command.canExecute).length,
      zoneCount: new Set(commands.map((command) => command.zoneId)).size,
      encodedBytes: commands.reduce((sum, command) => sum + command.encodedBytes, 0),
    },
    policy,
    commands,
    nextActions: policy.canApply
      ? apply
        ? ["record_audit", "wait_for_adapter_ack", "refresh_climate_state"]
        : ["operator_can_apply_profile", "record_climate_preview", "preserve_manual_override_boundary"]
      : ["adjust_setpoint_or_restore_device", "preview_profile_again"],
    event: buildClimateEvent({
      profile,
      actor: actorInfo,
      status,
      commandCount: commands.length,
      action: apply ? "climate.profile.applied" : "climate.profile.previewed",
    }),
  };
}

export function applyClimateProfile(options = {}) {
  const preview = previewClimateProfile({ ...options, apply: false });
  if (preview.error) return preview;
  if (!preview.policy.canApply) {
    return {
      ...preview,
      applyAttempted: true,
      status: "blocked",
      event: {
        ...preview.event,
        action: "climate.profile.apply.blocked",
        status: "blocked",
      },
    };
  }
  return {
    ...previewClimateProfile({ ...options, apply: true }),
    applyAttempted: true,
  };
}

export function previewClimateSetpoint({
  climate = loadClimateHvac(),
  deviceRegistry = loadDeviceRegistry(),
  zoneId,
  setpointC,
  mode = "heat",
  holdMinutes = 60,
  actor = {},
  apply = false,
} = {}) {
  const zone = zoneMap(climate).get(zoneId || climate.service?.defaultZoneId);
  if (!zone) {
    return {
      error: "climate_zone_not_found",
      id: zoneId || climate.service?.defaultZoneId,
    };
  }

  const profile = {
    id: `ad-hoc-${zone.id}`,
    name: `${zone.name} Setpoint`,
    mode,
    status: "ad_hoc",
    trafficClass: "P2_CONTROL",
    requiresApproval: false,
    policies: ["safe-setpoint-range", "manual-override-first", "humidity-comfort-guard"],
    zoneTargets: [{ zoneId: zone.id, setpointC, mode, holdMinutes }],
    commandProfile: { encodedBytes: 44, ackRequired: true, ttlSeconds: 180 },
  };

  const device = findDevice(deviceRegistry, zone.thermostatDeviceId);
  const command = buildClimateCommand({
    climate,
    profile,
    zone,
    target: profile.zoneTargets[0],
    device,
    index: 0,
    apply,
  });
  const policy = policyResult(climate, profile, [command]);
  const status = policy.canApply ? (apply ? "executed_simulated" : "ready") : "blocked";
  const actorInfo = actorProfile(actor);

  return {
    previewId: `climate_setpoint_${zone.id}_${Date.now()}`,
    createdAt: new Date().toISOString(),
    tenant: climate.tenant,
    service: climate.service,
    profile: {
      id: profile.id,
      name: profile.name,
      mode: profile.mode,
      status: profile.status,
      trafficClass: profile.trafficClass,
      requiresApproval: false,
    },
    actor: actorInfo,
    status,
    summary: {
      commandCount: 1,
      readyCount: command.canExecute ? 1 : 0,
      blockedCount: command.canExecute ? 0 : 1,
      zoneCount: 1,
      encodedBytes: command.encodedBytes,
    },
    policy,
    commands: [command],
    nextActions: policy.canApply
      ? apply
        ? ["record_audit", "wait_for_adapter_ack", "refresh_climate_state"]
        : ["operator_can_apply_setpoint", "record_climate_preview"]
      : ["adjust_setpoint_or_restore_device", "preview_setpoint_again"],
    event: buildClimateEvent({
      profile,
      actor: actorInfo,
      status,
      commandCount: 1,
      action: apply ? "climate.setpoint.applied" : "climate.setpoint.previewed",
    }),
  };
}

export function applyClimateSetpoint(options = {}) {
  const preview = previewClimateSetpoint({ ...options, apply: false });
  if (preview.error) return preview;
  if (!preview.policy.canApply) {
    return {
      ...preview,
      applyAttempted: true,
      status: "blocked",
      event: {
        ...preview.event,
        action: "climate.setpoint.apply.blocked",
        status: "blocked",
      },
    };
  }
  return {
    ...previewClimateSetpoint({ ...options, apply: true }),
    applyAttempted: true,
  };
}

function scoreRecipe(intent, recipe) {
  const text = String(intent || "").toLowerCase();
  return safeArray(recipe.keywords).reduce((score, keyword) => score + (text.includes(String(keyword).toLowerCase()) ? 1 : 0), 0);
}

export function previewClimateIntent({
  climate = loadClimateHvac(),
  deviceRegistry = loadDeviceRegistry(),
  intent = "",
  actor = {},
} = {}) {
  const scored = safeArray(climate.intentRecipes)
    .map((recipe) => ({ recipe, score: scoreRecipe(intent, recipe) }))
    .sort((a, b) => b.score - a.score || Number(b.recipe.confidence || 0) - Number(a.recipe.confidence || 0));
  const match = scored.find((item) => item.score > 0) || scored[0];
  if (!match) {
    return {
      error: "climate_intent_recipe_not_found",
      intent,
    };
  }

  return {
    intent,
    match: {
      id: match.recipe.id,
      name: match.recipe.name,
      profileId: match.recipe.profileId,
      confidence: match.recipe.confidence,
      score: match.score,
    },
    preview: previewClimateProfile({
      climate,
      deviceRegistry,
      profileId: match.recipe.profileId,
      actor,
    }),
  };
}
