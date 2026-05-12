import assert from "node:assert/strict";
import test from "node:test";
import { loadDeviceRegistry } from "../src/deviceRegistry.mjs";
import {
  buildZigbeeDashboard,
  executeZigbeeCommand,
  loadZigbeeAdapter,
  previewZigbeeCommand,
  previewZigbeeIntent,
  previewZigbeePermitJoin,
  previewZigbeeReporting,
  summarizeZigbeeAdapter,
} from "../src/zigbeeAdapter.mjs";

test("Zigbee adapter summarizes mesh health and bindings", () => {
  const summary = summarizeZigbeeAdapter(loadZigbeeAdapter(), loadDeviceRegistry());
  assert.equal(summary.coordinatorStatus, "online");
  assert.equal(summary.bindingCount, 5);
  assert.equal(summary.zigbeeRegistryDevices, 5);
  assert.equal(summary.healthyRoutes, 4);
  assert.equal(summary.watchRoutes, 1);
  assert.equal(summary.commandableBindings, 5);
  assert.equal(summary.byRole.end_device, 3);
});

test("Zigbee dashboard enriches bindings with registry devices", () => {
  const dashboard = buildZigbeeDashboard({ adapter: loadZigbeeAdapter(), deviceRegistry: loadDeviceRegistry() });
  assert.equal(dashboard.service.moduleId, "zigbee");
  assert.equal(dashboard.coordinator.status, "online");
  assert.equal(dashboard.deviceBindings.length, 5);
  assert.equal(dashboard.deviceBindings[0].device.name, "Utility Leak Sensor");
  assert.equal(dashboard.meshRoutes.find((route) => route.id === "route-hall-occupancy").status, "watch");
});

test("Zigbee command preview produces simulated frame", () => {
  const result = previewZigbeeCommand({
    adapter: loadZigbeeAdapter(),
    deviceRegistry: loadDeviceRegistry(),
    commandId: "cmd-zigbee-living-floor-wash-dim",
    actor: { subject: "operator", roles: ["Automation.Operator"] },
  });
  assert.equal(result.status, "ready_to_execute");
  assert.equal(result.frame.cluster, "gen_level_ctrl");
  assert.equal(result.summary.canExecute, true);
  assert.equal(result.frame.simulated, true);
});

test("Zigbee permit join command is approval-gated for non-approvers", () => {
  const result = previewZigbeeCommand({
    adapter: loadZigbeeAdapter(),
    deviceRegistry: loadDeviceRegistry(),
    commandId: "cmd-zigbee-permit-router-join",
    actor: { subject: "viewer", roles: ["Automation.Viewer"] },
  });
  assert.equal(result.status, "approval_required");
  assert.equal(result.summary.canExecute, false);
  assert.equal(result.policy.rules.some((rule) => rule.id === "zigbee-router-join-approval"), true);
});

test("Zigbee execute remains simulated for approved command", () => {
  const result = executeZigbeeCommand({
    adapter: loadZigbeeAdapter(),
    deviceRegistry: loadDeviceRegistry(),
    commandId: "cmd-zigbee-living-floor-wash-dim",
    actor: { subject: "approver", roles: ["Automation.AgentApprover"] },
  });
  assert.equal(result.status, "execute_simulated");
  assert.equal(result.executeAttempted, true);
  assert.equal(result.event.action, "zigbee.command.execute.simulated");
});

test("Zigbee reporting preview validates binding and coordinator health", () => {
  const result = previewZigbeeReporting({
    adapter: loadZigbeeAdapter(),
    deviceRegistry: loadDeviceRegistry(),
    reportingId: "report-utility-leak",
  });
  assert.equal(result.status, "ready");
  assert.equal(result.configureReporting.cluster, "ias_zone");
  assert.equal(result.summary.canConfigure, true);
});

test("Zigbee permit join preview enforces approval and allowlist posture", () => {
  const result = previewZigbeePermitJoin({
    adapter: loadZigbeeAdapter(),
    permitJoinId: "permit-whole-home-router",
    actor: { subject: "operator", roles: ["Automation.Operator"] },
  });
  assert.equal(result.status, "approval_required");
  assert.equal(result.summary.requiresApproval, true);
  assert.equal(result.summary.canPermitJoin, false);
});

test("Zigbee intent routes natural language to reporting preview", () => {
  const result = previewZigbeeIntent({
    adapter: loadZigbeeAdapter(),
    deviceRegistry: loadDeviceRegistry(),
    intent: "Preview Zigbee leak reporting in the utility room",
    actor: { subject: "operator", roles: ["Automation.Operator"] },
  });
  assert.equal(result.match.reportingId, "report-utility-leak");
  assert.equal(result.preview.summary.canConfigure, true);
});
