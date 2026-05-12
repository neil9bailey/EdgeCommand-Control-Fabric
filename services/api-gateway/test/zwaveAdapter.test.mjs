import assert from "node:assert/strict";
import test from "node:test";
import { loadDeviceRegistry } from "../src/deviceRegistry.mjs";
import {
  buildZwaveDashboard,
  executeZwaveCommand,
  loadZwaveAdapter,
  previewZwaveCommand,
  previewZwaveExclusion,
  previewZwaveInclusion,
  previewZwaveIntent,
  summarizeZwaveAdapter,
} from "../src/zwaveAdapter.mjs";

test("Z-Wave adapter summarizes secure nodes and lock posture", () => {
  const summary = summarizeZwaveAdapter(loadZwaveAdapter(), loadDeviceRegistry());
  assert.equal(summary.controllerStatus, "online");
  assert.equal(summary.bindingCount, 1);
  assert.equal(summary.zwaveRegistryDevices, 1);
  assert.equal(summary.secureNodeCount, 1);
  assert.equal(summary.lockNodeCount, 1);
  assert.equal(summary.approvalRequiredCommands, 2);
});

test("Z-Wave dashboard enriches node binding with registry device", () => {
  const dashboard = buildZwaveDashboard({ adapter: loadZwaveAdapter(), deviceRegistry: loadDeviceRegistry() });
  assert.equal(dashboard.service.moduleId, "zwave");
  assert.equal(dashboard.controller.status, "online");
  assert.equal(dashboard.nodeBindings[0].device.name, "Front Door Lock");
  assert.equal(dashboard.nodeBindings[0].readiness.s2Ready, true);
});

test("Z-Wave status command preview can execute without lock approval", () => {
  const result = previewZwaveCommand({
    adapter: loadZwaveAdapter(),
    deviceRegistry: loadDeviceRegistry(),
    commandId: "cmd-zwave-front-lock-status",
    actor: { subject: "operator", roles: ["Automation.Operator"] },
  });
  assert.equal(result.status, "ready_to_execute");
  assert.equal(result.frame.commandClass, "door_lock");
  assert.equal(result.summary.canExecute, true);
  assert.equal(result.frame.supervised, true);
});

test("Z-Wave lock command is approval-gated for non-approvers", () => {
  const result = previewZwaveCommand({
    adapter: loadZwaveAdapter(),
    deviceRegistry: loadDeviceRegistry(),
    commandId: "cmd-zwave-front-lock-unlock",
    actor: { subject: "viewer", roles: ["Automation.Viewer"] },
  });
  assert.equal(result.status, "approval_required");
  assert.equal(result.summary.canExecute, false);
  assert.equal(result.policy.rules.some((rule) => rule.id === "zwave-lock-command-approval"), true);
});

test("Z-Wave execute remains simulated for approved lock command", () => {
  const result = executeZwaveCommand({
    adapter: loadZwaveAdapter(),
    deviceRegistry: loadDeviceRegistry(),
    commandId: "cmd-zwave-front-lock-secure",
    actor: { subject: "approver", roles: ["Automation.AgentApprover"] },
  });
  assert.equal(result.status, "execute_simulated");
  assert.equal(result.executeAttempted, true);
  assert.equal(result.event.action, "zwave.command.execute.simulated");
});

test("Z-Wave inclusion and exclusion previews enforce approval", () => {
  const inclusion = previewZwaveInclusion({
    adapter: loadZwaveAdapter(),
    deviceRegistry: loadDeviceRegistry(),
    inclusionId: "include-front-lock-s2",
    actor: { subject: "operator", roles: ["Automation.Operator"] },
  });
  const exclusion = previewZwaveExclusion({
    adapter: loadZwaveAdapter(),
    deviceRegistry: loadDeviceRegistry(),
    exclusionId: "exclude-front-lock",
    actor: { subject: "operator", roles: ["Automation.Operator"] },
  });
  assert.equal(inclusion.status, "approval_required");
  assert.equal(exclusion.status, "approval_required");
  assert.equal(inclusion.summary.canRun, false);
  assert.equal(exclusion.summary.canRun, false);
});

test("Z-Wave intent routes natural language to status preview", () => {
  const result = previewZwaveIntent({
    adapter: loadZwaveAdapter(),
    deviceRegistry: loadDeviceRegistry(),
    intent: "Check the front door lock status using Z-Wave",
    actor: { subject: "operator", roles: ["Automation.Operator"] },
  });
  assert.equal(result.match.commandId, "cmd-zwave-front-lock-status");
  assert.equal(result.preview.summary.canExecute, true);
});
