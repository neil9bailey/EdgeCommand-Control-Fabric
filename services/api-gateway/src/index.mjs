import express from "express";
import cors from "cors";
import { loadCatalog, summarizeCatalog, findModule } from "./catalog.mjs";

const app = express();
const port = Number(process.env.API_GATEWAY_PORT || process.env.PORT || 3101);
const catalog = loadCatalog();

app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: "256kb" }));

function now() {
  return new Date().toISOString();
}

function buildOverview() {
  const summary = summarizeCatalog(catalog);
  return {
    ...summary,
    runtime: {
      service: "api-gateway",
      mode: process.env.AUTH_MODE || "development",
      time: now(),
      dockerDesktopTarget: true,
      azureTarget: "Azure Container Apps",
    },
    commandCentre: {
      readiness: "foundation",
      activeSite: "Home HQ + Remote Cottage",
      safetyPosture: "governed",
      pendingApprovals: 4,
      criticalEvents: 1,
      narrowbandReadiness: "simulated",
      agentMode: "deterministic mock",
    },
    links: [
      { id: "lan", name: "Local LAN", class: "lan_local", status: "healthy", score: 98, carries: ["P0", "P1", "P2", "P3", "P4"] },
      { id: "broadband", name: "Broadband WAN", class: "wan_broadband", status: "degraded", score: 71, carries: ["P1", "P2", "P3", "P4"] },
      { id: "lte-m", name: "LTE-M Remote", class: "cellular_ltem", status: "standby", score: 64, carries: ["P0", "P1", "P2", "P3"] },
      { id: "lorawan", name: "LoRaWAN Emergency", class: "lorawan", status: "ready", score: 82, carries: ["P0", "P1", "P3"] }
    ],
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
  });
});

app.get("/auth/status", (_req, res) => {
  res.json({
    mode: process.env.AUTH_MODE || "development",
    tenant: process.env.ENTRA_TENANT_ID || catalog.product.tenant,
    jwt_validation: process.env.AUTH_MODE === "entra" ? "required" : "not_required_in_local_dev",
    roles: [
      "Automation.Admin",
      "Automation.Operator",
      "Automation.Viewer",
      "Automation.Installer",
      "Automation.Security",
      "Automation.AgentApprover",
    ],
  });
});

app.get("/api/platform/overview", (_req, res) => {
  res.json(buildOverview());
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

app.get("/api/narrowband/routes", (_req, res) => {
  res.json({
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
  });
});

app.post("/api/intent/propose", (req, res) => {
  res.json(proposeFromIntent(req.body?.intent || ""));
});

app.listen(port, () => {
  console.log(`api-gateway listening on http://localhost:${port}`);
});

