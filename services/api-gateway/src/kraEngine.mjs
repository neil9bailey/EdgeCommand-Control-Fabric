import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const kraEnginePath = resolve(here, "../../../packages/kra-engine/kra-engine.json");

const STATUS_RANK = {
  ok: 0,
  needs_review: 1,
  missing_context: 2,
  conflict: 3,
  blocked: 4,
};

const SEVERITY_RANK = {
  info: 0,
  warning: 1,
  high: 2,
  critical: 3,
};

export function loadKraEngine() {
  return JSON.parse(readFileSync(kraEnginePath, "utf8"));
}

function titleFromId(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/_/g, "-");
}

function hasGate(proposal, gate) {
  const needle = normalizeToken(gate);
  return (proposal.requiredGates || []).some((candidate) => normalizeToken(candidate) === needle);
}

function anyGate(proposal, gates) {
  return gates.some((gate) => hasGate(proposal, gate));
}

function policyById(automationEngine = {}) {
  return new Map((automationEngine.policyDefinitions || []).map((policy) => [policy.id, policy]));
}

function moduleById(catalog = {}) {
  return new Map((catalog.modules || []).map((module) => [module.id, module]));
}

function capabilityById(deviceRegistry = {}) {
  return new Map((deviceRegistry.capabilityDefinitions || []).map((capability) => [capability.id, capability]));
}

function toolsById(mcpOrchestrator = {}) {
  return new Map((mcpOrchestrator.tools || []).map((tool) => [tool.id, tool]));
}

function riskRank(risk) {
  if (risk === "high") return 3;
  if (risk === "medium") return 2;
  return 1;
}

function highestStatus(findings) {
  return findings.reduce((status, finding) =>
    (STATUS_RANK[finding.status] > STATUS_RANK[status] ? finding.status : status), "ok");
}

function highestSeverity(findings) {
  return findings.reduce((severity, finding) =>
    (SEVERITY_RANK[finding.severity] > SEVERITY_RANK[severity] ? finding.severity : severity), "info");
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function proposalIdentifier(proposal) {
  return proposal.proposalId || proposal.proposal_id || proposal.id || null;
}

function rulePack(engine, id) {
  return (engine.rulePacks || []).find((pack) => pack.id === id) || {};
}

function buildEvidencePointers({ proposals, catalog, deviceRegistry, automationEngine, eventLedger, mcpOrchestrator }) {
  const modules = moduleById(catalog);
  const policies = policyById(automationEngine);
  const capabilities = capabilityById(deviceRegistry);
  const tools = toolsById(mcpOrchestrator);
  const moduleIds = unique(proposals.map((proposal) => proposal.moduleId || proposal.module_id));
  const capabilityIds = unique(proposals.flatMap((proposal) => safeArray(proposal.requiredCapabilities || proposal.required_capabilities)));
  const inferredPolicies = proposals.flatMap((proposal) => {
    const capabilities = safeArray(proposal.requiredCapabilities || proposal.required_capabilities);
    const tools = safeArray(proposal.requiredTools);
    const policies = [];
    if (proposal.risk === "high" || capabilities.some((capability) => ["water_valve", "lock", "gate", "battery"].includes(capability))) {
      policies.push("physical-safety-approval");
    }
    if (tools.includes("narrowband.command.encode") || tools.includes("connectivity.route.evaluate")) {
      policies.push("narrowband-command-safety");
    }
    if (capabilities.some((capability) => ["battery", "ev_charger", "solar_inverter"].includes(capability))) {
      policies.push("energy-reserve-guard");
    }
    return policies;
  });
  const policyIds = unique([...proposals.flatMap((proposal) => safeArray(proposal.requiredPolicies)), ...inferredPolicies]);
  const toolIds = unique(proposals.flatMap((proposal) => safeArray(proposal.requiredTools)));

  const moduleEvidence = moduleIds.map((id) => ({
    id: `module:${id}`,
    sourceId: "module-catalog",
    type: "module",
    label: modules.get(id)?.name || titleFromId(id),
    target: id,
    reason: "target module and dashboard ownership",
    status: modules.has(id) ? "grounded" : "missing",
  }));

  const policyEvidence = policyIds.map((id) => ({
    id: `policy:${id}`,
    sourceId: "policy-definitions",
    type: "policy",
    label: policies.get(id)?.name || titleFromId(id),
    target: id,
    reason: "required safety or governance policy",
    status: policies.has(id) ? "grounded" : "missing",
  }));

  const capabilityEvidence = capabilityIds.map((id) => ({
    id: `capability:${id}`,
    sourceId: "device-registry",
    type: "capability",
    label: titleFromId(id),
    target: id,
    reason: `${capabilities.get(id)?.risk || "unknown"} risk capability`,
    status: capabilities.has(id) ? "grounded" : "missing",
  }));

  const toolEvidence = toolIds.map((id) => ({
    id: `mcp:${id}`,
    sourceId: "mcp-tool-plan",
    type: "mcp_tool",
    label: tools.get(id)?.name || id,
    target: id,
    reason: tools.get(id)?.requiresApproval ? "explicit permission tool" : "registered tool",
    status: tools.has(id) ? "grounded" : "missing",
  }));

  const eventEvidence = (eventLedger?.events || [])
    .filter((event) =>
      event.auditRequired && (
        moduleIds.includes(event.moduleId)
        || ["policy", "audit", "agent", "command"].includes(event.stream)
        || String(event.action).startsWith("kra.")
      ),
    )
    .slice(0, 8)
    .map((event) => ({
      id: `event:${event.id}`,
      sourceId: "audit-ledger",
      type: event.stream,
      label: event.summary,
      target: event.id,
      reason: `${event.action} / ${event.status}`,
      status: "grounded",
    }));

  return [...moduleEvidence, ...policyEvidence, ...capabilityEvidence, ...toolEvidence, ...eventEvidence];
}

function existingRulesForProposal(proposal, automationEngine = {}) {
  const moduleId = proposal.moduleId || proposal.module_id;
  const type = proposal.type || "";
  if (!moduleId || !String(type).includes("automation")) return [];
  return (automationEngine.rules || []).filter((rule) => rule.moduleId === moduleId && rule.state === "armed");
}

function addFinding(findings, proposal, finding) {
  const proposalId = proposalIdentifier(proposal);
  findings.push({
    id: `${proposalId || "proposal"}:${finding.category}:${findings.length + 1}`,
    proposalId,
    proposalTitle: proposal.title || "Proposal",
    ...finding,
  });
}

function evaluateProposal({ engine, proposal, automationEngine, eventLedger, mcpPlan }) {
  const findings = [];
  const capabilities = safeArray(proposal.requiredCapabilities || proposal.required_capabilities);
  const policies = safeArray(proposal.requiredPolicies);
  const gates = safeArray(proposal.requiredGates);
  const tools = safeArray(proposal.requiredTools);
  const risk = proposal.risk || "medium";
  const type = proposal.type || "";
  const physicalPack = rulePack(engine, "physical-safety-grounding");
  const narrowbandPack = rulePack(engine, "narrowband-command-safety");
  const modulePack = rulePack(engine, "module-certification-boundary");
  const boundaryPack = rulePack(engine, "aip-execution-boundary");
  const groundingPack = rulePack(engine, "grounding-completeness");
  const overlapPack = rulePack(engine, "existing-rule-overlap-review");
  const highRiskPhysical = risk === "high" || capabilities.some((capability) => safeArray(physicalPack.capabilities).includes(capability));
  const narrowbandRelevant = tools.includes("narrowband.command.encode")
    || tools.includes("connectivity.route.evaluate")
    || capabilities.some((capability) => safeArray(narrowbandPack.capabilities).includes(capability));
  const moduleRelevant = safeArray(modulePack.proposalTypes).includes(type);

  if (proposal.canExecute) {
    addFinding(findings, proposal, {
      severity: "critical",
      status: "conflict",
      category: "agent_governance",
      rulePackId: boundaryPack.id,
      title: boundaryPack.name,
      detail: boundaryPack.message,
      evidence: ["proposal.canExecute=true"],
      requiredActions: boundaryPack.requires,
    });
  }

  if (highRiskPhysical) {
    const missing = ["simulation", "human_approval", "signed_command"].filter((gate) => !hasGate(proposal, gate));
    addFinding(findings, proposal, {
      severity: missing.length ? "high" : "warning",
      status: "needs_review",
      category: "physical_safety",
      rulePackId: physicalPack.id,
      title: missing.length ? "Physical safety gates incomplete" : "Physical safety gates present",
      detail: missing.length
        ? `${proposal.title} is high risk and is missing ${missing.map(titleFromId).join(", ")}.`
        : physicalPack.message,
      evidence: [...policies.map((policy) => `policy:${policy}`), ...gates.map((gate) => `gate:${gate}`)],
      requiredActions: missing.length ? missing : ["operator_review", "preserve_propose_only_boundary"],
    });
  }

  if (narrowbandRelevant) {
    const missing = ["payload_budget", "ttl", "ack_required"].filter((gate) => !hasGate(proposal, gate));
    addFinding(findings, proposal, {
      severity: missing.length ? "high" : "warning",
      status: "needs_review",
      category: "connectivity",
      rulePackId: narrowbandPack.id,
      title: missing.length ? "Narrowband evidence incomplete" : "Narrowband evidence present",
      detail: missing.length
        ? `${proposal.title} references constrained routing and needs ${missing.map(titleFromId).join(", ")} evidence.`
        : narrowbandPack.message,
      evidence: [...tools.map((tool) => `mcp:${tool}`), ...gates.map((gate) => `gate:${gate}`)],
      requiredActions: missing.length ? missing : ["simulate_link_variants", "attach_payload_budget"],
    });
  }

  if (moduleRelevant) {
    const missing = ["dependency_check", "tests", "kra_review"].filter((gate) => !hasGate(proposal, gate));
    const enablementNeedsApproval = type === "module_enablement" && !anyGate(proposal, ["human_approval", "certification"]);
    addFinding(findings, proposal, {
      severity: missing.length || enablementNeedsApproval ? "high" : "warning",
      status: "needs_review",
      category: "module_governance",
      rulePackId: modulePack.id,
      title: missing.length || enablementNeedsApproval ? "Module enablement gates incomplete" : "Module governance gates present",
      detail: missing.length || enablementNeedsApproval
        ? `${proposal.title} must show dependency, test, KRA, certification, and approval evidence before enablement.`
        : modulePack.message,
      evidence: [...gates.map((gate) => `gate:${gate}`), ...tools.map((tool) => `mcp:${tool}`)],
      requiredActions: unique([...missing, ...(enablementNeedsApproval ? ["certification", "human_approval"] : [])]),
    });
  }

  const overlaps = existingRulesForProposal(proposal, automationEngine);
  if (overlaps.length > 0) {
    addFinding(findings, proposal, {
      severity: "warning",
      status: "needs_review",
      category: "automation_conflict",
      rulePackId: overlapPack.id,
      title: "Armed rule overlap review required",
      detail: `${proposal.title} overlaps ${overlaps.length} armed ${titleFromId(proposal.moduleId || proposal.module_id)} rule(s).`,
      evidence: overlaps.map((rule) => `rule:${rule.id}`),
      requiredActions: overlapPack.requires,
    });
  }

  if (policies.length === 0 && riskRank(risk) >= 2) {
    addFinding(findings, proposal, {
      severity: "warning",
      status: "missing_context",
      category: "grounding",
      rulePackId: groundingPack.id,
      title: "Policy grounding missing",
      detail: `${proposal.title} needs at least one explicit policy pointer.`,
      evidence: ["policy:none"],
      requiredActions: ["attach_policy_pointer", "rerun_kra"],
    });
  }

  const permissionTools = safeArray(mcpPlan?.toolPlans).filter((tool) =>
    safeArray(proposal.requiredTools).includes(tool.toolId) && tool.status === "requires_permission",
  );
  if (permissionTools.length > 0) {
    addFinding(findings, proposal, {
      severity: "warning",
      status: "needs_review",
      category: "mcp_permission",
      rulePackId: "mcp-tool-plan",
      title: "Explicit MCP permission required",
      detail: `${proposal.title} references ${permissionTools.length} high-risk tool(s) paused for explicit permission.`,
      evidence: permissionTools.map((tool) => `mcp:${tool.toolId}:${tool.status}`),
      requiredActions: ["attach_explicit_permission", "record_audit"],
    });
  }

  if ((eventLedger?.events || []).some((event) => event.status === "blocked" && event.moduleId === (proposal.moduleId || proposal.module_id))) {
    addFinding(findings, proposal, {
      severity: "warning",
      status: "needs_review",
      category: "audit_context",
      rulePackId: "audit-ledger",
      title: "Recent blocked route or policy evidence",
      detail: `${proposal.title} shares module context with a recent blocked or held audit event.`,
      evidence: (eventLedger.events || [])
        .filter((event) => event.status === "blocked" && event.moduleId === (proposal.moduleId || proposal.module_id))
        .slice(0, 3)
        .map((event) => `event:${event.id}`),
      requiredActions: ["review_audit_evidence"],
    });
  }

  return findings;
}

function buildProposalReviews(proposals, findings, evidencePointers) {
  return proposals.map((proposal) => {
    const proposalId = proposalIdentifier(proposal);
    const proposalFindings = findings.filter((finding) => finding.proposalId === proposalId);
    const blockers = proposalFindings.filter((finding) => finding.severity === "critical" || finding.status === "conflict");
    const missingGates = unique(proposalFindings.flatMap((finding) => finding.requiredActions || []));
    return {
      proposalId,
      title: proposal.title,
      moduleId: proposal.moduleId || proposal.module_id,
      risk: proposal.risk,
      status: blockers.length > 0 ? "conflict" : highestStatus(proposalFindings),
      severity: highestSeverity(proposalFindings),
      findingCount: proposalFindings.length,
      blockerCount: blockers.length,
      requiredGates: safeArray(proposal.requiredGates),
      missingGates,
      evidencePointers: evidencePointers
        .filter((pointer) =>
          pointer.target === (proposal.moduleId || proposal.module_id)
          || safeArray(proposal.requiredPolicies).includes(pointer.target)
          || safeArray(proposal.requiredTools).includes(pointer.target),
        )
        .map((pointer) => pointer.id),
      decision: blockers.length > 0 ? "block" : proposalFindings.length > 0 ? "review" : "ok",
    };
  });
}

function nextActionsForStatus(status, findings) {
  if (status === "conflict" || status === "blocked") return ["block_proposal", "remove_execution_claim", "rerun_kra"];
  if (findings.some((finding) => finding.category === "connectivity")) return ["run_simulation", "attach_payload_budget", "request_human_approval"];
  if (findings.some((finding) => finding.category === "module_governance")) return ["attach_dependency_check", "run_module_tests", "request_certification"];
  if (status === "missing_context") return ["attach_policy_pointer", "add_audit_evidence", "rerun_kra"];
  if (status === "needs_review") return ["review_findings", "prepare_approval_packet", "record_audit"];
  return ["record_kra_ok", "continue_to_simulation"];
}

function buildEvent(status, findings, actor = {}) {
  return {
    id: `kra-${Date.now()}`,
    timestamp: new Date().toISOString(),
    tenant: "vendorlogic.io",
    siteId: null,
    zoneId: null,
    deviceId: null,
    moduleId: "safety-policy",
    stream: "policy",
    severity: status === "conflict" || status === "blocked" ? "critical" : status === "ok" ? "info" : "warning",
    actor: {
      type: "agent",
      id: actor.subject || "kra-agent",
      displayName: actor.name || "Knowledge And Risk Agent",
    },
    action: "kra.evaluation.completed",
    summary: `KRA completed with ${findings.length} finding(s) and ${status.replace(/_/g, " ")} status.`,
    status,
    trafficClass: findings.some((finding) => finding.severity === "critical" || finding.severity === "high") ? "P0_EMERGENCY" : "P2_CONTROL",
    auditRequired: true,
    payload: {
      findingCount: findings.length,
      categories: unique(findings.map((finding) => finding.category)),
    },
  };
}

export function summarizeKraEngine(engine = loadKraEngine()) {
  const rulePacks = engine.rulePacks || [];
  const evidenceSources = engine.evidenceSources || [];
  return {
    schemaVersion: engine.schemaVersion,
    sourceCount: evidenceSources.length,
    requiredSourceCount: evidenceSources.filter((source) => source.required).length,
    rulePackCount: rulePacks.length,
    enabledRulePacks: rulePacks.filter((pack) => pack.status === "enabled").length,
    blockingRulePacks: rulePacks.filter((pack) => pack.blocking).length,
    seedEvaluationCount: (engine.seedEvaluations || []).length,
    critiqueOnly: engine.engine?.rule === "critique-only",
    byRisk: rulePacks.reduce((acc, pack) => {
      acc[pack.risk] = (acc[pack.risk] || 0) + 1;
      return acc;
    }, {}),
  };
}

export function evaluateKraContext({
  engine = loadKraEngine(),
  catalog,
  deviceRegistry,
  automationEngine,
  eventLedger,
  mcpOrchestrator,
  session = {},
  proposals,
  intent,
  mcp,
  actor = {},
} = {}) {
  const proposalList = safeArray(proposals || session.aip?.proposals || session.proposals);
  const mcpPlan = mcp || session.mcp || {};
  const evidencePointers = buildEvidencePointers({
    proposals: proposalList,
    catalog,
    deviceRegistry,
    automationEngine,
    eventLedger,
    mcpOrchestrator,
  });
  const findings = proposalList.flatMap((proposal) =>
    evaluateProposal({ engine, proposal, automationEngine, eventLedger, mcpPlan }),
  );

  if (proposalList.length === 0) {
    findings.push({
      id: "kra:grounding:no-proposals",
      proposalId: null,
      proposalTitle: "No proposal",
      severity: "warning",
      status: "missing_context",
      category: "grounding",
      rulePackId: "grounding-completeness",
      title: "No proposals supplied",
      detail: "KRA needs at least one AIP proposal or module plan to critique.",
      evidence: ["proposal:none"],
      requiredActions: ["create_aip_proposal"],
    });
  }

  const status = highestStatus(findings);
  const proposalReviews = buildProposalReviews(proposalList, findings, evidencePointers);
  const summary = {
    proposalCount: proposalList.length,
    findingCount: findings.length,
    blockerCount: findings.filter((finding) => finding.severity === "critical" || finding.status === "conflict").length,
    conflictCount: findings.filter((finding) => finding.status === "conflict").length,
    missingContextCount: findings.filter((finding) => finding.status === "missing_context").length,
    requiredReview: status !== "ok",
    highRiskProposalCount: proposalList.filter((proposal) => proposal.risk === "high").length,
    narrowbandFindingCount: findings.filter((finding) => finding.category === "connectivity").length,
    evidencePointerCount: evidencePointers.length,
    sourcesUsed: unique(evidencePointers.map((pointer) => pointer.sourceId)),
    byCategory: findings.reduce((acc, finding) => {
      acc[finding.category] = (acc[finding.category] || 0) + 1;
      return acc;
    }, {}),
    bySeverity: findings.reduce((acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1;
      return acc;
    }, {}),
  };

  return {
    evaluationId: `kra_eval_${Date.now()}`,
    createdAt: new Date().toISOString(),
    role: "Knowledge And Risk Agent",
    rule: "critique only",
    status,
    verdict: status === "ok" ? "grounded_ok" : status === "conflict" ? "blocked_conflict" : "operator_review_required",
    intent: intent || session.input || "",
    summary,
    findings,
    proposalReviews,
    evidencePointers,
    grounding: {
      policies: evidencePointers.filter((pointer) => pointer.type === "policy"),
      modules: evidencePointers.filter((pointer) => pointer.type === "module"),
      capabilities: evidencePointers.filter((pointer) => pointer.type === "capability"),
      tools: evidencePointers.filter((pointer) => pointer.type === "mcp_tool"),
      events: evidencePointers.filter((pointer) => ["audit", "policy", "agent", "command"].includes(pointer.type)),
    },
    nextActions: nextActionsForStatus(status, findings),
    event: buildEvent(status, findings, actor),
  };
}

export function buildKraContextFromEvaluation(evaluation, fallback = {}) {
  return {
    role: "Knowledge And Risk Agent",
    rule: "critique only",
    status: evaluation.status,
    grounding_pointers: evaluation.evidencePointers.map((pointer) => pointer.id),
    critique: evaluation.findings.length > 0
      ? evaluation.findings.slice(0, 3).map((finding) => finding.detail).join(" ")
      : "No KRA findings detected. Preserve the propose-only boundary and continue to simulation or approval as required.",
    narrowband_note: evaluation.summary.narrowbandFindingCount > 0
      ? "Constrained-link findings are present. Payload, TTL, ack, route, and approval evidence must remain attached."
      : fallback.narrowband_note || "No constrained-link dependency detected.",
    risk_register: unique(evaluation.findings.map((finding) => finding.severity)),
    required_review: evaluation.summary.requiredReview,
    frames: fallback.frames || [],
    evaluationId: evaluation.evaluationId,
    verdict: evaluation.verdict,
    summary: evaluation.summary,
    findings: evaluation.findings,
    proposalReviews: evaluation.proposalReviews,
    evidencePointers: evaluation.evidencePointers,
    nextActions: evaluation.nextActions,
  };
}

export function buildKraDashboard({
  engine = loadKraEngine(),
  catalog,
  deviceRegistry,
  automationEngine,
  eventLedger,
  mcpOrchestrator,
} = {}) {
  const summary = summarizeKraEngine(engine);
  const policyCount = (automationEngine?.policyDefinitions || []).length;
  const highRiskDevices = (deviceRegistry?.devices || []).filter((device) =>
    (device.capabilities || []).some((capability) => ["water_valve", "lock", "gate", "battery", "remote_gateway"].includes(capability)),
  ).length;
  const auditEvidence = (eventLedger?.events || [])
    .filter((event) => event.auditRequired && ["policy", "audit", "agent", "command"].includes(event.stream))
    .slice(0, 8)
    .map((event) => ({
      id: event.id,
      stream: event.stream,
      status: event.status,
      severity: event.severity,
      moduleId: event.moduleId,
      summary: event.summary,
      timestamp: event.timestamp,
    }));
  const toolCount = (mcpOrchestrator?.tools || []).filter((tool) => tool.agentId === "kra-agent" || tool.auditRequired).length;

  return {
    engine: engine.engine,
    summary: {
      ...summary,
      policyCount,
      highRiskDevices,
      auditEvidenceCount: auditEvidence.length,
      kraToolCount: toolCount,
      moduleCount: (catalog?.modules || []).length,
    },
    posture: {
      status: summary.blockingRulePacks > 0 ? "guarded" : "ready",
      rule: "critique-only",
      sourceHealth: summary.requiredSourceCount === summary.sourceCount ? "all_required_sources_ready" : "source_review_required",
      executionBoundary: "no_agent_direct_execution",
    },
    sources: engine.evidenceSources || [],
    rulePacks: engine.rulePacks || [],
    seedEvaluations: engine.seedEvaluations || [],
    recentEvidence: auditEvidence,
  };
}
