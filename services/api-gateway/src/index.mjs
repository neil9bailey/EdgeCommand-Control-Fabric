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

const secretLoadSummary = await loadExternalSecrets();
const authConfig = buildAuthConfig();
const secretProviderStatus = getSecretProviderStatus(process.env, secretLoadSummary);
const app = express();
const port = Number(process.env.API_GATEWAY_PORT || process.env.PORT || 3101);
const catalog = loadCatalog();
const deviceRegistry = loadDeviceRegistry();
const eventLedger = loadEventLedger();
const automationEngine = loadAutomationEngine();
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
      agentMode: "deterministic mock",
      deviceRegistry: `${deviceSummary.deviceCount} devices / ${deviceSummary.capabilityCount} capabilities`,
      eventLedger: `${eventSummary.eventCount} events / ${eventSummary.auditRequired} audit-bound`,
      automationEngine: `${automationSummary.armedRules} armed rules / ${automationSummary.policyCount} policies`,
    },
    links: defaultLinkInventory(),
  };
}

function keywordScore(text, mod) {
  const haystack = [
    mod.id,
    mod.name,
    mod.category,
    mod.description,
    ...(mod.capabilities || []),
    ...(mod.services || []),
    ...(mod.adapters || []),
    ...(mod.policies || []),
  ].join(" ").toLowerCase();

  return text
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((token) => token.length > 2)
    .reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

function proposeFromIntent(intent) {
  const text = String(intent || "");
  const scored = catalog.modules
    .map((mod) => ({ mod, score: keywordScore(text, mod) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const fallback = ["water-management", "narrowband-control-plane", "simulation-lab", "safety-policy"]
    .map((id) => ({ mod: findModule(catalog, id), score: 1 }))
    .filter((item) => item.mod);

  const matches = scored.length ? scored : fallback;
  const highRisk = matches.some(({ mod }) => mod.risk === "high");
  const narrowband = matches.some(({ mod }) => mod.narrowbandSuitability);

  return {
    session_id: `intent_${Date.now()}`,
    created_at: now(),
    input: text,
    aip: {
      role: "Automation Intent Partner",
      rule: "propose only",
      proposals: matches.map(({ mod }, index) => ({
        proposal_id: `proposal_${index + 1}`,
        module_id: mod.id,
        title: `Enable or configure ${mod.name}`,
        target_dashboard: mod.dashboards?.[0] || "Global Command Centre",
        risk: mod.risk,
        expected_impact: mod.description,
        required_services: mod.services,
        required_capabilities: mod.capabilities,
        status: "proposed",
      })),
    },
    kra: {
      role: "Knowledge And Risk Agent",
      rule: "critique only",
      status: highRisk ? "needs_review" : "ok",
      grounding_pointers: matches.map(({ mod }) => `${mod.id}:${mod.policies?.[0] || "module-policy"}`),
      critique: highRisk
        ? "One or more proposals can affect physical safety or remote control. Require simulation and explicit approval."
        : "No high-risk controls detected in this proposal set.",
      narrowband_note: narrowband
        ? "Narrowband path is suitable only for compact signed commands, telemetry deltas, and acknowledgements."
        : "No constrained-link dependency detected.",
    },
    next_actions: ["simulate", "review_policy", "approve_or_modify"],
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
  res.json(buildApprovalQueue(automationEngine, deviceRegistry));
});

app.get("/api/narrowband/routes", (_req, res) => {
  res.json(defaultNarrowbandRoutes());
});

app.post(
  "/api/intent/propose",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json({
      ...proposeFromIntent(req.body?.intent || ""),
      actor: {
        subject: req.auth?.subject,
        name: req.auth?.name,
        roles: req.auth?.roles || [],
      },
    });
  },
);

app.listen(port, () => {
  console.log(`api-gateway listening on http://localhost:${port}`);
});
