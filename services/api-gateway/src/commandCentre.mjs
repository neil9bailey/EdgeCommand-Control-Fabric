import { summarizeAutomationEngine } from "./automationEngine.mjs";
import {
  buildApprovalDashboard,
  buildApprovalQueue as buildWorkflowApprovalQueue,
} from "./approvalWorkflow.mjs";
import { summarizeDeviceRegistry } from "./deviceRegistry.mjs";
import { filterEvents, summarizeEventLedger } from "./eventLedger.mjs";
import { buildKraDashboard, summarizeKraEngine } from "./kraEngine.mjs";
import { summarizeMcpOrchestrator } from "./mcpOrchestrator.mjs";
import {
  buildSimulationDashboard,
  summarizeSimulationLab,
} from "./simulationLab.mjs";

function titleFromId(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function deviceRisk(device, registry) {
  const capabilityRisk = new Map((registry.capabilityDefinitions || []).map((capability) => [capability.id, capability.risk]));
  if ((device.capabilities || []).some((capability) => capabilityRisk.get(capability) === "high")) return "high";
  if ((device.capabilities || []).some((capability) => capabilityRisk.get(capability) === "medium")) return "medium";
  return "low";
}

export function defaultLinkInventory() {
  return [
    { id: "lan", name: "Local LAN", class: "lan_local", status: "healthy", score: 98, carries: ["P0", "P1", "P2", "P3", "P4"] },
    { id: "broadband", name: "Broadband WAN", class: "wan_broadband", status: "degraded", score: 71, carries: ["P1", "P2", "P3", "P4"] },
    { id: "lte-m", name: "LTE-M Remote", class: "cellular_ltem", status: "standby", score: 64, carries: ["P0", "P1", "P2", "P3"] },
    { id: "lorawan", name: "LoRaWAN Emergency", class: "lorawan", status: "ready", score: 82, carries: ["P0", "P1", "P3"] },
  ];
}

export function defaultNarrowbandRoutes() {
  return {
    controller: "semantic-narrowband-sdwan",
    routes: [
      {
        id: "route_water_p0",
        command: "close remote cottage water valve",
        class: "P0_EMERGENCY",
        selectedPath: "lorawan",
        encodedBytes: 46,
        ttlSeconds: 300,
        ackRequired: true,
        status: "ready",
      },
      {
        id: "route_security_p1",
        command: "remote gate state check",
        class: "P1_SECURITY",
        selectedPath: "lte-m",
        encodedBytes: 64,
        ttlSeconds: 180,
        ackRequired: true,
        status: "standby",
      },
      {
        id: "route_camera_p4",
        command: "camera clip upload",
        class: "P4_BULK",
        selectedPath: "blocked",
        encodedBytes: 0,
        ttlSeconds: 0,
        ackRequired: false,
        status: "blocked_from_narrowband",
      },
    ],
    rule: "LoRaWAN carries semantic commands and telemetry deltas only, never rich media or firmware.",
  };
}

export function buildApprovalQueue(automationEngine, deviceRegistry, simulationLab = null, approvalWorkflow = null, context = {}) {
  return buildWorkflowApprovalQueue({
    workflow: approvalWorkflow || undefined,
    automationEngine,
    deviceRegistry,
    simulationLab,
    ...context,
  });
}

function buildWorkspaces({ catalog, deviceSummary, eventSummary, automationSummary, approvalSummary, mcpSummary, kraSummary, simulationSummary, links, routes, authStatus }) {
  const onlineDevices = deviceSummary.byStatus.online || 0;
  const degradedLinks = links.filter((link) => link.status !== "healthy" && link.status !== "ready").length;
  const blockedRoutes = routes.filter((route) => String(route.status).includes("blocked")).length;
  const foundationModules = (catalog.modules || []).filter((module) => ["foundation", "hero"].includes(module.state)).length;

  return [
    {
      id: "modules",
      label: "Modules",
      headline: `${foundationModules} foundations online`,
      detail: `${catalog.modules.length} manifest-backed product surfaces`,
      status: "ready",
      metrics: [
        { label: "Total", value: catalog.modules.length },
        { label: "High Risk", value: catalog.modules.filter((module) => module.risk === "high").length },
        { label: "Narrowband", value: catalog.modules.filter((module) => module.narrowbandSuitability).length },
      ],
    },
    {
      id: "devices",
      label: "Devices",
      headline: `${onlineDevices}/${deviceSummary.deviceCount} online`,
      detail: `${deviceSummary.highRiskDevices} high-risk devices, ${deviceSummary.narrowbandEligible} narrowband eligible`,
      status: deviceSummary.byStatus.degraded ? "attention" : "ready",
      metrics: [
        { label: "Sites", value: deviceSummary.siteCount },
        { label: "Zones", value: deviceSummary.zoneCount },
        { label: "Capabilities", value: deviceSummary.capabilityCount },
      ],
    },
    {
      id: "automations",
      label: "Automations",
      headline: `${automationSummary.armedRules} rules armed`,
      detail: `${automationSummary.policyCount} safety policies, ${approvalSummary.pending} pending approval`,
      status: approvalSummary.pending > 0 ? "attention" : "ready",
      metrics: [
        { label: "Rules", value: automationSummary.ruleCount },
        { label: "P0", value: automationSummary.p0Rules },
        { label: "Scenes", value: automationSummary.sceneCount },
      ],
    },
    {
      id: "approvals",
      label: "Approvals",
      headline: `${approvalSummary.pending} pending decision`,
      detail: `${approvalSummary.simulationAttached || 0} simulation attachment, ${approvalSummary.readyForApproval || 0} ready for human approval`,
      status: approvalSummary.pending > 0 ? "attention" : "ready",
      metrics: [
        { label: "Pending", value: approvalSummary.pending },
        { label: "Ready", value: approvalSummary.readyForApproval || 0 },
        { label: "Policies", value: approvalSummary.policyRuleCount || 0 },
      ],
    },
    {
      id: "agents",
      label: "Agents",
      headline: `${mcpSummary.enabledTools} tools registered`,
      detail: `${mcpSummary.agentCount} agents, ${mcpSummary.approvalRequiredTools} explicit permission gates`,
      status: mcpSummary.approvalRequiredTools > 0 ? "attention" : "ready",
      metrics: [
        { label: "Tools", value: mcpSummary.toolCount },
        { label: "High Risk", value: mcpSummary.highRiskTools },
        { label: "Sessions", value: mcpSummary.activeSessions },
      ],
    },
    {
      id: "risk",
      label: "Risk",
      headline: `${kraSummary.enabledRulePacks} KRA packs enabled`,
      detail: `${kraSummary.sourceCount} evidence sources, ${kraSummary.blockingRulePacks} blocking boundary`,
      status: kraSummary.blockingRulePacks > 0 ? "governed" : "ready",
      metrics: [
        { label: "Sources", value: kraSummary.sourceCount },
        { label: "Rules", value: kraSummary.rulePackCount },
        { label: "Seeds", value: kraSummary.seedEvaluationCount },
      ],
    },
    {
      id: "simulations",
      label: "Simulations",
      headline: `${simulationSummary.scenarioCount} labs ready`,
      detail: `${simulationSummary.variantCount} variants, ${simulationSummary.failureModeCount} injectable failures`,
      status: simulationSummary.approvalAttachmentReady > 0 ? "governed" : "ready",
      metrics: [
        { label: "Scenarios", value: simulationSummary.scenarioCount },
        { label: "Variants", value: simulationSummary.variantCount },
        { label: "Attachments", value: approvalSummary.simulationAttached || 0 },
      ],
    },
    {
      id: "connectivity",
      label: "Connectivity",
      headline: `${links.length} paths scored`,
      detail: `${degradedLinks} degraded or standby path, ${blockedRoutes} route blocked by policy`,
      status: degradedLinks || blockedRoutes ? "attention" : "ready",
      metrics: [
        { label: "Routes", value: routes.length },
        { label: "LoRaWAN", value: routes.filter((route) => route.selectedPath === "lorawan").length },
        { label: "Blocked", value: blockedRoutes },
      ],
    },
    {
      id: "identity",
      label: "Identity",
      headline: authStatus.entraEnabled ? "Entra enforced" : "Development auth",
      detail: authStatus.secretProvider?.keyVaultEnabled ? "Shared Key Vault configured" : "Environment secret fallback",
      status: authStatus.entraEnabled ? "ready" : "governed",
      metrics: [
        { label: "Roles", value: authStatus.roles.length },
        { label: "Maps", value: authStatus.groupRoleMapEntries + authStatus.principalRoleMapEntries },
        { label: "Secrets", value: authStatus.secretProvider?.mappedEnvironmentNames?.length || 0 },
      ],
    },
    {
      id: "audit",
      label: "Audit",
      headline: `${eventSummary.auditRequired} audit-bound events`,
      detail: `${eventSummary.criticalCount} critical or P0 records, ${eventSummary.pendingApprovals} ledger approvals`,
      status: eventSummary.criticalCount > 0 ? "attention" : "ready",
      metrics: [
        { label: "Events", value: eventSummary.eventCount },
        { label: "Commands", value: eventSummary.commandCount },
        { label: "Telemetry", value: eventSummary.telemetryCount },
      ],
    },
  ];
}

function buildActionQueue({ approvals, devices, routes, auditEvents, mcpOrchestrator, kraDashboard, simulationDashboard }) {
  const approvalActions = approvals.map((approval) => ({
    id: approval.id,
    priority: approval.trafficClass,
      workspaceId: "approvals",
      title: `${approval.deviceName} approval`,
      owner: titleFromId(approval.moduleId),
      status: approval.status,
      detail: `${approval.selectedPath} path requires ${approval.requiredRoles.length} approval role(s)`,
      evidence: [...approval.reasons, approval.simulation?.attached ? "simulation-attached" : "simulation-missing"],
    }));

  const deviceActions = devices
    .filter((device) => device.status !== "online")
    .map((device) => ({
      id: `device-${device.id}`,
      priority: device.narrowbandEligible ? "P1_SECURITY" : "P3_TELEMETRY",
      workspaceId: "devices",
      title: `${device.name} ${device.status}`,
      owner: titleFromId(device.siteId),
      status: device.status,
      detail: `${device.adapter} / ${device.capabilities.join(", ")}`,
      evidence: ["device-health", device.trustTier],
    }));

  const routeActions = routes
    .filter((route) => String(route.status).includes("blocked") || route.status === "standby")
    .map((route) => ({
      id: `route-${route.id}`,
      priority: route.class,
      workspaceId: "connectivity",
      title: titleFromId(route.command),
      owner: route.selectedPath,
      status: route.status,
      detail: `${route.encodedBytes} bytes / TTL ${route.ttlSeconds}s`,
      evidence: [route.ackRequired ? "ack-required" : "no-ack", route.selectedPath],
    }));

  const auditActions = auditEvents
    .filter((event) => event.severity === "critical")
    .map((event) => ({
      id: `audit-${event.id}`,
      priority: event.trafficClass,
      workspaceId: "audit",
      title: event.summary,
      owner: titleFromId(event.moduleId),
      status: event.status,
      detail: event.action,
      evidence: [event.stream, event.actor.displayName],
    }));

  const kraActions = (kraDashboard?.seedEvaluations || [])
    .filter((evaluation) => evaluation.status !== "ok")
    .map((evaluation) => ({
      id: `kra-${evaluation.id}`,
      priority: evaluation.status === "conflict" ? "P0_EMERGENCY" : "P2_CONTROL",
      workspaceId: "risk",
      title: titleFromId(evaluation.id),
      owner: "kra-agent",
      status: evaluation.status,
      detail: evaluation.summary,
      evidence: [evaluation.intentClass, "critique-only"],
    }));

  const simulationActions = (simulationDashboard?.recentReports || [])
    .filter((report) => report.approvalAttachmentCount > 0 || report.status !== "passed")
    .map((report) => ({
      id: `simulation-${report.reportId}`,
      priority: report.status === "failed" ? "P0_EMERGENCY" : "P2_CONTROL",
      workspaceId: "simulations",
      title: report.scenarioName,
      owner: "simulation-lab",
      status: report.status,
      detail: `${report.variantCount} variant(s), ${report.approvalAttachmentCount} approval attachment(s)`,
      evidence: [`route-pass:${report.routePassCount}`, `route-fail:${report.routeFailCount}`],
    }));

  const toolsById = new Map((mcpOrchestrator?.tools || []).map((tool) => [tool.id, tool]));
  const mcpActions = (mcpOrchestrator?.toolCalls || [])
    .filter((call) => call.status === "requires_permission")
    .map((call) => {
      const tool = toolsById.get(call.toolId);
      return {
        id: `mcp-${call.id}`,
        priority: tool?.trafficClass || "P2_CONTROL",
        workspaceId: "agents",
        title: `${tool?.name || call.toolId} permission`,
        owner: tool?.agentId || "mcp-orchestrator",
        status: call.status,
        detail: call.summary,
        evidence: [call.decision, tool?.moduleId || "mcp-orchestrator"],
      };
    });

  return [...approvalActions, ...mcpActions, ...kraActions, ...simulationActions, ...deviceActions, ...routeActions, ...auditActions].slice(0, 12);
}

export function buildCommandCentre({ catalog, deviceRegistry, eventLedger, automationEngine, mcpOrchestrator, kraEngine, simulationLab, approvalWorkflow, authStatus }) {
  const deviceSummary = summarizeDeviceRegistry(deviceRegistry);
  const eventSummary = summarizeEventLedger(eventLedger);
  const automationSummary = summarizeAutomationEngine(automationEngine);
  const mcpSummary = summarizeMcpOrchestrator(mcpOrchestrator);
  const kraSummary = summarizeKraEngine(kraEngine);
  const simulationSummary = summarizeSimulationLab(simulationLab);
  const kraDashboard = buildKraDashboard({
    engine: kraEngine,
    catalog,
    deviceRegistry,
    automationEngine,
    eventLedger,
    mcpOrchestrator,
  });
  const simulationDashboard = buildSimulationDashboard({
    lab: simulationLab,
    automationEngine,
    deviceRegistry,
  });
  const approvalQueue = buildApprovalDashboard({
    workflow: approvalWorkflow,
    automationEngine,
    deviceRegistry,
    simulationLab,
    kraEngine,
    catalog,
    eventLedger,
    mcpOrchestrator,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.AgentApprover"] },
  });
  const links = defaultLinkInventory();
  const narrowbandRoutes = defaultNarrowbandRoutes();
  const auditEvents = filterEvents(eventLedger, { auditRequired: "true", limit: 8 });
  const workspaces = buildWorkspaces({
    catalog,
    deviceSummary,
    eventSummary,
    automationSummary,
    approvalSummary: approvalQueue.summary,
    mcpSummary,
    kraSummary,
    simulationSummary,
    links,
    routes: narrowbandRoutes.routes,
    authStatus,
  });

  const devices = (deviceRegistry.devices || []).map((device) => {
    const site = (deviceRegistry.sites || []).find((entry) => entry.id === device.siteId);
    const zone = (deviceRegistry.zones || []).find((entry) => entry.id === device.zoneId);
    return {
      id: device.id,
      name: device.name,
      siteId: device.siteId,
      siteName: site?.name || titleFromId(device.siteId),
      zoneId: device.zoneId,
      zoneName: zone?.name || titleFromId(device.zoneId),
      adapter: device.adapter,
      status: device.status,
      risk: deviceRisk(device, deviceRegistry),
      trustTier: device.trustTier,
      lastSeen: device.lastSeen,
      capabilities: device.capabilities || [],
      narrowbandEligible: Boolean(device.narrowbandEligible),
    };
  });

  return {
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    product: catalog.product,
    posture: {
      readiness: "local_operational",
      api: "online",
      dockerDesktop: true,
      safetyPosture: approvalQueue.summary.pending > 0 ? "approval_required" : "governed",
      identityMode: authStatus.normalizedMode,
      secretProvider: authStatus.secretProvider?.keyVaultEnabled ? "azure-key-vault" : "environment",
      unresolvedApprovals: approvalQueue.summary.pending,
      criticalEvents: eventSummary.criticalCount,
      degradedDevices: devices.filter((device) => device.status !== "online").length,
      constrainedRoutes: narrowbandRoutes.routes.filter((route) => route.selectedPath === "lorawan").length,
    },
    workspaces,
    actionQueue: buildActionQueue({
      approvals: approvalQueue.approvals,
      devices,
      routes: narrowbandRoutes.routes,
      auditEvents,
      mcpOrchestrator,
      kraDashboard,
      simulationDashboard,
    }),
    modules: {
      byState: catalog.modules.reduce((acc, module) => {
        acc[module.state] = (acc[module.state] || 0) + 1;
        return acc;
      }, {}),
      hero: catalog.modules.filter((module) => module.state === "hero").map((module) => module.id),
      next: catalog.modules.filter((module) => module.state === "next").map((module) => module.id),
      foundations: catalog.modules.filter((module) => module.state === "foundation").map((module) => module.id),
    },
    devices,
    automations: {
      rules: automationEngine.rules || [],
      policies: automationEngine.policyDefinitions || [],
      scenes: automationEngine.scenes || [],
      scenarios: automationEngine.scenarios || [],
      approvals: approvalQueue.approvals,
      summary: automationSummary,
    },
    approvals: approvalQueue,
    agents: {
      orchestrator: mcpOrchestrator.orchestrator,
      tools: mcpOrchestrator.tools || [],
      agents: mcpOrchestrator.agents || [],
      sessions: mcpOrchestrator.sessions || [],
      audit: mcpOrchestrator.toolCalls || [],
      summary: mcpSummary,
    },
    risk: kraDashboard,
    simulations: simulationDashboard,
    connectivity: {
      links,
      routes: narrowbandRoutes.routes,
      rule: narrowbandRoutes.rule,
    },
    identity: {
      mode: authStatus.mode,
      normalizedMode: authStatus.normalizedMode,
      tenant: authStatus.tenant,
      audience: authStatus.audience,
      entraEnabled: authStatus.entraEnabled,
      roles: authStatus.roles,
      keyVaultEnabled: Boolean(authStatus.secretProvider?.keyVaultEnabled),
      secretProvider: authStatus.secretProvider,
    },
    audit: {
      events: auditEvents,
      summary: eventSummary,
    },
  };
}
