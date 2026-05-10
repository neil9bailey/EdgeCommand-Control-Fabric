import test from "node:test";
import assert from "node:assert/strict";
import { loadAutomationEngine } from "../src/automationEngine.mjs";
import { loadDeviceRegistry } from "../src/deviceRegistry.mjs";
import {
  buildApprovalSimulationEvidence,
  buildSimulationDashboard,
  loadSimulationLab,
  runSimulation,
  summarizeSimulationLab,
} from "../src/simulationLab.mjs";

const operator = {
  subject: "operator-local",
  name: "Local Operator",
  roles: ["Automation.Operator"],
};

function sources() {
  return {
    lab: loadSimulationLab(),
    automationEngine: loadAutomationEngine(),
    deviceRegistry: loadDeviceRegistry(),
    actor: operator,
  };
}

test("simulation lab loads scenarios, links, failure modes, and device groups", () => {
  const lab = loadSimulationLab();
  const summary = summarizeSimulationLab(lab);

  assert.equal(lab.lab.tenant, "vendorlogic.io");
  assert.equal(lab.lab.executionBoundary, "simulation-only");
  assert.equal(summary.schemaVersion, "0.1.0");
  assert.equal(summary.scenarioCount, 3);
  assert.equal(summary.linkCount, 4);
  assert.equal(summary.failureModeCount, 6);
  assert.ok(summary.narrowbandVariantCount >= 3);
});

test("leak shutoff scenario simulates and attaches approval evidence", () => {
  const report = runSimulation({
    ...sources(),
    scenarioId: "sim-home-leak-shutoff",
    variantId: "variant-home-lan",
  });

  assert.equal(report.status, "passed_pending_approval");
  assert.equal(report.summary.variantCount, 1);
  assert.equal(report.summary.approvalAttachmentCount, 1);
  assert.ok(report.approvalAttachments[0].evidence.some((entry) => entry.startsWith("simulation:")));
  assert.ok(report.variants[0].automation.commands.some((command) => command.status === "pending_approval"));
  assert.ok(report.events.some((event) => event.action === "simulation.report.generated"));
});

test("broadband outage uses LoRaWAN with delay and payload constraints", () => {
  const report = runSimulation({
    ...sources(),
    scenarioId: "sim-cottage-broadband-outage",
    variantId: "variant-cottage-payload",
  });

  const route = report.variants[0].routeOutcomes.find((outcome) => outcome.selectedPath === "lorawan");

  assert.equal(report.status, "passed_pending_approval");
  assert.equal(route.payloadFits, true);
  assert.equal(route.encodedBytes, 46);
  assert.equal(route.maxPayloadBytes, 48);
  assert.equal(route.ackFits, true);
  assert.equal(report.summary.approvalAttachmentCount, 1);
});

test("failure injection holds physical actuation safe", () => {
  const report = runSimulation({
    ...sources(),
    scenarioId: "sim-home-leak-shutoff",
    variantId: "variant-home-manual-override",
  });

  assert.equal(report.status, "safe_hold");
  assert.equal(report.summary.safeHoldCount, 1);
  assert.ok(report.variants[0].automation.commands.every((command) => command.status === "blocked"));
  assert.equal(report.variants[0].safetyVerdict, "held_safe");
});

test("simulation dashboard exposes recent reports and approval attachment readiness", () => {
  const dashboard = buildSimulationDashboard(sources());

  assert.equal(dashboard.summary.scenarioCount, 3);
  assert.equal(dashboard.recentReports.length, 3);
  assert.ok(dashboard.recentReports.some((report) => report.approvalAttachmentCount > 0));
  assert.ok(dashboard.scenarios.some((scenario) => scenario.id === "sim-cottage-broadband-outage"));
});

test("approval simulation evidence maps report attachments by command id", () => {
  const evidence = buildApprovalSimulationEvidence(sources());

  assert.equal(evidence.report.status, "passed_pending_approval");
  assert.ok(evidence.byCommandId["rule-cottage-leak-lorawan-valve-cmd-1"].attached);
  assert.equal(evidence.byCommandId["rule-cottage-leak-lorawan-valve-cmd-1"].safetyVerdict, "simulation_passed_attach_to_approval");
});
