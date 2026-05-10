import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { planMcpSession } from "./mcpOrchestrator.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const intentEnginePath = resolve(here, "../../../packages/intent-engine/intent-engine.json");

export function loadIntentEngine() {
  return JSON.parse(readFileSync(intentEnginePath, "utf8"));
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((token) => token.length > 1);
}

function titleFromId(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function confidenceLabel(engine, score) {
  const bands = [...(engine.confidenceBands || [])].sort((a, b) => b.minimum - a.minimum);
  return bands.find((band) => score >= band.minimum)?.label || "low";
}

function findModule(catalog, id) {
  return (catalog.modules || []).find((module) => module.id === id);
}

function keywordScore(tokens, keywords = []) {
  const keywordSet = new Set(keywords.map((keyword) => keyword.toLowerCase()));
  return tokens.reduce((score, token) => score + (keywordSet.has(token) ? 1 : 0), 0);
}

function moduleScore(tokens, module) {
  const haystack = [
    module.id,
    module.name,
    module.category,
    module.description,
    ...(module.capabilities || []),
    ...(module.services || []),
    ...(module.adapters || []),
    ...(module.policies || []),
  ].join(" ").toLowerCase();
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

function riskRank(risk) {
  if (risk === "high") return 3;
  if (risk === "medium") return 2;
  return 1;
}

function highestRisk(values = []) {
  return values.reduce((current, risk) => (riskRank(risk) > riskRank(current) ? risk : current), "low");
}

function frameMatches(engine, intent) {
  const tokens = tokenize(intent);
  const matches = (engine.frames || [])
    .map((frame) => {
      const score = keywordScore(tokens, frame.keywords);
      return {
        frame,
        score,
        confidenceScore: Math.min(0.96, score / Math.max(3, frame.keywords.length * 0.55)),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.confidenceScore - a.confidenceScore);

  return {
    tokens,
    matches,
  };
}

function fallbackFrame(engine) {
  return {
    ...(engine.frames || [])[0],
    id: "general-automation",
    name: "General Automation Request",
    intentClass: "automation_plan",
  };
}

function prioritizeIntentFrames(frames) {
  const automationFrame = frames.find((frame) => frame.intentClass === "automation_rule");
  if (!automationFrame) return frames;
  return [automationFrame, ...frames.filter((frame) => frame.id !== automationFrame.id)];
}

function selectModules(catalog, frames, tokens) {
  const fromFrames = frames.flatMap((frame) => frame.targetModules || []);
  const fromCatalog = (catalog.modules || [])
    .map((module) => ({ module, score: moduleScore(tokens, module) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.module.id);
  return [...new Set([...fromFrames, ...fromCatalog])]
    .map((id) => findModule(catalog, id))
    .filter(Boolean)
    .slice(0, 8);
}

function buildExtractedSignals(frames, modules, tokens) {
  const frameSignals = frames.flatMap((frame) => frame.siteHints || []);
  const siteHints = [...new Set(tokens.filter((token) => frameSignals.includes(token)))];
  const capabilities = [...new Set(frames.flatMap((frame) => frame.targetCapabilities || []))];
  return {
    siteHints,
    targetModules: modules.map((module) => module.id),
    capabilities,
    urgency: tokens.some((token) => ["emergency", "urgent", "critical", "leak", "alarm"].includes(token)) ? "high" : "normal",
    narrowbandMentioned: tokens.some((token) => ["lorawan", "narrowband", "remote", "cottage", "outage", "fallback", "broadband", "down", "offline"].includes(token)),
  };
}

function proposalStatus(template, risk, mcpPlan) {
  if (risk === "high" && template.status === "ready_for_simulation") return "approval_required";
  if (mcpPlan.requiresPermissionCount > 0 && template.risk === "high") return "approval_required";
  return template.status || "needs_review";
}

function buildProposal(template, frame, module, index, sessionStatus, mcpPlan) {
  const risk = highestRisk([template.risk, module?.risk || "low"]);
  return {
    proposal_id: `proposal_${index + 1}`,
    proposalId: `proposal_${index + 1}`,
    type: template.type,
    title: template.title,
    module_id: module?.id || frame.targetModules?.[0] || "automation-engine",
    moduleId: module?.id || frame.targetModules?.[0] || "automation-engine",
    target_dashboard: module?.dashboards?.[0] || "Global Command Centre",
    targetDashboard: module?.dashboards?.[0] || "Global Command Centre",
    risk,
    confidence: sessionStatus.confidenceLabel,
    confidenceScore: sessionStatus.confidenceScore,
    status: proposalStatus(template, risk, mcpPlan),
    expected_impact: template.impact,
    expectedImpact: template.impact,
    rollbackPath: template.rollbackPath,
    required_services: module?.services || [],
    requiredServices: module?.services || [],
    required_capabilities: [...new Set([...(template.requiredCapabilities || []), ...(module?.capabilities || [])])],
    requiredCapabilities: [...new Set([...(template.requiredCapabilities || []), ...(module?.capabilities || [])])],
    requiredPolicies: module?.policies || [],
    requiredGates: template.requiredGates || [],
    requiredTools: template.requiredTools || [],
    canExecute: false,
    executionRule: "AIP proposes only; execution requires policy, simulation, approval, and a separate command path.",
  };
}

function buildProposals(frames, modules, sessionStatus, mcpPlan) {
  const templates = frames.flatMap((frame) =>
    (frame.proposalTemplates || []).map((template) => ({ frame, template })),
  );
  const proposalSources = templates.length > 0
    ? templates
    : [{
        frame: frames[0],
        template: {
          type: "automation_plan",
          title: "Governed automation proposal",
          status: "needs_review",
          risk: "medium",
          requiredGates: ["kra_review", "simulation"],
          requiredTools: ["policy.evaluate", "audit.record"],
          impact: "Prepare a governed automation plan without execution.",
          rollbackPath: "No system state changes are made by AIP.",
        },
      }];

  return proposalSources.map(({ frame, template }, index) => {
    const module = modules.find((item) => (frame.targetModules || []).includes(item.id)) || modules[index % Math.max(1, modules.length)];
    return buildProposal(template, frame, module, index, sessionStatus, mcpPlan);
  });
}

function buildKraContext(frames, proposals, mcpPlan, signals) {
  const highRisk = proposals.some((proposal) => proposal.risk === "high");
  const permissionRequired = mcpPlan.requiresPermissionCount > 0;
  return {
    role: "Knowledge And Risk Agent",
    rule: "critique only",
    status: highRisk || permissionRequired ? "needs_review" : "ok",
    grounding_pointers: proposals.flatMap((proposal) =>
      (proposal.requiredPolicies || []).map((policy) => `${proposal.moduleId}:${policy}`),
    ),
    critique: highRisk
      ? "One or more proposals affect physical safety, remote command routing, or module enablement. Require simulation, policy review, and explicit approval before execution."
      : "No high-risk actuation detected in the proposal set. Keep AIP in propose-only mode.",
    narrowband_note: signals.narrowbandMentioned
      ? "Constrained links may carry compact signed commands and telemetry deltas only; payload, TTL, ack, and audit evidence are mandatory."
      : "No constrained-link dependency detected.",
    risk_register: [...new Set(proposals.map((proposal) => proposal.risk))],
    required_review: highRisk || permissionRequired,
    frames: frames.map((frame) => frame.id),
  };
}

function sessionStatusFrom(proposals, confidence, mcpPlan) {
  if (proposals.some((proposal) => proposal.status === "approval_required") || mcpPlan.requiresPermissionCount > 0) return "approval_required";
  if (confidence === "low") return "needs_clarification";
  if (proposals.some((proposal) => proposal.status === "ready_for_simulation")) return "ready_for_simulation";
  return "needs_review";
}

function nextActions(status) {
  if (status === "approval_required") return ["review_kra_critique", "run_simulation", "attach_explicit_permission", "approve_or_modify"];
  if (status === "ready_for_simulation") return ["run_simulation", "review_policy", "approve_or_modify"];
  if (status === "needs_clarification") return ["clarify_intent", "rerun_parser"];
  return ["review_policy", "modify_or_accept", "record_audit"];
}

export function summarizeIntentEngine(engine = loadIntentEngine()) {
  return {
    schemaVersion: engine.schemaVersion,
    frameCount: (engine.frames || []).length,
    seedSessionCount: (engine.seedSessions || []).length,
    proposalStateCount: (engine.proposalStates || []).length,
    highRiskFrames: (engine.frames || []).filter((frame) =>
      (frame.proposalTemplates || []).some((template) => template.risk === "high"),
    ).length,
    proposeOnly: engine.engine?.rule === "propose-only",
  };
}

export function createIntentSession({ engine = loadIntentEngine(), catalog, mcpOrchestrator, intent, actor = {} }) {
  const parsed = frameMatches(engine, intent);
  const rawFrames = parsed.matches.length > 0
    ? parsed.matches.slice(0, 3).map((item) => item.frame)
    : [fallbackFrame(engine)];
  const matchedFrames = prioritizeIntentFrames(rawFrames);
  const confidenceScore = parsed.matches.length > 0
    ? Math.min(0.98, parsed.matches.reduce((sum, item) => sum + item.confidenceScore, 0) / Math.min(2, parsed.matches.length))
    : 0.28;
  const confidence = confidenceLabel(engine, confidenceScore);
  const modules = selectModules(catalog, matchedFrames, parsed.tokens);
  const signals = buildExtractedSignals(matchedFrames, modules, parsed.tokens);
  const mcpPlan = planMcpSession(mcpOrchestrator, { intent }, actor);
  const sessionConfidence = { confidenceLabel: confidence, confidenceScore: Number(confidenceScore.toFixed(2)) };
  const proposals = buildProposals(matchedFrames, modules, sessionConfidence, mcpPlan);
  const status = sessionStatusFrom(proposals, confidence, mcpPlan);
  const intentClass = matchedFrames[0]?.intentClass || "automation_plan";

  const timestamp = new Date().toISOString();
  const sessionId = `intent_${Date.now()}`;

  return {
    session_id: sessionId,
    sessionId,
    created_at: timestamp,
    createdAt: timestamp,
    input: String(intent || ""),
    status,
    intent: {
      class: intentClass,
      summary: matchedFrames.map((frame) => frame.name).join(" + "),
      confidence,
      confidenceScore: sessionConfidence.confidenceScore,
      extractedSignals: signals,
      matchedFrames: matchedFrames.map((frame) => ({
        id: frame.id,
        name: frame.name,
        intentClass: frame.intentClass,
      })),
    },
    aip: {
      role: "Automation Intent Partner",
      rule: "propose only",
      status,
      proposals,
    },
    kra: buildKraContext(matchedFrames, proposals, mcpPlan, signals),
    mcp: {
      sessionId: mcpPlan.sessionId,
      status: mcpPlan.status,
      requestedToolCount: mcpPlan.requestedToolCount,
      readyCount: mcpPlan.readyCount,
      requiresPermissionCount: mcpPlan.requiresPermissionCount,
      deniedCount: mcpPlan.deniedCount,
      toolPlans: mcpPlan.toolPlans,
      nextActions: mcpPlan.nextActions,
    },
    next_actions: nextActions(status),
    nextActions: nextActions(status),
    actor: {
      subject: actor.subject,
      name: actor.name,
      roles: actor.roles || [],
    },
  };
}

export function listIntentSeedSessions(engine = loadIntentEngine()) {
  return {
    sessions: engine.seedSessions || [],
    summary: summarizeIntentEngine(engine),
  };
}

export function recordIntentDecision({ sessionId, proposalId, decision, note, actor = {} }) {
  const normalized = String(decision || "").toLowerCase();
  const stateByDecision = {
    accept: "accepted_for_simulation",
    modify: "modification_requested",
    reject: "rejected",
  };
  const state = stateByDecision[normalized] || "modification_requested";
  const next = normalized === "accept"
    ? ["run_simulation", "request_kra_review", "prepare_approval_packet"]
    : normalized === "reject"
      ? ["record_rejection", "archive_proposal"]
      : ["capture_changes", "rerun_intent_parser", "refresh_mcp_tool_plan"];

  return {
    decisionId: `intent_decision_${Date.now()}`,
    sessionId,
    proposalId,
    decision: normalized || "modify",
    state,
    note: note || "",
    actor: {
      subject: actor.subject || "local-dev-operator",
      name: actor.name || "Local Development Operator",
      roles: actor.roles || [],
    },
    nextActions: next,
    event: {
      id: `intent-${proposalId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      tenant: "vendorlogic.io",
      siteId: null,
      zoneId: null,
      deviceId: null,
      moduleId: "intent-automation-builder",
      stream: "agent",
      severity: normalized === "reject" ? "info" : "warning",
      actor: { type: "human", id: actor.subject || "local-dev-operator", displayName: actor.name || "Local Development Operator" },
      action: "intent.proposal.decision",
      summary: `${titleFromId(normalized || "modify")} recorded for ${proposalId}.`,
      status: state,
      trafficClass: "P2_CONTROL",
      auditRequired: true,
      payload: { sessionId, proposalId, decision: normalized || "modify", note: note || "" },
    },
  };
}
