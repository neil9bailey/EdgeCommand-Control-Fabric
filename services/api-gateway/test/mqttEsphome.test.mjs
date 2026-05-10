import test from "node:test";
import assert from "node:assert/strict";
import { loadCatalog } from "../src/catalog.mjs";
import { loadDeviceRegistry } from "../src/deviceRegistry.mjs";
import { loadModuleBuilder } from "../src/moduleBuilder.mjs";
import { loadModuleCertification } from "../src/moduleCertification.mjs";
import { loadModuleManifest } from "../src/moduleManifest.mjs";
import { loadModuleMarketplace } from "../src/moduleMarketplace.mjs";
import {
  buildMqttEsphomeDashboard,
  loadMqttEsphome,
  previewMqttCommand,
  previewMqttDiscovery,
  previewMqttIntent,
  publishMqttCommand,
  summarizeMqttEsphome,
} from "../src/mqttEsphome.mjs";

function context() {
  return {
    adapter: loadMqttEsphome(),
    deviceRegistry: loadDeviceRegistry(),
    certification: loadModuleCertification(),
    marketplace: loadModuleMarketplace(),
    builder: loadModuleBuilder(),
    manifest: loadModuleManifest(),
    catalog: loadCatalog(),
  };
}

test("MQTT ESPHome adapter summarizes mapped registry devices", () => {
  const summary = summarizeMqttEsphome(loadMqttEsphome(), loadDeviceRegistry());

  assert.equal(summary.mappingCount, 3);
  assert.equal(summary.mappedDeviceCount, 3);
  assert.equal(summary.onlineMappedDevices, 3);
  assert.equal(summary.publishableMappings, 2);
  assert.equal(summary.byCapability.light, 1);
});

test("MQTT ESPHome dashboard links certification and registry mappings", () => {
  const dashboard = buildMqttEsphomeDashboard(context());
  const garden = dashboard.topicMappings.find((mapping) => mapping.deviceId === "dev-light-garden-path-01");

  assert.equal(dashboard.service.moduleId, "mqtt-esphome");
  assert.equal(dashboard.certification.status, "passed");
  assert.equal(garden.device.name, "Garden Path Bollards");
  assert.equal(garden.discovery.id, "discovery-esphome-garden-light");
});

test("MQTT command preview normalizes payload without broker mutation", () => {
  const result = previewMqttCommand({
    adapter: loadMqttEsphome(),
    deviceRegistry: loadDeviceRegistry(),
    commandId: "cmd-mqtt-garden-light-on",
    actor: { subject: "tester", name: "Tester", roles: ["Automation.Operator"] },
  });

  assert.equal(result.status, "ready_to_publish");
  assert.equal(result.summary.canPublish, true);
  assert.equal(result.publish.topic, "edgecommand/home-hq/garden/path-light/set");
  assert.deepEqual(result.publish.payload, { on: true, brightness: 62 });
  assert.equal(result.publish.simulated, true);
});

test("MQTT high-risk command is approval-gated for non-approvers", () => {
  const result = previewMqttCommand({
    adapter: loadMqttEsphome(),
    deviceRegistry: loadDeviceRegistry(),
    commandId: "cmd-mqtt-main-valve-close",
    actor: { subject: "viewer", name: "Viewer", roles: ["Automation.Operator"] },
  });

  assert.equal(result.status, "approval_required");
  assert.equal(result.summary.canPublish, false);
  assert.ok(result.nextActions.includes("attach_human_approval"));
});

test("MQTT publish is simulated for approved command", () => {
  const result = publishMqttCommand({
    adapter: loadMqttEsphome(),
    deviceRegistry: loadDeviceRegistry(),
    commandId: "cmd-mqtt-garden-light-on",
    actor: { subject: "tester", name: "Tester", roles: ["Automation.Operator"] },
  });

  assert.equal(result.status, "publish_simulated");
  assert.equal(result.publishAttempted, true);
  assert.equal(result.event.action, "mqtt.command.publish.simulated");
});

test("ESPHome discovery preview emits Home Assistant compatible topic", () => {
  const result = previewMqttDiscovery({
    adapter: loadMqttEsphome(),
    deviceRegistry: loadDeviceRegistry(),
    discoveryProfileId: "discovery-esphome-garden-light",
  });

  assert.equal(result.status, "ready");
  assert.equal(result.discoveryTopic, "homeassistant/light/edge-garden-path-light/config");
  assert.equal(result.summary.canPublishDiscovery, true);
});

test("MQTT intent routes natural language to command preview", () => {
  const result = previewMqttIntent({
    adapter: loadMqttEsphome(),
    deviceRegistry: loadDeviceRegistry(),
    intent: "Turn on the garden path light using MQTT.",
  });

  assert.equal(result.match.commandId, "cmd-mqtt-garden-light-on");
  assert.equal(result.preview.status, "ready_to_publish");
});
