import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const orchestratorPath = resolve(here, "../../../packages/mcp-orchestrator/orchestrator.json");

const ROLE_SCOPES = {
  "Automation.Admin": ["*"],
  "Automation.Operator": [
    "device:read",
    "device:command:propose",
    "automation:rule:compile",
    "policy:evaluate",
    "simulation:run",
    "connectivity:route:evaluate",
    "narrowband:command:encode",
    "module:plan",
    "audit:record",
  ],
  "Automation.AgentApprover": [
    "device:read",
    "device:command:propose",
    "automation:rule:compile",
    "policy:evaluate",
    "simulation:run",
    "connectivity:route:evaluate",
    "narrowband:command:encode",
    "module:plan",
    "module:enable",
    "audit:record",
  ],
  "Automation.Security": [
    "device:read",
    "device:command:propose",
    "policy:evaluate",
    "simulation:run",
    "connectivity:route:evaluate",
    "narrowband:command:encode",
    "audit:record",
  ],
  "Automation.Viewer": ["device:read"],
};

const APPROVER_ROLES = new Set(["Automation.Admin", "Automation.AgentApprover", "Automation.Security"]);

export function loadMcpOrchestrator() {
  return JSON.parse(readFileSync(orchestratorPath, "utf8"));
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function countBy(items, field) {
  return items.reduce((acc, item) => {
    const value = item[field] || "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function actorRoles(actor = {}) {
  return Array.isArray(actor.roles) && actor.roles.length > 0 ? actor.roles : ["Automation.Viewer"];
}

function actorScopes(actor = {}) {
  const scopes = new Set();
  for (const role of actorRoles(actor)) {
    for (const scope of ROLE_SCOPES[role] || []) {
      scopes.add(scope);
    }
  }
  return scopes;
}

function hasAllScopes(requiredScopes = [], scopes) {
  if (scopes.has("*")) return true;
  return requiredScopes.every((scope) => scopes.has(scope));
}

function hasAllowedRole(tool, actor = {}) {
  const allowedRoles = new Set(tool.allowedRoles || []);
  return actorRoles(actor).some((role) => allowedRoles.has(role));
}

function hasApproverRole(actor = {}) {
  return actorRoles(actor).some((role) => APPROVER_ROLES.has(role));
}

function redactInput(input = {}) {
  const redacted = {};
  for (const [key, value] of Object.entries(input)) {
    redacted[key] = /secret|token|password|key/i.test(key) ? "[redacted]" : value;
  }
  return redacted;
}

function toolMap(orchestrator) {
  return new Map((orchestrator.tools || []).map((tool) => [tool.id, tool]));
}

function requestedApproval(approvedTools, toolId, approved) {
  if (approved === true) return true;
  return Array.isArray(approvedTools) && approvedTools.includes(toolId);
}

function inferToolIdsFromIntent(orchestrator, intent = "") {
  const text = String(intent || "").toLowerCase();
  const tools = new Set(["device.search", "policy.evaluate", "audit.record"]);

  if (/leak|water|valve|shutoff|shut off|close/.test(text)) {
    tools.add("automation.rule.compile");
    tools.add("device.command.propose");
    tools.add("simulation.run");
  }
  if (/lorawan|narrowband|remote|cottage|outage|fallback|sd-wan|sdwan|broadband|offline|\bdown\b/.test(text)) {
    tools.add("connectivity.route.evaluate");
    tools.add("narrowband.command.encode");
  }
  if (/module|feature|build|enable|adapter|marketplace|iac|docker/.test(text)) {
    tools.add("module.plan");
  }
  if (/enable|deploy|install/.test(text) && /module|feature|adapter/.test(text)) {
    tools.add("module.enable");
  }

  const registered = toolMap(orchestrator);
  return [...tools].filter((toolId) => registered.has(toolId));
}

export function summarizeMcpOrchestrator(orchestrator = loadMcpOrchestrator()) {
  const tools = orchestrator.tools || [];
  const sessions = orchestrator.sessions || [];
  const toolCalls = orchestrator.toolCalls || [];
  return {
    schemaVersion: orchestrator.schemaVersion,
    toolCount: tools.length,
    enabledTools: tools.filter((tool) => tool.status === "enabled").length,
    agentCount: (orchestrator.agents || []).length,
    sessionCount: sessions.length,
    activeSessions: sessions.filter((session) => session.status !== "completed").length,
    auditEventCount: toolCalls.length,
    highRiskTools: tools.filter((tool) => tool.risk === "high").length,
    approvalRequiredTools: tools.filter((tool) => tool.requiresApproval).length,
    byRisk: countBy(tools, "risk"),
    byAgent: countBy(tools, "agentId"),
    byModule: countBy(tools, "moduleId"),
  };
}

export function filterMcpTools(orchestrator, filters = {}) {
  return (orchestrator.tools || []).filter((tool) => {
    if (filters.status && tool.status !== first(filters.status)) return false;
    if (filters.risk && tool.risk !== first(filters.risk)) return false;
    if (filters.agentId && tool.agentId !== first(filters.agentId)) return false;
    if (filters.moduleId && tool.moduleId !== first(filters.moduleId)) return false;
    if (filters.requiresApproval !== undefined) {
      const required = String(first(filters.requiresApproval)).toLowerCase() === "true";
      if (tool.requiresApproval !== required) return false;
    }
    return true;
  });
}

export function findMcpTool(orchestrator, id) {
  return toolMap(orchestrator).get(id) || null;
}

export function findMcpSession(orchestrator, id) {
  return (orchestrator.sessions || []).find((session) => session.id === id) || null;
}

export function evaluateToolPermission(orchestrator, toolId, actor = {}, options = {}) {
  const tool = findMcpTool(orchestrator, toolId);
  if (!tool) {
    return {
      toolId,
      registered: false,
      status: "denied_unregistered",
      decision: "deny_unregistered",
      canExecute: false,
      reasons: ["tool_not_registered"],
    };
  }

  const scopes = actorScopes(actor);
  const roleAllowed = hasAllowedRole(tool, actor);
  const scopeAllowed = hasAllScopes(tool.scopes || [], scopes);
  const explicitApproval = requestedApproval(options.approvedTools, toolId, options.approved);
  const approvalSatisfied = !tool.requiresApproval || (explicitApproval && hasApproverRole(actor));
  const reasons = [];

  if (tool.status !== "enabled") reasons.push("tool_disabled");
  if (!roleAllowed) reasons.push("role_not_allowed");
  if (!scopeAllowed) reasons.push("scope_missing");
  if (tool.requiresApproval && !explicitApproval) reasons.push("explicit_permission_required");
  if (tool.requiresApproval && explicitApproval && !hasApproverRole(actor)) reasons.push("approver_role_required");

  const canExecute = tool.status === "enabled" && roleAllowed && scopeAllowed && approvalSatisfied;
  const status = canExecute
    ? "ready"
    : reasons.includes("explicit_permission_required") || reasons.includes("approver_role_required")
      ? "requires_permission"
      : "denied";

  return {
    toolId,
    tool,
    registered: true,
    status,
    decision: canExecute ? "allow" : status === "requires_permission" ? "explicit_permission_required" : "deny_role_scope",
    canExecute,
    reasons,
  };
}

function buildToolPlan(toolDecision) {
  const tool = toolDecision.tool;
  return {
    toolId: toolDecision.toolId,
    name: tool?.name || "Unregistered Tool",
    agentId: tool?.agentId || null,
    moduleId: tool?.moduleId || null,
    risk: tool?.risk || "unknown",
    trafficClass: tool?.trafficClass || "P2_CONTROL",
    status: toolDecision.status,
    decision: toolDecision.decision,
    canExecute: toolDecision.canExecute,
    requiresApproval: Boolean(tool?.requiresApproval),
    auditRequired: Boolean(tool?.auditRequired),
    reasons: toolDecision.reasons,
  };
}

export function planMcpSession(orchestrator, request = {}, actor = {}) {
  const requestedToolIds = Array.isArray(request.toolIds) && request.toolIds.length > 0
    ? request.toolIds
    : inferToolIdsFromIntent(orchestrator, request.intent);

  const toolPlans = requestedToolIds.map((toolId) =>
    buildToolPlan(evaluateToolPermission(orchestrator, toolId, actor, {
      approvedTools: request.approvedTools,
      approved: request.approved,
    })),
  );
  const deniedCount = toolPlans.filter((plan) => plan.status === "denied" || plan.status === "denied_unregistered").length;
  const permissionCount = toolPlans.filter((plan) => plan.status === "requires_permission").length;
  const readyCount = toolPlans.filter((plan) => plan.status === "ready").length;
  const sessionStatus = deniedCount > 0 ? "blocked" : permissionCount > 0 ? "needs_permission" : "planned";

  return {
    sessionId: `mcp_${Date.now()}`,
    createdAt: new Date().toISOString(),
    actor: {
      subject: actor.subject || "local-dev-operator",
      name: actor.name || "Local Development Operator",
      roles: actorRoles(actor),
    },
    intent: request.intent || "",
    status: sessionStatus,
    requestedToolCount: requestedToolIds.length,
    readyCount,
    requiresPermissionCount: permissionCount,
    deniedCount,
    toolPlans,
    nextActions: permissionCount > 0
      ? ["attach_explicit_permission", "rerun_session_plan", "record_audit"]
      : deniedCount > 0
        ? ["remove_unregistered_or_unauthorized_tool", "review_role_scope"]
        : ["execute_ready_tools", "record_audit"],
  };
}

function deterministicToolResult(tool, input = {}) {
  if (tool.id === "device.search") {
    return { matches: ["dev-cottage-leak-01", "dev-cottage-valve-01", "dev-cottage-gateway-01"], source: "device-registry" };
  }
  if (tool.id === "device.command.propose") {
    return { proposalStatus: "policy_gated", commandType: input.commandType || "set_state", execution: "not_executed" };
  }
  if (tool.id === "automation.rule.compile") {
    return { compiled: true, ruleState: "draft", requiredGates: ["simulation", "human_approval", "signed_command"] };
  }
  if (tool.id === "policy.evaluate") {
    return { decision: "needs_review", requiredGates: ["simulation", "approval"], policy: "physical-safety-approval" };
  }
  if (tool.id === "simulation.run") {
    return { simulationStatus: "prepared", variants: ["lan", "broadband_outage", "lte-m", "lorawan"] };
  }
  if (tool.id === "connectivity.route.evaluate") {
    return { selectedPath: "lorawan", secondaryPath: "lte-m", blockedClasses: ["P4_BULK"] };
  }
  if (tool.id === "narrowband.command.encode") {
    return { encodedBytes: 46, codec: "semantic-compact-json", ttlSeconds: input.ttlSeconds || 300, ackRequired: true };
  }
  if (tool.id === "module.plan") {
    return { planStatus: "draft", includes: ["service", "dashboard", "policy", "tests", "compose-fragment", "bicep-fragment"] };
  }
  if (tool.id === "module.enable") {
    return { enablementStatus: "queued", execution: "not_mutated", requiresCertification: true };
  }
  return { recorded: true, stream: "agent" };
}

function buildToolAuditEvent(tool, decision, request, actor, status) {
  return {
    id: `mcp-${tool?.id || decision.toolId}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    tenant: "vendorlogic.io",
    siteId: request.siteId || null,
    zoneId: null,
    deviceId: request.deviceId || null,
    moduleId: tool?.moduleId || "mcp-orchestrator",
    stream: "agent",
    severity: tool?.risk === "high" ? "warning" : "info",
    actor: {
      type: "agent",
      id: actor.subject || "local-dev-operator",
      displayName: actor.name || "Local Development Operator",
    },
    action: "mcp.tool.requested",
    summary: `${tool?.name || decision.toolId} ${status.replace(/_/g, " ")} by MCP Orchestrator.`,
    status,
    trafficClass: tool?.trafficClass || "P2_CONTROL",
    auditRequired: true,
    payload: {
      toolId: decision.toolId,
      decision: decision.decision,
      reasons: decision.reasons,
      input: redactInput(request.input || {}),
    },
  };
}

export function executeMcpTool(orchestrator, request = {}, actor = {}) {
  const decision = evaluateToolPermission(orchestrator, request.toolId, actor, {
    approved: request.approved,
    approvedTools: request.approvedTools,
  });
  const tool = decision.tool || null;
  const status = decision.canExecute ? "completed" : decision.status;
  return {
    executionId: `mcp_exec_${Date.now()}`,
    createdAt: new Date().toISOString(),
    toolId: request.toolId,
    status,
    decision: decision.decision,
    canExecute: decision.canExecute,
    reasons: decision.reasons,
    result: decision.canExecute ? deterministicToolResult(tool, request.input || {}) : null,
    event: buildToolAuditEvent(tool, decision, request, actor, status),
  };
}

export function listMcpAudit(orchestrator, filters = {}) {
  const calls = orchestrator.toolCalls || [];
  return calls.filter((call) => {
    if (filters.sessionId && call.sessionId !== first(filters.sessionId)) return false;
    if (filters.toolId && call.toolId !== first(filters.toolId)) return false;
    if (filters.status && call.status !== first(filters.status)) return false;
    return true;
  });
}
