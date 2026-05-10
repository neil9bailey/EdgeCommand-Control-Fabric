import test from "node:test";
import assert from "node:assert/strict";
import { loadApprovalWorkflow, buildApprovalDashboard, decideApproval, exportApprovalAudit, summarizeApprovalWorkflow } from "../src/approvalWorkflow.mjs";
import { loadAutomationEngine } from "../src/automationEngine.mjs";
import { loadCatalog } from "../src/catalog.mjs";
import { loadDeviceRegistry } from "../src/deviceRegistry.mjs";
import { loadEventLedger } from "../src/eventLedger.mjs";
import { loadKraEngine } from "../src/kraEngine.mjs";
import { loadMcpOrchestrator } from "../src/mcpOrchestrator.mjs";
import { loadSimulationLab } from "../src/simulationLab.mjs";

const approver = {
  subject: "human-approver",
  name: "Human Approver",
  roles: ["Automation.AgentApprover"],
};

const viewer = {
  subject: "viewer",
  name: "Viewer",
  roles: ["Automation.Viewer"],
};

function sources(actor = approver) {
  return {
    workflow: loadApprovalWorkflow(),
    automationEngine: loadAutomationEngine(),
    deviceRegistry: loadDeviceRegistry(),
    simulationLab: loadSimulationLab(),
    kraEngine: loadKraEngine(),
    catalog: loadCatalog(),
    eventLedger: loadEventLedger(),
    mcpOrchestrator: loadMcpOrchestrator(),
    actor,
  };
}

test("approval workflow loads policy rules and decision model", () => {
  const workflow = loadApprovalWorkflow();
  const summary = summarizeApprovalWorkflow(workflow);

  assert.equal(workflow.workflow.tenant, "vendorlogic.io");
  assert.equal(workflow.workflow.executionBoundary, "approval-records-and-command-queue-only");
  assert.equal(summary.policyRuleCount, 5);
  assert.equal(summary.decisionCount, 3);
  assert.equal(summary.emergencyExceptionCount, 2);
});

test("approval dashboard shows pending high-risk record with simulation and KRA critique", () => {
  const dashboard = buildApprovalDashboard(sources());
  const approval = dashboard.approvals[0];

  assert.equal(dashboard.summary.pending, 1);
  assert.equal(dashboard.summary.simulationAttached, 1);
  assert.equal(approval.status, "pending_approval");
  assert.equal(approval.proposal.canExecute, false);
  assert.equal(approval.simulation.attached, true);
  assert.equal(approval.policy.readyForApproval, true);
  assert.equal(approval.commandQueue.canExecute, false);
  assert.ok(approval.critique.findingCount >= 1);
});

test("approver can approve a record into the signed command queue", () => {
  const decision = decideApproval({
    ...sources(approver),
    approvalId: "approval-rule-cottage-leak-lorawan-valve-cmd-1",
    decision: "approve",
    note: "Simulation, KRA, and LoRaWAN payload proof reviewed.",
  });

  assert.equal(decision.state, "approved");
  assert.equal(decision.policyResult, "approved_for_signed_command_queue");
  assert.equal(decision.commandQueue.status, "queued_for_execution");
  assert.equal(decision.commandQueue.canExecute, true);
  assert.equal(decision.approval.decision.actor.name, "Human Approver");
  assert.equal(decision.event.action, "approval.approve");
});

test("rejected approval remains blocked from execution", () => {
  const decision = decideApproval({
    ...sources(approver),
    approvalId: "approval-rule-cottage-leak-lorawan-valve-cmd-1",
    decision: "reject",
    note: "Do not operate the remote valve.",
  });

  assert.equal(decision.state, "rejected");
  assert.equal(decision.commandQueue.status, "blocked_rejected");
  assert.equal(decision.commandQueue.canExecute, false);
  assert.ok(decision.nextActions.includes("keep_command_blocked"));
});

test("viewer cannot approve high-risk records", () => {
  const decision = decideApproval({
    ...sources(viewer),
    approvalId: "approval-rule-cottage-leak-lorawan-valve-cmd-1",
    decision: "approve",
  });

  assert.equal(decision.error, "approval_decision_forbidden");
  assert.ok(decision.requiredRoles.includes("Automation.AgentApprover"));
});

test("approval audit export contains proposal critique policy and simulation evidence", () => {
  const audit = exportApprovalAudit(sources());
  const record = audit.records[0];

  assert.equal(audit.tenant, "vendorlogic.io");
  assert.equal(record.proposal.canExecute, false);
  assert.equal(record.simulation.attached, true);
  assert.equal(record.policy.result, "ready_for_human_approval");
  assert.ok(record.critique.evidencePointers.length > 0);
});
