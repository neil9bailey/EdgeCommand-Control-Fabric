import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findDevice } from "./deviceRegistry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const automationPath = resolve(here, "../../../packages/automation-engine/automation.json");

export function loadAutomationEngine() {
  return JSON.parse(readFileSync(automationPath, "utf8"));
}

function getValue(source, field) {
  if (!source || !field) return undefined;
  return field.split(".").reduce((value, key) => (value && typeof value === "object" ? value[key] : undefined), source);
}

function compare(actual, operator, expected) {
  if (operator === "equals") return actual === expected;
  if (operator === "not_equals") return actual !== expected;
  if (operator === "exists") return actual !== undefined && actual !== null;
  if (operator === "greater_than") return Number(actual) > Number(expected);
  if (operator === "less_than") return Number(actual) < Number(expected);
  return false;
}

function stateForDevice(device, overrideState = null) {
  return {
    ...(device?.observedState || {}),
    ...(device?.desiredState || {}),
    ...(overrideState || {}),
  };
}

function triggerMatches(rule, scenarioEvent) {
  const trigger = rule.trigger || {};
  if (trigger.type === "schedule") {
    return scenarioEvent.type === "schedule" && compare(scenarioEvent.value, trigger.operator, trigger.value);
  }
  if (trigger.deviceId && trigger.deviceId !== scenarioEvent.deviceId) return false;
  if (trigger.capability && trigger.capability !== scenarioEvent.capability) return false;
  const actual = getValue(scenarioEvent.observedState || {}, trigger.field);
  return compare(actual, trigger.operator, trigger.value);
}

function evaluateCondition(condition, registry, scenarioEvent) {
  const device = findDevice(registry, condition.deviceId);
  const overrideState = scenarioEvent.deviceId === condition.deviceId ? scenarioEvent.observedState : null;
  const actual = getValue(stateForDevice(device, overrideState), condition.field);
  const passed = compare(actual, condition.operator, condition.value);
  return {
    ...condition,
    actual,
    passed,
  };
}

function policyById(engine) {
  return new Map((engine.policyDefinitions || []).map((policy) => [policy.id, policy]));
}

function selectPath(action, registry) {
  const device = findDevice(registry, action.deviceId);
  const preferences = action.pathPreference || ["lan"];
  if (device?.adapter === "lorawan" && preferences.includes("lorawan")) return "lorawan";
  if (device?.adapter === "lte-m" && preferences.includes("lte-m")) return "lte-m";
  if (preferences.includes("lan")) return "lan";
  return preferences[0] || "lan";
}

function evaluatePolicies(rule, action, conditionResults, engine, scenario = {}) {
  const policies = policyById(engine);
  const applied = (rule.policies || []).map((id) => policies.get(id)).filter(Boolean);
  const failedConditions = conditionResults.filter((condition) => !condition.passed);
  const controlledAction = action.type !== "notify";
  const highRisk = controlledAction && (rule.risk === "high" || rule.trafficClass === "P0_EMERGENCY" || action.requiresAck);
  const requiresApproval = controlledAction && (applied.some((policy) => policy.requiresApproval) || highRisk);
  const requiresSimulation = controlledAction && (applied.some((policy) => policy.requiresSimulation) || highRisk);
  const requiresSignedCommand = controlledAction && (applied.some((policy) => policy.requiresSignedCommand) || rule.trafficClass === "P0_EMERGENCY");
  const manualOverride = conditionResults.some((condition) => condition.field === "manualOverride" && condition.actual === true);
  const emergencyApproved = scenario.emergencyApproved === true && rule.trafficClass === "P0_EMERGENCY";
  const canActuate =
    failedConditions.length === 0 &&
    (!requiresApproval || emergencyApproved || scenario.approved === true) &&
    (!requiresSimulation || scenario.simulated === true || action.type !== "set_state");

  const reasons = [];
  if (failedConditions.length > 0) reasons.push("conditions_failed");
  if (manualOverride) reasons.push("manual_override");
  if (requiresSimulation && scenario.simulated !== true && action.type === "set_state") reasons.push("simulation_required");
  if (requiresApproval && scenario.approved !== true && !emergencyApproved) reasons.push("approval_required");
  if (requiresSignedCommand && action.type === "set_state") reasons.push("signed_command_required");

  return {
    policies: applied.map((policy) => ({
      id: policy.id,
      name: policy.name,
      risk: policy.risk,
      requiresApproval: policy.requiresApproval,
      requiresSimulation: policy.requiresSimulation,
      requiresSignedCommand: policy.requiresSignedCommand,
    })),
    decision: canActuate ? "allow" : requiresApproval ? "approval_required" : "blocked",
    canActuate,
    requiresApproval,
    requiresSimulation,
    requiresSignedCommand,
    reasons,
  };
}

function buildCommand(rule, action, policy, registry, index) {
  const device = action.deviceId ? findDevice(registry, action.deviceId) : null;
  const route = selectPath(action, registry);
  const hardBlocked = policy.reasons.includes("conditions_failed") || policy.reasons.includes("manual_override");
  return {
    id: `${rule.id}-cmd-${index + 1}`,
    ruleId: rule.id,
    actionId: action.id,
    type: action.type,
    moduleId: rule.moduleId,
    deviceId: action.deviceId || null,
    deviceName: device?.name || action.channel || "Notification",
    capability: action.capability || "notification",
    desiredState: action.desiredState || {},
    message: action.message || null,
    trafficClass: rule.trafficClass,
    selectedPath: route,
    encodedBytes: action.encodedBytes || 0,
    ackRequired: Boolean(action.requiresAck),
    status: policy.canActuate ? "ready_to_execute" : hardBlocked ? "blocked" : policy.requiresApproval ? "pending_approval" : "blocked",
    canExecute: policy.canActuate,
    approvalRequired: policy.requiresApproval,
    simulationRequired: policy.requiresSimulation,
    signedCommandRequired: policy.requiresSignedCommand,
    policyDecision: policy.decision,
    policyReasons: policy.reasons,
  };
}

function buildEvidenceEvents(rule, commands, scenario, actor) {
  const timestamp = new Date().toISOString();
  return [
    {
      id: `auto-${rule.id}-${Date.now()}-policy`,
      timestamp,
      tenant: "vendorlogic.io",
      siteId: scenario.siteId || null,
      zoneId: scenario.zoneId || null,
      deviceId: scenario.event?.deviceId || null,
      moduleId: rule.moduleId,
      stream: "policy",
      severity: rule.risk === "high" ? "warning" : "info",
      actor: { type: "service", id: "automation-engine", displayName: "Automation Engine" },
      action: "policy.evaluated",
      summary: `${rule.name} evaluated ${commands.length} command plan item(s).`,
      status: commands.some((command) => command.status === "pending_approval") ? "pending_approval" : "evaluated",
      trafficClass: rule.trafficClass,
      auditRequired: true,
      payload: { ruleId: rule.id, actor: actor?.subject || "local-dev-operator" },
    },
    ...commands.map((command, index) => ({
      id: `auto-${rule.id}-${Date.now()}-command-${index + 1}`,
      timestamp,
      tenant: "vendorlogic.io",
      siteId: scenario.siteId || null,
      zoneId: scenario.zoneId || null,
      deviceId: command.deviceId,
      moduleId: rule.moduleId,
      stream: "command",
      severity: command.trafficClass === "P0_EMERGENCY" ? "critical" : "warning",
      actor: { type: "service", id: "automation-engine", displayName: "Automation Engine" },
      action: "command.planned",
      summary: `${command.deviceName} ${command.type} planned with ${command.policyDecision} policy decision.`,
      status: command.status,
      trafficClass: command.trafficClass,
      auditRequired: true,
      payload: {
        ruleId: rule.id,
        commandId: command.id,
        selectedPath: command.selectedPath,
        encodedBytes: command.encodedBytes,
        ackRequired: command.ackRequired,
      },
    })),
  ];
}

export function summarizeAutomationEngine(engine = loadAutomationEngine()) {
  const rules = engine.rules || [];
  const policies = engine.policyDefinitions || [];
  const byState = {};
  const byRisk = {};
  const byModule = {};
  let approvalRequired = 0;
  let p0Rules = 0;

  for (const rule of rules) {
    byState[rule.state] = (byState[rule.state] || 0) + 1;
    byRisk[rule.risk] = (byRisk[rule.risk] || 0) + 1;
    byModule[rule.moduleId] = (byModule[rule.moduleId] || 0) + 1;
    if (rule.approvalMode?.includes("required")) approvalRequired += 1;
    if (rule.trafficClass === "P0_EMERGENCY") p0Rules += 1;
  }

  return {
    schemaVersion: engine.schemaVersion,
    ruleCount: rules.length,
    armedRules: rules.filter((rule) => rule.state === "armed").length,
    policyCount: policies.length,
    sceneCount: (engine.scenes || []).length,
    scenarioCount: (engine.scenarios || []).length,
    approvalRequired,
    p0Rules,
    byState,
    byRisk,
    byModule,
  };
}

export function findScenario(engine, id) {
  return (engine.scenarios || []).find((scenario) => scenario.id === id);
}

export function evaluateAutomation(engine, registry, scenario, actor = null) {
  const event = scenario.event || scenario;
  const matches = (engine.rules || []).filter((rule) => rule.state === "armed" && triggerMatches(rule, event));
  const evaluations = matches.map((rule) => {
    const conditionResults = (rule.conditions || []).map((condition) => evaluateCondition(condition, registry, event));
    const commands = (rule.actions || []).map((action, index) => {
      const policy = evaluatePolicies(rule, action, conditionResults, engine, scenario);
      return buildCommand(rule, action, policy, registry, index);
    });

    return {
      rule: {
        id: rule.id,
        name: rule.name,
        moduleId: rule.moduleId,
        risk: rule.risk,
        trafficClass: rule.trafficClass,
        simulationProfile: rule.simulationProfile,
      },
      matched: true,
      conditions: conditionResults,
      commands,
      events: buildEvidenceEvents(rule, commands, scenario, actor),
    };
  });

  const commands = evaluations.flatMap((evaluation) => evaluation.commands);
  const events = evaluations.flatMap((evaluation) => evaluation.events);

  return {
    evaluationId: `eval_${Date.now()}`,
    createdAt: new Date().toISOString(),
    scenarioId: scenario.id || "ad_hoc",
    scenarioName: scenario.name || "Ad Hoc Automation Evaluation",
    event,
    actor: actor
      ? { subject: actor.subject, name: actor.name, roles: actor.roles || [] }
      : { subject: "local-dev-operator", name: "Local Development Operator", roles: [] },
    matchedRuleCount: evaluations.length,
    commandCount: commands.length,
    pendingApprovalCount: commands.filter((command) => command.status === "pending_approval").length,
    blockedCount: commands.filter((command) => command.status === "blocked").length,
    readyCount: commands.filter((command) => command.status === "ready_to_execute").length,
    evaluations,
    commands,
    events,
  };
}
