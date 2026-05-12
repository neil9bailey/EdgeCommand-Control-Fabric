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
  buildApprovalDashboard,
  decideApproval,
  exportApprovalAudit,
  findApprovalRecord,
  loadApprovalWorkflow,
  summarizeApprovalWorkflow,
} from "./approvalWorkflow.mjs";
import {
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
import {
  applyLightingScene,
  buildLightingDashboard,
  loadLightingScenes,
  previewLightingIntent,
  previewLightingScene,
  summarizeLightingScenes,
} from "./lightingScenes.mjs";
import {
  applyClimateProfile,
  applyClimateSetpoint,
  buildClimateDashboard,
  loadClimateHvac,
  previewClimateIntent,
  previewClimateProfile,
  previewClimateSetpoint,
  summarizeClimateHvac,
} from "./climateHvac.mjs";
import {
  applyAccessPointCommand,
  applySecurityProfile,
  buildSecurityDashboard,
  loadSecurityAccess,
  previewAccessPointCommand,
  previewSecurityIntent,
  previewSecurityProfile,
  summarizeSecurityAccess,
} from "./securityAccess.mjs";
import {
  applyWaterProfile,
  buildWaterDashboard,
  loadWaterManagement,
  previewWaterIntent,
  previewWaterProfile,
  summarizeWaterManagement,
} from "./waterManagement.mjs";
import {
  applyEnergyProfile,
  buildEnergyDashboard,
  loadEnergyManagement,
  previewEnergyIntent,
  previewEnergyProfile,
  summarizeEnergyManagement,
} from "./energyManagement.mjs";
import {
  buildSensingDashboard,
  loadSensingPresence,
  previewSensingIntent,
  previewSensingProfile,
  summarizeSensingPresence,
} from "./sensingPresence.mjs";
import {
  buildModuleManifestDashboard,
  loadModuleManifest,
  previewModuleFlag,
  previewModuleIntent,
  summarizeModuleManifest,
} from "./moduleManifest.mjs";
import {
  buildModuleBuilderDashboard,
  loadModuleBuilder,
  previewBuildIntent,
  previewBuildPlan,
  summarizeModuleBuilder,
} from "./moduleBuilder.mjs";
import {
  buildModuleMarketplaceDashboard,
  loadModuleMarketplace,
  previewMarketplaceIntent,
  previewMarketplaceRequest,
  summarizeModuleMarketplace,
} from "./moduleMarketplace.mjs";
import {
  buildModuleCertificationDashboard,
  loadModuleCertification,
  previewCertificationIntent,
  previewCertificationProfile,
  summarizeModuleCertification,
} from "./moduleCertification.mjs";
import {
  buildMqttEsphomeDashboard,
  loadMqttEsphome,
  previewMqttCommand,
  previewMqttDiscovery,
  previewMqttIntent,
  publishMqttCommand,
  summarizeMqttEsphome,
} from "./mqttEsphome.mjs";
import {
  buildMatterThreadDashboard,
  executeMatterCommand,
  loadMatterThread,
  previewMatterCommand,
  previewMatterCommissioning,
  previewMatterIntent,
  summarizeMatterThread,
} from "./matterThread.mjs";
import {
  buildZigbeeDashboard,
  executeZigbeeCommand,
  loadZigbeeAdapter,
  previewZigbeeCommand,
  previewZigbeeIntent,
  previewZigbeePermitJoin,
  previewZigbeeReporting,
  summarizeZigbeeAdapter,
} from "./zigbeeAdapter.mjs";
import {
  buildZwaveDashboard,
  executeZwaveCommand,
  loadZwaveAdapter,
  previewZwaveCommand,
  previewZwaveExclusion,
  previewZwaveInclusion,
  previewZwaveIntent,
  summarizeZwaveAdapter,
} from "./zwaveAdapter.mjs";

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
const approvalWorkflow = loadApprovalWorkflow();
const lightingScenes = loadLightingScenes();
const climateHvac = loadClimateHvac();
const securityAccess = loadSecurityAccess();
const waterManagement = loadWaterManagement();
const energyManagement = loadEnergyManagement();
const sensingPresence = loadSensingPresence();
const moduleManifest = loadModuleManifest();
const moduleBuilder = loadModuleBuilder();
const moduleMarketplace = loadModuleMarketplace();
const moduleCertification = loadModuleCertification();
const mqttEsphome = loadMqttEsphome();
const matterThread = loadMatterThread();
const zigbeeAdapter = loadZigbeeAdapter();
const zwaveAdapter = loadZwaveAdapter();
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
  const approvalSummary = summarizeApprovalWorkflow(approvalWorkflow);
  const lightingSummary = summarizeLightingScenes(lightingScenes, deviceRegistry);
  const climateSummary = summarizeClimateHvac(climateHvac, deviceRegistry);
  const securitySummary = summarizeSecurityAccess(securityAccess, deviceRegistry);
  const waterSummary = summarizeWaterManagement(waterManagement, deviceRegistry);
  const energySummary = summarizeEnergyManagement(energyManagement, deviceRegistry);
  const sensingSummary = summarizeSensingPresence(sensingPresence, deviceRegistry);
  const moduleManifestSummary = summarizeModuleManifest(moduleManifest, catalog);
  const moduleBuilderSummary = summarizeModuleBuilder(moduleBuilder, moduleManifest, catalog);
  const moduleMarketplaceSummary = summarizeModuleMarketplace(moduleMarketplace, catalog, moduleManifest, moduleBuilder);
  const moduleCertificationSummary = summarizeModuleCertification(moduleCertification, moduleMarketplace, moduleBuilder, moduleManifest, catalog);
  const mqttEsphomeSummary = summarizeMqttEsphome(mqttEsphome, deviceRegistry);
  const matterThreadSummary = summarizeMatterThread(matterThread, deviceRegistry);
  const zigbeeSummary = summarizeZigbeeAdapter(zigbeeAdapter, deviceRegistry);
  const zwaveSummary = summarizeZwaveAdapter(zwaveAdapter, deviceRegistry);
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
      approvalWorkflow: `${approvalSummary.policyRuleCount} policies / ${approvalSummary.decisionCount} decisions`,
      lightingScenes: `${lightingSummary.enabledSceneCount} enabled scenes / ${lightingSummary.onlineFixtureCount} online fixtures`,
      climateHvac: `${climateSummary.enabledProfileCount} enabled profiles / ${climateSummary.onlineThermostatCount} online thermostats`,
      securityAccess: `${securitySummary.enabledProfileCount} guarded profiles / ${securitySummary.accessPointCount} access points`,
      waterManagement: `${waterSummary.enabledProfileCount} water profiles / ${waterSummary.onlineValveCount} online valves`,
      energyManagement: `${energySummary.enabledProfileCount} energy profiles / ${energySummary.totalSolarWatts}W solar`,
      sensingPresence: `${sensingSummary.occupiedZoneCount} occupied zones / ${sensingSummary.averageCo2Ppm}ppm CO2`,
      moduleManifest: `${moduleManifestSummary.enabled} enabled flags / ${moduleManifestSummary.buildable} buildable`,
      moduleBuilder: `${moduleBuilderSummary.planCount} build plans / ${moduleBuilderSummary.readyToQueue} queue-ready`,
      moduleMarketplace: `${moduleMarketplaceSummary.installed} installed / ${moduleMarketplaceSummary.available} available`,
      moduleCertification: `${moduleCertificationSummary.passed} passed / ${moduleCertificationSummary.approvalRequired} approval-required`,
      mqttEsphome: `${mqttEsphomeSummary.mappedDeviceCount} mapped devices / ${mqttEsphomeSummary.publishableMappings} publishable`,
      matterThread: `${matterThreadSummary.bindingCount} bindings / ${matterThreadSummary.healthyThreadNetworks} healthy Thread network`,
      zigbee: `${zigbeeSummary.bindingCount} bindings / ${zigbeeSummary.healthyRoutes} healthy mesh routes`,
      zwave: `${zwaveSummary.bindingCount} bindings / ${zwaveSummary.secureNodeCount} secure node`,
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
    approvalWorkflow,
    lightingScenes,
    climateHvac,
    securityAccess,
    waterManagement,
    energyManagement,
    sensingPresence,
    moduleManifest,
    moduleBuilder,
    moduleMarketplace,
    moduleCertification,
    mqttEsphome,
    matterThread,
    zigbeeAdapter,
    zwaveAdapter,
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

app.get("/api/module-manifest", (_req, res) => {
  res.json(buildModuleManifestDashboard({
    manifest: moduleManifest,
    catalog,
  }));
});

app.get("/api/module-manifest/flags/:id/preview", (req, res) => {
  const result = previewModuleFlag({
    manifest: moduleManifest,
    catalog,
    moduleId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  });
  if (result.error === "module_flag_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/module-manifest/flags/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewModuleFlag({
      manifest: moduleManifest,
      catalog,
      moduleId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "module_flag_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/module-manifest/intent/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(previewModuleIntent({
      manifest: moduleManifest,
      catalog,
      intent: req.body?.intent || "",
      actor: req.auth,
    }));
  },
);

app.get("/api/module-builder", (_req, res) => {
  res.json(buildModuleBuilderDashboard({
    builder: moduleBuilder,
    manifest: moduleManifest,
    catalog,
  }));
});

app.get("/api/module-builder/plans/:id/preview", (req, res) => {
  const result = previewBuildPlan({
    builder: moduleBuilder,
    manifest: moduleManifest,
    catalog,
    planId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  });
  if (result.error === "module_build_plan_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/module-builder/plans/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewBuildPlan({
      builder: moduleBuilder,
      manifest: moduleManifest,
      catalog,
      planId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "module_build_plan_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/module-builder/intent/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(previewBuildIntent({
      builder: moduleBuilder,
      manifest: moduleManifest,
      catalog,
      intent: req.body?.intent || "",
      actor: req.auth,
    }));
  },
);

app.get("/api/module-marketplace", (_req, res) => {
  res.json(buildModuleMarketplaceDashboard({
    marketplace: moduleMarketplace,
    catalog,
    manifest: moduleManifest,
    builder: moduleBuilder,
  }));
});

app.get("/api/module-marketplace/requests/:id/preview", (req, res) => {
  const result = previewMarketplaceRequest({
    marketplace: moduleMarketplace,
    catalog,
    manifest: moduleManifest,
    builder: moduleBuilder,
    requestId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  });
  if (result.error === "marketplace_request_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/module-marketplace/requests/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewMarketplaceRequest({
      marketplace: moduleMarketplace,
      catalog,
      manifest: moduleManifest,
      builder: moduleBuilder,
      requestId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "marketplace_request_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/module-marketplace/intent/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(previewMarketplaceIntent({
      marketplace: moduleMarketplace,
      catalog,
      manifest: moduleManifest,
      builder: moduleBuilder,
      intent: req.body?.intent || "",
      actor: req.auth,
    }));
  },
);

app.get("/api/module-certification", (_req, res) => {
  res.json(buildModuleCertificationDashboard({
    certification: moduleCertification,
    marketplace: moduleMarketplace,
    builder: moduleBuilder,
    manifest: moduleManifest,
    catalog,
  }));
});

app.get("/api/module-certification/profiles/:id/preview", (req, res) => {
  const result = previewCertificationProfile({
    certification: moduleCertification,
    marketplace: moduleMarketplace,
    builder: moduleBuilder,
    manifest: moduleManifest,
    catalog,
    profileId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  });
  if (result.error === "module_certification_profile_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/module-certification/profiles/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewCertificationProfile({
      certification: moduleCertification,
      marketplace: moduleMarketplace,
      builder: moduleBuilder,
      manifest: moduleManifest,
      catalog,
      profileId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "module_certification_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/module-certification/intent/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(previewCertificationIntent({
      certification: moduleCertification,
      marketplace: moduleMarketplace,
      builder: moduleBuilder,
      manifest: moduleManifest,
      catalog,
      intent: req.body?.intent || "",
      actor: req.auth,
    }));
  },
);

app.get("/api/mqtt-esphome", (_req, res) => {
  res.json(buildMqttEsphomeDashboard({
    adapter: mqttEsphome,
    deviceRegistry,
    certification: moduleCertification,
    marketplace: moduleMarketplace,
    builder: moduleBuilder,
    manifest: moduleManifest,
    catalog,
  }));
});

app.get("/api/mqtt-esphome/discovery/:id/preview", (req, res) => {
  const result = previewMqttDiscovery({
    adapter: mqttEsphome,
    deviceRegistry,
    discoveryProfileId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  });
  if (result.error === "mqtt_discovery_profile_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/mqtt-esphome/discovery/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewMqttDiscovery({
      adapter: mqttEsphome,
      deviceRegistry,
      discoveryProfileId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "mqtt_discovery_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.get("/api/mqtt-esphome/commands/:id/preview", (req, res) => {
  const result = previewMqttCommand({
    adapter: mqttEsphome,
    deviceRegistry,
    commandId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  });
  if (result.error === "mqtt_command_profile_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/mqtt-esphome/commands/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewMqttCommand({
      adapter: mqttEsphome,
      deviceRegistry,
      commandId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "mqtt_command_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/mqtt-esphome/commands/:id/publish",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = publishMqttCommand({
      adapter: mqttEsphome,
      deviceRegistry,
      commandId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "mqtt_command_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.status(result.summary?.canPublish ? 200 : 409).json(result);
  },
);

app.post(
  "/api/mqtt-esphome/intent/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(previewMqttIntent({
      adapter: mqttEsphome,
      deviceRegistry,
      intent: req.body?.intent || "",
      actor: req.auth,
    }));
  },
);

app.get("/api/matter-thread", (_req, res) => {
  res.json(buildMatterThreadDashboard({
    adapter: matterThread,
    deviceRegistry,
    catalog,
  }));
});

app.get("/api/matter-thread/commissioning/:id/preview", (req, res) => {
  const result = previewMatterCommissioning({
    adapter: matterThread,
    deviceRegistry,
    commissioningId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  });
  if (result.error === "matter_commissioning_profile_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/matter-thread/commissioning/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewMatterCommissioning({
      adapter: matterThread,
      deviceRegistry,
      commissioningId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "matter_commissioning_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.get("/api/matter-thread/commands/:id/preview", (req, res) => {
  const result = previewMatterCommand({
    adapter: matterThread,
    deviceRegistry,
    commandId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  });
  if (result.error === "matter_command_profile_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/matter-thread/commands/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewMatterCommand({
      adapter: matterThread,
      deviceRegistry,
      commandId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "matter_command_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/matter-thread/commands/:id/execute",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = executeMatterCommand({
      adapter: matterThread,
      deviceRegistry,
      commandId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "matter_command_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.status(result.summary?.canExecute ? 200 : 409).json(result);
  },
);

app.post(
  "/api/matter-thread/intent/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(previewMatterIntent({
      adapter: matterThread,
      deviceRegistry,
      intent: req.body?.intent || "",
      actor: req.auth,
    }));
  },
);

app.get("/api/zigbee", (_req, res) => {
  res.json(buildZigbeeDashboard({
    adapter: zigbeeAdapter,
    deviceRegistry,
    catalog,
  }));
});

app.get("/api/zigbee/permit-join/:id/preview", (req, res) => {
  const result = previewZigbeePermitJoin({
    adapter: zigbeeAdapter,
    permitJoinId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  });
  if (result.error === "zigbee_permit_join_profile_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/zigbee/permit-join/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewZigbeePermitJoin({
      adapter: zigbeeAdapter,
      permitJoinId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "zigbee_permit_join_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.get("/api/zigbee/reporting/:id/preview", (req, res) => {
  const result = previewZigbeeReporting({
    adapter: zigbeeAdapter,
    deviceRegistry,
    reportingId: req.params.id,
  });
  if (result.error === "zigbee_reporting_profile_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/zigbee/reporting/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewZigbeeReporting({
      adapter: zigbeeAdapter,
      deviceRegistry,
      reportingId: req.params.id,
    });
    if (result.error === "zigbee_reporting_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.get("/api/zigbee/commands/:id/preview", (req, res) => {
  const result = previewZigbeeCommand({
    adapter: zigbeeAdapter,
    deviceRegistry,
    commandId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  });
  if (result.error === "zigbee_command_profile_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/zigbee/commands/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewZigbeeCommand({
      adapter: zigbeeAdapter,
      deviceRegistry,
      commandId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "zigbee_command_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/zigbee/commands/:id/execute",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = executeZigbeeCommand({
      adapter: zigbeeAdapter,
      deviceRegistry,
      commandId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "zigbee_command_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.status(result.summary?.canExecute ? 200 : 409).json(result);
  },
);

app.post(
  "/api/zigbee/intent/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(previewZigbeeIntent({
      adapter: zigbeeAdapter,
      deviceRegistry,
      intent: req.body?.intent || "",
      actor: req.auth,
    }));
  },
);

app.get("/api/zwave", (_req, res) => {
  res.json(buildZwaveDashboard({
    adapter: zwaveAdapter,
    deviceRegistry,
    catalog,
  }));
});

app.get("/api/zwave/inclusion/:id/preview", (req, res) => {
  const result = previewZwaveInclusion({
    adapter: zwaveAdapter,
    deviceRegistry,
    inclusionId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  });
  if (result.error === "zwave_inclusion_profile_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/zwave/inclusion/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewZwaveInclusion({
      adapter: zwaveAdapter,
      deviceRegistry,
      inclusionId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "zwave_inclusion_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.get("/api/zwave/exclusion/:id/preview", (req, res) => {
  const result = previewZwaveExclusion({
    adapter: zwaveAdapter,
    deviceRegistry,
    exclusionId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  });
  if (result.error === "zwave_exclusion_profile_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/zwave/exclusion/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewZwaveExclusion({
      adapter: zwaveAdapter,
      deviceRegistry,
      exclusionId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "zwave_exclusion_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.get("/api/zwave/commands/:id/preview", (req, res) => {
  const result = previewZwaveCommand({
    adapter: zwaveAdapter,
    deviceRegistry,
    commandId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  });
  if (result.error === "zwave_command_profile_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/zwave/commands/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewZwaveCommand({
      adapter: zwaveAdapter,
      deviceRegistry,
      commandId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "zwave_command_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/zwave/commands/:id/execute",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = executeZwaveCommand({
      adapter: zwaveAdapter,
      deviceRegistry,
      commandId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "zwave_command_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.status(result.summary?.canExecute ? 200 : 409).json(result);
  },
);

app.post(
  "/api/zwave/intent/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(previewZwaveIntent({
      adapter: zwaveAdapter,
      deviceRegistry,
      intent: req.body?.intent || "",
      actor: req.auth,
    }));
  },
);

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

app.get("/api/lighting", (_req, res) => {
  res.json(buildLightingDashboard({
    lighting: lightingScenes,
    deviceRegistry,
  }));
});

app.get("/api/lighting/scenes/:id/preview", (req, res) => {
  const result = previewLightingScene({
    lighting: lightingScenes,
    deviceRegistry,
    sceneId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  });
  if (result.error === "lighting_scene_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/lighting/scenes/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewLightingScene({
      lighting: lightingScenes,
      deviceRegistry,
      sceneId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "lighting_scene_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/lighting/scenes/:id/apply",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = applyLightingScene({
      lighting: lightingScenes,
      deviceRegistry,
      sceneId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "lighting_scene_not_found") {
      res.status(404).json(result);
      return;
    }
    res.status(result.status === "blocked" ? 409 : 200).json(result);
  },
);

app.post(
  "/api/lighting/intent/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(previewLightingIntent({
      lighting: lightingScenes,
      deviceRegistry,
      intent: req.body?.intent || "",
      actor: req.auth,
    }));
  },
);

app.get("/api/climate", (_req, res) => {
  res.json(buildClimateDashboard({
    climate: climateHvac,
    deviceRegistry,
  }));
});

app.get("/api/climate/profiles/:id/preview", (req, res) => {
  const result = previewClimateProfile({
    climate: climateHvac,
    deviceRegistry,
    profileId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  });
  if (result.error === "climate_profile_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/climate/profiles/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewClimateProfile({
      climate: climateHvac,
      deviceRegistry,
      profileId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "climate_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/climate/profiles/:id/apply",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = applyClimateProfile({
      climate: climateHvac,
      deviceRegistry,
      profileId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "climate_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.status(result.status === "blocked" ? 409 : 200).json(result);
  },
);

app.post(
  "/api/climate/zones/:id/setpoint/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewClimateSetpoint({
      climate: climateHvac,
      deviceRegistry,
      zoneId: req.params.id,
      setpointC: req.body?.setpointC,
      mode: req.body?.mode || "heat",
      holdMinutes: req.body?.holdMinutes || 60,
      actor: req.auth,
    });
    if (result.error === "climate_zone_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/climate/zones/:id/setpoint/apply",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = applyClimateSetpoint({
      climate: climateHvac,
      deviceRegistry,
      zoneId: req.params.id,
      setpointC: req.body?.setpointC,
      mode: req.body?.mode || "heat",
      holdMinutes: req.body?.holdMinutes || 60,
      actor: req.auth,
    });
    if (result.error === "climate_zone_not_found") {
      res.status(404).json(result);
      return;
    }
    res.status(result.status === "blocked" ? 409 : 200).json(result);
  },
);

app.post(
  "/api/climate/intent/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(previewClimateIntent({
      climate: climateHvac,
      deviceRegistry,
      intent: req.body?.intent || "",
      actor: req.auth,
    }));
  },
);

app.get("/api/security", (_req, res) => {
  res.json(buildSecurityDashboard({
    security: securityAccess,
    deviceRegistry,
  }));
});

app.get("/api/security/profiles/:id/preview", (req, res) => {
  const result = previewSecurityProfile({
    security: securityAccess,
    deviceRegistry,
    profileId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.Security"] },
  });
  if (result.error === "security_profile_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/security/profiles/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewSecurityProfile({
      security: securityAccess,
      deviceRegistry,
      profileId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "security_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/security/profiles/:id/apply",
  requireRoles(["Automation.Admin", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = applySecurityProfile({
      security: securityAccess,
      deviceRegistry,
      profileId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "security_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.status(result.status === "blocked" || result.status === "approval_required" ? 409 : 200).json(result);
  },
);

app.post(
  "/api/security/access-points/:id/command/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewAccessPointCommand({
      security: securityAccess,
      deviceRegistry,
      accessPointId: req.params.id,
      action: req.body?.action || "state_check",
      desiredState: req.body?.desiredState || {},
      actor: req.auth,
    });
    if (result.error === "security_access_point_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/security/access-points/:id/command/apply",
  requireRoles(["Automation.Admin", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = applyAccessPointCommand({
      security: securityAccess,
      deviceRegistry,
      accessPointId: req.params.id,
      action: req.body?.action || "state_check",
      desiredState: req.body?.desiredState || {},
      actor: req.auth,
    });
    if (result.error === "security_access_point_not_found") {
      res.status(404).json(result);
      return;
    }
    res.status(result.status === "blocked" || result.status === "approval_required" ? 409 : 200).json(result);
  },
);

app.post(
  "/api/security/intent/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(previewSecurityIntent({
      security: securityAccess,
      deviceRegistry,
      intent: req.body?.intent || "",
      actor: req.auth,
    }));
  },
);

app.get("/api/water", (_req, res) => {
  res.json(buildWaterDashboard({
    water: waterManagement,
    deviceRegistry,
    automationEngine,
  }));
});

app.get("/api/water/profiles/:id/preview", (req, res) => {
  const result = previewWaterProfile({
    water: waterManagement,
    deviceRegistry,
    automationEngine,
    profileId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.AgentApprover"] },
  });
  if (result.error === "water_profile_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/water/profiles/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewWaterProfile({
      water: waterManagement,
      deviceRegistry,
      automationEngine,
      profileId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "water_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/water/profiles/:id/apply",
  requireRoles(["Automation.Admin", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = applyWaterProfile({
      water: waterManagement,
      deviceRegistry,
      automationEngine,
      profileId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "water_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.status(result.status === "blocked" || result.status === "approval_required" ? 409 : 200).json(result);
  },
);

app.post(
  "/api/water/intent/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(previewWaterIntent({
      water: waterManagement,
      deviceRegistry,
      automationEngine,
      intent: req.body?.intent || "",
      actor: req.auth,
    }));
  },
);

app.get("/api/energy", (_req, res) => {
  res.json(buildEnergyDashboard({
    energy: energyManagement,
    deviceRegistry,
    automationEngine,
  }));
});

app.get("/api/energy/profiles/:id/preview", (req, res) => {
  const result = previewEnergyProfile({
    energy: energyManagement,
    deviceRegistry,
    automationEngine,
    profileId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.AgentApprover"] },
  });
  if (result.error === "energy_profile_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/energy/profiles/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewEnergyProfile({
      energy: energyManagement,
      deviceRegistry,
      automationEngine,
      profileId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "energy_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/energy/profiles/:id/apply",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = applyEnergyProfile({
      energy: energyManagement,
      deviceRegistry,
      automationEngine,
      profileId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "energy_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.status(result.status === "blocked" || result.status === "approval_required" ? 409 : 200).json(result);
  },
);

app.post(
  "/api/energy/intent/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(previewEnergyIntent({
      energy: energyManagement,
      deviceRegistry,
      automationEngine,
      intent: req.body?.intent || "",
      actor: req.auth,
    }));
  },
);

app.get("/api/sensing", (_req, res) => {
  res.json(buildSensingDashboard({
    sensing: sensingPresence,
    deviceRegistry,
  }));
});

app.get("/api/sensing/profiles/:id/preview", (req, res) => {
  const result = previewSensingProfile({
    sensing: sensingPresence,
    deviceRegistry,
    profileId: req.params.id,
    actor: { subject: "system-preview", name: "System Preview", roles: ["Automation.AgentApprover"] },
  });
  if (result.error === "sensing_profile_not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post(
  "/api/sensing/profiles/:id/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    const result = previewSensingProfile({
      sensing: sensingPresence,
      deviceRegistry,
      profileId: req.params.id,
      actor: req.auth,
    });
    if (result.error === "sensing_profile_not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

app.post(
  "/api/sensing/intent/preview",
  requireRoles(["Automation.Admin", "Automation.Operator", "Automation.AgentApprover", "Automation.Security"]),
  (req, res) => {
    res.json(previewSensingIntent({
      sensing: sensingPresence,
      deviceRegistry,
      intent: req.body?.intent || "",
      actor: req.auth,
    }));
  },
);

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

function approvalWorkflowContext(actor = null) {
  return {
    workflow: approvalWorkflow,
    automationEngine,
    deviceRegistry,
    simulationLab,
    kraEngine,
    catalog,
    eventLedger,
    mcpOrchestrator,
    actor: actor || { subject: "system-preview", name: "System Preview", roles: ["Automation.AgentApprover"] },
  };
}

app.get("/api/approvals", (_req, res) => {
  res.json(buildApprovalDashboard(approvalWorkflowContext()));
});

app.get("/api/approvals/audit/export", (_req, res) => {
  res.json(exportApprovalAudit(approvalWorkflowContext()));
});

app.get("/api/approvals/:id", (req, res) => {
  const approval = findApprovalRecord(approvalWorkflowContext(), req.params.id);
  if (!approval) {
    res.status(404).json({ error: "approval_not_found", id: req.params.id });
    return;
  }
  res.json({ approval });
});

app.post(
  "/api/approvals/:id/decisions",
  requireRoles(["Automation.Admin", "Automation.Security", "Automation.AgentApprover", "Automation.Operator"]),
  (req, res) => {
    const result = decideApproval({
      ...approvalWorkflowContext(req.auth),
      approvalId: req.params.id,
      decision: req.body?.decision || "request_changes",
      note: req.body?.note || "",
    });
    if (result.error === "approval_not_found" || result.error === "approval_decision_not_found") {
      res.status(404).json(result);
      return;
    }
    if (result.error === "approval_decision_forbidden" || result.error === "approval_missing_evidence") {
      res.status(403).json(result);
      return;
    }
    res.json(result);
  },
);

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
