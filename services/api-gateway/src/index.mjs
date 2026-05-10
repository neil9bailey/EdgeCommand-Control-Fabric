import express from "express";
import cors from "cors";
import { loadCatalog, summarizeCatalog, findModule } from "./catalog.mjs";
import {
  filterDevices,
  findDevice,
  loadDeviceRegistry,
  summarizeDeviceRegistry,
} from "./deviceRegistry.mjs";
import {
  filterEvents,
  loadEventLedger,
  summarizeEventLedger,
  summarizeTelemetry,
} from "./eventLedger.mjs";
import {
  EDGE_ROLES,
  buildAuthConfig,
  createAuthMiddleware,
  publicAuthStatus,
  requireRoles,
} from "./auth.mjs";
import { getSecretProviderStatus, loadExternalSecrets } from "./secrets.mjs";
import {
  evaluateAutomation,
  findScenario,
  loadAutomationEngine,
  summarizeAutomationEngine,
} from "./automationEngine.mjs";
import {
  buildApprovalQueue,
  buildCommandCentre,
  defaultLinkInventory,
  defaultNarrowbandRoutes,
} from "./commandCentre.mjs";
import {
  executeMcpTool,
  filterMcpTools,
  findMcpSession,
  findMcpTool,
  listMcpAudit,
  loadMcpOrchestrator,
  planMcpSession,
  summarizeMcpOrchestrator,
} from "./mcpOrchestrator.mjs";
import {
  createIntentSession,
  listIntentSeedSessions,
  loadIntentEngine,
  recordIntentDecision,
  summarizeIntentEngine,
} from "./intentEngine.mjs";
import {
  buildKraDashboard,
  evaluateKraContext,
  loadKraEngine,
  summarizeKraEngine,
} from "./kraEngine.mjs";
import {
  buildSimulationDashboard,
  loadSimulationLab,
  runSimulation,
  summarizeSimulationLab,
} from "./simulationLab.mjs";

const secretLoadSummary = await loadExternalSecrets();
const authConfig = buildAuthConfig();
const secretProviderStatus = getSecretProviderStatus(process.env, secretLoadSummary);
const app = express();
const port = Number(process.env.API_GATEWAY_PORT || process.env.PORT || 3101);
const catalog = loadCatalog();
const deviceRegistry = loadDeviceRegistry();
const eventLedger = loadEventLedger();
const automationEngine = loadAutomationEngine();
const mcpOrchestrator = loadMcpOrchestrator();
const intentEngine = loadIntentEngine();
const kraEngine = loadKraEngine();
const simulationLab = loadSimulationLab();
const publicPaths = new Set(["/health", "/auth/status"]);

app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: "256kb" }));
app.use(createAuthMiddleware({ config: authConfig, publicPaths, secretProvider: secretProviderStatus }));

function now() {
  return new Date().toISOString();
}

function buildOverview() {
  const summary = summarizeCatalog(catalog);
  const deviceSummary = summarizeDeviceRegistry(deviceRegistry);
  const eventSummary = summarizeEventLedger(eventLedger);
  const automationSummary = summarizeAutomationEngine(automationEngine);
  const mcpSummary = summarizeMcpOrchestrator(mcpOrchestrator);
  const intentSummary = summarizeIntentEngine(intentEngine);
  const kraSummary = summarizeKraEngine(kraEngine);
  const simulationSummary = summarizeSimulationLab(simulationLab);
  return {
    ...summary,
    devices: deviceSummary,
    events: eventSummary,
    automation: automationSummary,
    runtime: {
      service: "api-gateway",
      mode: process.env.AUTH_MODE || "development",
      time: now(),
      dockerDesktopTarget: true,
      azureTarget: "Azure Container Apps",
    },
    identity: publicAuthStatus(authConfig, secretProviderStatus),
    commandCentre: {
      readiness: "foundation",
      activeSite: "Home HQ + Remote Cottage",
      safetyPosture: "governed",
      pendingApprovals: eventSummary.pendingApprovals,
      criticalEvents: eventSummary.criticalCount,
      narrowbandReadiness: "simulated",
      deviceRegistry: `${deviceSummary.deviceCount} devices / ${deviceSummary.capabilityCount} capabilities`,
      eventLedger: `${eventSummary.eventCount} events / ${eventSummary.auditRequired} audit-bound`,
      automationEngine: `${automationSummary.armedRules} armed rules / ${automationSummary.policyCount} policies`,
      agentMode: `${mcpSummary.enabledTools} MCP tools / ${mcpSummary.approvalRequiredTools} permission gates`,
      intentEngine: `${intentSummary.frameCount} intent frames / propose-only`,
      riskAgent: `${kraSummary.rulePackCount} KRA rule packs / ${kraSummary.sourceCount} sources`,
      simulationLab: `${simulationSummary.scenarioCount} labs / ${simulationSummary.variantCount} variants`,
    },
    links: defaultLinkInventory(),
  };
}

app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "api-gateway",
    time: now(),
    modules: catalog.modules.length,
    auth: {
      mode: authConfig.rawMode,
      entraEnabled: authConfig.enabled,
      keyVaultEnabled: secretProviderStatus.keyVaultEnabled,
    },
  });
});

app.get("/auth/status", (_req, res) => {
  res.json(publicAuthStatus(authConfig, secretProviderStatus));
});

app.get("/auth/me", requireRoles(EDGE_ROLES), (req, res) => {
  res.json({
    principal: req.auth,
  });
});

app.get("/api/platform/overview", (_req, res) => {
  res.json(buildOverview());
});

app.get("/api/command-centre", (_req, res) => {
  res.json(buildCommandCentre({
    catalog,
    deviceRegistry,
    eventLedger,
    automationEngine,
    mcpOrchestrator,
    kraEngine,
    simulationLab,
    authStatus: publicAuthStatus(authConfig, secretProviderStatus),
  }));
});

app.get("/api/modules", (_req, res) => {
  res.json({
    product: catalog.product,
    categories: catalog.categories,
    modules: catalog.modules,
    summary: summarizeCatalog(catalog),
  });
});

app.get("/api/modules/:id", (req, res) => {
  const mod = findModule(catalog, req.params.id);
  if (!mod) {
    res.status(404).json({ error: "module_not_found", id: req.params.id });
    return;
  }
  res.json({ module: mod });
});

app.get("/api/sites", (_req, res) => {
  res.json({
    sites: deviceRegistry.sites,
    zones: deviceRegistry.zones,
  });
});

app.get("/api/capabilities", (_req, res) => {
  res.json({
    capabilities: deviceRegistry.capabilityDefinitions,
    summary: summarizeDeviceRegistry(deviceRegistry).capabilityUse,
  });
});

app.get("/api/devices", (req, res) => {
  const devices = filterDevices(deviceRegistry, req.query);
  res.json({
    devices,
    summary: summarizeDeviceRegistry({
      ...deviceRegistry,
      devices,
    }),
    filters: req.query,
  });
});

app.get("/api/devices/:id", (req, res) => {
  const device = findDevice(deviceRegistry, req.params.id);
  if (!device) {
    res.status(404).json({ error: "device_not_found", id: req.params.id });
    return;
  }

  const site = deviceRegistry.sites.find((entry) => entry.id === device.siteId);
  const zone = deviceRegistry.zones.find((entry) => entry.id === device.zoneId);
  const capabilities = device.capabilities.map((id) =>
    deviceRegistry.capabilityDefinitions.find((entry) => entry.id === id) || { id, class: "unknown" },
  );

  res.json({
    device,
    site,
    zone,
    capabilities,
  });
});

app.get("/api/events", (req, res) => {
  const events = filterEvents(eventLedger, req.query);
  res.json({
    events,
    summary: summarizeEventLedger({
      ...eventLedger,
      events,
    }),
    filters: req.query,
  });
});

app.get("/api/audit", (_req, res) => {
  const events = filterEvents(eventLedger, { auditRequired: "true" });
  res.json({
    events,
    summary: summarizeEventLedger({
      ...eventLedger,
      events,
    }),
    durableStreams: ["audit", "command", "policy", "agent", "module"],
    rule: "Audit-bound events must remain explainable before physical actuation or constrained-link routing.",
  });
});

app.get("/api/telemetry/summary", (_req, res) => {
  res.json(summarizeTelemetry(eventLedger));
});

app.get("/api/commands", (_req, res) => {
  const events = filterEvents(eventLedger, { stream: "command" });
  res.json({
    events,
    summary: summarizeEventLedger({
      ...eventLedger,
      events,
    }),
    rule: "Commands are proposed, critiqued, policy-gated, approved, signed, routed, and acknowledged.",
  });
});

app.get("/api/automations", (_req, res) => {
  res.json({
    engine: automationEngine.engine,
    policies: automationEngine.policyDefinitions,
    rules: automationEngine.rules,
    scenes: automationEngine.scenes,
    scenarios: automationEngine.scenarios,
    summary: summarizeAutomationEngine(automationEngine),
  });
});

app.get("/api/mcp", (_req, res) => {
  res.json({
    orchestrator: mcpOrchestrator.orchestrator,
    agents: mcpOrchestrator.agents,
    permissionScopes: mcpOrchestrator.permissionScopes,
    tools: mcpOrchestrator.tools,
    sessions: mcpOrchestrator.sessions,
    audit: mcpOrchestrator.toolCalls,
    summary: summarizeMcpOrchestrator(mcpOrchestrator),
  });
});

app.get("/api/mcp/tools", (req, res) => {
  const tools = filterMcpTools(mcpOrchestrator, req.query);
  res.json({
    tools,
    summary: summarizeMcpOrchestrator({ ...mcpOrchestrator, tools }),
    filters: req.query,
  });
});

app.get("/api/mcp/tools/:id", (req, res) => {
  const tool = findMcpTool(mcpOrchestrator, req.params.id);
  if (!tool) {
    res.status(404).json({ error: "mcp_tool_not_found", id: req.params.id });
    return;
  }
  res.json({ tool });
});

app.get("/api/mcp/sessions", (_req, res) => {
  res.json({
    sessions: mcpOrchestrator.sessions,
    summary: summarizeMcpOrchestrator(mcpOrchestrator),
  });
});

app.get("/api/mcp/sessions/:id", (req, res) => {
  const session = findMcpSession(mcpOrchestrator, req.params.id);
  if (!session) {
    res.status(404).json({ error: "mcp_session_not_found", id: req.params.id });
    return;
  }
  res.json({ session });
});

app.post(
  "/api/mcp/sessions/plan",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(planMcpSession(mcpOrchestrator, req.body || {}, req.auth));
  },
);

app.post(
  "/api/mcp/tools/:id/execute",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const request = {
      ...(req.body || {}),
      toolId: req.params.id,
    };
    const result = executeMcpTool(mcpOrchestrator, request, req.auth);
    if (result.decision === "deny_unregistered") {
      res.status(404).json(result);
      return;
    }
    res.status(result.canExecute ? 200 : 403).json(result);
  },
);

app.get("/api/mcp/audit", (req, res) => {
  const audit = listMcpAudit(mcpOrchestrator, req.query);
  res.json({
    audit,
    summary: {
      total: audit.length,
      requiresPermission: audit.filter((call) => call.status === "requires_permission").length,
      completed: audit.filter((call) => call.status === "completed").length,
    },
    filters: req.query,
  });
});

app.get("/api/intent", (_req, res) => {
  res.json({
    engine: intentEngine.engine,
    frames: intentEngine.frames,
    confidenceBands: intentEngine.confidenceBands,
    proposalStates: intentEngine.proposalStates,
    seedSessions: intentEngine.seedSessions,
    summary: summarizeIntentEngine(intentEngine),
  });
});

app.get("/api/intent/sessions", (_req, res) => {
  res.json(listIntentSeedSessions(intentEngine));
});

app.get("/api/kra", (_req, res) => {
  res.json({
    ...buildKraDashboard({
      engine: kraEngine,
      catalog,
      deviceRegistry,
      automationEngine,
      eventLedger,
      mcpOrchestrator,
    }),
    statusModel: kraEngine.statusModel,
    severityModel: kraEngine.severityModel,
  });
});

app.get("/api/simulations", (_req, res) => {
  res.json(buildSimulationDashboard({
    lab: simulationLab,
    automationEngine,
    deviceRegistry,
  }));
});

app.post(
  "/api/simulations/run",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = runSimulation({
      lab: simulationLab,
      automationEngine,
      deviceRegistry,
      scenarioId: req.body?.scenarioId,
      variantId: req.body?.variantId,
      failureModes: req.body?.failureModes,
      actor: req.auth,
    });
    if (result.error === "simulation_scenario_not_found" || result.error === "simulation_variant_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/simulations/scenarios/:id/run",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = runSimulation({
      lab: simulationLab,
      automationEngine,
      deviceRegistry,
      scenarioId: req.params.id,
      variantId: req.body?.variantId,
      failureModes: req.body?.failureModes,
      actor: req.auth,
    });
    if (result.error === "simulation_scenario_not_found" || result.error === "simulation_variant_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/kra/evaluate",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(evaluateKraContext({
      engine: kraEngine,
      catalog,
      deviceRegistry,
      automationEngine,
      eventLedger,
      mcpOrchestrator,
      session: req.body?.session,
      proposals: req.body?.proposals,
      intent: req.body?.intent,
      mcp: req.body?.mcp,
      actor: req.auth,
    }));
  },
);

app.post(
  "/api/intent/sessions",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(createIntentSession({
      engine: intentEngine,
      kraEngine,
      catalog,
      deviceRegistry,
      automationEngine,
      eventLedger,
      mcpOrchestrator,
      intent: req.body?.intent || "",
      actor: req.auth,
    }));
  },
);

app.post(
  "/api/intent/sessions/:id/decisions",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(recordIntentDecision({
      sessionId: req.params.id,
      proposalId: req.body?.proposalId || "proposal_1",
      decision: req.body?.decision || "modify",
      note: req.body?.note || "",
      actor: req.auth,
    }));
  },
);

app.post(
  "/api/automations/evaluate",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const scenario = req.body?.scenarioId ? findScenario(automationEngine, req.body.scenarioId) : req.body;
    if (!scenario) {
      res.status(404).json({ error: "scenario_not_found", id: req.body?.scenarioId });
      return;
    }

    const mergedScenario = {
      ...scenario,
      ...req.body,
      event: req.body?.event || scenario.event,
    };
    res.json(evaluateAutomation(automationEngine, deviceRegistry, mergedScenario, req.auth));
  },
);

app.post(
  "/api/automations/scenarios/:id/run",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const scenario = findScenario(automationEngine, req.params.id);
    if (!scenario) {
      res.status(404).json({ error: "scenario_not_found", id: req.params.id });
      return;
    }
    res.json(evaluateAutomation(automationEngine, deviceRegistry, { ...scenario, ...req.body }, req.auth));
  },
);

app.get("/api/approvals", (_req, res) => {
  res.json(buildApprovalQueue(automationEngine, deviceRegistry, simulationLab));
});

app.get("/api/narrowband/routes", (_req, res) => {
  res.json(defaultNarrowbandRoutes());
});

app.post(
  "/api/intent/propose",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(createIntentSession({
      engine: intentEngine,
      kraEngine,
      catalog,
      deviceRegistry,
      automationEngine,
      eventLedger,
      mcpOrchestrator,
      intent: req.body?.intent || "",
      actor: req.auth,
    }));
  },
);

app.listen(port, () => {
  console.log(`api-gateway listening on http://localhost:${port}`);
});
