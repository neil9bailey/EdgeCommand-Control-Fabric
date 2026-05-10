import test from "node:test";
import assert from "node:assert/strict";
import { loadDeviceRegistry } from "../src/deviceRegistry.mjs";
import {
  buildMatterThreadDashboard,
  executeMatterCommand,
  loadMatterThread,
  previewMatterCommand,
  previewMatterCommissioning,
  previewMatterIntent,
  summarizeMatterThread,
} from "../src/matterThread.mjs";

test("Matter Thread adapter summarizes fabric devices and thread health", () => {
  const summary = summarizeMatterThread(loadMatterThread(), loadDeviceRegistry());

  assert.equal(summary.bindingCount, 5);
  assert.equal(summary.matterRegistryDevices, 9);
  assert.equal(summary.threadNetworkCount, 1);
  assert.equal(summary.healthyThreadNetworks, 1);
  assert.equal(summary.onlineBorderRouters, 1);
  assert.equal(summary.commandableBindings, 5);
});

test("Matter Thread dashboard enriches bindings with registry devices", () => {
  const dashboard = buildMatterThreadDashboard({ adapter: loadMatterThread(), deviceRegistry: loadDeviceRegistry() });
  const kitchen = dashboard.deviceBindings.find((binding) => binding.deviceId === "dev-light-kitchen-01");
  const thread = dashboard.threadNetworks.find((network) => network.id === "thread-home-hq");

  assert.equal(dashboard.service.moduleId, "matter-thread");
  assert.equal(kitchen.device.name, "Kitchen Downlights");
  assert.equal(kitchen.readiness.canCommand, true);
  assert.equal(thread.health.status, "healthy");
});

test("Matter command preview produces simulated invoke", () => {
  const result = previewMatterCommand({
    adapter: loadMatterThread(),
    deviceRegistry: loadDeviceRegistry(),
    commandId: "cmd-matter-kitchen-dim",
    actor: { subject: "tester", name: "Tester", roles: ["Automation.Operator"] },
  });

  assert.equal(result.status, "ready_to_execute");
  assert.equal(result.summary.canExecute, true);
  assert.equal(result.invoke.cluster, "level_control");
  assert.deepEqual(result.invoke.desiredState, { on: true, brightness: 48, colorTemperatureK: 3200 });
});

test("Matter security command is approval-gated for non-approvers", () => {
  const result = previewMatterCommand({
    adapter: loadMatterThread(),
    deviceRegistry: loadDeviceRegistry(),
    commandId: "cmd-matter-hall-alarm-arm",
    actor: { subject: "viewer", name: "Viewer", roles: ["Automation.Operator"] },
  });

  assert.equal(result.status, "approval_required");
  assert.equal(result.summary.canExecute, false);
  assert.ok(result.nextActions.includes("attach_human_approval"));
});

test("Matter execute remains simulated for approved command", () => {
  const result = executeMatterCommand({
    adapter: loadMatterThread(),
    deviceRegistry: loadDeviceRegistry(),
    commandId: "cmd-matter-kitchen-dim",
    actor: { subject: "tester", name: "Tester", roles: ["Automation.Operator"] },
  });

  assert.equal(result.status, "execute_simulated");
  assert.equal(result.executeAttempted, true);
  assert.equal(result.event.action, "matter.command.execute.simulated");
});

test("Thread commissioning preview validates border router health", () => {
  const result = previewMatterCommissioning({
    adapter: loadMatterThread(),
    deviceRegistry: loadDeviceRegistry(),
    commissioningId: "commission-thread-contact",
  });

  assert.equal(result.status, "ready");
  assert.equal(result.summary.threadRequired, true);
  assert.equal(result.summary.threadHealthy, true);
  assert.equal(result.threadNetwork.id, "thread-home-hq");
});

test("Matter intent routes natural language to command preview", () => {
  const result = previewMatterIntent({
    adapter: loadMatterThread(),
    deviceRegistry: loadDeviceRegistry(),
    intent: "Dim the kitchen downlights using Matter.",
  });

  assert.equal(result.match.commandId, "cmd-matter-kitchen-dim");
  assert.equal(result.preview.status, "ready_to_execute");
});
