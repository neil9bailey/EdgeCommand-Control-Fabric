import test from "node:test";
import assert from "node:assert/strict";
import { loadDeviceRegistry } from "../src/deviceRegistry.mjs";
import {
  evaluateAutomation,
  findScenario,
  loadAutomationEngine,
  summarizeAutomationEngine,
} from "../src/automationEngine.mjs";

test("automation engine loads rules, policies, scenes, and scenarios", () => {
  const engine = loadAutomationEngine();
  const summary = summarizeAutomationEngine(engine);

  assert.equal(summary.schemaVersion, "0.1.0");
  assert.equal(summary.ruleCount, 4);
  assert.equal(summary.armedRules, 4);
  assert.equal(summary.policyCount, 4);
  assert.equal(summary.sceneCount, 3);
  assert.equal(summary.scenarioCount, 3);
  assert.equal(summary.approvalRequired, 3);
  assert.equal(summary.p0Rules, 2);
  assert.equal(summary.byModule["water-management"], 2);
});

test("home leak drill creates approval-gated valve command and audit evidence", () => {
  const engine = loadAutomationEngine();
  const registry = loadDeviceRegistry();
  const scenario = findScenario(engine, "scenario-home-leak");

  const result = evaluateAutomation(engine, registry, scenario, {
    subject: "test-operator",
    name: "Test Operator",
    roles: ["Automation.Operator"],
  });

  assert.equal(result.matchedRuleCount, 1);
  assert.equal(result.commandCount, 2);
  assert.ok(result.pendingApprovalCount >= 1);
  assert.ok(result.events.some((event) => event.stream === "policy"));
  assert.ok(result.events.some((event) => event.stream === "command"));

  const valveCommand = result.commands.find((command) => command.deviceId === "dev-water-valve-main-01");
  assert.equal(valveCommand.status, "pending_approval");
  assert.equal(valveCommand.canExecute, false);
  assert.equal(valveCommand.trafficClass, "P0_EMERGENCY");
  assert.ok(valveCommand.policyReasons.includes("approval_required"));
  assert.ok(valveCommand.policyReasons.includes("simulation_required"));
});

test("approved and simulated high-risk command becomes ready to execute", () => {
  const engine = loadAutomationEngine();
  const registry = loadDeviceRegistry();
  const scenario = {
    ...findScenario(engine, "scenario-home-leak"),
    approved: true,
    simulated: true,
  };

  const result = evaluateAutomation(engine, registry, scenario);
  const valveCommand = result.commands.find((command) => command.deviceId === "dev-water-valve-main-01");

  assert.equal(valveCommand.status, "ready_to_execute");
  assert.equal(valveCommand.canExecute, true);
  assert.equal(valveCommand.signedCommandRequired, true);
});

test("manual override blocks physical actuation", () => {
  const engine = loadAutomationEngine();
  const registry = loadDeviceRegistry();
  const valve = registry.devices.find((device) => device.id === "dev-water-valve-main-01");
  valve.observedState.manualOverride = true;

  const result = evaluateAutomation(engine, registry, {
    ...findScenario(engine, "scenario-home-leak"),
    approved: true,
    simulated: true,
  });
  const valveCommand = result.commands.find((command) => command.deviceId === "dev-water-valve-main-01");

  assert.equal(valveCommand.status, "blocked");
  assert.equal(valveCommand.canExecute, false);
  assert.ok(valveCommand.policyReasons.includes("conditions_failed"));
  assert.ok(valveCommand.policyReasons.includes("manual_override"));
});

test("remote cottage drill chooses LoRaWAN for compact P0 command", () => {
  const engine = loadAutomationEngine();
  const registry = loadDeviceRegistry();
  const result = evaluateAutomation(engine, registry, findScenario(engine, "scenario-cottage-leak-lorawan"));
  const command = result.commands.find((item) => item.deviceId === "dev-cottage-valve-01");

  assert.equal(command.selectedPath, "lorawan");
  assert.equal(command.encodedBytes, 46);
  assert.equal(command.ackRequired, true);
  assert.equal(command.status, "pending_approval");
});

test("EV reserve drill is policy-held without approval queue", () => {
  const engine = loadAutomationEngine();
  const registry = loadDeviceRegistry();
  const result = evaluateAutomation(engine, registry, findScenario(engine, "scenario-ev-reserve"));
  const command = result.commands.find((item) => item.deviceId === "dev-ev-charger-01");

  assert.equal(result.pendingApprovalCount, 0);
  assert.equal(command.status, "ready_to_execute");
  assert.equal(command.policyDecision, "allow");
  assert.equal(command.simulationRequired, true);
});
