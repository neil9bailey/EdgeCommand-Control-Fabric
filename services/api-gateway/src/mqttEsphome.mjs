import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findDevice, loadDeviceRegistry } from "./deviceRegistry.mjs";
import { loadModuleCertification, previewCertificationProfile } from "./moduleCertification.mjs";
import { loadModuleBuilder } from "./moduleBuilder.mjs";
import { loadModuleManifest } from "./moduleManifest.mjs";
import { loadModuleMarketplace } from "./moduleMarketplace.mjs";
import { loadCatalog } from "./catalog.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const mqttPath = resolve(here, "../../../packages/mqtt-esphome/mqtt-esphome.json");

export function loadMqttEsphome() {
  return JSON.parse(readFileSync(mqttPath, "utf8"));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function countBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
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

function mappingById(adapter, id) {
  return safeArray(adapter.topicMappings).find((mapping) => mapping.id === id || mapping.deviceId === id || mapping.nodeId === id) || null;
}

function commandById(adapter, id) {
  return safeArray(adapter.commandProfiles).find((command) => command.id === id || command.deviceId === id || command.mappingId === id) || null;
}

function discoveryById(adapter, id) {
  return safeArray(adapter.discoveryProfiles).find((profile) => profile.id === id || profile.deviceId === id || profile.nodeId === id) || null;
}

function renderPayload(template = {}, desiredState = {}) {
  const rendered = {};
  for (const [key, value] of Object.entries(template)) {
    if (typeof value === "string") {
      const match = value.match(/^\{\{desired\.([a-zA-Z0-9_]+)\}\}$/);
      rendered[key] = match ? desiredState[match[1]] : value;
    } else {
      rendered[key] = value;
    }
  }
  return Object.keys(rendered).length > 0 ? rendered : desiredState;
}

function enrichMapping(adapter, deviceRegistry, mapping) {
  const device = findDevice(deviceRegistry, mapping.deviceId) || null;
  const capability = safeArray(deviceRegistry.capabilityDefinitions).find((entry) => entry.id === mapping.capability) || null;
  const discovery = safeArray(adapter.discoveryProfiles).find((profile) => profile.deviceId === mapping.deviceId) || null;
  const stateSample = safeArray(adapter.stateSamples).find((sample) => sample.mappingId === mapping.id) || null;
  return {
    ...mapping,
    device,
    capabilityDefinition: capability,
    discovery,
    stateSample,
    readiness: {
      deviceKnown: Boolean(device),
      deviceOnline: device?.status === "online",
      commandTopicAllowed: Boolean(mapping.commandTopic),
      canPublish: Boolean(mapping.commandTopic && device?.status === "online"),
      registryCapabilities: safeArray(device?.capabilities),
    },
  };
}

function enrichedMappings(adapter, deviceRegistry) {
  return safeArray(adapter.topicMappings).map((mapping) => enrichMapping(adapter, deviceRegistry, mapping));
}

export function summarizeMqttEsphome(adapter = loadMqttEsphome(), deviceRegistry = loadDeviceRegistry()) {
  const mappings = enrichedMappings(adapter, deviceRegistry);
  const mappedDevices = mappings.map((mapping) => mapping.device).filter(Boolean);
  return {
    schemaVersion: adapter.schemaVersion,
    brokerStatus: adapter.broker?.status || "unknown",
    mappingCount: mappings.length,
    mappedDeviceCount: mappedDevices.length,
    onlineMappedDevices: mappedDevices.filter((device) => device.status === "online").length,
    commandProfileCount: safeArray(adapter.commandProfiles).length,
    discoveryProfileCount: safeArray(adapter.discoveryProfiles).length,
    readyDiscoveryProfiles: safeArray(adapter.discoveryProfiles).filter((profile) => profile.status === "ready").length,
    stateSampleCount: safeArray(adapter.stateSamples).length,
    recentRunCount: safeArray(adapter.recentMqttRuns).length,
    approvalRequiredCommands: safeArray(adapter.commandProfiles).filter((command) => command.requiresApproval).length,
    publishableMappings: mappings.filter((mapping) => mapping.readiness.canPublish).length,
    byCapability: countBy(mappings, (mapping) => mapping.capability),
    byRisk: countBy(mappings, (mapping) => mapping.risk),
    byQos: countBy(mappings, (mapping) => `qos${mapping.qos}`),
  };
}

export function buildMqttEsphomeDashboard({
  adapter = loadMqttEsphome(),
  deviceRegistry = loadDeviceRegistry(),
  certification = loadModuleCertification(),
  marketplace = loadModuleMarketplace(),
  builder = loadModuleBuilder(),
  manifest = loadModuleManifest(),
  catalog = loadCatalog(),
} = {}) {
  const certificationPreview = previewCertificationProfile({
    certification,
    marketplace,
    builder,
    manifest,
    catalog,
    profileId: "cert-mqtt-esphome-foundation",
    actor: { subject: "mqtt-adapter", name: "MQTT Adapter", roles: ["Automation.AgentApprover"] },
  });
  return {
    service: adapter.service,
    featureModule: adapter.featureModule,
    broker: adapter.broker,
    summary: summarizeMqttEsphome(adapter, deviceRegistry),
    topicMappings: enrichedMappings(adapter, deviceRegistry),
    discoveryProfiles: safeArray(adapter.discoveryProfiles).map((profile) => ({
      ...profile,
      device: findDevice(deviceRegistry, profile.deviceId) || null,
    })),
    commandProfiles: safeArray(adapter.commandProfiles).map((command) => ({
      ...command,
      mapping: mappingById(adapter, command.mappingId),
      device: findDevice(deviceRegistry, command.deviceId) || null,
    })),
    stateSamples: safeArray(adapter.stateSamples),
    policies: safeArray(adapter.policies),
    intentRecipes: safeArray(adapter.intentRecipes),
    recentMqttRuns: safeArray(adapter.recentMqttRuns),
    certification: certificationPreview.error ? null : {
      status: certificationPreview.status,
      profileId: certificationPreview.profile.id,
      canEnable: certificationPreview.summary.canEnable,
      evidenceAttached: certificationPreview.summary.attachedEvidence.length,
      requiredEvidence: certificationPreview.profile.requiredEvidence.length,
    },
    rule: adapter.service?.rule,
  };
}

export function previewMqttDiscovery({ adapter = loadMqttEsphome(), deviceRegistry = loadDeviceRegistry(), discoveryProfileId, actor = {} } = {}) {
  const profile = discoveryById(adapter, discoveryProfileId || adapter.service?.defaultDiscoveryProfileId);
  if (!profile) return { error: "mqtt_discovery_profile_not_found", id: discoveryProfileId || adapter.service?.defaultDiscoveryProfileId };
  const device = findDevice(deviceRegistry, profile.deviceId) || null;
  const now = new Date().toISOString();
  return {
    previewId: `mqtt_discovery_${profile.id}_${Date.now()}`,
    createdAt: now,
    tenant: adapter.tenant,
    service: adapter.service,
    actor: actorProfile(actor),
    status: device ? profile.status : "blocked_missing_device",
    profile,
    device,
    discoveryTopic: profile.discoveryTopic,
    payload: profile.payload,
    summary: {
      deviceKnown: Boolean(device),
      capabilityCount: safeArray(device?.capabilities).length,
      retainRecommended: true,
      canPublishDiscovery: Boolean(device && profile.status === "ready"),
    },
    nextActions: device && profile.status === "ready"
      ? ["publish_discovery_simulated", "subscribe_state_topic", "watch_availability"]
      : ["review_discovery_profile", "attach_approval_if_actuator", "rerun_discovery_preview"],
  };
}

export function previewMqttCommand({ adapter = loadMqttEsphome(), deviceRegistry = loadDeviceRegistry(), commandId, actor = {}, publish = false } = {}) {
  const command = commandById(adapter, commandId || adapter.service?.defaultCommandId);
  if (!command) return { error: "mqtt_command_profile_not_found", id: commandId || adapter.service?.defaultCommandId };
  const mapping = mappingById(adapter, command.mappingId);
  const device = findDevice(deviceRegistry, command.deviceId) || null;
  const actorInfo = actorProfile(actor);
  const approvalSatisfied = !command.requiresApproval || hasApproverRole(actorInfo);
  const blockedReason = !mapping
    ? "mapping_not_found"
    : !mapping.commandTopic
      ? "command_topic_not_declared"
      : !device
        ? "device_not_found"
        : device.status !== "online"
          ? "device_not_online"
          : !approvalSatisfied
            ? "approval_required"
            : null;
  const canPublish = !blockedReason;
  const status = canPublish ? (publish ? "publish_simulated" : "ready_to_publish") : blockedReason;
  const payload = renderPayload(mapping?.payloadTemplate, command.desiredState);
  const now = new Date().toISOString();

  return {
    previewId: `mqtt_command_${command.id}_${Date.now()}`,
    createdAt: now,
    tenant: adapter.tenant,
    service: adapter.service,
    actor: actorInfo,
    status,
    command,
    mapping,
    device,
    publish: {
      topic: mapping?.commandTopic || null,
      payload,
      qos: command.qos,
      retain: Boolean(command.retain),
      brokerId: adapter.broker?.id || "local-mosquitto",
      simulated: true,
    },
    summary: {
      canPublish,
      requiresApproval: Boolean(command.requiresApproval),
      approvalSatisfied,
      deviceOnline: device?.status === "online",
      encodedBytes: Buffer.byteLength(JSON.stringify(payload), "utf8"),
    },
    policy: {
      result: canPublish ? "allow" : blockedReason,
      rules: safeArray(adapter.policies).filter((policy) => (
        policy.id === "mqtt-topic-allowlist" || (command.requiresApproval && policy.id === "mqtt-physical-actuation-approval")
      )),
    },
    nextActions: canPublish
      ? publish
        ? ["record_audit", "await_state_echo", "refresh_device_registry_projection"]
        : ["simulate_publish", "record_preview", "preserve_broker_boundary"]
      : blockedReason === "approval_required"
        ? ["attach_human_approval", "rerun_command_preview", "keep_publish_blocked"]
        : ["repair_topic_mapping", "refresh_device_state", "rerun_command_preview"],
    event: {
      id: `mqtt-${command.id}-${Date.now()}`,
      timestamp: now,
      tenant: adapter.tenant,
      siteId: device?.siteId || null,
      zoneId: device?.zoneId || null,
      deviceId: device?.id || null,
      moduleId: "mqtt-esphome",
      stream: "command",
      severity: command.trafficClass === "P0_EMERGENCY" ? "critical" : "info",
      actor: { type: "human", id: actorInfo.subject, displayName: actorInfo.name },
      action: publish ? "mqtt.command.publish.simulated" : "mqtt.command.previewed",
      summary: `${command.name} ${status.replace(/_/g, " ")} on ${mapping?.commandTopic || "no topic"}.`,
      status,
      trafficClass: command.trafficClass,
      auditRequired: true,
      payload: { commandId: command.id, mappingId: command.mappingId, topic: mapping?.commandTopic || null, simulated: true },
    },
  };
}

export function publishMqttCommand(options = {}) {
  const preview = previewMqttCommand({ ...options, publish: false });
  if (preview.error) return preview;
  if (!preview.summary.canPublish) {
    return {
      ...preview,
      publishAttempted: true,
      event: { ...preview.event, action: "mqtt.command.publish.blocked" },
    };
  }
  return { ...previewMqttCommand({ ...options, publish: true }), publishAttempted: true };
}

export function previewMqttIntent({ adapter = loadMqttEsphome(), deviceRegistry = loadDeviceRegistry(), intent = "", actor = {} } = {}) {
  const text = String(intent || "").toLowerCase();
  const scored = safeArray(adapter.intentRecipes)
    .map((recipe) => ({
      recipe,
      score: safeArray(recipe.keywords).reduce((score, keyword) => score + (text.includes(String(keyword).toLowerCase()) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score || Number(b.recipe.confidence || 0) - Number(a.recipe.confidence || 0));
  const match = scored.find((item) => item.score > 0) || scored[0];
  if (!match) return { error: "mqtt_intent_recipe_not_found", intent };
  return {
    intent,
    match: { id: match.recipe.id, name: match.recipe.name, commandId: match.recipe.commandId, confidence: match.recipe.confidence, score: match.score },
    preview: previewMqttCommand({ adapter, deviceRegistry, commandId: match.recipe.commandId, actor }),
  };
}
