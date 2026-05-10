import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findDevice, loadDeviceRegistry } from "./deviceRegistry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const securityPath = resolve(here, "../../../packages/security-access/security-access.json");

const SAFE_ACTIONS = new Set(["lock", "arm_stay", "arm_away", "state_check"]);
const APPROVAL_ACTIONS = new Set(["unlock", "open", "disarm"]);

export function loadSecurityAccess() {
  return JSON.parse(readFileSync(securityPath, "utf8"));
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

function hasSecurityRole(actor = {}) {
  return safeArray(actor.roles).some((role) =>
    ["Automation.Admin", "Automation.Security", "Automation.AgentApprover"].includes(role),
  );
}

function accessPointMap(security) {
  return new Map(safeArray(security.accessPoints).map((point) => [point.id, point]));
}

function profileMap(security) {
  return new Map(safeArray(security.profiles).map((profile) => [profile.id, profile]));
}

function devicesForAccessPoint(accessPoint, deviceRegistry) {
  return [accessPoint.lockDeviceId, accessPoint.alarmDeviceId, accessPoint.gateDeviceId, accessPoint.sensorDeviceId]
    .filter(Boolean)
    .map((id) => findDevice(deviceRegistry, id))
    .filter(Boolean);
}

function primaryDeviceForAction(accessPoint, action, deviceRegistry) {
  if (action === "arm_stay" || action === "arm_away" || action === "disarm") return findDevice(deviceRegistry, accessPoint.alarmDeviceId);
  if (action === "state_check" && accessPoint.sensorDeviceId) return findDevice(deviceRegistry, accessPoint.sensorDeviceId);
  if (action === "open") return findDevice(deviceRegistry, accessPoint.gateDeviceId);
  return findDevice(deviceRegistry, accessPoint.lockDeviceId || accessPoint.gateDeviceId || accessPoint.alarmDeviceId || accessPoint.sensorDeviceId);
}

function selectedPath(accessPoint, device) {
  const preferences = safeArray(accessPoint.pathPreference);
  if (preferences.includes("lan") && device?.siteId === "home-hq") return "lan";
  if (preferences.includes(device?.adapter)) return device.adapter;
  return preferences[0] || device?.adapter || "lan";
}

function commandStatus({ action, accessPoint, device, actor, apply }) {
  if (!accessPoint) return { status: "blocked_access_point_missing", canExecute: false, reason: "access_point_missing" };
  if (!device) return { status: "blocked_missing_device", canExecute: false, reason: "device_not_found" };
  if (device.status !== "online" && action !== "state_check") return { status: "blocked_device_not_online", canExecute: false, reason: "device_not_online" };
  if (!hasSecurityRole(actor)) return { status: "blocked_security_role_required", canExecute: false, reason: "security_role_required" };
  if (APPROVAL_ACTIONS.has(action)) return { status: "approval_required", canExecute: false, reason: "human_approval_required" };
  if (!SAFE_ACTIONS.has(action)) return { status: "blocked_unknown_action", canExecute: false, reason: "unknown_action" };
  return { status: apply ? "executed_simulated" : "ready_to_execute", canExecute: true, reason: "policy_passed" };
}

function buildSecurityCommand({ security, profile, accessPoint, actionSpec, deviceRegistry, actor, index, apply }) {
  const action = actionSpec.action;
  const device = primaryDeviceForAction(accessPoint, action, deviceRegistry);
  const policy = commandStatus({ action, accessPoint, device, actor, apply });
  const encodedBytes = Math.max(36, Math.ceil(Number(profile.commandProfile?.encodedBytes || 72) / Math.max(1, safeArray(profile.actions).length)));
  return {
    id: `${profile.id}-cmd-${index + 1}`,
    profileId: profile.id,
    accessPointId: accessPoint?.id || actionSpec.accessPointId,
    accessPointName: accessPoint?.name || actionSpec.accessPointId,
    deviceId: device?.id || null,
    deviceName: device?.name || accessPoint?.name || actionSpec.accessPointId,
    siteId: accessPoint?.siteId || device?.siteId || null,
    zoneId: accessPoint?.zoneId || device?.zoneId || null,
    type: "security_action",
    moduleId: "security-access",
    capability: action === "open" ? "gate" : action.includes("arm") || action === "disarm" ? "alarm" : action === "state_check" ? "door" : "lock",
    action,
    desiredState: actionSpec.desiredState || {},
    observedState: device?.observedState || {},
    trafficClass: profile.trafficClass,
    selectedPath: selectedPath(accessPoint, device),
    encodedBytes,
    ackRequired: Boolean(profile.commandProfile?.ackRequired),
    status: policy.status,
    canExecute: policy.canExecute,
    requiresApproval: APPROVAL_ACTIONS.has(action) || Boolean(profile.requiresApproval),
    policyDecision: policy.canExecute ? "allow" : policy.status === "approval_required" ? "approval_required" : "blocked",
    policyReasons: [policy.reason, ...safeArray(profile.policies), ...safeArray(accessPoint?.policies)],
  };
}

function policyResult(security, profile, commands) {
  const policyIds = new Set([...safeArray(profile.policies), ...commands.flatMap((command) => command.policyReasons || [])]);
  const policies = safeArray(security.policies).filter((policy) => policyIds.has(policy.id));
  const blocked = commands.filter((command) => command.policyDecision === "blocked");
  const approval = commands.filter((command) => command.policyDecision === "approval_required" || command.requiresApproval);
  return {
    result: blocked.length > 0 ? "blocked" : approval.length > 0 ? "approval_required" : "ready",
    canApply: blocked.length === 0 && approval.length === 0,
    requiresApproval: approval.length > 0 || Boolean(profile.requiresApproval),
    policies: policies.map((policy) => ({
      id: policy.id,
      name: policy.name,
      risk: policy.risk,
      message: policy.message,
    })),
    criteria: [
      { id: "security_role_present", label: "Security role present", passed: !commands.some((command) => command.policyReasons.includes("security_role_required")) },
      { id: "devices_known", label: "Security devices known", passed: !commands.some((command) => command.policyReasons.includes("device_not_found")) },
      { id: "safe_action_boundary", label: "Unlock/open approval boundary", passed: !commands.some((command) => APPROVAL_ACTIONS.has(command.action) && command.canExecute) },
      { id: "audit_required", label: "Audit event generated", passed: true },
    ],
  };
}

function buildSecurityEvent({ profile, actor, status, commandCount, action }) {
  return {
    id: `security-${profile.id}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    tenant: "vendorlogic.io",
    siteId: "home-hq",
    zoneId: null,
    deviceId: null,
    moduleId: "security-access",
    stream: "command",
    severity: status === "blocked" || status === "approval_required" ? "warning" : "info",
    actor: {
      type: "human",
      id: actor.subject,
      displayName: actor.name,
    },
    action,
    summary: `${profile.name} ${status.replace(/_/g, " ")} with ${commandCount} security command(s).`,
    status,
    trafficClass: profile.trafficClass,
    auditRequired: true,
    payload: {
      profileId: profile.id,
      commandCount,
      executionBoundary: "simulated-security-command-plan-only",
    },
  };
}

export function summarizeSecurityAccess(security = loadSecurityAccess(), deviceRegistry = loadDeviceRegistry()) {
  const accessPoints = safeArray(security.accessPoints);
  const pointDevices = accessPoints.flatMap((point) => devicesForAccessPoint(point, deviceRegistry));
  const enabledProfiles = safeArray(security.profiles).filter((profile) => profile.status === "enabled");
  return {
    schemaVersion: security.schemaVersion,
    accessPointCount: accessPoints.length,
    onlineDeviceCount: pointDevices.filter((device) => device.status === "online").length,
    securityDeviceCount: pointDevices.length,
    profileCount: safeArray(security.profiles).length,
    enabledProfileCount: enabledProfiles.length,
    approvalProfileCount: enabledProfiles.filter((profile) => profile.requiresApproval).length,
    policyCount: safeArray(security.policies).length,
    intentRecipeCount: safeArray(security.intentRecipes).length,
    recentRunCount: safeArray(security.recentSecurityRuns).length,
    byType: countBy(accessPoints, "type"),
    byPath: countBy(accessPoints.flatMap((point) => safeArray(point.pathPreference).slice(0, 1).map((path) => ({ path }))), "path"),
  };
}

export function findSecurityProfile(security = loadSecurityAccess(), profileId) {
  return profileMap(security).get(profileId) || null;
}

export function buildSecurityDashboard({
  security = loadSecurityAccess(),
  deviceRegistry = loadDeviceRegistry(),
} = {}) {
  return {
    service: security.service,
    featureModule: security.featureModule,
    summary: summarizeSecurityAccess(security, deviceRegistry),
    accessPoints: safeArray(security.accessPoints).map((point) => ({
      ...point,
      devices: devicesForAccessPoint(point, deviceRegistry).map((device) => ({
        id: device.id,
        name: device.name,
        status: device.status,
        adapter: device.adapter,
        capabilities: device.capabilities || [],
        observedState: device.observedState || {},
        desiredState: device.desiredState || {},
      })),
    })),
    profiles: safeArray(security.profiles),
    policies: safeArray(security.policies),
    intentRecipes: safeArray(security.intentRecipes),
    recentSecurityRuns: safeArray(security.recentSecurityRuns),
    rule: security.service?.rule,
  };
}

export function previewSecurityProfile({
  security = loadSecurityAccess(),
  deviceRegistry = loadDeviceRegistry(),
  profileId,
  actor = {},
  apply = false,
} = {}) {
  const profile = findSecurityProfile(security, profileId || security.service?.defaultProfileId);
  if (!profile) return { error: "security_profile_not_found", id: profileId || security.service?.defaultProfileId };
  const actorInfo = actorProfile(actor);
  const points = accessPointMap(security);
  const commands = safeArray(profile.actions).map((actionSpec, index) =>
    buildSecurityCommand({
      security,
      profile,
      accessPoint: points.get(actionSpec.accessPointId),
      actionSpec,
      deviceRegistry,
      actor: actorInfo,
      index,
      apply,
    }),
  );
  const policy = policyResult(security, profile, commands);
  const status = policy.canApply ? (apply ? "executed_simulated" : "ready") : policy.requiresApproval ? "approval_required" : "blocked";

  return {
    previewId: `security_preview_${profile.id}_${Date.now()}`,
    createdAt: new Date().toISOString(),
    tenant: security.tenant,
    service: security.service,
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
      accessPointCount: new Set(commands.map((command) => command.accessPointId)).size,
      encodedBytes: commands.reduce((sum, command) => sum + command.encodedBytes, 0),
    },
    policy,
    commands,
    nextActions: policy.canApply
      ? apply
        ? ["record_audit", "wait_for_adapter_ack", "refresh_security_state"]
        : ["operator_can_apply_secure_profile", "record_security_preview", "preserve_remote_unlock_boundary"]
      : policy.requiresApproval
        ? ["create_approval_record", "attach_signed_command_evidence", "rerun_security_preview"]
        : ["restore_security_device_or_role", "preview_profile_again"],
    event: buildSecurityEvent({
      profile,
      actor: actorInfo,
      status,
      commandCount: commands.length,
      action: apply ? "security.profile.applied" : "security.profile.previewed",
    }),
  };
}

export function applySecurityProfile(options = {}) {
  const preview = previewSecurityProfile({ ...options, apply: false });
  if (preview.error) return preview;
  if (!preview.policy.canApply) {
    return {
      ...preview,
      applyAttempted: true,
      event: {
        ...preview.event,
        action: "security.profile.apply.blocked",
      },
    };
  }
  return {
    ...previewSecurityProfile({ ...options, apply: true }),
    applyAttempted: true,
  };
}

export function previewAccessPointCommand({
  security = loadSecurityAccess(),
  deviceRegistry = loadDeviceRegistry(),
  accessPointId,
  action = "state_check",
  desiredState = {},
  actor = {},
  apply = false,
} = {}) {
  const accessPoint = accessPointMap(security).get(accessPointId || security.service?.defaultAccessPointId);
  if (!accessPoint) return { error: "security_access_point_not_found", id: accessPointId || security.service?.defaultAccessPointId };
  const profile = {
    id: `ad-hoc-${accessPoint.id}-${action}`,
    name: `${accessPoint.name} ${String(action).replace(/_/g, " ")}`,
    mode: action,
    status: "ad_hoc",
    trafficClass: accessPoint.trafficClass,
    requiresApproval: APPROVAL_ACTIONS.has(action),
    policies: accessPoint.policies,
    actions: [{ accessPointId: accessPoint.id, action, desiredState }],
    commandProfile: { encodedBytes: 48, ackRequired: true, ttlSeconds: 120 },
  };
  return previewSecurityProfile({ security: { ...security, profiles: [profile] }, deviceRegistry, profileId: profile.id, actor, apply });
}

export function applyAccessPointCommand(options = {}) {
  const preview = previewAccessPointCommand({ ...options, apply: false });
  if (preview.error) return preview;
  if (!preview.policy.canApply) {
    return {
      ...preview,
      applyAttempted: true,
      event: {
        ...preview.event,
        action: "security.access.apply.blocked",
      },
    };
  }
  return {
    ...previewAccessPointCommand({ ...options, apply: true }),
    applyAttempted: true,
  };
}

function scoreRecipe(intent, recipe) {
  const text = String(intent || "").toLowerCase();
  return safeArray(recipe.keywords).reduce((score, keyword) => score + (text.includes(String(keyword).toLowerCase()) ? 1 : 0), 0);
}

export function previewSecurityIntent({
  security = loadSecurityAccess(),
  deviceRegistry = loadDeviceRegistry(),
  intent = "",
  actor = {},
} = {}) {
  const scored = safeArray(security.intentRecipes)
    .map((recipe) => ({ recipe, score: scoreRecipe(intent, recipe) }))
    .sort((a, b) => b.score - a.score || Number(b.recipe.confidence || 0) - Number(a.recipe.confidence || 0));
  const match = scored.find((item) => item.score > 0) || scored[0];
  if (!match) return { error: "security_intent_recipe_not_found", intent };
  return {
    intent,
    match: {
      id: match.recipe.id,
      name: match.recipe.name,
      profileId: match.recipe.profileId,
      confidence: match.recipe.confidence,
      score: match.score,
    },
    preview: previewSecurityProfile({
      security,
      deviceRegistry,
      profileId: match.recipe.profileId,
      actor,
    }),
  };
}
