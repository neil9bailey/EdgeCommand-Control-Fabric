import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findDevice, loadDeviceRegistry } from "./deviceRegistry.mjs";
import { loadCatalog } from "./catalog.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const zigbeePath = resolve(here, "../../../packages/zigbee/zigbee.json");

export function loadZigbeeAdapter() {
  return JSON.parse(readFileSync(zigbeePath, "utf8"));
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
  return safeArray(adapter.deviceBindings).find((binding) => binding.id === id || binding.deviceId === id || binding.ieeeAddress === id) || null;
}

function findRoute(adapter, id) {
  return safeArray(adapter.meshRoutes).find((route) => route.id === id || route.deviceId === id) || null;
}

function findCommand(adapter, id) {
  return safeArray(adapter.commandProfiles).find((command) => command.id === id || command.deviceId === id || command.bindingId === id) || null;
}

function findPermitJoin(adapter, id) {
  return safeArray(adapter.permitJoinProfiles).find((profile) => profile.id === id || profile.coordinatorId === id) || null;
}

function findReporting(adapter, id) {
  return safeArray(adapter.reportingProfiles).find((profile) => profile.id === id || profile.deviceId === id || profile.bindingId === id) || null;
}

function enrichBinding(adapter, deviceRegistry, binding) {
  const device = findDevice(deviceRegistry, binding.deviceId) || null;
  const route = findRoute(adapter, binding.deviceId);
  return {
    ...binding,
    device,
    route,
    readiness: {
      deviceKnown: Boolean(device),
      deviceOnline: device?.status === "online",
      coordinatorOnline: adapter.coordinator?.status === "online",
      routeHealthy: !route || ["healthy", "watch"].includes(route.status),
      batteryOk: route?.batteryPercent == null || route.batteryPercent >= 20,
      canCommand: Boolean(device?.status === "online" && adapter.coordinator?.status === "online" && (!route || ["healthy", "watch"].includes(route.status))),
      registryCapabilities: safeArray(device?.capabilities),
    },
  };
}

function enrichedBindings(adapter, deviceRegistry) {
  return safeArray(adapter.deviceBindings).map((binding) => enrichBinding(adapter, deviceRegistry, binding));
}

export function summarizeZigbeeAdapter(adapter = loadZigbeeAdapter(), deviceRegistry = loadDeviceRegistry()) {
  const bindings = enrichedBindings(adapter, deviceRegistry);
  const zigbeeDevices = safeArray(deviceRegistry.devices).filter((device) => device.adapter === "zigbee");
  return {
    schemaVersion: adapter.schemaVersion,
    coordinatorStatus: adapter.coordinator?.status || "unknown",
    bindingCount: bindings.length,
    zigbeeRegistryDevices: zigbeeDevices.length,
    onlineZigbeeDevices: zigbeeDevices.filter((device) => device.status === "online").length,
    routeCount: safeArray(adapter.meshRoutes).length,
    healthyRoutes: safeArray(adapter.meshRoutes).filter((route) => route.status === "healthy").length,
    watchRoutes: safeArray(adapter.meshRoutes).filter((route) => route.status === "watch").length,
    lowBatteryDevices: safeArray(adapter.meshRoutes).filter((route) => route.batteryPercent != null && route.batteryPercent < 20).length,
    permitJoinProfileCount: safeArray(adapter.permitJoinProfiles).length,
    readyPermitJoinProfiles: safeArray(adapter.permitJoinProfiles).filter((profile) => profile.status === "ready").length,
    reportingProfileCount: safeArray(adapter.reportingProfiles).length,
    readyReportingProfiles: safeArray(adapter.reportingProfiles).filter((profile) => profile.status === "ready").length,
    commandProfileCount: safeArray(adapter.commandProfiles).length,
    approvalRequiredCommands: safeArray(adapter.commandProfiles).filter((command) => command.requiresApproval).length,
    commandableBindings: bindings.filter((binding) => binding.readiness.canCommand).length,
    averageLqi: Math.round(safeArray(adapter.meshRoutes).reduce((sum, route) => sum + Number(route.lqi || 0), 0) / Math.max(safeArray(adapter.meshRoutes).length, 1)),
    byDeviceType: countBy(bindings, (binding) => binding.deviceType),
    byRisk: countBy(bindings, (binding) => binding.risk),
    byRole: countBy(safeArray(adapter.meshRoutes), (route) => route.role),
  };
}

export function buildZigbeeDashboard({ adapter = loadZigbeeAdapter(), deviceRegistry = loadDeviceRegistry(), catalog = loadCatalog() } = {}) {
  const module = safeArray(catalog.modules).find((entry) => entry.id === "zigbee") || null;
  return {
    service: adapter.service,
    featureModule: adapter.featureModule,
    coordinator: adapter.coordinator,
    module,
    summary: summarizeZigbeeAdapter(adapter, deviceRegistry),
    meshRoutes: safeArray(adapter.meshRoutes).map((route) => ({
      ...route,
      device: findDevice(deviceRegistry, route.deviceId) || null,
      binding: findBinding(adapter, route.deviceId),
    })),
    deviceBindings: enrichedBindings(adapter, deviceRegistry),
    permitJoinProfiles: safeArray(adapter.permitJoinProfiles),
    reportingProfiles: safeArray(adapter.reportingProfiles).map((profile) => ({
      ...profile,
      binding: findBinding(adapter, profile.bindingId),
      device: findDevice(deviceRegistry, profile.deviceId) || null,
    })),
    commandProfiles: safeArray(adapter.commandProfiles).map((command) => ({
      ...command,
      binding: command.bindingId ? findBinding(adapter, command.bindingId) : null,
      permitJoin: command.permitJoinId ? findPermitJoin(adapter, command.permitJoinId) : null,
      device: command.deviceId ? findDevice(deviceRegistry, command.deviceId) : null,
    })),
    healthSamples: safeArray(adapter.healthSamples),
    policies: safeArray(adapter.policies),
    intentRecipes: safeArray(adapter.intentRecipes),
    recentZigbeeRuns: safeArray(adapter.recentZigbeeRuns),
    rule: adapter.service?.rule,
  };
}

export function previewZigbeePermitJoin({ adapter = loadZigbeeAdapter(), permitJoinId, actor = {} } = {}) {
  const profile = findPermitJoin(adapter, permitJoinId || adapter.service?.defaultPermitJoinId);
  if (!profile) return { error: "zigbee_permit_join_profile_not_found", id: permitJoinId || adapter.service?.defaultPermitJoinId };
  const actorInfo = actorProfile(actor);
  const approvalSatisfied = !profile.requiresApproval || hasApproverRole(actorInfo);
  const status = adapter.coordinator?.status !== "online"
    ? "coordinator_offline"
    : !approvalSatisfied
      ? "approval_required"
      : "ready";
  const now = new Date().toISOString();
  return {
    previewId: `zigbee_permit_${profile.id}_${Date.now()}`,
    createdAt: now,
    tenant: adapter.tenant,
    service: adapter.service,
    actor: actorInfo,
    status,
    profile,
    coordinator: adapter.coordinator,
    checklist: safeArray(profile.checklist).map((item) => ({
      id: item,
      label: item.replace(/[-_]/g, " "),
      passed: item === "approval_record_attached" ? approvalSatisfied : adapter.coordinator?.status === "online",
    })),
    summary: {
      coordinatorOnline: adapter.coordinator?.status === "online",
      durationSeconds: profile.durationSeconds,
      allowlistCount: safeArray(profile.allowedDeviceTypes).length + safeArray(profile.allowedManufacturers).length,
      requiresApproval: Boolean(profile.requiresApproval),
      approvalSatisfied,
      canPermitJoin: status === "ready",
    },
    nextActions: status === "ready"
      ? ["simulate_permit_join_window", "watch_interview_events", "record_audit"]
      : status === "approval_required"
        ? ["attach_human_approval", "rerun_permit_join_preview", "keep_join_closed"]
        : ["repair_coordinator", "rerun_permit_join_preview"],
  };
}

export function previewZigbeeReporting({ adapter = loadZigbeeAdapter(), deviceRegistry = loadDeviceRegistry(), reportingId } = {}) {
  const profile = findReporting(adapter, reportingId || adapter.service?.defaultReportingId);
  if (!profile) return { error: "zigbee_reporting_profile_not_found", id: reportingId || adapter.service?.defaultReportingId };
  const binding = findBinding(adapter, profile.bindingId);
  const enrichedBinding = binding ? enrichBinding(adapter, deviceRegistry, binding) : null;
  const device = findDevice(deviceRegistry, profile.deviceId) || null;
  const status = !binding
    ? "binding_not_found"
    : !device
      ? "device_not_found"
      : adapter.coordinator?.status !== "online"
        ? "coordinator_offline"
        : profile.status === "watch"
          ? "ready_with_watch"
          : "ready";
  const now = new Date().toISOString();
  return {
    previewId: `zigbee_reporting_${profile.id}_${Date.now()}`,
    createdAt: now,
    tenant: adapter.tenant,
    service: adapter.service,
    status,
    profile,
    binding: enrichedBinding,
    device,
    coordinator: adapter.coordinator,
    configureReporting: {
      ieeeAddress: binding?.ieeeAddress || null,
      endpoint: binding?.endpoint || null,
      cluster: profile.cluster,
      attribute: profile.attribute,
      minIntervalSeconds: profile.minIntervalSeconds,
      maxIntervalSeconds: profile.maxIntervalSeconds,
      reportableChange: profile.reportableChange,
      simulated: true,
    },
    summary: {
      deviceKnown: Boolean(device),
      deviceOnline: device?.status === "online",
      coordinatorOnline: adapter.coordinator?.status === "online",
      canConfigure: status === "ready" || status === "ready_with_watch",
      watchRoute: status === "ready_with_watch",
    },
    nextActions: status === "ready" || status === "ready_with_watch"
      ? ["simulate_reporting_config", "watch_attribute_reports", "refresh_mesh_projection"]
      : ["repair_binding_or_coordinator", "rerun_reporting_preview"],
  };
}

export function previewZigbeeCommand({ adapter = loadZigbeeAdapter(), deviceRegistry = loadDeviceRegistry(), commandId, actor = {}, execute = false } = {}) {
  const command = findCommand(adapter, commandId || adapter.service?.defaultCommandId);
  if (!command) return { error: "zigbee_command_profile_not_found", id: commandId || adapter.service?.defaultCommandId };
  const actorInfo = actorProfile(actor);
  const binding = command.bindingId ? findBinding(adapter, command.bindingId) : null;
  const enrichedBinding = binding ? enrichBinding(adapter, deviceRegistry, binding) : null;
  const device = command.deviceId ? findDevice(deviceRegistry, command.deviceId) : null;
  const permitJoin = command.permitJoinId ? findPermitJoin(adapter, command.permitJoinId) : null;
  const approvalSatisfied = !command.requiresApproval || hasApproverRole(actorInfo);
  const blockedReason = adapter.coordinator?.status !== "online"
    ? "coordinator_offline"
    : command.permitJoinId && !permitJoin
      ? "permit_join_profile_not_found"
      : command.permitJoinId && !approvalSatisfied
        ? "approval_required"
        : command.bindingId && !binding
          ? "binding_not_found"
          : command.deviceId && !device
            ? "device_not_found"
            : command.deviceId && device.status !== "online"
              ? "device_not_online"
              : command.bindingId && !enrichedBinding?.readiness.routeHealthy
                ? "route_unhealthy"
                : !approvalSatisfied
                  ? "approval_required"
                  : null;
  const canExecute = !blockedReason;
  const status = canExecute ? (execute ? "execute_simulated" : "ready_to_execute") : blockedReason;
  const now = new Date().toISOString();
  return {
    previewId: `zigbee_command_${command.id}_${Date.now()}`,
    createdAt: now,
    tenant: adapter.tenant,
    service: adapter.service,
    actor: actorInfo,
    status,
    command,
    binding: enrichedBinding,
    permitJoin,
    device,
    coordinator: adapter.coordinator,
    frame: {
      ieeeAddress: binding?.ieeeAddress || null,
      networkAddress: binding?.networkAddress || null,
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
      deviceOnline: device?.status === "online" || !command.deviceId,
      routeStatus: enrichedBinding?.route?.status || "coordinator",
    },
    policy: {
      result: canExecute ? "allow" : blockedReason,
      rules: safeArray(adapter.policies).filter((policy) => (
        policy.id === "zigbee-permit-join-window" || (command.requiresApproval && policy.id === "zigbee-router-join-approval")
      )),
    },
    nextActions: canExecute
      ? execute
        ? ["record_audit", "await_zigbee_report", "refresh_mesh_projection"]
        : ["simulate_command", "record_preview", "preserve_coordinator_boundary"]
      : blockedReason === "approval_required"
        ? ["attach_human_approval", "rerun_command_preview", "keep_execution_blocked"]
        : ["repair_binding_or_mesh_route", "rerun_command_preview"],
    event: {
      id: `zigbee-${command.id}-${Date.now()}`,
      timestamp: now,
      tenant: adapter.tenant,
      siteId: device?.siteId || adapter.coordinator?.siteId || null,
      zoneId: device?.zoneId || adapter.coordinator?.zoneId || null,
      deviceId: device?.id || null,
      moduleId: "zigbee",
      stream: "command",
      severity: command.trafficClass === "P0_EMERGENCY" ? "critical" : command.requiresApproval ? "warning" : "info",
      actor: { type: "human", id: actorInfo.subject, displayName: actorInfo.name },
      action: execute ? "zigbee.command.execute.simulated" : "zigbee.command.previewed",
      summary: `${command.name} ${status.replace(/_/g, " ")} on ${binding?.ieeeAddress || adapter.coordinator?.id || "no target"}.`,
      status,
      trafficClass: command.trafficClass,
      auditRequired: true,
      payload: { commandId: command.id, bindingId: command.bindingId, permitJoinId: command.permitJoinId, simulated: true },
    },
  };
}

export function executeZigbeeCommand(options = {}) {
  const preview = previewZigbeeCommand({ ...options, execute: false });
  if (preview.error) return preview;
  if (!preview.summary.canExecute) {
    return { ...preview, executeAttempted: true, event: { ...preview.event, action: "zigbee.command.execute.blocked" } };
  }
  return { ...previewZigbeeCommand({ ...options, execute: true }), executeAttempted: true };
}

export function previewZigbeeIntent({ adapter = loadZigbeeAdapter(), deviceRegistry = loadDeviceRegistry(), intent = "", actor = {} } = {}) {
  const text = String(intent || "").toLowerCase();
  const scored = safeArray(adapter.intentRecipes)
    .map((recipe) => ({
      recipe,
      score: safeArray(recipe.keywords).reduce((score, keyword) => score + (text.includes(String(keyword).toLowerCase()) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score || Number(b.recipe.confidence || 0) - Number(a.recipe.confidence || 0));
  const match = scored.find((item) => item.score > 0) || scored[0];
  if (!match) return { error: "zigbee_intent_recipe_not_found", intent };
  return {
    intent,
    match: {
      id: match.recipe.id,
      name: match.recipe.name,
      commandId: match.recipe.commandId || null,
      permitJoinId: match.recipe.permitJoinId || null,
      reportingId: match.recipe.reportingId || null,
      confidence: match.recipe.confidence,
      score: match.score,
    },
    preview: match.recipe.commandId
      ? previewZigbeeCommand({ adapter, deviceRegistry, commandId: match.recipe.commandId, actor })
      : match.recipe.permitJoinId
        ? previewZigbeePermitJoin({ adapter, permitJoinId: match.recipe.permitJoinId, actor })
        : previewZigbeeReporting({ adapter, deviceRegistry, reportingId: match.recipe.reportingId }),
  };
}
