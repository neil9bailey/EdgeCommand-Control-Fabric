import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateAutomation, findScenario, loadAutomationEngine } from "./automationEngine.mjs";
import { findDevice, loadDeviceRegistry } from "./deviceRegistry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const waterPath = resolve(here, "../../../packages/water-management/water-management.json");

export function loadWaterManagement() {
  return JSON.parse(readFileSync(waterPath, "utf8"));
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

function zoneMap(water) {
  return new Map(safeArray(water.zones).map((zone) => [zone.id, zone]));
}

function profileMap(water) {
  return new Map(safeArray(water.profiles).map((profile) => [profile.id, profile]));
}

function selectedPath(zone, valve) {
  const preferences = safeArray(zone?.pathPreference);
  if (valve?.adapter === "lorawan" && preferences.includes("lorawan")) return "lorawan";
  if (valve?.adapter === "lte-m" && preferences.includes("lte-m")) return "lte-m";
  if (preferences.includes("lan")) return "lan";
  return preferences[0] || valve?.adapter || "lan";
}

function waterDevices(zone, deviceRegistry) {
  return {
    leakSensor: findDevice(deviceRegistry, zone.leakSensorDeviceId),
    valve: findDevice(deviceRegistry, zone.valveDeviceId),
    flowMeter: findDevice(deviceRegistry, zone.flowMeterDeviceId),
    gateway: findDevice(deviceRegistry, zone.gatewayDeviceId),
  };
}

function commandStatus({ action, devices, actor, apply }) {
  const valve = devices.valve;
  if (!valve) return { status: "blocked_missing_valve", canExecute: false, reason: "valve_not_found" };
  if (valve.observedState?.manualOverride === true) return { status: "blocked_manual_override", canExecute: false, reason: "manual_override" };
  if (valve.status !== "online") return { status: "blocked_valve_offline", canExecute: false, reason: "valve_offline" };
  if (action === "reopen") return { status: "approval_required", canExecute: false, reason: "dry_state_and_approval_required" };
  if (action !== "close") return { status: "blocked_unknown_action", canExecute: false, reason: "unknown_action" };
  return { status: apply ? "executed_simulated" : "ready_to_execute", canExecute: true, reason: "policy_passed" };
}

function buildWaterCommand({ profile, zone, target, deviceRegistry, actor, index, apply }) {
  const devices = waterDevices(zone, deviceRegistry);
  const policy = commandStatus({ action: target.action, devices, actor, apply });
  const approvalRequired = target.action === "reopen" || Boolean(profile.requiresApproval);
  return {
    id: `${profile.id}-cmd-${index + 1}`,
    profileId: profile.id,
    zoneId: zone?.id || target.zoneId,
    zoneName: zone?.name || target.zoneId,
    deviceId: devices.valve?.id || null,
    deviceName: devices.valve?.name || zone?.name || target.zoneId,
    leakSensorId: devices.leakSensor?.id || null,
    flowMeterId: devices.flowMeter?.id || null,
    gatewayId: devices.gateway?.id || null,
    type: "water_valve_action",
    moduleId: "water-management",
    capability: "water_valve",
    action: target.action,
    desiredState: target.desiredState || {},
    observedState: devices.valve?.observedState || {},
    leakState: devices.leakSensor?.observedState || {},
    flowState: devices.flowMeter?.observedState || {},
    trafficClass: profile.trafficClass,
    selectedPath: selectedPath(zone, devices.valve),
    encodedBytes: profile.commandProfile?.encodedBytes || 42,
    ackRequired: Boolean(profile.commandProfile?.ackRequired),
    status: policy.status,
    canExecute: policy.canExecute && (!approvalRequired || hasApproverRole(actor)),
    requiresApproval: approvalRequired,
    policyDecision: policy.status === "approval_required" || approvalRequired ? "approval_required" : policy.canExecute ? "allow" : "blocked",
    policyReasons: [policy.reason, ...safeArray(profile.policies), ...safeArray(zone?.policies)],
  };
}

function policyResult(water, profile, commands) {
  const policyIds = new Set([...safeArray(profile.policies), ...commands.flatMap((command) => command.policyReasons || [])]);
  const policies = safeArray(water.policies).filter((policy) => policyIds.has(policy.id));
  const blocked = commands.filter((command) => command.policyDecision === "blocked");
  const approval = commands.filter((command) => command.policyDecision === "approval_required");
  return {
    result: blocked.length > 0 ? "blocked" : approval.length > 0 ? "approval_required" : "ready",
    canApply: blocked.length === 0 && approval.length === 0,
    requiresApproval: approval.length > 0 || Boolean(profile.requiresApproval),
    policies: policies.map((policy) => ({ id: policy.id, name: policy.name, risk: policy.risk, message: policy.message })),
    criteria: [
      { id: "valves_known", label: "Valves known", passed: !commands.some((command) => command.policyReasons.includes("valve_not_found")) },
      { id: "manual_override_clear", label: "Manual override clear", passed: !commands.some((command) => command.policyReasons.includes("manual_override")) },
      { id: "reopen_approval_boundary", label: "Reopen approval boundary", passed: !commands.some((command) => command.action === "reopen" && command.canExecute) },
      { id: "audit_required", label: "Audit event generated", passed: true },
    ],
  };
}

function buildWaterEvent({ profile, actor, status, commandCount, action }) {
  return {
    id: `water-${profile.id}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    tenant: "vendorlogic.io",
    siteId: null,
    zoneId: null,
    deviceId: null,
    moduleId: "water-management",
    stream: "command",
    severity: profile.trafficClass === "P0_EMERGENCY" ? "critical" : "warning",
    actor: { type: "human", id: actor.subject, displayName: actor.name },
    action,
    summary: `${profile.name} ${status.replace(/_/g, " ")} with ${commandCount} water command(s).`,
    status,
    trafficClass: profile.trafficClass,
    auditRequired: true,
    payload: { profileId: profile.id, commandCount, executionBoundary: "simulated-water-command-plan-only" },
  };
}

export function summarizeWaterManagement(water = loadWaterManagement(), deviceRegistry = loadDeviceRegistry()) {
  const zones = safeArray(water.zones);
  const valves = zones.map((zone) => waterDevices(zone, deviceRegistry).valve).filter(Boolean);
  const sensors = zones.map((zone) => waterDevices(zone, deviceRegistry).leakSensor).filter(Boolean);
  return {
    schemaVersion: water.schemaVersion,
    zoneCount: zones.length,
    valveCount: valves.length,
    onlineValveCount: valves.filter((device) => device.status === "online").length,
    leakSensorCount: sensors.length,
    activeLeakCount: sensors.filter((device) => device.observedState?.leak === true).length,
    profileCount: safeArray(water.profiles).length,
    enabledProfileCount: safeArray(water.profiles).filter((profile) => profile.status === "enabled").length,
    approvalProfileCount: safeArray(water.profiles).filter((profile) => profile.requiresApproval).length,
    policyCount: safeArray(water.policies).length,
    intentRecipeCount: safeArray(water.intentRecipes).length,
    recentRunCount: safeArray(water.recentWaterRuns).length,
    byPath: countBy(zones.flatMap((zone) => safeArray(zone.pathPreference).slice(0, 1).map((path) => ({ path }))), "path"),
  };
}

export function buildWaterDashboard({ water = loadWaterManagement(), deviceRegistry = loadDeviceRegistry(), automationEngine = loadAutomationEngine() } = {}) {
  return {
    service: water.service,
    featureModule: water.featureModule,
    summary: summarizeWaterManagement(water, deviceRegistry),
    zones: safeArray(water.zones).map((zone) => ({ ...zone, devices: waterDevices(zone, deviceRegistry) })),
    profiles: safeArray(water.profiles),
    policies: safeArray(water.policies),
    intentRecipes: safeArray(water.intentRecipes),
    recentWaterRuns: safeArray(water.recentWaterRuns),
    automationRules: safeArray(automationEngine.rules).filter((rule) => rule.moduleId === "water-management"),
    automationScenarios: safeArray(automationEngine.scenarios).filter((scenario) => String(scenario.id).includes("leak")),
    rule: water.service?.rule,
  };
}

export function findWaterProfile(water = loadWaterManagement(), profileId) {
  return profileMap(water).get(profileId) || null;
}

export function previewWaterProfile({ water = loadWaterManagement(), deviceRegistry = loadDeviceRegistry(), automationEngine = loadAutomationEngine(), profileId, actor = {}, apply = false } = {}) {
  const profile = findWaterProfile(water, profileId || water.service?.defaultProfileId);
  if (!profile) return { error: "water_profile_not_found", id: profileId || water.service?.defaultProfileId };
  const actorInfo = actorProfile(actor);
  const zones = zoneMap(water);
  const commands = safeArray(profile.zoneTargets).map((target, index) =>
    buildWaterCommand({ profile, zone: zones.get(target.zoneId), target, deviceRegistry, actor: actorInfo, index, apply }),
  );
  const policy = policyResult(water, profile, commands);
  const status = policy.canApply ? (apply ? "executed_simulated" : "ready") : policy.requiresApproval ? "approval_required" : "blocked";
  const scenario = profile.automationScenarioId ? findScenario(automationEngine, profile.automationScenarioId) : null;
  const automation = scenario ? evaluateAutomation(automationEngine, deviceRegistry, scenario, actorInfo) : null;

  return {
    previewId: `water_preview_${profile.id}_${Date.now()}`,
    createdAt: new Date().toISOString(),
    tenant: water.tenant,
    service: water.service,
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
      automationCommandCount: automation?.commandCount || 0,
    },
    policy,
    commands,
    automation,
    nextActions: policy.canApply
      ? apply
        ? ["record_audit", "wait_for_adapter_ack", "refresh_water_state"]
        : ["operator_can_apply_water_profile", "record_water_preview", "preserve_reopen_boundary"]
      : policy.requiresApproval
        ? ["attach_simulation_evidence", "create_approval_record", "sign_command_after_approval"]
        : ["restore_valve_or_sensor_state", "preview_profile_again"],
    event: buildWaterEvent({ profile, actor: actorInfo, status, commandCount: commands.length, action: apply ? "water.profile.applied" : "water.profile.previewed" }),
  };
}

export function applyWaterProfile(options = {}) {
  const preview = previewWaterProfile({ ...options, apply: false });
  if (preview.error) return preview;
  if (!preview.policy.canApply) {
    return {
      ...preview,
      applyAttempted: true,
      event: { ...preview.event, action: "water.profile.apply.blocked" },
    };
  }
  return { ...previewWaterProfile({ ...options, apply: true }), applyAttempted: true };
}

export function previewWaterIntent({ water = loadWaterManagement(), deviceRegistry = loadDeviceRegistry(), automationEngine = loadAutomationEngine(), intent = "", actor = {} } = {}) {
  const text = String(intent || "").toLowerCase();
  const scored = safeArray(water.intentRecipes)
    .map((recipe) => ({ recipe, score: safeArray(recipe.keywords).reduce((score, keyword) => score + (text.includes(String(keyword).toLowerCase()) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score || Number(b.recipe.confidence || 0) - Number(a.recipe.confidence || 0));
  const match = scored.find((item) => item.score > 0) || scored[0];
  if (!match) return { error: "water_intent_recipe_not_found", intent };
  return {
    intent,
    match: { id: match.recipe.id, name: match.recipe.name, profileId: match.recipe.profileId, confidence: match.recipe.confidence, score: match.score },
    preview: previewWaterProfile({ water, deviceRegistry, automationEngine, profileId: match.recipe.profileId, actor }),
  };
}
