import test from "node:test";
import assert from "node:assert/strict";
import {
  executeMcpTool,
  filterMcpTools,
  findMcpTool,
  listMcpAudit,
  loadMcpOrchestrator,
  planMcpSession,
  summarizeMcpOrchestrator,
} from "../src/mcpOrchestrator.mjs";

const operator = {
  subject: "operator-local",
  name: "Local Operator",
  roles: ["Automation.Operator"],
};

const approver = {
  subject: "approver-local",
  name: "Local Approver",
  roles: ["Automation.AgentApprover"],
};

test("MCP orchestrator loads registered tools, agents, sessions, and audit", () => {
  const orchestrator = loadMcpOrchestrator();
  const summary = summarizeMcpOrchestrator(orchestrator);

  assert.equal(orchestrator.orchestrator.tenant, "vendorlogic.io");
  assert.equal(summary.schemaVersion, "0.1.0");
  assert.equal(summary.toolCount, 18);
  assert.equal(summary.enabledTools, 18);
  assert.equal(summary.agentCount, 5);
  assert.equal(summary.approvalRequiredTools, 6);
  assert.equal(summary.highRiskTools, 8);
  assert.equal(summary.byModule["lighting-scenes"], 2);
  assert.equal(summary.byModule["climate-hvac"], 2);
  assert.equal(summary.byModule["security-access"], 2);
  assert.equal(summary.byModule["water-management"], 2);
  assert.equal(summary.byModule["mcp-orchestrator"], undefined);
});

test("MCP tool filtering and lookup use registered manifests only", () => {
  const orchestrator = loadMcpOrchestrator();
  const highRiskTools = filterMcpTools(orchestrator, { risk: "high" });

  assert.equal(highRiskTools.length, 8);
  assert.equal(findMcpTool(orchestrator, "device.search").risk, "low");
  assert.equal(findMcpTool(orchestrator, "unknown.tool"), null);
});

test("MCP session planning infers leak response tools and gates high-risk tools", () => {
  const orchestrator = loadMcpOrchestrator();
  const plan = planMcpSession(orchestrator, {
    intent: "If the cottage leak sensor fires, close the valve over LoRaWAN and record audit evidence.",
  }, operator);

  assert.equal(plan.status, "needs_permission");
  assert.ok(plan.toolPlans.some((tool) => tool.toolId === "narrowband.command.encode"));
  assert.ok(plan.toolPlans.some((tool) => tool.toolId === "water.profile.preview"));
  assert.ok(plan.toolPlans.some((tool) => tool.toolId === "water.valve.propose" && tool.status === "requires_permission"));
  assert.ok(plan.toolPlans.some((tool) => tool.toolId === "simulation.run" && tool.status === "ready"));
  assert.ok(plan.toolPlans.some((tool) => tool.toolId === "automation.rule.compile" && tool.status === "requires_permission"));
  assert.ok(plan.requiresPermissionCount >= 3);
});

test("MCP session planning denies unregistered tools", () => {
  const orchestrator = loadMcpOrchestrator();
  const plan = planMcpSession(orchestrator, {
    intent: "Run a mystery tool",
    toolIds: ["device.search", "external.shell.delete"],
  }, operator);

  assert.equal(plan.status, "blocked");
  assert.equal(plan.deniedCount, 1);
  assert.ok(plan.toolPlans.some((tool) => tool.toolId === "external.shell.delete" && tool.status === "denied_unregistered"));
});

test("MCP session planning supports low-risk lighting scene tools", () => {
  const orchestrator = loadMcpOrchestrator();
  const plan = planMcpSession(orchestrator, {
    intent: "Set a warm evening lighting scene and dim the hall lights.",
  }, operator);

  assert.equal(plan.status, "planned");
  assert.ok(plan.toolPlans.some((tool) => tool.toolId === "lighting.scene.preview" && tool.status === "ready"));
  assert.ok(plan.toolPlans.some((tool) => tool.toolId === "lighting.scene.apply" && tool.status === "ready"));
  assert.equal(plan.requiresPermissionCount, 0);
});

test("MCP execution simulates lighting scene apply", () => {
  const orchestrator = loadMcpOrchestrator();
  const result = executeMcpTool(orchestrator, {
    toolId: "lighting.scene.apply",
    input: { sceneId: "scene-evening-wind-down" },
  }, operator);

  assert.equal(result.status, "completed");
  assert.equal(result.canExecute, true);
  assert.equal(result.result.applyStatus, "simulated");
  assert.equal(result.event.moduleId, "lighting-scenes");
});

test("MCP session planning supports medium-risk climate comfort tools", () => {
  const orchestrator = loadMcpOrchestrator();
  const plan = planMcpSession(orchestrator, {
    intent: "Make the house warm with a climate comfort profile.",
  }, operator);

  assert.equal(plan.status, "planned");
  assert.ok(plan.toolPlans.some((tool) => tool.toolId === "climate.profile.preview" && tool.status === "ready"));
  assert.ok(plan.toolPlans.some((tool) => tool.toolId === "climate.setpoint.apply" && tool.status === "ready"));
  assert.equal(plan.requiresPermissionCount, 0);
});

test("MCP execution simulates climate setpoint apply", () => {
  const orchestrator = loadMcpOrchestrator();
  const result = executeMcpTool(orchestrator, {
    toolId: "climate.setpoint.apply",
    input: { zoneId: "climate-zone-hall", setpointC: 20 },
  }, operator);

  assert.equal(result.status, "completed");
  assert.equal(result.canExecute, true);
  assert.equal(result.result.applyStatus, "simulated");
  assert.equal(result.event.moduleId, "climate-hvac");
});

test("MCP session planning gates high-risk security command proposals", () => {
  const orchestrator = loadMcpOrchestrator();
  const plan = planMcpSession(orchestrator, {
    intent: "Secure the house for night, lock the front door, arm the alarm, and check the remote gate.",
  }, operator);

  assert.equal(plan.status, "needs_permission");
  assert.ok(plan.toolPlans.some((tool) => tool.toolId === "security.profile.preview" && tool.status === "ready"));
  assert.ok(plan.toolPlans.some((tool) => tool.toolId === "security.command.propose" && tool.status === "requires_permission"));
});

test("MCP execution simulates security profile preview", () => {
  const orchestrator = loadMcpOrchestrator();
  const result = executeMcpTool(orchestrator, {
    toolId: "security.profile.preview",
    input: { profileId: "profile-night-secure" },
  }, operator);

  assert.equal(result.status, "completed");
  assert.equal(result.canExecute, true);
  assert.equal(result.result.profileId, "profile-night-secure");
  assert.equal(result.event.moduleId, "security-access");
});

test("MCP execution simulates water profile preview", () => {
  const orchestrator = loadMcpOrchestrator();
  const result = executeMcpTool(orchestrator, {
    toolId: "water.profile.preview",
    input: { profileId: "profile-cottage-lorawan-shutoff" },
  }, operator);

  assert.equal(result.status, "completed");
  assert.equal(result.canExecute, true);
  assert.equal(result.result.profileId, "profile-cottage-lorawan-shutoff");
  assert.equal(result.event.moduleId, "water-management");
});

test("MCP execution requires explicit permission for high-risk tools", () => {
  const orchestrator = loadMcpOrchestrator();
  const result = executeMcpTool(orchestrator, {
    toolId: "narrowband.command.encode",
    input: { command: "close valve", ttlSeconds: 300 },
  }, operator);

  assert.equal(result.status, "requires_permission");
  assert.equal(result.canExecute, false);
  assert.equal(result.result, null);
  assert.ok(result.reasons.includes("explicit_permission_required"));
  assert.equal(result.event.stream, "agent");
});

test("MCP execution allows explicitly approved high-risk tools for approver roles", () => {
  const orchestrator = loadMcpOrchestrator();
  const result = executeMcpTool(orchestrator, {
    toolId: "narrowband.command.encode",
    approved: true,
    input: { command: "close valve", ttlSeconds: 120 },
  }, approver);

  assert.equal(result.status, "completed");
  assert.equal(result.canExecute, true);
  assert.equal(result.result.encodedBytes, 46);
  assert.equal(result.result.ttlSeconds, 120);
  assert.equal(result.event.status, "completed");
});

test("MCP audit list exposes seed tool calls", () => {
  const orchestrator = loadMcpOrchestrator();
  const audit = listMcpAudit(orchestrator, { sessionId: "mcp-session-leak-response" });

  assert.equal(audit.length, 2);
  assert.ok(audit.some((call) => call.status === "requires_permission"));
});
