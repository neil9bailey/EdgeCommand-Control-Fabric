import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findDevice, loadDeviceRegistry } from "./deviceRegistry.mjs";
import { loadCatalog } from "./catalog.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const matterThreadPath = resolve(here, "../../../packages/matter-thread/matter-thread.json");

export function loadMatterThread() {
  return JSON.parse(readFileSync(matterThreadPath, "utf8"));
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
  return safeArray(adapter.deviceBindings).find((binding) => binding.id === id || binding.deviceId === id || binding.nodeId === id) || null;
}

function findCommand(adapter, id) {
  return safeArray(adapter.commandProfiles).find((command) => command.id === id || command.deviceId === id || command.bindingId === id) || null;
}

function findCommissioning(adapter, id) {
  return safeArray(adapter.commissioningProfiles).find((profile) => profile.id === id || profile.deviceId === id) || null;
}

function findThreadNetwork(adapter, id) {
  return safeArray(adapter.threadNetworks).find((network) => network.id === id) || null;
}

function enrichBinding(adapter, deviceRegistry, binding) {
  const device = findDevice(deviceRegistry, binding.deviceId) || null;
  const threadNetwork = binding.threadNetworkId ? findThreadNetwork(adapter, binding.threadNetworkId) : null;
  return {
    ...binding,
    device,
    threadNetwork,
    readiness: {
      deviceKnown: Boolean(device),
      deviceOnline: device?.status === "online",
      fabricReady: adapter.fabric?.status === "ready" && binding.fabricStatus === "commissioned",
      threadHealthy: !threadNetwork || threadNetwork.status === "healthy",
      canCommand: Boolean(device?.status === "online" && adapter.fabric?.status === "ready" && binding.fabricStatus === "commissioned"),
      registryCapabilities: safeArray(device?.capabilities),
    },
  };
}

function enrichedBindings(adapter, deviceRegistry) {
  return safeArray(adapter.deviceBindings).map((binding) => enrichBinding(adapter, deviceRegistry, binding));
}

export function summarizeMatterThread(adapter = loadMatterThread(), deviceRegistry = loadDeviceRegistry()) {
  const bindings = enrichedBindings(adapter, deviceRegistry);
  const matterDevices = safeArray(deviceRegistry.devices).filter((device) => device.adapter === "matter");
  return {
    schemaVersion: adapter.schemaVersion,
    fabricStatus: adapter.fabric?.status || "unknown",
    bindingCount: bindings.length,
    matterRegistryDevices: matterDevices.length,
    onlineMatterDevices: matterDevices.filter((device) => device.status === "online").length,
    threadNetworkCount: safeArray(adapter.threadNetworks).length,
    healthyThreadNetworks: safeArray(adapter.threadNetworks).filter((network) => network.status === "healthy").length,
    borderRouterCount: safeArray(adapter.borderRouters).length,
    onlineBorderRouters: safeArray(adapter.borderRouters).filter((router) => router.status === "online").length,
    commissioningProfileCount: safeArray(adapter.commissioningProfiles).length,
    readyCommissioningProfiles: safeArray(adapter.commissioningProfiles).filter((profile) => profile.status === "ready").length,
    commandProfileCount: safeArray(adapter.commandProfiles).length,
    approvalRequiredCommands: safeArray(adapter.commandProfiles).filter((command) => command.requiresApproval).length,
    commandableBindings: bindings.filter((binding) => binding.readiness.canCommand).length,
    byDeviceType: countBy(bindings, (binding) => binding.deviceType),
    byRisk: countBy(bindings, (binding) => binding.risk),
    byThread: countBy(bindings, (binding) => binding.threadNetworkId ? "thread" : "ip"),
  };
}

export function buildMatterThreadDashboard({ adapter = loadMatterThread(), deviceRegistry = loadDeviceRegistry(), catalog = loadCatalog() } = {}) {
  const module = safeArray(catalog.modules).find((entry) => entry.id === "matter-thread") || null;
  return {
    service: adapter.service,
    featureModule: adapter.featureModule,
    fabric: adapter.fabric,
    summary: summarizeMatterThread(adapter, deviceRegistry),
    module,
    threadNetworks: safeArray(adapter.threadNetworks).map((network) => ({
      ...network,
      borderRouters: safeArray(adapter.borderRouters).filter((router) => safeArray(network.borderRouterIds).includes(router.id)),
      health: safeArray(adapter.healthSamples).find((sample) => sample.threadNetworkId === network.id) || null,
    })),
    borderRouters: safeArray(adapter.borderRouters),
    deviceBindings: enrichedBindings(adapter, deviceRegistry),
    commissioningProfiles: safeArray(adapter.commissioningProfiles).map((profile) => ({
      ...profile,
      device: findDevice(deviceRegistry, profile.deviceId) || null,
      threadNetwork: profile.threadNetworkId ? findThreadNetwork(adapter, profile.threadNetworkId) : null,
    })),
    commandProfiles: safeArray(adapter.commandProfiles).map((command) => ({
      ...command,
      binding: findBinding(adapter, command.bindingId),
      device: findDevice(deviceRegistry, command.deviceId) || null,
    })),
    healthSamples: safeArray(adapter.healthSamples),
    policies: safeArray(adapter.policies),
    intentRecipes: safeArray(adapter.intentRecipes),
    recentMatterRuns: safeArray(adapter.recentMatterRuns),
    rule: adapter.service?.rule,
  };
}

export function previewMatterCommissioning({ adapter = loadMatterThread(), deviceRegistry = loadDeviceRegistry(), commissioningId, actor = {} } = {}) {
  const profile = findCommissioning(adapter, commissioningId || adapter.service?.defaultCommissioningId);
  if (!profile) return { error: "matter_commissioning_profile_not_found", id: commissioningId || adapter.service?.defaultCommissioningId };
  const actorInfo = actorProfile(actor);
  const device = findDevice(deviceRegistry, profile.deviceId) || null;
  const threadNetwork = profile.threadNetworkId ? findThreadNetwork(adapter, profile.threadNetworkId) : null;
  const approvalSatisfied = !profile.requiresApproval || hasApproverRole(actorInfo);
  const status = !device
    ? "blocked_missing_device"
    : threadNetwork && threadNetwork.status !== "healthy"
      ? "blocked_thread_unhealthy"
      : !approvalSatisfied
        ? "approval_required"
        : "ready";
  const now = new Date().toISOString();
  return {
    previewId: `matter_commission_${profile.id}_${Date.now()}`,
    createdAt: now,
    tenant: adapter.tenant,
    service: adapter.service,
    actor: actorInfo,
    status,
    profile,
    device,
    fabric: adapter.fabric,
    threadNetwork,
    checklist: safeArray(profile.checklist).map((item) => ({
      id: item,
      label: item.replace(/_/g, " "),
      passed: item === "approval_record_attached" ? approvalSatisfied : Boolean(device),
    })),
    summary: {
      deviceKnown: Boolean(device),
      threadRequired: Boolean(profile.threadNetworkId),
      threadHealthy: !threadNetwork || threadNetwork.status === "healthy",
      requiresApproval: Boolean(profile.requiresApproval),
      approvalSatisfied,
      canCommission: status === "ready",
    },
    nextActions: status === "ready"
      ? ["simulate_commissioning_record", "attach_fabric_binding", "refresh_matter_dashboard"]
      : status === "approval_required"
        ? ["attach_human_approval", "review_security_device", "rerun_commissioning_preview"]
        : ["repair_thread_or_registry_binding", "rerun_commissioning_preview"],
  };
}

export function previewMatterCommand({ adapter = loadMatterThread(), deviceRegistry = loadDeviceRegistry(), commandId, actor = {}, execute = false } = {}) {
  const command = findCommand(adapter, commandId || adapter.service?.defaultCommandId);
  if (!command) return { error: "matter_command_profile_not_found", id: commandId || adapter.service?.defaultCommandId };
  const actorInfo = actorProfile(actor);
  const binding = findBinding(adapter, command.bindingId);
  const enrichedBinding = binding ? enrichBinding(adapter, deviceRegistry, binding) : null;
  const device = findDevice(deviceRegistry, command.deviceId) || null;
  const approvalSatisfied = !command.requiresApproval || hasApproverRole(actorInfo);
  const blockedReason = !binding
    ? "binding_not_found"
    : !device
      ? "device_not_found"
      : device.status !== "online"
        ? "device_not_online"
        : !enrichedBinding?.readiness.fabricReady
          ? "fabric_not_ready"
          : !enrichedBinding?.readiness.threadHealthy
            ? "thread_unhealthy"
            : !approvalSatisfied
              ? "approval_required"
              : null;
  const canExecute = !blockedReason;
  const status = canExecute ? (execute ? "execute_simulated" : "ready_to_execute") : blockedReason;
  const now = new Date().toISOString();
  return {
    previewId: `matter_command_${command.id}_${Date.now()}`,
    createdAt: now,
    tenant: adapter.tenant,
    service: adapter.service,
    actor: actorInfo,
    status,
    command,
    binding: enrichedBinding,
    device,
    fabric: adapter.fabric,
    invoke: {
      nodeId: binding?.nodeId || null,
      endpoint: binding?.endpoint || null,
      cluster: command.cluster,
      command: command.command,
      desiredState: command.desiredState,
      simulated: true,
    },
    summary: {
      canExecute,
      requiresApproval: Boolean(command.requiresApproval),
      approvalSatisfied,
      deviceOnline: device?.status === "online",
      threadPath: Boolean(binding?.threadNetworkId),
    },
    policy: {
      result: canExecute ? "allow" : blockedReason,
      rules: safeArray(adapter.policies).filter((policy) => (
        policy.id === "matter-attestation-required" || (command.requiresApproval && policy.id === "matter-security-device-approval")
      )),
    },
    nextActions: canExecute
      ? execute
        ? ["record_audit", "await_matter_report", "refresh_registry_projection"]
        : ["simulate_command", "record_preview", "preserve_fabric_boundary"]
      : blockedReason === "approval_required"
        ? ["attach_human_approval", "rerun_command_preview", "keep_execution_blocked"]
        : ["repair_binding_or_thread_health", "rerun_command_preview"],
    event: {
      id: `matter-${command.id}-${Date.now()}`,
      timestamp: now,
      tenant: adapter.tenant,
      siteId: device?.siteId || null,
      zoneId: device?.zoneId || null,
      deviceId: device?.id || null,
      moduleId: "matter-thread",
      stream: "command",
      severity: command.trafficClass === "P1_SECURITY" ? "warning" : "info",
      actor: { type: "human", id: actorInfo.subject, displayName: actorInfo.name },
      action: execute ? "matter.command.execute.simulated" : "matter.command.previewed",
      summary: `${command.name} ${status.replace(/_/g, " ")} on ${binding?.nodeId || "no node"}.`,
      status,
      trafficClass: command.trafficClass,
      auditRequired: true,
      payload: { commandId: command.id, bindingId: command.bindingId, simulated: true },
    },
  };
}

export function executeMatterCommand(options = {}) {
  const preview = previewMatterCommand({ ...options, execute: false });
  if (preview.error) return preview;
  if (!preview.summary.canExecute) {
    return { ...preview, executeAttempted: true, event: { ...preview.event, action: "matter.command.execute.blocked" } };
  }
  return { ...previewMatterCommand({ ...options, execute: true }), executeAttempted: true };
}

export function previewMatterIntent({ adapter = loadMatterThread(), deviceRegistry = loadDeviceRegistry(), intent = "", actor = {} } = {}) {
  const text = String(intent || "").toLowerCase();
  const scored = safeArray(adapter.intentRecipes)
    .map((recipe) => ({
      recipe,
      score: safeArray(recipe.keywords).reduce((score, keyword) => score + (text.includes(String(keyword).toLowerCase()) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score || Number(b.recipe.confidence || 0) - Number(a.recipe.confidence || 0));
  const match = scored.find((item) => item.score > 0) || scored[0];
  if (!match) return { error: "matter_intent_recipe_not_found", intent };
  return {
    intent,
    match: {
      id: match.recipe.id,
      name: match.recipe.name,
      commandId: match.recipe.commandId || null,
      commissioningId: match.recipe.commissioningId || null,
      confidence: match.recipe.confidence,
      score: match.score,
    },
    preview: match.recipe.commandId
      ? previewMatterCommand({ adapter, deviceRegistry, commandId: match.recipe.commandId, actor })
      : previewMatterCommissioning({ adapter, deviceRegistry, commissioningId: match.recipe.commissioningId, actor }),
  };
}
