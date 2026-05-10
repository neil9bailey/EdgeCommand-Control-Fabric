import test from "node:test";
import assert from "node:assert/strict";
import { loadCatalog } from "../src/catalog.mjs";
import {
  createIntentSession,
  listIntentSeedSessions,
  loadIntentEngine,
  recordIntentDecision,
  summarizeIntentEngine,
} from "../src/intentEngine.mjs";
import { loadMcpOrchestrator } from "../src/mcpOrchestrator.mjs";

const operator = {
  subject: "operator-local",
  name: "Local Operator",
  roles: ["Automation.Operator"],
};

test("intent engine loads deterministic AIP frames and seed sessions", () => {
  const engine = loadIntentEngine();
  const summary = summarizeIntentEngine(engine);
  const seeds = listIntentSeedSessions(engine);

  assert.equal(engine.engine.tenant, "vendorlogic.io");
  assert.equal(engine.engine.rule, "propose-only");
  assert.equal(summary.schemaVersion, "0.1.0");
  assert.equal(summary.frameCount, 6);
  assert.equal(summary.seedSessionCount, 3);
  assert.equal(summary.proposeOnly, true);
  assert.ok(summary.highRiskFrames >= 4);
  assert.equal(seeds.sessions.length, 3);
});

test("AIP proposes leak response and LoRaWAN fallback without execution", () => {
  const session = createIntentSession({
    engine: loadIntentEngine(),
    catalog: loadCatalog(),
    mcpOrchestrator: loadMcpOrchestrator(),
    intent: "Water leak at the remote cottage: close the valve, use LoRaWAN narrowband outage fallback, and record audit evidence.",
    actor: operator,
  });

  assert.equal(session.status, "approval_required");
  assert.equal(session.intent.confidence, "high");
  assert.equal(session.intent.class, "automation_rule");
  assert.equal(session.aip.rule, "propose only");
  assert.ok(session.intent.extractedSignals.narrowbandMentioned);
  assert.ok(session.intent.matchedFrames.some((frame) => frame.id === "water-leak-response"));
  assert.ok(session.intent.matchedFrames.some((frame) => frame.id === "narrowband-fallback"));
  assert.ok(session.aip.proposals.length >= 3);
  assert.ok(session.aip.proposals.every((proposal) => proposal.canExecute === false));
  assert.ok(session.aip.proposals.some((proposal) => proposal.requiredTools.includes("narrowband.command.encode")));
  assert.ok(session.mcp.toolPlans.some((tool) => tool.toolId === "narrowband.command.encode" && tool.status === "requires_permission"));
  assert.ok(session.mcp.requiresPermissionCount >= 3);
  assert.equal(session.kra.required_review, true);
  assert.ok(session.nextActions.includes("attach_explicit_permission"));
});

test("AIP creates module enablement plans through MCP without mutating infrastructure", () => {
  const session = createIntentSession({
    engine: loadIntentEngine(),
    catalog: loadCatalog(),
    mcpOrchestrator: loadMcpOrchestrator(),
    intent: "Build and enable an MQTT ESPHome adapter module with Docker IaC and certification gates.",
    actor: operator,
  });

  assert.equal(session.intent.class, "module_plan");
  assert.ok(session.intent.extractedSignals.targetModules.includes("module-marketplace"));
  assert.ok(session.aip.proposals.some((proposal) => proposal.type === "module_plan"));
  assert.ok(session.aip.proposals.some((proposal) => proposal.type === "module_enablement"));
  assert.ok(session.mcp.toolPlans.some((tool) => tool.toolId === "module.plan"));
  assert.ok(session.mcp.toolPlans.some((tool) => tool.toolId === "module.enable"));
  assert.ok(session.aip.proposals.every((proposal) => proposal.executionRule.includes("proposes only")));
});

test("AIP proposes lighting scene plans through MCP without direct fixture mutation", () => {
  const session = createIntentSession({
    engine: loadIntentEngine(),
    catalog: loadCatalog(),
    mcpOrchestrator: loadMcpOrchestrator(),
    intent: "Set a warm evening lighting scene and dim the hall lights.",
    actor: operator,
  });

  assert.equal(session.intent.class, "scene_control");
  assert.ok(session.intent.extractedSignals.targetModules.includes("lighting-scenes"));
  assert.ok(session.aip.proposals.some((proposal) => proposal.type === "scene_preview"));
  assert.ok(session.aip.proposals.some((proposal) => proposal.type === "scene_apply"));
  assert.ok(session.mcp.toolPlans.some((tool) => tool.toolId === "lighting.scene.preview" && tool.status === "ready"));
  assert.ok(session.mcp.toolPlans.some((tool) => tool.toolId === "lighting.scene.apply" && tool.status === "ready"));
  assert.ok(session.aip.proposals.every((proposal) => proposal.canExecute === false));
});

test("intent decision records accept, modify, and reject outcomes", () => {
  const accepted = recordIntentDecision({
    sessionId: "intent_test",
    proposalId: "proposal_1",
    decision: "accept",
    actor: operator,
  });
  const modified = recordIntentDecision({
    sessionId: "intent_test",
    proposalId: "proposal_1",
    decision: "modify",
    note: "Add SMS notification before approval.",
    actor: operator,
  });
  const rejected = recordIntentDecision({
    sessionId: "intent_test",
    proposalId: "proposal_1",
    decision: "reject",
    actor: operator,
  });

  assert.equal(accepted.state, "accepted_for_simulation");
  assert.equal(modified.state, "modification_requested");
  assert.equal(rejected.state, "rejected");
  assert.equal(accepted.event.stream, "agent");
  assert.equal(accepted.event.auditRequired, true);
  assert.ok(accepted.nextActions.includes("run_simulation"));
  assert.ok(modified.nextActions.includes("rerun_intent_parser"));
  assert.ok(rejected.nextActions.includes("archive_proposal"));
});
