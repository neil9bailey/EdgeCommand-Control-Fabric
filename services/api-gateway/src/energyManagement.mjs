import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateAutomation, findScenario, loadAutomationEngine } from "./automationEngine.mjs";
import { findDevice, loadDeviceRegistry } from "./deviceRegistry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const energyPath = resolve(here, "../../../packages/energy-management/energy-management.json");

export function loadEnergyManagement() {
  return JSON.parse(readFileSync(energyPath, "utf8"));
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

function hasApproverRole(actor = {}) {
  return safeArray(actor.roles).some((role) => ["Automation.Admin", "Automation.Security", "Automation.AgentApprover"].includes(role));
}

function countBy(items, field) {
  return items.reduce((acc, item) => {
    const value = item[field] || "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function assetMap(energy) {
  return new Map(safeArray(energy.assets).map((asset) => [asset.id, asset]));
}

function profileMap(energy) {
  return new Map(safeArray(energy.profiles).map((profile) => [profile.id, profile]));
}

function policyById(energy, id) {
  return safeArray(energy.policies).find((policy) => policy.id === id) || null;
}

function energyDevices(asset, deviceRegistry) {
  return {
    meter: findDevice(deviceRegistry, asset.meterDeviceId),
    solarInverter: findDevice(deviceRegistry, asset.solarInverterDeviceId),
    battery: findDevice(deviceRegistry, asset.batteryDeviceId),
    evCharger: findDevice(deviceRegistry, asset.evChargerDeviceId),
  };
}

function selectedPath(asset, device) {
  const preferences = safeArray(asset?.pathPreference);
  if (device?.adapter === "modbus" && preferences.includes("lan")) return "lan";
  if (device?.narrowbandEligible && preferences.includes("lte-m")) return "lte-m";
  return preferences[0] || device?.adapter || "lan";
}

function commandDeviceForAction(devices, action) {
  if (String(action).includes("ev")) return devices.evCharger;
  if (String(action).includes("critical") || String(action).includes("battery")) return devices.battery;
  if (String(action).includes("solar") || String(action).includes("export")) return devices.solarInverter;
  return devices.meter || devices.evCharger || devices.battery || devices.solarInverter;
}

function commandCapability(action) {
  if (String(action).includes("ev")) return "ev_charger";
  if (String(action).includes("critical")) return "critical_load";
  if (String(action).includes("battery")) return "battery";
  if (String(action).includes("solar") || String(action).includes("export")) return "solar_inverter";
  return "energy_meter";
}

function commandStatus({ energy, profile, target, devices, actor, apply }) {
  const device = commandDeviceForAction(devices, target.action);
  if (!device) return { status: "blocked_missing_device", canExecute: false, reason: "device_not_found" };
  if (device.status !== "online" && device.status !== "standby") return { status: "blocked_device_offline", canExecute: false, reason: "device_offline" };

  const battery = devices.battery;
  const reservePolicy = policyById(energy, "battery-reserve-floor");
  const minimumReserve = Number(reservePolicy?.minimumReservePercent || 35);
  const stateOfCharge = Number(battery?.observedState?.stateOfChargePercent || 0);
  const reserve = Number(battery?.observedState?.reservePercent || minimumReserve);
  const wouldDrainBattery = target.action === "set_ev_limit" && Number(target.desiredState?.limitAmps || 0) > 12 && stateOfCharge <= reserve + 5;

  if (battery && (stateOfCharge < minimumReserve || reserve < minimumReserve || wouldDrainBattery)) {
    return { status: "blocked_reserve_floor", canExecute: false, reason: "battery_reserve" };
  }
  if (target.action === "critical_load_mode") {
    return {
      status: "approval_required",
      canExecute: hasApproverRole(actor) && apply,
      reason: profile.requiresApproval ? "critical_load_approval_required" : "critical_load_policy",
    };
  }
  return { status: apply ? "executed_simulated" : "ready_to_execute", canExecute: true, reason: "policy_passed" };
}

function buildEnergyCommand({ energy, profile, asset, target, deviceRegistry, actor, index, apply }) {
  const devices = energyDevices(asset, deviceRegistry);
  const device = commandDeviceForAction(devices, target.action);
  const status = commandStatus({ energy, profile, target, devices, actor, apply });
  const approvalRequired = Boolean(profile.requiresApproval) || status.status === "approval_required";
  return {
    id: `${profile.id}-cmd-${index + 1}`,
    profileId: profile.id,
    assetId: asset?.id || target.assetId,
    assetName: asset?.name || target.assetId,
    deviceId: device?.id || null,
    deviceName: device?.name || asset?.name || target.assetId,
    type: "energy_action",
    moduleId: "energy-solar",
    capability: commandCapability(target.action),
    action: target.action,
    desiredState: target.desiredState || {},
    observedState: device?.observedState || {},
    energyState: {
      loadWatts: devices.meter?.observedState?.watts || 0,
      solarWatts: devices.solarInverter?.observedState?.generationWatts || 0,
      batteryPercent: devices.battery?.observedState?.stateOfChargePercent || 0,
      evPluggedIn: Boolean(devices.evCharger?.observedState?.pluggedIn),
    },
    trafficClass: profile.trafficClass,
    selectedPath: selectedPath(asset, device),
    encodedBytes: profile.commandProfile?.encodedBytes || 48,
    ackRequired: Boolean(profile.commandProfile?.ackRequired),
    status: status.status,
    canExecute: status.canExecute && (!approvalRequired || hasApproverRole(actor)),
    requiresApproval: approvalRequired,
    policyDecision: status.status === "approval_required" || approvalRequired ? "approval_required" : status.canExecute ? "allow" : "blocked",
    policyReasons: [status.reason, ...safeArray(profile.policies), ...safeArray(asset?.policies)],
  };
}

function policyResult(energy, profile, commands) {
  const policyIds = new Set([...safeArray(profile.policies), ...commands.flatMap((command) => command.policyReasons || [])]);
  const policies = safeArray(energy.policies).filter((policy) => policyIds.has(policy.id));
  const blocked = commands.filter((command) => command.policyDecision === "blocked");
  const approval = commands.filter((command) => command.policyDecision === "approval_required");
  return {
    result: blocked.length > 0 ? "blocked" : approval.length > 0 ? "approval_required" : "ready",
    canApply: blocked.length === 0 && approval.length === 0,
    requiresApproval: approval.length > 0 || Boolean(profile.requiresApproval),
    policies: policies.map((policy) => ({ id: policy.id, name: policy.name, risk: policy.risk, message: policy.message })),
    criteria: [
      { id: "assets_known", label: "Energy assets known", passed: !commands.some((command) => command.policyReasons.includes("device_not_found")) },
      { id: "battery_reserve_preserved", label: "Battery reserve preserved", passed: !commands.some((command) => command.policyReasons.includes("battery_reserve")) },
      { id: "critical_load_boundary", label: "Critical load boundary", passed: !commands.some((command) => command.action === "critical_load_mode" && command.canExecute) },
      { id: "audit_required", label: "Audit event generated", passed: true },
    ],
  };
}

function buildEnergyEvent({ profile, actor, status, commandCount, action }) {
  return {
    id: `energy-${profile.id}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    tenant: "vendorlogic.io",
    siteId: "home-hq",
    zoneId: "energy-room",
    deviceId: null,
    moduleId: "energy-solar",
    stream: "command",
    severity: profile.trafficClass === "P1_SECURITY" ? "warning" : "info",
    actor: { type: "human", id: actor.subject, displayName: actor.name },
    action,
    summary: `${profile.name} ${status.replace(/_/g, " ")} with ${commandCount} energy command(s).`,
    status,
    trafficClass: profile.trafficClass,
    auditRequired: true,
    payload: { profileId: profile.id, commandCount, executionBoundary: "simulated-energy-command-plan-only" },
  };
}

export function summarizeEnergyManagement(energy = loadEnergyManagement(), deviceRegistry = loadDeviceRegistry()) {
  const assets = safeArray(energy.assets);
  const enriched = assets.map((asset) => energyDevices(asset, deviceRegistry));
  const meters = enriched.map((devices) => devices.meter).filter(Boolean);
  const inverters = enriched.map((devices) => devices.solarInverter).filter(Boolean);
  const batteries = enriched.map((devices) => devices.battery).filter(Boolean);
  const chargers = enriched.map((devices) => devices.evCharger).filter(Boolean);
  const totalLoadWatts = meters.reduce((sum, device) => sum + Number(device.observedState?.watts || 0), 0);
  const totalSolarWatts = inverters.reduce((sum, device) => sum + Number(device.observedState?.generationWatts || 0), 0);
  const batteryPercent = batteries.length > 0
    ? Number((batteries.reduce((sum, device) => sum + Number(device.observedState?.stateOfChargePercent || 0), 0) / batteries.length).toFixed(1))
    : 0;

  return {
    schemaVersion: energy.schemaVersion,
    assetCount: assets.length,
    meterCount: meters.length,
    solarInverterCount: inverters.length,
    batteryCount: batteries.length,
    evChargerCount: chargers.length,
    onlineAssetDeviceCount: [...meters, ...inverters, ...batteries].filter((device) => device.status === "online").length + chargers.filter((device) => ["online", "standby"].includes(device.status)).length,
    totalLoadWatts,
    totalSolarWatts,
    netGridWatts: totalLoadWatts - totalSolarWatts,
    batteryPercent,
    profileCount: safeArray(energy.profiles).length,
    enabledProfileCount: safeArray(energy.profiles).filter((profile) => profile.status === "enabled").length,
    approvalProfileCount: safeArray(energy.profiles).filter((profile) => profile.requiresApproval).length,
    policyCount: safeArray(energy.policies).length,
    tariffCount: safeArray(energy.tariffs).length,
    intentRecipeCount: safeArray(energy.intentRecipes).length,
    recentRunCount: safeArray(energy.recentEnergyRuns).length,
    byMode: countBy(safeArray(energy.profiles), "mode"),
  };
}

export function buildEnergyDashboard({ energy = loadEnergyManagement(), deviceRegistry = loadDeviceRegistry(), automationEngine = loadAutomationEngine() } = {}) {
  return {
    service: energy.service,
    featureModule: energy.featureModule,
    summary: summarizeEnergyManagement(energy, deviceRegistry),
    assets: safeArray(energy.assets).map((asset) => ({ ...asset, devices: energyDevices(asset, deviceRegistry) })),
    profiles: safeArray(energy.profiles),
    policies: safeArray(energy.policies),
    tariffs: safeArray(energy.tariffs),
    forecasts: safeArray(energy.forecasts),
    intentRecipes: safeArray(energy.intentRecipes),
    recentEnergyRuns: safeArray(energy.recentEnergyRuns),
    automationRules: safeArray(automationEngine.rules).filter((rule) => ["energy-solar", "ev-charging", "battery-backup"].includes(rule.moduleId)),
    automationScenarios: safeArray(automationEngine.scenarios).filter((scenario) => String(scenario.id).includes("ev") || String(scenario.id).includes("energy")),
    rule: energy.service?.rule,
  };
}

export function findEnergyProfile(energy = loadEnergyManagement(), profileId) {
  return profileMap(energy).get(profileId) || null;
}

export function previewEnergyProfile({ energy = loadEnergyManagement(), deviceRegistry = loadDeviceRegistry(), automationEngine = loadAutomationEngine(), profileId, actor = {}, apply = false } = {}) {
  const profile = findEnergyProfile(energy, profileId || energy.service?.defaultProfileId);
  if (!profile) return { error: "energy_profile_not_found", id: profileId || energy.service?.defaultProfileId };
  const actorInfo = actorProfile(actor);
  const assets = assetMap(energy);
  const commands = safeArray(profile.assetTargets).map((target, index) =>
    buildEnergyCommand({ energy, profile, asset: assets.get(target.assetId), target, deviceRegistry, actor: actorInfo, index, apply }),
  );
  const policy = policyResult(energy, profile, commands);
  const status = policy.canApply ? (apply ? "executed_simulated" : "ready") : policy.requiresApproval ? "approval_required" : "blocked";
  const scenario = profile.automationScenarioId ? findScenario(automationEngine, profile.automationScenarioId) : null;
  const automation = scenario ? evaluateAutomation(automationEngine, deviceRegistry, scenario, actorInfo) : null;

  return {
    previewId: `energy_preview_${profile.id}_${Date.now()}`,
    createdAt: new Date().toISOString(),
    tenant: energy.tenant,
    service: energy.service,
    profile: {
      id: profile.id,
      name: profile.name,
      mode: profile.mode,
      status: profile.status,
      trafficClass: profile.trafficClass,
      requiresApproval: Boolean(profile.requiresApproval),
      automationScenarioId: profile.automationScenarioId || null,
      simulationScenarioId: profile.simulationScenarioId || null,
    },
    actor: actorInfo,
    status,
    summary: {
      commandCount: commands.length,
      readyCount: commands.filter((command) => command.canExecute).length,
      approvalCount: commands.filter((command) => command.policyDecision === "approval_required").length,
      blockedCount: commands.filter((command) => command.policyDecision === "blocked").length,
      encodedBytes: commands.reduce((sum, command) => sum + command.encodedBytes, 0),
      forecastSavingGbp: safeArray(energy.forecasts)[0]?.savingForecastGbp || 0,
      automationCommandCount: automation?.commandCount || 0,
    },
    policy,
    commands,
    automation,
    nextActions: policy.canApply
      ? apply
        ? ["record_audit", "wait_for_adapter_ack", "refresh_energy_state"]
        : ["operator_can_apply_energy_profile", "record_energy_preview", "preserve_reserve_boundary"]
      : policy.requiresApproval
        ? ["attach_simulation_evidence", "create_approval_record", "sign_command_after_approval"]
        : ["restore_energy_state_or_adjust_profile", "preview_profile_again"],
    event: buildEnergyEvent({ profile, actor: actorInfo, status, commandCount: commands.length, action: apply ? "energy.profile.applied" : "energy.profile.previewed" }),
  };
}

export function applyEnergyProfile(options = {}) {
  const preview = previewEnergyProfile({ ...options, apply: false });
  if (preview.error) return preview;
  if (!preview.policy.canApply) {
    return {
      ...preview,
      applyAttempted: true,
      event: { ...preview.event, action: "energy.profile.apply.blocked" },
    };
  }
  return { ...previewEnergyProfile({ ...options, apply: true }), applyAttempted: true };
}

export function previewEnergyIntent({ energy = loadEnergyManagement(), deviceRegistry = loadDeviceRegistry(), automationEngine = loadAutomationEngine(), intent = "", actor = {} } = {}) {
  const text = String(intent || "").toLowerCase();
  const scored = safeArray(energy.intentRecipes)
    .map((recipe) => ({ recipe, score: safeArray(recipe.keywords).reduce((score, keyword) => score + (text.includes(String(keyword).toLowerCase()) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score || Number(b.recipe.confidence || 0) - Number(a.recipe.confidence || 0));
  const match = scored.find((item) => item.score > 0) || scored[0];
  if (!match) return { error: "energy_intent_recipe_not_found", intent };
  return {
    intent,
    match: { id: match.recipe.id, name: match.recipe.name, profileId: match.recipe.profileId, confidence: match.recipe.confidence, score: match.score },
    preview: previewEnergyProfile({ energy, deviceRegistry, automationEngine, profileId: match.recipe.profileId, actor }),
  };
}
