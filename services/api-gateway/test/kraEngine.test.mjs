import test from "node:test";
import assert from "node:assert/strict";
import { loadAutomationEngine } from "../src/automationEngine.mjs";
import { loadCatalog } from "../src/catalog.mjs";
import { loadDeviceRegistry } from "../src/deviceRegistry.mjs";
import { loadEventLedger } from "../src/eventLedger.mjs";
import { createIntentSession, loadIntentEngine } from "../src/intentEngine.mjs";
import {
  buildKraDashboard,
  evaluateKraContext,
  loadKraEngine,
  summarizeKraEngine,
} from "../src/kraEngine.mjs";
import { loadMcpOrchestrator } from "../src/mcpOrchestrator.mjs";

const operator = {
  subject: "operator-local",
  name: "Local Operator",
  roles: ["Automation.Operator"],
};

function sources() {
  return {
    engine: loadKraEngine(),
    catalog: loadCatalog(),
    deviceRegistry: loadDeviceRegistry(),
    automationEngine: loadAutomationEngine(),
    eventLedger: loadEventLedger(),
    mcpOrchestrator: loadMcpOrchestrator(),
  };
}

test("KRA engine loads critique-only source registry and rule packs", () => {
  const engine = loadKraEngine();
  const summary = summarizeKraEngine(engine);

  assert.equal(engine.engine.tenant, "vendorlogic.io");
  assert.equal(engine.engine.rule, "critique-only");
  assert.equal(summary.schemaVersion, "0.1.0");
  assert.equal(summary.sourceCount, 6);
  assert.equal(summary.rulePackCount, 6);
  assert.equal(summary.blockingRulePacks, 1);
  assert.equal(summary.critiqueOnly, true);
});

test("KRA grounds leak and narrowband AIP proposals against policies, tools, audit, and armed rules", () => {
  const context = sources();
  const session = createIntentSession({
    engine: loadIntentEngine(),
    kraEngine: context.engine,
    catalog: context.catalog,
    deviceRegistry: context.deviceRegistry,
    automationEngine: context.automationEngine,
    eventLedger: context.eventLedger,
    mcpOrchestrator: context.mcpOrchestrator,
    intent: "Water leak at the remote cottage: close the valve, use LoRaWAN narrowband outage fallback, and record audit evidence.",
    actor: operator,
  });

  assert.equal(session.kra.role, "Knowledge And Risk Agent");
  assert.equal(session.kra.status, "needs_review");
  assert.equal(session.kra.summary.proposalCount, 3);
  assert.ok(session.kra.summary.findingCount >= 5);
  assert.ok(session.kra.summary.narrowbandFindingCount >= 1);
  assert.ok(session.kra.findings.some((finding) => finding.category === "physical_safety"));
  assert.ok(session.kra.findings.some((finding) => finding.category === "connectivity"));
  assert.ok(session.kra.findings.some((finding) => finding.category === "automation_conflict"));
  assert.ok(session.kra.evidencePointers.some((pointer) => pointer.id === "policy:physical-safety-approval"));
  assert.ok(session.kra.evidencePointers.some((pointer) => pointer.id === "mcp:narrowband.command.encode"));
  assert.ok(session.kra.nextActions.includes("run_simulation"));
  assert.equal(session.kraEvaluation.event.stream, "policy");
});

test("KRA blocks proposals that claim direct execution", () => {
  const context = sources();
  const evaluation = evaluateKraContext({
    ...context,
    proposals: [{
      proposalId: "proposal_direct_unlock",
      title: "Direct remote unlock",
      type: "security_check",
      moduleId: "security-access",
      risk: "high",
      requiredCapabilities: ["lock"],
      requiredPolicies: ["physical-safety-approval"],
      requiredGates: ["human_approval"],
      requiredTools: ["device.command.propose"],
      canExecute: true,
    }],
    actor: operator,
  });

  assert.equal(evaluation.status, "conflict");
  assert.equal(evaluation.summary.blockerCount, 1);
  assert.ok(evaluation.findings.some((finding) => finding.rulePackId === "aip-execution-boundary"));
  assert.equal(evaluation.proposalReviews[0].status, "conflict");
  assert.equal(evaluation.proposalReviews[0].blockerCount, 1);
  assert.ok(evaluation.nextActions.includes("block_proposal"));
  assert.equal(evaluation.event.severity, "critical");
});

test("KRA correlates external proposal ids with direct-execution blockers", () => {
  const context = sources();
  const evaluation = evaluateKraContext({
    ...context,
    proposals: [{
      id: "external-direct-unlock",
      title: "External direct unlock",
      type: "security_check",
      moduleId: "security-access",
      risk: "high",
      requiredCapabilities: ["lock"],
      requiredGates: ["human_approval"],
      requiredTools: ["device.command.propose"],
      canExecute: true,
    }],
    actor: operator,
  });

  assert.equal(evaluation.status, "conflict");
  assert.equal(evaluation.findings[0].proposalId, "external-direct-unlock");
  assert.equal(evaluation.proposalReviews[0].decision, "block");
  assert.equal(evaluation.proposalReviews[0].blockerCount, 1);
});

test("KRA module enablement review requires build governance evidence", () => {
  const context = sources();
  const evaluation = evaluateKraContext({
    ...context,
    proposals: [{
      proposalId: "proposal_module",
      title: "Enable MQTT ESPHome adapter",
      type: "module_enablement",
      moduleId: "module-marketplace",
      risk: "high",
      requiredCapabilities: ["feature_module", "dependency", "certification"],
      requiredPolicies: ["module-certification-required"],
      requiredGates: ["human_approval", "certification", "test_pass"],
      requiredTools: ["module.enable", "policy.evaluate", "audit.record"],
      canExecute: false,
    }],
    actor: operator,
  });

  assert.equal(evaluation.status, "needs_review");
  assert.ok(evaluation.findings.some((finding) => finding.category === "module_governance"));
  assert.ok(evaluation.nextActions.includes("attach_dependency_check"));
});

test("KRA dashboard exposes source health and recent evidence", () => {
  const context = sources();
  const dashboard = buildKraDashboard(context);

  assert.equal(dashboard.engine.id, "edgecommand-kra-engine");
  assert.equal(dashboard.posture.executionBoundary, "no_agent_direct_execution");
  assert.equal(dashboard.summary.sourceCount, 6);
  assert.ok(dashboard.summary.policyCount >= 4);
  assert.ok(dashboard.summary.highRiskDevices >= 4);
  assert.ok(dashboard.recentEvidence.length > 0);
});
