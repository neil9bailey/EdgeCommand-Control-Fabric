import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findDevice, loadDeviceRegistry } from "./deviceRegistry.mjs";
import { loadCatalog } from "./catalog.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const zwavePath = resolve(here, "../../../packages/zwave/zwave.json");

export function loadZwaveAdapter() {
  return JSON.parse(readFileSync(zwavePath, "utf8"));
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

function countBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function findBinding(adapter, id) {
  return safeArray(adapter.nodeBindings).find((binding) => binding.id === id || binding.deviceId === id || String(binding.nodeId) === String(id)) || null;
}

function findSignal(adapter, id) {
  return safeArray(adapter.signalSamples).find((sample) => sample.bindingId === id || sample.nodeId === id || String(sample.nodeId) === String(id)) || null;
}

function findCommand(adapter, id) {
  return safeArray(adapter.commandProfiles).find((command) => command.id === id || command.deviceId === id || command.bindingId === id) || null;
}

function findInclusion(adapter, id) {
  return safeArray(adapter.inclusionProfiles).find((profile) => profile.id === id || profile.deviceId === id) || null;
}

function findExclusion(adapter, id) {
  return safeArray(adapter.exclusionProfiles).find((profile) => profile.id === id || profile.deviceId === id) || null;
}

function enrichBinding(adapter, deviceRegistry, binding) {
  const device = findDevice(deviceRegistry, binding.deviceId) || null;
  const signal = findSignal(adapter, binding.id);
  const s2Ready = String(binding.securityClass || "").startsWith("S2");
  return {
    ...binding,
    device,
    signal,
    readiness: {
      deviceKnown: Boolean(device),
      deviceOnline: device?.status === "online",
      controllerOnline: adapter.controller?.status === "online",
      interviewComplete: binding.interviewStatus === "complete",
      s2Ready,
      signalHealthy: !signal || signal.status === "healthy",
      batteryOk: signal?.batteryPercent == null || signal.batteryPercent >= 20,
      canCommand: Boolean(device?.status === "online" && adapter.controller?.status === "online" && binding.interviewStatus === "complete" && (!signal || signal.status === "healthy")),
      registryCapabilities: safeArray(device?.capabilities),
    },
  };
}

function enrichedBindings(adapter, deviceRegistry) {
  return safeArray(adapter.nodeBindings).map((binding) => enrichBinding(adapter, deviceRegistry, binding));
}

export function summarizeZwaveAdapter(adapter = loadZwaveAdapter(), deviceRegistry = loadDeviceRegistry()) {
  const bindings = enrichedBindings(adapter, deviceRegistry);
  const zwaveDevices = safeArray(deviceRegistry.devices).filter((device) => device.adapter === "zwave");
  return {
    schemaVersion: adapter.schemaVersion,
    controllerStatus: adapter.controller?.status || "unknown",
    bindingCount: bindings.length,
    zwaveRegistryDevices: zwaveDevices.length,
    onlineZwaveDevices: zwaveDevices.filter((device) => device.status === "online").length,
    secureNodeCount: bindings.filter((binding) => binding.readiness.s2Ready).length,
    lockNodeCount: bindings.filter((binding) => safeArray(binding.device?.capabilities).includes("lock")).length,
    inclusionProfileCount: safeArray(adapter.inclusionProfiles).length,
    exclusionProfileCount: safeArray(adapter.exclusionProfiles).length,
    commandProfileCount: safeArray(adapter.commandProfiles).length,
    approvalRequiredCommands: safeArray(adapter.commandProfiles).filter((command) => command.requiresApproval).length,
    commandableBindings: bindings.filter((binding) => binding.readiness.canCommand).length,
    lowBatteryNodes: safeArray(adapter.signalSamples).filter((sample) => sample.batteryPercent != null && sample.batteryPercent < 20).length,
    averageRoundTripMs: Math.round(safeArray(adapter.signalSamples).reduce((sum, sample) => sum + Number(sample.roundTripMs || 0), 0) / Math.max(safeArray(adapter.signalSamples).length, 1)),
    bySecurity: countBy(bindings, (binding) => binding.securityClass),
    byRisk: countBy(bindings, (binding) => binding.risk),
  };
}

export function buildZwaveDashboard({ adapter = loadZwaveAdapter(), deviceRegistry = loadDeviceRegistry(), catalog = loadCatalog() } = {}) {
  const module = safeArray(catalog.modules).find((entry) => entry.id === "zwave") || null;
  return {
    service: adapter.service,
    featureModule: adapter.featureModule,
    controller: adapter.controller,
    module,
    summary: summarizeZwaveAdapter(adapter, deviceRegistry),
    nodeBindings: enrichedBindings(adapter, deviceRegistry),
    signalSamples: safeArray(adapter.signalSamples).map((sample) => ({
      ...sample,
      binding: findBinding(adapter, sample.bindingId),
    })),
    inclusionProfiles: safeArray(adapter.inclusionProfiles).map((profile) => ({
      ...profile,
      device: findDevice(deviceRegistry, profile.deviceId) || null,
    })),
    exclusionProfiles: safeArray(adapter.exclusionProfiles).map((profile) => ({
      ...profile,
      device: findDevice(deviceRegistry, profile.deviceId) || null,
    })),
    commandProfiles: safeArray(adapter.commandProfiles).map((command) => ({
      ...command,
      binding: findBinding(adapter, command.bindingId),
      device: findDevice(deviceRegistry, command.deviceId) || null,
    })),
    healthSamples: safeArray(adapter.healthSamples),
    policies: safeArray(adapter.policies),
    intentRecipes: safeArray(adapter.intentRecipes),
    recentZwaveRuns: safeArray(adapter.recentZwaveRuns),
    rule: adapter.service?.rule,
  };
}

export function previewZwaveInclusion({ adapter = loadZwaveAdapter(), deviceRegistry = loadDeviceRegistry(), inclusionId, actor = {} } = {}) {
  const profile = findInclusion(adapter, inclusionId || adapter.service?.defaultInclusionId);
  if (!profile) return { error: "zwave_inclusion_profile_not_found", id: inclusionId || adapter.service?.defaultInclusionId };
  const actorInfo = actorProfile(actor);
  const device = findDevice(deviceRegistry, profile.deviceId) || null;
  const approvalSatisfied = !profile.requiresApproval || hasApproverRole(actorInfo);
  const status = adapter.controller?.status !== "online"
    ? "controller_offline"
    : !device
      ? "device_not_found"
      : !approvalSatisfied
        ? "approval_required"
        : "ready";
  return profilePreview({ adapter, profile, actorInfo, device, status, approvalSatisfied, type: "inclusion" });
}

export function previewZwaveExclusion({ adapter = loadZwaveAdapter(), deviceRegistry = loadDeviceRegistry(), exclusionId, actor = {} } = {}) {
  const profile = findExclusion(adapter, exclusionId || adapter.service?.defaultExclusionId);
  if (!profile) return { error: "zwave_exclusion_profile_not_found", id: exclusionId || adapter.service?.defaultExclusionId };
  const actorInfo = actorProfile(actor);
  const device = findDevice(deviceRegistry, profile.deviceId) || null;
  const approvalSatisfied = !profile.requiresApproval || hasApproverRole(actorInfo);
  const status = adapter.controller?.status !== "online"
    ? "controller_offline"
    : !device
      ? "device_not_found"
      : !approvalSatisfied
        ? "approval_required"
        : "ready";
  return profilePreview({ adapter, profile, actorInfo, device, status, approvalSatisfied, type: "exclusion" });
}

function profilePreview({ adapter, profile, actorInfo, device, status, approvalSatisfied, type }) {
  const now = new Date().toISOString();
  return {
    previewId: `zwave_${type}_${profile.id}_${Date.now()}`,
    createdAt: now,
    tenant: adapter.tenant,
    service: adapter.service,
    actor: actorInfo,
    status,
    profile,
    device,
    controller: adapter.controller,
    checklist: safeArray(profile.checklist).map((item) => ({
      id: item,
      label: item.replace(/[-_]/g, " "),
      passed: item === "approval_record_attached" ? approvalSatisfied : Boolean(device && adapter.controller?.status === "online"),
    })),
    summary: {
      deviceKnown: Boolean(device),
      controllerOnline: adapter.controller?.status === "online",
      requiresApproval: Boolean(profile.requiresApproval),
      approvalSatisfied,
      durationSeconds: profile.durationSeconds,
      canRun: status === "ready",
    },
    nextActions: status === "ready"
      ? [`simulate_${type}_window`, "record_audit", "refresh_zwave_dashboard"]
      : status === "approval_required"
        ? ["attach_human_approval", `rerun_${type}_preview`, "keep_controller_closed"]
        : ["repair_controller_or_registry", `rerun_${type}_preview`],
  };
}

export function previewZwaveCommand({ adapter = loadZwaveAdapter(), deviceRegistry = loadDeviceRegistry(), commandId, actor = {}, execute = false } = {}) {
  const command = findCommand(adapter, commandId || adapter.service?.defaultCommandId);
  if (!command) return { error: "zwave_command_profile_not_found", id: commandId || adapter.service?.defaultCommandId };
  const actorInfo = actorProfile(actor);
  const binding = findBinding(adapter, command.bindingId);
  const enrichedBinding = binding ? enrichBinding(adapter, deviceRegistry, binding) : null;
  const device = findDevice(deviceRegistry, command.deviceId) || null;
  const approvalSatisfied = !command.requiresApproval || hasApproverRole(actorInfo);
  const blockedReason = adapter.controller?.status !== "online"
    ? "controller_offline"
    : !binding
      ? "binding_not_found"
      : !device
        ? "device_not_found"
        : device.status !== "online"
          ? "device_not_online"
          : !enrichedBinding?.readiness.interviewComplete
            ? "interview_incomplete"
            : safeArray(device.capabilities).includes("lock") && !enrichedBinding?.readiness.s2Ready
              ? "s2_required"
              : !approvalSatisfied
                ? "approval_required"
                : null;
  const canExecute = !blockedReason;
  const status = canExecute ? (execute ? "execute_simulated" : "ready_to_execute") : blockedReason;
  const now = new Date().toISOString();
  return {
    previewId: `zwave_command_${command.id}_${Date.now()}`,
    createdAt: now,
    tenant: adapter.tenant,
    service: adapter.service,
    actor: actorInfo,
    status,
    command,
    binding: enrichedBinding,
    device,
    controller: adapter.controller,
    frame: {
      nodeId: binding?.nodeId || null,
      endpoint: binding?.endpoint ?? null,
      commandClass: command.commandClass,
      command: command.command,
      desiredState: command.desiredState,
      securityClass: binding?.securityClass || null,
      supervised: safeArray(binding?.commandClasses).includes("supervision"),
      simulated: true,
    },
    summary: {
      canExecute,
      requiresApproval: Boolean(command.requiresApproval),
      approvalSatisfied,
      deviceOnline: device?.status === "online",
      s2Ready: Boolean(enrichedBinding?.readiness.s2Ready),
      signalHealthy: Boolean(enrichedBinding?.readiness.signalHealthy),
    },
    policy: {
      result: canExecute ? "allow" : blockedReason,
      rules: safeArray(adapter.policies).filter((policy) => (
        policy.id === "zwave-signal-supervision" || policy.id === "zwave-s2-required" || (command.requiresApproval && policy.id === "zwave-lock-command-approval")
      )),
    },
    nextActions: canExecute
      ? execute
        ? ["record_audit", "await_supervision_report", "refresh_node_projection"]
        : ["simulate_command", "record_preview", "preserve_controller_boundary"]
      : blockedReason === "approval_required"
        ? ["attach_human_approval", "rerun_command_preview", "keep_execution_blocked"]
        : ["repair_binding_or_security_class", "rerun_command_preview"],
    event: {
      id: `zwave-${command.id}-${Date.now()}`,
      timestamp: now,
      tenant: adapter.tenant,
      siteId: device?.siteId || null,
      zoneId: device?.zoneId || null,
      deviceId: device?.id || null,
      moduleId: "zwave",
      stream: "command",
      severity: command.requiresApproval ? "warning" : "info",
      actor: { type: "human", id: actorInfo.subject, displayName: actorInfo.name },
      action: execute ? "zwave.command.execute.simulated" : "zwave.command.previewed",
      summary: `${command.name} ${status.replace(/_/g, " ")} on node ${binding?.nodeId || "unknown"}.`,
      status,
      trafficClass: command.trafficClass,
      auditRequired: true,
      payload: { commandId: command.id, bindingId: command.bindingId, simulated: true },
    },
  };
}

export function executeZwaveCommand(options = {}) {
  const preview = previewZwaveCommand({ ...options, execute: false });
  if (preview.error) return preview;
  if (!preview.summary.canExecute) {
    return { ...preview, executeAttempted: true, event: { ...preview.event, action: "zwave.command.execute.blocked" } };
  }
  return { ...previewZwaveCommand({ ...options, execute: true }), executeAttempted: true };
}

export function previewZwaveIntent({ adapter = loadZwaveAdapter(), deviceRegistry = loadDeviceRegistry(), intent = "", actor = {} } = {}) {
  const text = String(intent || "").toLowerCase();
  const scored = safeArray(adapter.intentRecipes)
    .map((recipe) => ({
      recipe,
      score: safeArray(recipe.keywords).reduce((score, keyword) => score + (text.includes(String(keyword).toLowerCase()) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score || Number(b.recipe.confidence || 0) - Number(a.recipe.confidence || 0));
  const match = scored.find((item) => item.score > 0) || scored[0];
  if (!match) return { error: "zwave_intent_recipe_not_found", intent };
  return {
    intent,
    match: {
      id: match.recipe.id,
      name: match.recipe.name,
      commandId: match.recipe.commandId || null,
      inclusionId: match.recipe.inclusionId || null,
      confidence: match.recipe.confidence,
      score: match.score,
    },
    preview: match.recipe.commandId
      ? previewZwaveCommand({ adapter, deviceRegistry, commandId: match.recipe.commandId, actor })
      : previewZwaveInclusion({ adapter, deviceRegistry, inclusionId: match.recipe.inclusionId, actor }),
  };
}
