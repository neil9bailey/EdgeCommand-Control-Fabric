import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateAutomation, findScenario } from "./automationEngine.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const simulationLabPath = resolve(here, "../../../packages/simulation-lab/simulation-lab.json");

export function loadSimulationLab() {
  return JSON.parse(readFileSync(simulationLabPath, "utf8"));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function titleFromId(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function deepMerge(base, patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return base;
  const target = { ...(base || {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      target[key] = deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function failureModeMap(lab) {
  return new Map((lab.failureModes || []).map((mode) => [mode.id, mode]));
}

function findDevice(registry, id) {
  return (registry.devices || []).find((device) => device.id === id);
}

export function summarizeSimulationLab(lab = loadSimulationLab()) {
  const scenarios = lab.scenarios || [];
  const variants = scenarios.flatMap((scenario) => scenario.variants || []);
  const byRisk = {};
  const byTrafficClass = {};
  const byFailureCategory = {};

  for (const scenario of scenarios) {
    byRisk[scenario.risk] = (byRisk[scenario.risk] || 0) + 1;
    byTrafficClass[scenario.trafficClass] = (byTrafficClass[scenario.trafficClass] || 0) + 1;
  }

  for (const mode of lab.failureModes || []) {
    byFailureCategory[mode.category] = (byFailureCategory[mode.category] || 0) + 1;
  }

  return {
    schemaVersion: lab.schemaVersion,
    scenarioCount: scenarios.length,
    variantCount: variants.length,
    failureModeCount: (lab.failureModes || []).length,
    linkCount: (lab.links || []).length,
    simulatedDeviceGroupCount: (lab.simulatedDevices || []).length,
    reportTemplateCount: (lab.reportTemplates || []).length,
    approvalAttachmentReady: scenarios.filter((scenario) => scenario.risk === "high").length,
    narrowbandVariantCount: variants.filter((variant) => safeArray(variant.failureModes).some((mode) => mode.includes("lorawan") || mode.includes("payload") || mode.includes("broadband"))).length,
    byRisk,
    byTrafficClass,
    byFailureCategory,
  };
}

export function findSimulationScenario(lab, id) {
  return (lab.scenarios || []).find((scenario) => scenario.id === id || scenario.automationScenarioId === id);
}

function selectedVariants(simulationScenario, variantId) {
  const variants = simulationScenario?.variants || [];
  if (!variantId) return variants;
  return variants.filter((variant) => variant.id === variantId);
}

function applyFailureModeToRegistry(registry, failureModeId) {
  const patches = {
    manual_override_main_valve: {
      deviceId: "dev-water-valve-main-01",
      status: "online",
      observedState: { manualOverride: true },
    },
    cottage_manual_override: {
      deviceId: "dev-cottage-valve-01",
      status: "online",
      observedState: { manualOverride: true },
    },
    sensor_offline: {
      deviceId: "dev-leak-utility-01",
      status: "offline",
      observedState: { leak: false, offline: true, battery: 0 },
    },
    broadband_outage: {
      deviceId: "dev-cottage-gateway-01",
      status: "degraded",
      observedState: { broadband: "down", lorawan: "ready", lteM: "standby" },
    },
  };
  const patch = patches[failureModeId];
  if (!patch) return;
  const device = findDevice(registry, patch.deviceId);
  if (!device) return;
  if (patch.status) device.status = patch.status;
  device.observedState = { ...(device.observedState || {}), ...(patch.observedState || {}) };
  device.desiredState = { ...(device.desiredState || {}), ...(patch.desiredState || {}) };
}

function applyDevicePatches(registry, patches = []) {
  for (const patch of patches) {
    const device = findDevice(registry, patch.deviceId);
    if (!device) continue;
    if (patch.status) device.status = patch.status;
    device.observedState = { ...(device.observedState || {}), ...(patch.observedState || {}) };
    device.desiredState = { ...(device.desiredState || {}), ...(patch.desiredState || {}) };
  }
}

function registryForVariant(deviceRegistry, variant, activeFailureModes) {
  const registry = clone(deviceRegistry);
  for (const mode of activeFailureModes) applyFailureModeToRegistry(registry, mode);
  applyDevicePatches(registry, variant.devicePatches || []);
  return registry;
}

function scenarioForVariant(automationScenario, simulationScenario, variant, activeFailureModes) {
  const scenario = clone(automationScenario);
  scenario.id = automationScenario.id;
  scenario.name = automationScenario.name;
  scenario.simulated = true;
  scenario.approved = variant.approved === true;
  scenario.simulationProfile = simulationScenario.id;
  scenario.simulationVariant = variant.id;
  scenario.failureModes = activeFailureModes;
  if (variant.eventPatch) {
    scenario.event = deepMerge(scenario.event, variant.eventPatch);
  }
  return scenario;
}

function buildLinksForVariant(lab, activeFailureModes) {
  const links = clone(lab.links || []);
  const byId = new Map(links.map((link) => [link.id, link]));

  if (activeFailureModes.includes("broadband_outage") && byId.has("broadband")) {
    Object.assign(byId.get("broadband"), {
      status: "down",
      latencyMs: 0,
      jitterMs: 0,
      maxPayloadBytes: 0,
      ackSupported: false,
    });
  }

  if (activeFailureModes.includes("lorawan_delay") && byId.has("lorawan")) {
    const link = byId.get("lorawan");
    link.latencyMs += 2200;
    link.jitterMs += 900;
    link.status = "delayed";
  }

  if (activeFailureModes.includes("payload_pressure") && byId.has("lorawan")) {
    const link = byId.get("lorawan");
    link.maxPayloadBytes = 48;
    link.status = link.status === "available" ? "constrained" : link.status;
  }

  return links;
}

function maxLatencyForTraffic(trafficClass) {
  if (String(trafficClass).includes("P0")) return 4500;
  if (String(trafficClass).includes("P1")) return 6000;
  return 15000;
}

function routeOutcomeForCommand(command, links) {
  const link = links.find((item) => item.id === command.selectedPath) || {
    id: command.selectedPath || "none",
    name: titleFromId(command.selectedPath || "none"),
    class: "unknown",
    status: "missing",
    latencyMs: 0,
    jitterMs: 0,
    maxPayloadBytes: 0,
    ackSupported: false,
  };
  const payloadFits = command.encodedBytes === 0 || command.encodedBytes <= link.maxPayloadBytes;
  const pathAvailable = !["down", "missing"].includes(link.status);
  const latencyFits = link.latencyMs <= maxLatencyForTraffic(command.trafficClass);
  const ackFits = !command.ackRequired || link.ackSupported;

  return {
    commandId: command.id,
    deviceId: command.deviceId,
    selectedPath: command.selectedPath,
    trafficClass: command.trafficClass,
    encodedBytes: command.encodedBytes,
    maxPayloadBytes: link.maxPayloadBytes,
    latencyMs: link.latencyMs,
    jitterMs: link.jitterMs,
    ackRequired: command.ackRequired,
    ackSupported: link.ackSupported,
    payloadFits,
    pathAvailable,
    latencyFits,
    ackFits,
    status: payloadFits && pathAvailable && latencyFits && ackFits ? "pass" : "fail",
  };
}

function statusForVariant(evaluation, routeOutcomes, variant) {
  const expectedOutcome = variant.expectedOutcome || "passed";
  if (evaluation.matchedRuleCount === 0) return expectedOutcome === "safe_hold" ? "safe_hold" : "failed_no_match";
  if (routeOutcomes.some((outcome) => outcome.status === "fail")) return "failed";
  if (evaluation.blockedCount > 0) return expectedOutcome === "safe_hold" ? "safe_hold" : "blocked";
  if (evaluation.pendingApprovalCount > 0) return "passed_pending_approval";
  return "passed";
}

function safetyVerdict(status) {
  if (status === "safe_hold") return "held_safe";
  if (status === "passed_pending_approval") return "simulation_passed_attach_to_approval";
  if (status === "passed") return "simulation_passed";
  return "simulation_failed_review_required";
}

function buildApprovalAttachments(reportId, simulationScenario, variant, evaluation, routeOutcomes, status) {
  const routesByCommand = new Map(routeOutcomes.map((outcome) => [outcome.commandId, outcome]));
  return evaluation.commands
    .filter((command) => command.approvalRequired)
    .map((command) => {
      const route = routesByCommand.get(command.id);
      return {
        id: `sim-attach-${reportId}-${variant.id}-${command.id}`,
        reportId,
        scenarioId: simulationScenario.id,
        variantId: variant.id,
        commandId: command.id,
        ruleId: command.ruleId,
        status: "attached",
        safetyVerdict: safetyVerdict(status),
        evidence: [
          `simulation:${simulationScenario.id}`,
          `variant:${variant.id}`,
          `route:${command.selectedPath}`,
          `payload:${command.encodedBytes}/${route?.maxPayloadBytes || 0}`,
        ],
      };
    });
}

function buildVariantResult({ reportId, lab, simulationScenario, automationEngine, deviceRegistry, variant, requestedFailureModes, actor }) {
  const modeById = failureModeMap(lab);
  const activeFailureModes = unique([...safeArray(variant.failureModes), ...safeArray(requestedFailureModes)]);
  const automationScenario = findScenario(automationEngine, simulationScenario.automationScenarioId);
  if (!automationScenario) {
    return {
      id: variant.id,
      name: variant.name,
      status: "failed_no_scenario",
      failureModes: activeFailureModes,
      failureModeDetails: activeFailureModes.map((mode) => modeById.get(mode)).filter(Boolean),
      automation: null,
      links: buildLinksForVariant(lab, activeFailureModes),
      routeOutcomes: [],
      approvalAttachments: [],
      safetyVerdict: "simulation_failed_review_required",
    };
  }

  const registry = registryForVariant(deviceRegistry, variant, activeFailureModes);
  const scenario = scenarioForVariant(automationScenario, simulationScenario, variant, activeFailureModes);
  const links = buildLinksForVariant(lab, activeFailureModes);
  const evaluation = evaluateAutomation(automationEngine, registry, scenario, actor);
  const routeOutcomes = evaluation.commands.map((command) => routeOutcomeForCommand(command, links));
  const status = statusForVariant(evaluation, routeOutcomes, variant);
  const approvalAttachments = buildApprovalAttachments(reportId, simulationScenario, variant, evaluation, routeOutcomes, status);

  return {
    id: variant.id,
    name: variant.name,
    status,
    expectedOutcome: variant.expectedOutcome || "passed",
    failureModes: activeFailureModes,
    failureModeDetails: activeFailureModes.map((mode) => modeById.get(mode)).filter(Boolean),
    automation: evaluation,
    links,
    routeOutcomes,
    approvalAttachments,
    safetyVerdict: safetyVerdict(status),
  };
}

function reportStatus(variants) {
  if (variants.some((variant) => variant.status.startsWith("failed") || variant.status === "blocked")) return "failed";
  if (variants.some((variant) => variant.status === "passed_pending_approval")) return "passed_pending_approval";
  if (variants.every((variant) => variant.status === "safe_hold")) return "safe_hold";
  return "passed";
}

function buildReportSummary(variants) {
  const commands = variants.flatMap((variant) => variant.automation?.commands || []);
  const routeOutcomes = variants.flatMap((variant) => variant.routeOutcomes || []);
  const attachments = variants.flatMap((variant) => variant.approvalAttachments || []);
  const byStatus = variants.reduce((acc, variant) => {
    acc[variant.status] = (acc[variant.status] || 0) + 1;
    return acc;
  }, {});

  return {
    variantCount: variants.length,
    passedCount: variants.filter((variant) => variant.status === "passed" || variant.status === "passed_pending_approval").length,
    safeHoldCount: variants.filter((variant) => variant.status === "safe_hold").length,
    failedCount: variants.filter((variant) => variant.status.startsWith("failed") || variant.status === "blocked").length,
    commandCount: commands.length,
    pendingApprovalCount: commands.filter((command) => command.status === "pending_approval").length,
    blockedCommandCount: commands.filter((command) => command.status === "blocked").length,
    approvalAttachmentCount: attachments.length,
    routePassCount: routeOutcomes.filter((outcome) => outcome.status === "pass").length,
    routeFailCount: routeOutcomes.filter((outcome) => outcome.status === "fail").length,
    byStatus,
  };
}

function buildSimulationEvents(report, actor) {
  const timestamp = report.createdAt;
  return [
    {
      id: `sim-${report.reportId}-report`,
      timestamp,
      tenant: "vendorlogic.io",
      siteId: null,
      zoneId: null,
      deviceId: null,
      moduleId: "simulation-lab",
      stream: "policy",
      severity: report.status === "failed" ? "warning" : "info",
      actor: { type: "service", id: "simulation-lab", displayName: "Simulation Lab" },
      action: "simulation.report.generated",
      summary: `${report.scenario.name} completed with ${report.summary.variantCount} variant(s) and ${report.status.replace(/_/g, " ")} status.`,
      status: report.status,
      trafficClass: report.scenario.trafficClass,
      auditRequired: true,
      payload: {
        actor: actor?.subject || "local-dev-operator",
        scenarioId: report.scenario.id,
        approvalAttachmentCount: report.summary.approvalAttachmentCount,
      },
    },
  ];
}

export function runSimulation({
  lab = loadSimulationLab(),
  automationEngine,
  deviceRegistry,
  scenarioId,
  variantId,
  failureModes = [],
  actor = {},
} = {}) {
  const simulationScenario = findSimulationScenario(lab, scenarioId || lab.lab?.defaultScenario);
  if (!simulationScenario) {
    return {
      error: "simulation_scenario_not_found",
      id: scenarioId || lab.lab?.defaultScenario,
    };
  }

  const variants = selectedVariants(simulationScenario, variantId);
  if (variantId && variants.length === 0) {
    return {
      error: "simulation_variant_not_found",
      id: variantId,
      scenarioId: simulationScenario.id,
    };
  }

  const reportId = `sim_report_${simulationScenario.id}_${Date.now()}`;
  const createdAt = new Date().toISOString();
  const variantResults = variants.map((variant) => buildVariantResult({
    reportId,
    lab,
    simulationScenario,
    automationEngine,
    deviceRegistry,
    variant,
    requestedFailureModes: failureModes,
    actor,
  }));
  const status = reportStatus(variantResults);
  const summary = buildReportSummary(variantResults);
  const report = {
    reportId,
    createdAt,
    lab: lab.lab,
    scenario: {
      id: simulationScenario.id,
      name: simulationScenario.name,
      moduleId: simulationScenario.moduleId,
      automationScenarioId: simulationScenario.automationScenarioId,
      risk: simulationScenario.risk,
      trafficClass: simulationScenario.trafficClass,
      objective: simulationScenario.objective,
    },
    status,
    summary,
    variants: variantResults,
    approvalAttachments: variantResults.flatMap((variant) => variant.approvalAttachments),
    nextActions: status === "failed"
      ? ["review_failed_variant", "adjust_policy_or_route", "rerun_simulation"]
      : summary.approvalAttachmentCount > 0
        ? ["attach_report_to_approval", "request_human_approval", "preserve_command_boundary"]
        : ["record_simulation_pass", "continue_policy_workflow"],
  };

  return {
    ...report,
    events: buildSimulationEvents(report, actor),
  };
}

export function buildApprovalSimulationEvidence({
  lab = loadSimulationLab(),
  automationEngine,
  deviceRegistry,
  scenarioId = "sim-cottage-broadband-outage",
} = {}) {
  const report = runSimulation({
    lab,
    automationEngine,
    deviceRegistry,
    scenarioId,
    variantId: findSimulationScenario(lab, scenarioId)?.defaultVariantId,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.AgentApprover"] },
  });
  const byCommandId = {};
  for (const attachment of report.approvalAttachments || []) {
    byCommandId[attachment.commandId] = {
      required: true,
      attached: true,
      reportId: attachment.reportId,
      scenarioId: attachment.scenarioId,
      variantId: attachment.variantId,
      status: report.status,
      safetyVerdict: attachment.safetyVerdict,
      evidence: attachment.evidence,
    };
  }
  return { report, byCommandId };
}

function recentReportSummary(report) {
  return {
    reportId: report.reportId,
    createdAt: report.createdAt,
    scenarioId: report.scenario.id,
    scenarioName: report.scenario.name,
    status: report.status,
    variantCount: report.summary.variantCount,
    approvalAttachmentCount: report.summary.approvalAttachmentCount,
    routePassCount: report.summary.routePassCount,
    routeFailCount: report.summary.routeFailCount,
    nextActions: report.nextActions,
  };
}

export function buildSimulationDashboard({
  lab = loadSimulationLab(),
  automationEngine,
  deviceRegistry,
} = {}) {
  const summary = summarizeSimulationLab(lab);
  const previewReports = (lab.scenarios || []).slice(0, 3).map((scenario) =>
    runSimulation({
      lab,
      automationEngine,
      deviceRegistry,
      scenarioId: scenario.id,
      variantId: scenario.defaultVariantId,
      actor: { subject: "simulation-preview", name: "Simulation Preview", roles: ["Automation.Operator"] },
    }),
  );

  return {
    lab: lab.lab,
    summary: {
      ...summary,
      recentReportCount: previewReports.length,
      recentApprovalAttachmentCount: previewReports.reduce((total, report) => total + (report.summary?.approvalAttachmentCount || 0), 0),
    },
    links: lab.links || [],
    simulatedDevices: lab.simulatedDevices || [],
    failureModes: lab.failureModes || [],
    scenarios: lab.scenarios || [],
    reportTemplates: lab.reportTemplates || [],
    recentReports: previewReports.map(recentReportSummary),
    rule: lab.lab?.rule,
  };
}
