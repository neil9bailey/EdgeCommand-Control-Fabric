import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateAutomation, findScenario } from "./automationEngine.mjs";
import { evaluateKraContext, loadKraEngine } from "./kraEngine.mjs";
import { buildApprovalSimulationEvidence } from "./simulationLab.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const approvalWorkflowPath = resolve(here, "../../../packages/approval-workflow/approval-workflow.json");

export function loadApprovalWorkflow() {
  return JSON.parse(readFileSync(approvalWorkflowPath, "utf8"));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function titleFromId(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function riskFromTrafficClass(trafficClass) {
  if (String(trafficClass).includes("P0") || String(trafficClass).includes("P1")) return "high";
  if (String(trafficClass).includes("P2")) return "medium";
  return "low";
}

function decisionDefinition(workflow, decision) {
  return (workflow.decisions || []).find((item) => item.id === decision);
}

function actorRoles(actor = {}) {
  return safeArray(actor.roles);
}

function canActorDecide(actor, requiredRoles = []) {
  const roles = actorRoles(actor);
  return requiredRoles.some((role) => roles.includes(role));
}

function policyRulesForCommand(workflow, command) {
  const categories = ["physical_safety", "simulation", "risk", "command_boundary"];
  const rules = (workflow.policyRules || []).filter((rule) => categories.includes(rule.category));
  if (command.approvalRequired) return rules;
  return rules.filter((rule) => rule.category !== "physical_safety");
}

function emergencyExceptionForCommand(workflow, command) {
  return (workflow.emergencyExceptions || []).find((item) =>
    item.trafficClass === command.trafficClass && safeArray(item.allowedModules).includes(command.moduleId),
  ) || null;
}

function proposalForCommand(command, approval) {
  const requiredGates = ["simulation", "human_approval"];
  if (command.signedCommandRequired) requiredGates.push("signed_command");
  if (command.selectedPath === "lorawan" || command.selectedPath === "lte-m") {
    requiredGates.push("payload_budget", "ttl", "ack_required");
  }

  const requiredTools = ["device.command.propose", "policy.evaluate", "simulation.run", "audit.record"];
  if (command.selectedPath === "lorawan" || command.selectedPath === "lte-m") {
    requiredTools.push("connectivity.route.evaluate", "narrowband.command.encode");
  }

  return {
    proposalId: `proposal-${approval.id}`,
    type: "command_approval",
    title: `${command.deviceName} ${titleFromId(command.type)}`,
    moduleId: command.moduleId,
    targetDashboard: "Approval Workflow",
    risk: riskFromTrafficClass(command.trafficClass),
    requiredCapabilities: [command.capability],
    requiredPolicies: command.policyReasons.includes("simulation_required")
      ? ["physical-safety-approval", "narrowband-command-safety"].filter((policy, index) => command.selectedPath === "lorawan" || index === 0)
      : ["physical-safety-approval"],
    requiredGates,
    requiredTools,
    status: "pending_approval",
    canExecute: false,
    expectedImpact: `Queue ${command.deviceName} command after approval.`,
    rollbackPath: "Approval expiry leaves device state unchanged.",
    executionRule: "Approval records feed a separate signed command queue and never actuate directly.",
  };
}

function buildCritique({ kraEngine, catalog, deviceRegistry, automationEngine, eventLedger, mcpOrchestrator, proposal, actor }) {
  const evaluation = evaluateKraContext({
    engine: kraEngine || loadKraEngine(),
    catalog,
    deviceRegistry,
    automationEngine,
    eventLedger,
    mcpOrchestrator,
    proposals: [proposal],
    intent: proposal.title,
    actor,
  });
  return {
    evaluationId: evaluation.evaluationId,
    status: evaluation.status,
    verdict: evaluation.verdict,
    findingCount: evaluation.summary.findingCount,
    blockerCount: evaluation.summary.blockerCount,
    findings: evaluation.findings,
    evidencePointers: evaluation.evidencePointers,
    nextActions: evaluation.nextActions,
  };
}

function policyResultForApproval(workflow, command, simulation, critique) {
  const rules = policyRulesForCommand(workflow, command);
  const emergencyException = emergencyExceptionForCommand(workflow, command);
  const criteria = [
    {
      id: "simulation_attached",
      label: "Simulation attached",
      passed: Boolean(simulation?.attached),
    },
    {
      id: "kra_no_conflict",
      label: "KRA has no blocking conflict",
      passed: critique.status !== "conflict" && critique.blockerCount === 0,
    },
    {
      id: "human_approval_required",
      label: "Human approval required",
      passed: command.approvalRequired,
    },
    {
      id: "signed_command_boundary",
      label: "Signed command boundary",
      passed: command.signedCommandRequired || command.trafficClass !== "P0_EMERGENCY",
    },
  ];
  const readyForApproval = criteria.every((item) => item.passed || item.id === "human_approval_required");

  return {
    result: readyForApproval ? "ready_for_human_approval" : "missing_evidence",
    readyForApproval,
    requiredRoles: ["Automation.Admin", "Automation.Security", "Automation.AgentApprover"],
    rules: rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      risk: rule.risk,
      category: rule.category,
      message: rule.message,
    })),
    criteria,
    emergencyException: emergencyException
      ? {
        id: emergencyException.id,
        status: emergencyException.status,
        expiresSeconds: emergencyException.expiresSeconds,
        requires: emergencyException.requires,
      }
      : null,
  };
}

function commandQueueForApproval(command, status = "held_for_approval") {
  const commandId = command.id || command.commandId;
  return {
    queueId: command.queueId || `queue-${commandId}`,
    commandId,
    status,
    commandStatus: status === "queued_for_execution" ? "ready_to_execute" : status.startsWith("blocked") ? "blocked" : command.status,
    canExecute: status === "queued_for_execution",
    executionBoundary: "separate_signed_command_path",
    selectedPath: command.selectedPath,
    trafficClass: command.trafficClass,
    encodedBytes: command.encodedBytes,
    ackRequired: command.ackRequired,
    signingRequired: command.signedCommandRequired,
  };
}

function lifecycleForApproval(approval, simulation, critique) {
  return [
    { state: "created", status: "complete", detail: "Automation engine produced an approval-gated command." },
    { state: "simulated", status: simulation?.attached ? "complete" : "missing", detail: simulation?.reportId || "Simulation report required." },
    { state: "kra_reviewed", status: critique.status === "conflict" ? "blocked" : "complete", detail: critique.verdict },
    { state: "pending_human", status: approval.status, detail: "Waiting for a named human decision." },
  ];
}

function buildApprovalFromCommand({ workflow, command, simulationEvidence, kraEngine, catalog, deviceRegistry, automationEngine, eventLedger, mcpOrchestrator, actor }) {
  const approval = {
    id: `approval-${command.id}`,
    commandId: command.id,
    ruleId: command.ruleId,
    deviceId: command.deviceId,
    deviceName: command.deviceName,
    moduleId: command.moduleId,
    trafficClass: command.trafficClass,
    selectedPath: command.selectedPath,
    status: command.status,
    requiredRoles: ["Automation.Admin", "Automation.Security", "Automation.AgentApprover"],
    reasons: command.policyReasons,
  };
  const simulation = simulationEvidence.byCommandId[command.id] || {
    required: command.simulationRequired,
    attached: false,
    reportId: null,
    scenarioId: null,
    variantId: null,
    status: "missing",
    safetyVerdict: "simulation_required",
    evidence: [],
  };
  const proposal = proposalForCommand(command, approval);
  const critique = buildCritique({
    kraEngine,
    catalog,
    deviceRegistry,
    automationEngine,
    eventLedger,
    mcpOrchestrator,
    proposal,
    actor,
  });
  const policy = policyResultForApproval(workflow, command, simulation, critique);

  return {
    ...approval,
    proposal,
    critique,
    policy,
    simulation,
    lifecycle: lifecycleForApproval(approval, simulation, critique),
    commandQueue: commandQueueForApproval(command),
    decision: null,
  };
}

export function summarizeApprovalWorkflow(workflow = loadApprovalWorkflow()) {
  const byDecision = {};
  for (const decision of workflow.seedDecisions || []) {
    byDecision[decision.decision] = (byDecision[decision.decision] || 0) + 1;
  }

  return {
    schemaVersion: workflow.schemaVersion,
    stateCount: (workflow.states || []).length,
    decisionCount: (workflow.decisions || []).length,
    policyRuleCount: (workflow.policyRules || []).length,
    emergencyExceptionCount: (workflow.emergencyExceptions || []).length,
    auditExportProfileCount: (workflow.auditExportProfiles || []).length,
    seedDecisionCount: (workflow.seedDecisions || []).length,
    byDecision,
  };
}

export function buildApprovalQueue({
  workflow = loadApprovalWorkflow(),
  automationEngine,
  deviceRegistry,
  simulationLab,
  kraEngine,
  catalog,
  eventLedger,
  mcpOrchestrator,
  actor = { subject: "system-preview", name: "System Preview", roles: ["Automation.AgentApprover"] },
} = {}) {
  const scenario = findScenario(automationEngine, "scenario-cottage-leak-lorawan");
  if (!scenario) {
    return {
      approvals: [],
      summary: { pending: 0, total: 0, sourceScenario: null, simulationAttached: 0, readyForApproval: 0 },
    };
  }

  const simulationEvidence = simulationLab
    ? buildApprovalSimulationEvidence({ lab: simulationLab, automationEngine, deviceRegistry })
    : { byCommandId: {} };
  const evaluation = evaluateAutomation(automationEngine, deviceRegistry, scenario, actor);
  const approvals = evaluation.commands
    .filter((command) => command.approvalRequired)
    .map((command) => buildApprovalFromCommand({
      workflow,
      command,
      simulationEvidence,
      kraEngine,
      catalog,
      deviceRegistry,
      automationEngine,
      eventLedger,
      mcpOrchestrator,
      actor,
    }));

  return {
    approvals,
    summary: {
      pending: approvals.filter((approval) => approval.status === "pending_approval").length,
      total: approvals.length,
      sourceScenario: scenario.id,
      simulationAttached: approvals.filter((approval) => approval.simulation?.attached).length,
      readyForApproval: approvals.filter((approval) => approval.policy?.readyForApproval).length,
      policyRuleCount: (workflow.policyRules || []).length,
      emergencyExceptionCount: (workflow.emergencyExceptions || []).length,
      auditExportProfileCount: (workflow.auditExportProfiles || []).length,
    },
  };
}

export function buildApprovalDashboard(options = {}) {
  const workflow = options.workflow || loadApprovalWorkflow();
  const queue = buildApprovalQueue({ ...options, workflow });
  return {
    workflow: workflow.workflow,
    summary: {
      ...summarizeApprovalWorkflow(workflow),
      ...queue.summary,
    },
    approvals: queue.approvals,
    policyRules: workflow.policyRules || [],
    decisions: workflow.decisions || [],
    emergencyExceptions: workflow.emergencyExceptions || [],
    auditExportProfiles: workflow.auditExportProfiles || [],
    recentDecisions: workflow.seedDecisions || [],
  };
}

export function findApprovalRecord(options = {}, approvalId) {
  return buildApprovalDashboard(options).approvals.find((approval) => approval.id === approvalId);
}

function buildDecisionEvent({ approval, decision, state, actor, policyResult }) {
  const timestamp = new Date().toISOString();
  return {
    id: `approval-${approval.commandId}-${Date.now()}`,
    timestamp,
    tenant: "vendorlogic.io",
    siteId: null,
    zoneId: null,
    deviceId: approval.deviceId,
    moduleId: approval.moduleId,
    stream: "audit",
    severity: approval.trafficClass === "P0_EMERGENCY" ? "critical" : "warning",
    actor: { type: "human", id: actor.subject || "local-dev-operator", displayName: actor.name || "Local Development Operator" },
    action: `approval.${decision}`,
    summary: `${approval.deviceName} approval ${state.replace(/_/g, " ")} by ${actor.name || actor.subject || "Local Development Operator"}.`,
    status: state,
    trafficClass: approval.trafficClass,
    auditRequired: true,
    payload: {
      approvalId: approval.id,
      commandId: approval.commandId,
      policyResult,
    },
  };
}

export function decideApproval({
  workflow = loadApprovalWorkflow(),
  automationEngine,
  deviceRegistry,
  simulationLab,
  kraEngine,
  catalog,
  eventLedger,
  mcpOrchestrator,
  approvalId,
  decision = "request_changes",
  note = "",
  actor = {},
} = {}) {
  const queue = buildApprovalQueue({
    workflow,
    automationEngine,
    deviceRegistry,
    simulationLab,
    kraEngine,
    catalog,
    eventLedger,
    mcpOrchestrator,
    actor,
  });
  const approval = queue.approvals.find((item) => item.id === approvalId);
  if (!approval) return { error: "approval_not_found", id: approvalId };

  const definition = decisionDefinition(workflow, decision);
  if (!definition) return { error: "approval_decision_not_found", decision };

  if (!canActorDecide(actor, definition.requiresRoles)) {
    return {
      error: "approval_decision_forbidden",
      approvalId,
      decision,
      requiredRoles: definition.requiresRoles,
      actor: {
        subject: actor.subject,
        name: actor.name,
        roles: actorRoles(actor),
      },
    };
  }

  if (decision === "approve" && !approval.policy.readyForApproval) {
    return {
      error: "approval_missing_evidence",
      approvalId,
      decision,
      criteria: approval.policy.criteria,
    };
  }

  const state = definition.resultState;
  const policyResult = decision === "approve"
    ? "approved_for_signed_command_queue"
    : decision === "reject"
      ? "rejected_block_execution"
      : "changes_requested_block_execution";
  const commandQueue = commandQueueForApproval(approval.commandQueue, definition.commandQueueStatus);
  const decidedAt = new Date().toISOString();
  const decisionRecord = {
    decisionId: `approval_decision_${Date.now()}`,
    approvalId,
    commandId: approval.commandId,
    decision,
    state,
    note,
    decidedAt,
    actor: {
      subject: actor.subject || "local-dev-operator",
      name: actor.name || "Local Development Operator",
      roles: actorRoles(actor),
    },
    policyResult,
  };
  const updatedApproval = {
    ...approval,
    status: state,
    decision: decisionRecord,
    commandQueue,
    lifecycle: [
      ...approval.lifecycle,
      { state, status: "complete", detail: `${decision} recorded by ${decisionRecord.actor.name}` },
    ],
  };

  return {
    ...decisionRecord,
    approval: updatedApproval,
    commandQueue,
    nextActions: decision === "approve"
      ? ["sign_command", "enqueue_command", "monitor_ack", "record_audit"]
      : ["keep_command_blocked", "notify_requestor", "record_audit"],
    event: buildDecisionEvent({ approval, decision, state, actor: decisionRecord.actor, policyResult }),
  };
}

export function exportApprovalAudit(options = {}) {
  const dashboard = buildApprovalDashboard(options);
  return {
    exportId: `approval_export_${Date.now()}`,
    createdAt: new Date().toISOString(),
    tenant: dashboard.workflow.tenant,
    format: "json",
    summary: dashboard.summary,
    records: dashboard.approvals.map((approval) => ({
      approvalId: approval.id,
      commandId: approval.commandId,
      status: approval.status,
      requiredRoles: approval.requiredRoles,
      proposal: approval.proposal,
      critique: approval.critique,
      policy: approval.policy,
      simulation: approval.simulation,
      commandQueue: approval.commandQueue,
      decision: approval.decision,
    })),
    decisions: dashboard.recentDecisions,
    fields: unique((dashboard.auditExportProfiles || []).flatMap((profile) => profile.fields)),
  };
}
