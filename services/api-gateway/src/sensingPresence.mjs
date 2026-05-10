import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findDevice, loadDeviceRegistry } from "./deviceRegistry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const sensingPath = resolve(here, "../../../packages/sensing-presence/sensing-presence.json");

export function loadSensingPresence() {
  return JSON.parse(readFileSync(sensingPath, "utf8"));
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

function zoneMap(sensing) {
  return new Map(safeArray(sensing.zones).map((zone) => [zone.id, zone]));
}

function profileMap(sensing) {
  return new Map(safeArray(sensing.profiles).map((profile) => [profile.id, profile]));
}

function sensingDevices(zone, deviceRegistry) {
  return {
    occupancy: findDevice(deviceRegistry, zone.occupancyDeviceId),
    presence: findDevice(deviceRegistry, zone.presenceDeviceId),
    airQuality: findDevice(deviceRegistry, zone.airQualityDeviceId),
    temperatures: safeArray(zone.temperatureDeviceIds).map((id) => findDevice(deviceRegistry, id)).filter(Boolean),
  };
}

function confidenceFor(devices) {
  return Math.max(
    Number(devices.occupancy?.observedState?.confidence || 0),
    Number(devices.presence?.observedState?.confidence || 0),
  );
}

function environmentalScore(devices) {
  const air = devices.airQuality?.observedState || {};
  const co2 = Number(air.co2Ppm || 0);
  const pm25 = Number(air.pm25 || 0);
  const voc = Number(air.voc || 0);
  let score = 100;
  if (co2 > 900) score -= 25;
  if (pm25 > 12) score -= 25;
  if (voc > 0.4) score -= 20;
  return Math.max(0, score);
}

function commandStatus({ zone, target, devices }) {
  if (!zone) return { status: "blocked_zone_missing", canExecute: false, reason: "zone_missing" };
  if (!devices.occupancy && !devices.presence) return { status: "blocked_missing_presence", canExecute: false, reason: "presence_not_found" };
  if (zone.privacyMode === "strict" || target.action === "hold_presence_detail") {
    return { status: "approval_required", canExecute: false, reason: "privacy_hold" };
  }
  if (confidenceFor(devices) < Number(target.minimumConfidence || 0.6)) {
    return { status: "blocked_low_confidence", canExecute: false, reason: "confidence_threshold" };
  }
  return { status: "ready_to_execute", canExecute: true, reason: "policy_passed" };
}

function buildSensingCommand({ profile, zone, target, deviceRegistry, index }) {
  const devices = sensingDevices(zone, deviceRegistry);
  const status = commandStatus({ zone, target, devices });
  return {
    id: `${profile.id}-cmd-${index + 1}`,
    profileId: profile.id,
    zoneId: zone?.id || target.zoneId,
    zoneName: zone?.name || target.zoneId,
    deviceId: devices.occupancy?.id || devices.presence?.id || null,
    deviceName: devices.occupancy?.name || devices.presence?.name || zone?.name || target.zoneId,
    type: "sensing_context",
    moduleId: "occupancy-presence",
    capability: target.action === "recommend_ventilation" ? "air_quality" : "occupancy",
    action: target.action,
    observedState: {
      occupied: Boolean(devices.occupancy?.observedState?.occupied),
      presenceHome: Boolean(devices.presence?.observedState?.home),
      confidence: Number(confidenceFor(devices).toFixed(2)),
      privacyMode: zone?.privacyMode || "summary_only",
      co2Ppm: devices.airQuality?.observedState?.co2Ppm || null,
      pm25: devices.airQuality?.observedState?.pm25 || null,
      voc: devices.airQuality?.observedState?.voc || null,
      temperatureC: devices.temperatures[0]?.observedState?.temperatureC || null,
      humidity: devices.temperatures[0]?.observedState?.humidity || null,
      environmentalScore: environmentalScore(devices),
    },
    trafficClass: profile.trafficClass,
    selectedPath: "lan",
    encodedBytes: profile.commandProfile?.encodedBytes || 36,
    ackRequired: Boolean(profile.commandProfile?.ackRequired),
    status: status.status,
    canExecute: status.canExecute,
    requiresApproval: Boolean(profile.requiresApproval) || status.status === "approval_required",
    policyDecision: status.status === "approval_required" ? "approval_required" : status.canExecute ? "allow" : "blocked",
    policyReasons: [status.reason, ...safeArray(profile.policies), ...safeArray(zone?.policies)],
  };
}

function policyResult(sensing, profile, commands) {
  const policyIds = new Set([...safeArray(profile.policies), ...commands.flatMap((command) => command.policyReasons || [])]);
  const policies = safeArray(sensing.policies).filter((policy) => policyIds.has(policy.id));
  const blocked = commands.filter((command) => command.policyDecision === "blocked");
  const approval = commands.filter((command) => command.policyDecision === "approval_required");
  return {
    result: blocked.length > 0 ? "blocked" : approval.length > 0 ? "approval_required" : "ready",
    canApply: blocked.length === 0 && approval.length === 0,
    requiresApproval: approval.length > 0 || Boolean(profile.requiresApproval),
    policies: policies.map((policy) => ({ id: policy.id, name: policy.name, risk: policy.risk, message: policy.message })),
    criteria: [
      { id: "presence_known", label: "Presence known", passed: !commands.some((command) => command.policyReasons.includes("presence_not_found")) },
      { id: "confidence_threshold", label: "Confidence threshold", passed: !commands.some((command) => command.policyReasons.includes("confidence_threshold")) },
      { id: "privacy_respected", label: "Privacy respected", passed: !commands.some((command) => command.action === "hold_presence_detail" && command.canExecute) },
      { id: "environmental_evidence", label: "Environmental evidence", passed: commands.some((command) => command.observedState.co2Ppm !== null || command.observedState.temperatureC !== null) },
    ],
  };
}

function buildSensingEvent({ profile, actor, status, commandCount, action }) {
  return {
    id: `sensing-${profile.id}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    tenant: "vendorlogic.io",
    siteId: "home-hq",
    zoneId: null,
    deviceId: null,
    moduleId: "occupancy-presence",
    stream: "telemetry",
    severity: status === "approval_required" ? "warning" : "info",
    actor: { type: "human", id: actor.subject, displayName: actor.name },
    action,
    summary: `${profile.name} ${status.replace(/_/g, " ")} with ${commandCount} sensing context item(s).`,
    status,
    trafficClass: profile.trafficClass,
    auditRequired: true,
    payload: { profileId: profile.id, commandCount, executionBoundary: "simulated-sensing-context-plan-only" },
  };
}

export function summarizeSensingPresence(sensing = loadSensingPresence(), deviceRegistry = loadDeviceRegistry()) {
  const zones = safeArray(sensing.zones);
  const enriched = zones.map((zone) => sensingDevices(zone, deviceRegistry));
  const occupancy = enriched.map((devices) => devices.occupancy).filter(Boolean);
  const presence = enriched.map((devices) => devices.presence).filter(Boolean);
  const airQuality = enriched.map((devices) => devices.airQuality).filter(Boolean);
  const occupiedCount = occupancy.filter((device) => device.observedState?.occupied === true).length;
  const avgConfidence = occupancy.length > 0 ? Number((occupancy.reduce((sum, device) => sum + Number(device.observedState?.confidence || 0), 0) / occupancy.length).toFixed(2)) : 0;
  const avgCo2 = airQuality.length > 0 ? Math.round(airQuality.reduce((sum, device) => sum + Number(device.observedState?.co2Ppm || 0), 0) / airQuality.length) : 0;

  return {
    schemaVersion: sensing.schemaVersion,
    zoneCount: zones.length,
    occupancySensorCount: occupancy.length,
    presenceSensorCount: new Set(presence.map((device) => device.id)).size,
    airQualitySensorCount: new Set(airQuality.map((device) => device.id)).size,
    occupiedZoneCount: occupiedCount,
    averageConfidence: avgConfidence,
    averageCo2Ppm: avgCo2,
    privacyStrictZoneCount: zones.filter((zone) => zone.privacyMode === "strict").length,
    profileCount: safeArray(sensing.profiles).length,
    enabledProfileCount: safeArray(sensing.profiles).filter((profile) => profile.status === "enabled").length,
    approvalProfileCount: safeArray(sensing.profiles).filter((profile) => profile.requiresApproval).length,
    policyCount: safeArray(sensing.policies).length,
    intentRecipeCount: safeArray(sensing.intentRecipes).length,
    recentRunCount: safeArray(sensing.recentSensingRuns).length,
    byPrivacyMode: countBy(zones, "privacyMode"),
  };
}

export function buildSensingDashboard({ sensing = loadSensingPresence(), deviceRegistry = loadDeviceRegistry() } = {}) {
  return {
    service: sensing.service,
    featureModule: sensing.featureModule,
    summary: summarizeSensingPresence(sensing, deviceRegistry),
    zones: safeArray(sensing.zones).map((zone) => ({ ...zone, devices: sensingDevices(zone, deviceRegistry) })),
    profiles: safeArray(sensing.profiles),
    policies: safeArray(sensing.policies),
    intentRecipes: safeArray(sensing.intentRecipes),
    recentSensingRuns: safeArray(sensing.recentSensingRuns),
    rule: sensing.service?.rule,
  };
}

export function findSensingProfile(sensing = loadSensingPresence(), profileId) {
  return profileMap(sensing).get(profileId) || null;
}

export function previewSensingProfile({ sensing = loadSensingPresence(), deviceRegistry = loadDeviceRegistry(), profileId, actor = {} } = {}) {
  const profile = findSensingProfile(sensing, profileId || sensing.service?.defaultProfileId);
  if (!profile) return { error: "sensing_profile_not_found", id: profileId || sensing.service?.defaultProfileId };
  const actorInfo = actorProfile(actor);
  const zones = zoneMap(sensing);
  const commands = safeArray(profile.zoneTargets).map((target, index) =>
    buildSensingCommand({ profile, zone: zones.get(target.zoneId), target, deviceRegistry, index }),
  );
  const policy = policyResult(sensing, profile, commands);
  const status = policy.canApply ? "ready" : policy.requiresApproval ? "approval_required" : "blocked";
  return {
    previewId: `sensing_preview_${profile.id}_${Date.now()}`,
    createdAt: new Date().toISOString(),
    tenant: sensing.tenant,
    service: sensing.service,
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
      approvalCount: commands.filter((command) => command.policyDecision === "approval_required").length,
      blockedCount: commands.filter((command) => command.policyDecision === "blocked").length,
      encodedBytes: commands.reduce((sum, command) => sum + command.encodedBytes, 0),
    },
    policy,
    commands,
    nextActions: policy.canApply
      ? ["record_sensing_preview", "feed_context_to_automation_builder", "preserve_privacy_boundary"]
      : policy.requiresApproval
        ? ["keep_summary_only", "request_privacy_review", "record_audit"]
        : ["restore_sensor_state_or_adjust_threshold", "preview_profile_again"],
    event: buildSensingEvent({ profile, actor: actorInfo, status, commandCount: commands.length, action: "sensing.profile.previewed" }),
  };
}

export function previewSensingIntent({ sensing = loadSensingPresence(), deviceRegistry = loadDeviceRegistry(), intent = "", actor = {} } = {}) {
  const text = String(intent || "").toLowerCase();
  const scored = safeArray(sensing.intentRecipes)
    .map((recipe) => ({ recipe, score: safeArray(recipe.keywords).reduce((score, keyword) => score + (text.includes(String(keyword).toLowerCase()) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score || Number(b.recipe.confidence || 0) - Number(a.recipe.confidence || 0));
  const match = scored.find((item) => item.score > 0) || scored[0];
  if (!match) return { error: "sensing_intent_recipe_not_found", intent };
  return {
    intent,
    match: { id: match.recipe.id, name: match.recipe.name, profileId: match.recipe.profileId, confidence: match.recipe.confidence, score: match.score },
    preview: previewSensingProfile({ sensing, deviceRegistry, profileId: match.recipe.profileId, actor }),
  };
}
