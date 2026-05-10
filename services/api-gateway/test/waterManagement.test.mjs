import test from "node:test";
import assert from "node:assert/strict";
import { loadAutomationEngine } from "../src/automationEngine.mjs";
import { loadDeviceRegistry } from "../src/deviceRegistry.mjs";
import {
  applyWaterProfile,
  buildWaterDashboard,
  loadWaterManagement,
  previewWaterIntent,
  previewWaterProfile,
  summarizeWaterManagement,
} from "../src/waterManagement.mjs";

const approver = {
  subject: "approver-local",
  name: "Local Approver",
  roles: ["Automation.AgentApprover"],
};

test("water management package loads zones profiles policies and recipes", () => {
  const water = loadWaterManagement();
  const summary = summarizeWaterManagement(water, loadDeviceRegistry());

  assert.equal(water.service.moduleId, "water-management");
  assert.equal(summary.schemaVersion, "0.1.0");
  assert.equal(summary.zoneCount, 2);
  assert.equal(summary.valveCount, 2);
  assert.equal(summary.onlineValveCount, 2);
  assert.equal(summary.profileCount, 4);
  assert.equal(summary.intentRecipeCount, 3);
});

test("water dashboard enriches zones with sensor valve flow and automation rules", () => {
  const dashboard = buildWaterDashboard({
    water: loadWaterManagement(),
    deviceRegistry: loadDeviceRegistry(),
    automationEngine: loadAutomationEngine(),
  });

  assert.equal(dashboard.featureModule.state, "foundation");
  assert.equal(dashboard.automationRules.length, 2);
  assert.ok(dashboard.zones.some((zone) => zone.id === "water-zone-utility" && zone.devices.flowMeter));
  assert.ok(dashboard.zones.some((zone) => zone.id === "water-zone-cottage" && zone.devices.gateway));
});

test("remote cottage shutoff preview attaches automation and LoRaWAN evidence", () => {
  const preview = previewWaterProfile({
    water: loadWaterManagement(),
    deviceRegistry: loadDeviceRegistry(),
    automationEngine: loadAutomationEngine(),
    profileId: "profile-cottage-lorawan-shutoff",
    actor: approver,
  });

  assert.equal(preview.status, "approval_required");
  assert.equal(preview.profile.name, "Cottage LoRaWAN Shutoff");
  assert.equal(preview.summary.commandCount, 1);
  assert.equal(preview.commands[0].selectedPath, "lorawan");
  assert.equal(preview.commands[0].trafficClass, "P0_EMERGENCY");
  assert.equal(preview.automation.scenarioId, "scenario-cottage-leak-lorawan");
  assert.ok(preview.nextActions.includes("attach_simulation_evidence"));
});

test("safe reopen remains approval required and cannot apply directly", () => {
  const preview = previewWaterProfile({
    water: loadWaterManagement(),
    deviceRegistry: loadDeviceRegistry(),
    automationEngine: loadAutomationEngine(),
    profileId: "profile-home-safe-reopen",
    actor: approver,
  });
  const applied = applyWaterProfile({
    water: loadWaterManagement(),
    deviceRegistry: loadDeviceRegistry(),
    automationEngine: loadAutomationEngine(),
    profileId: "profile-home-safe-reopen",
    actor: approver,
  });

  assert.equal(preview.status, "approval_required");
  assert.equal(preview.policy.canApply, false);
  assert.equal(preview.commands[0].action, "reopen");
  assert.ok(preview.commands[0].policyReasons.includes("dry_state_and_approval_required"));
  assert.equal(applied.event.action, "water.profile.apply.blocked");
});

test("water intent preview selects remote cottage shutoff", () => {
  const result = previewWaterIntent({
    water: loadWaterManagement(),
    deviceRegistry: loadDeviceRegistry(),
    automationEngine: loadAutomationEngine(),
    intent: "If the cottage leak sensor fires, close the remote valve over LoRaWAN.",
    actor: approver,
  });

  assert.equal(result.match.profileId, "profile-cottage-lorawan-shutoff");
  assert.equal(result.preview.profile.id, "profile-cottage-lorawan-shutoff");
  assert.equal(result.preview.commands[0].selectedPath, "lorawan");
});
