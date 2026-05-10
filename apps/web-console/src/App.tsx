import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  Bot,
  Boxes,
  Cable,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  Cpu,
  Droplets,
  FlaskConical,
  Gauge,
  GitBranch,
  Home,
  Layers3,
  Lightbulb,
  LockKeyhole,
  PlayCircle,
  Puzzle,
  RadioTower,
  RotateCcw,
  Satellite,
  Search,
  Server,
  Settings2,
  Shield,
  Thermometer,
  UserRound,
  Waves,
  Wifi,
  Wind,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  applyClimateProfile,
  applyEnergyProfile,
  applyLightingScene,
  applySecurityProfile,
  applyWaterProfile,
  fetchClimate,
  fetchApprovals,
  fetchAuthStatus,
  fetchAutomations,
  fetchCatalog,
  fetchCommandCentre,
  fetchDevices,
  fetchEnergy,
  fetchEvents,
  fetchKra,
  fetchLighting,
  fetchModuleBuilder,
  fetchModuleCertification,
  fetchModuleMarketplace,
  fetchModuleManifest,
  fetchNarrowbandRoutes,
  fetchOverview,
  fetchSimulationLab,
  fetchSecurity,
  fetchSensing,
  fetchWater,
  previewLightingIntent,
  previewLightingScene,
  previewModuleFlag,
  previewModuleBuildIntent,
  previewModuleBuildPlan,
  previewModuleManifestIntent,
  previewMarketplaceIntent,
  previewMarketplaceRequest,
  previewCertificationIntent,
  previewCertificationProfile,
  previewClimateIntent,
  previewClimateProfile,
  previewClimateSetpoint,
  previewEnergyIntent,
  previewEnergyProfile,
  previewSecurityIntent,
  previewSecurityProfile,
  previewSecurityUnlock,
  previewSensingIntent,
  previewSensingProfile,
  previewWaterIntent,
  previewWaterProfile,
  proposeIntent,
  recordApprovalDecision,
  recordIntentDecision,
  runAutomationScenario,
  runSimulationScenario,
} from "./api";
import type {
  AuthStatus,
  ApprovalDecisionResponse,
  ApprovalQueueResponse,
  AutomationEvaluation,
  AutomationResponse,
  ClimateDashboardResponse,
  ClimateIntentPreview,
  ClimatePreview,
  CommandCentreResponse,
  CommandCentreWorkspaceId,
  DeviceDefinition,
  DeviceRegistryResponse,
  EventLedgerResponse,
  EventLedgerSummary,
  FabricEvent,
  IntentDecisionResponse,
  IntentProposalResponse,
  KraDashboardResponse,
  LightingDashboardResponse,
  LightingIntentPreview,
  LightingScenePreview,
  ModuleFlagPreview,
  ModuleBuildIntentPreview,
  ModuleBuildPreview,
  ModuleBuilderResponse,
  ModuleCertificationIntentPreview,
  ModuleCertificationPreview,
  ModuleCertificationResponse,
  ModuleCatalog,
  ModuleDefinition,
  ModuleManifestIntentPreview,
  ModuleManifestResponse,
  ModuleMarketplaceIntentPreview,
  ModuleMarketplacePreview,
  ModuleMarketplaceResponse,
  NarrowbandRoutes,
  PlatformOverview,
  SimulationLabResponse,
  SimulationReport,
  SecurityDashboardResponse,
  SecurityIntentPreview,
  SecurityPreview,
  SensingDashboardResponse,
  SensingIntentPreview,
  SensingPreview,
  WaterDashboardResponse,
  WaterIntentPreview,
  WaterPreview,
  EnergyDashboardResponse,
  EnergyIntentPreview,
  EnergyPreview,
} from "./types";

const categoryIcons: Record<string, LucideIcon> = {
  "Core Platform": Server,
  Connectivity: Cable,
  "Home Automation": Home,
  "Advanced Intelligence": Bot,
  "Remote And Narrowband": Satellite,
};

const moduleIcons: Record<string, LucideIcon> = {
  "lighting-scenes": Lightbulb,
  "climate-hvac": Thermometer,
  "security-access": LockKeyhole,
  "cameras-doorbells": Camera,
  "occupancy-presence": UserRound,
  "water-management": Droplets,
  "energy-solar": Zap,
  "ev-charging": BatteryCharging,
  "battery-backup": BatteryCharging,
  "air-quality": Wind,
  "garden-irrigation": Waves,
  "mcp-orchestrator": GitBranch,
  "module-marketplace": Puzzle,
  "simulation-lab": FlaskConical,
  "narrowband-control-plane": RadioTower,
  "lorawan-adapter": RadioTower,
  "cellular-iot": Wifi,
  "vendor-cloud-adapters": Cloud,
  "safety-policy": Shield,
  "automation-engine": Settings2,
  "event-bus-telemetry": Activity,
};

const workspaceIcons: Record<CommandCentreWorkspaceId, LucideIcon> = {
  modules: Boxes,
  devices: Gauge,
  automations: Settings2,
  lighting: Lightbulb,
  climate: Thermometer,
  security: LockKeyhole,
  water: Droplets,
  energy: Zap,
  sensing: UserRound,
  agents: GitBranch,
  approvals: ClipboardCheck,
  risk: Shield,
  simulations: FlaskConical,
  connectivity: RadioTower,
  identity: Shield,
  audit: Activity,
};

const defaultIntent =
  "If the utility room leaks, close the main valve, alert me, and prove the emergency path still works if broadband is down.";

function iconForModule(mod: ModuleDefinition): LucideIcon {
  return moduleIcons[mod.id] || categoryIcons[mod.category] || Boxes;
}

function stateLabel(state: string) {
  return state.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function riskTone(risk: ModuleDefinition["risk"]) {
  if (risk === "high") return "danger";
  if (risk === "medium") return "warn";
  return "good";
}

function trafficTone(trafficClass: string) {
  if (trafficClass.includes("P0")) return "danger";
  if (trafficClass.includes("P1")) return "warn";
  if (trafficClass.includes("P4")) return "muted";
  return "good";
}

function severityTone(severity: FabricEvent["severity"]) {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warn";
  return "good";
}

function streamTone(stream: FabricEvent["stream"]) {
  if (stream === "command" || stream === "policy") return "warn";
  if (stream === "audit") return "danger";
  if (stream === "telemetry") return "good";
  return "neutral";
}

function commandCentreTone(status: string) {
  if (status === "ready") return "good";
  if (status === "blocked") return "danger";
  if (status === "attention") return "warn";
  return "neutral";
}

type PillTone = "good" | "warn" | "danger" | "neutral" | "muted";

function intentStatusTone(status: string): PillTone {
  if (status.includes("rejected") || status.includes("blocked") || status.includes("denied")) return "danger";
  if (status.includes("approval") || status.includes("permission") || status.includes("review") || status.includes("modify")) return "warn";
  if (status === "high") return "good";
  if (status === "medium") return "warn";
  if (status.includes("ready") || status.includes("accepted") || status.includes("planned") || status.includes("ok")) return "good";
  if (status.includes("low") || status.includes("draft")) return "muted";
  return "neutral";
}

function titleFromId(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function App() {
  const [catalog, setCatalog] = useState<ModuleCatalog | null>(null);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [routes, setRoutes] = useState<NarrowbandRoutes | null>(null);
  const [deviceRegistry, setDeviceRegistry] = useState<DeviceRegistryResponse | null>(null);
  const [eventLedger, setEventLedger] = useState<EventLedgerResponse | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [automations, setAutomations] = useState<AutomationResponse | null>(null);
  const [lighting, setLighting] = useState<LightingDashboardResponse | null>(null);
  const [lightingPreview, setLightingPreview] = useState<LightingScenePreview | null>(null);
  const [lightingIntentPreview, setLightingIntentPreview] = useState<LightingIntentPreview | null>(null);
  const [lightingLoading, setLightingLoading] = useState<"preview" | "apply" | "intent" | null>(null);
  const [climate, setClimate] = useState<ClimateDashboardResponse | null>(null);
  const [climatePreview, setClimatePreview] = useState<ClimatePreview | null>(null);
  const [climateIntentPreview, setClimateIntentPreview] = useState<ClimateIntentPreview | null>(null);
  const [climateLoading, setClimateLoading] = useState<"preview" | "apply" | "intent" | "unsafe" | null>(null);
  const [security, setSecurity] = useState<SecurityDashboardResponse | null>(null);
  const [securityPreview, setSecurityPreview] = useState<SecurityPreview | null>(null);
  const [securityIntentPreview, setSecurityIntentPreview] = useState<SecurityIntentPreview | null>(null);
  const [securityLoading, setSecurityLoading] = useState<"preview" | "apply" | "intent" | "unlock" | null>(null);
  const [water, setWater] = useState<WaterDashboardResponse | null>(null);
  const [waterPreview, setWaterPreview] = useState<WaterPreview | null>(null);
  const [waterIntentPreview, setWaterIntentPreview] = useState<WaterIntentPreview | null>(null);
  const [waterLoading, setWaterLoading] = useState<"preview" | "apply" | "intent" | null>(null);
  const [energy, setEnergy] = useState<EnergyDashboardResponse | null>(null);
  const [energyPreview, setEnergyPreview] = useState<EnergyPreview | null>(null);
  const [energyIntentPreview, setEnergyIntentPreview] = useState<EnergyIntentPreview | null>(null);
  const [energyLoading, setEnergyLoading] = useState<"preview" | "apply" | "intent" | null>(null);
  const [sensing, setSensing] = useState<SensingDashboardResponse | null>(null);
  const [sensingPreview, setSensingPreview] = useState<SensingPreview | null>(null);
  const [sensingIntentPreview, setSensingIntentPreview] = useState<SensingIntentPreview | null>(null);
  const [sensingLoading, setSensingLoading] = useState<"preview" | "intent" | null>(null);
  const [moduleManifest, setModuleManifest] = useState<ModuleManifestResponse | null>(null);
  const [moduleFlagPreview, setModuleFlagPreview] = useState<ModuleFlagPreview | null>(null);
  const [moduleIntentPreview, setModuleIntentPreview] = useState<ModuleManifestIntentPreview | null>(null);
  const [moduleLoading, setModuleLoading] = useState<"preview" | "intent" | null>(null);
  const [moduleBuilder, setModuleBuilder] = useState<ModuleBuilderResponse | null>(null);
  const [moduleBuildPreview, setModuleBuildPreview] = useState<ModuleBuildPreview | null>(null);
  const [moduleBuildIntentPreview, setModuleBuildIntentPreview] = useState<ModuleBuildIntentPreview | null>(null);
  const [moduleBuildLoading, setModuleBuildLoading] = useState<"preview" | "intent" | null>(null);
  const [moduleMarketplace, setModuleMarketplace] = useState<ModuleMarketplaceResponse | null>(null);
  const [marketplacePreview, setMarketplacePreview] = useState<ModuleMarketplacePreview | null>(null);
  const [marketplaceIntentPreview, setMarketplaceIntentPreview] = useState<ModuleMarketplaceIntentPreview | null>(null);
  const [marketplaceLoading, setMarketplaceLoading] = useState<"preview" | "intent" | null>(null);
  const [moduleCertification, setModuleCertification] = useState<ModuleCertificationResponse | null>(null);
  const [certificationPreview, setCertificationPreview] = useState<ModuleCertificationPreview | null>(null);
  const [certificationIntentPreview, setCertificationIntentPreview] = useState<ModuleCertificationIntentPreview | null>(null);
  const [certificationLoading, setCertificationLoading] = useState<"preview" | "intent" | null>(null);
  const [approvals, setApprovals] = useState<ApprovalQueueResponse | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<ApprovalDecisionResponse | null>(null);
  const [approvalDecisionLoading, setApprovalDecisionLoading] = useState<"approve" | "reject" | "request_changes" | null>(null);
  const [kra, setKra] = useState<KraDashboardResponse | null>(null);
  const [simulationLab, setSimulationLab] = useState<SimulationLabResponse | null>(null);
  const [simulationReport, setSimulationReport] = useState<SimulationReport | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [automationEvaluation, setAutomationEvaluation] = useState<AutomationEvaluation | null>(null);
  const [automationLoading, setAutomationLoading] = useState(false);
  const [commandCentre, setCommandCentre] = useState<CommandCentreResponse | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<CommandCentreWorkspaceId>("devices");
  const [activeCategory, setActiveCategory] = useState("Home Automation");
  const [activeModuleId, setActiveModuleId] = useState("water-management");
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState(defaultIntent);
  const [proposal, setProposal] = useState<IntentProposalResponse | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentDecision, setIntentDecision] = useState<IntentDecisionResponse | null>(null);
  const [decisionLoading, setDecisionLoading] = useState<"accept" | "modify" | "reject" | null>(null);

  useEffect(() => {
    void fetchCatalog().then(setCatalog);
    void fetchOverview().then(setOverview);
    void fetchAuthStatus().then(setAuthStatus);
    void fetchNarrowbandRoutes().then(setRoutes);
    void fetchDevices().then(setDeviceRegistry);
    void fetchEvents().then(setEventLedger);
    void fetchAutomations().then(setAutomations);
    void fetchLighting().then(setLighting);
    void fetchClimate().then(setClimate);
    void fetchSecurity().then(setSecurity);
    void fetchWater().then(setWater);
    void fetchEnergy().then(setEnergy);
    void fetchSensing().then(setSensing);
    void fetchModuleManifest().then(setModuleManifest);
    void fetchModuleBuilder().then(setModuleBuilder);
    void fetchModuleMarketplace().then(setModuleMarketplace);
    void fetchModuleCertification().then(setModuleCertification);
    void fetchApprovals().then(setApprovals);
    void fetchKra().then(setKra);
    void fetchSimulationLab().then(setSimulationLab);
    void fetchCommandCentre().then(setCommandCentre);
  }, []);

  const modules = catalog?.modules || [];
  const categories = catalog?.categories || [];

  const filteredModules = useMemo(() => {
    const text = query.trim().toLowerCase();
    return modules.filter((mod) => {
      const inCategory = activeCategory === "All" || mod.category === activeCategory;
      if (!text) return inCategory;
      const blob = [mod.name, mod.description, mod.category, ...mod.capabilities, ...mod.services, ...mod.adapters].join(" ").toLowerCase();
      return inCategory && blob.includes(text);
    });
  }, [activeCategory, modules, query]);

  const activeModule = modules.find((mod) => mod.id === activeModuleId) || filteredModules[0] || modules[0];

  useEffect(() => {
    if (filteredModules.length > 0 && !filteredModules.some((mod) => mod.id === activeModuleId)) {
      setActiveModuleId(filteredModules[0].id);
    }
  }, [activeModuleId, filteredModules]);

  async function runIntent() {
    setIntentLoading(true);
    setIntentDecision(null);
    try {
      setProposal(await proposeIntent(intent));
    } finally {
      setIntentLoading(false);
    }
  }

  async function decideIntent(decision: "accept" | "modify" | "reject") {
    const firstProposal = proposal?.aip.proposals[0];
    if (!proposal || !firstProposal) return;
    setDecisionLoading(decision);
    try {
      setIntentDecision(await recordIntentDecision(
        proposal.sessionId || proposal.session_id,
        firstProposal.proposalId || firstProposal.proposal_id,
        decision,
      ));
    } finally {
      setDecisionLoading(null);
    }
  }

  async function runScenario(scenarioId: string) {
    setAutomationLoading(true);
    try {
      setAutomationEvaluation(await runAutomationScenario(scenarioId));
    } finally {
      setAutomationLoading(false);
    }
  }

  async function previewScene(sceneId: string) {
    setLightingLoading("preview");
    try {
      setLightingPreview(await previewLightingScene(sceneId));
    } finally {
      setLightingLoading(null);
    }
  }

  async function applyScene(sceneId: string) {
    setLightingLoading("apply");
    try {
      setLightingPreview(await applyLightingScene(sceneId));
    } finally {
      setLightingLoading(null);
    }
  }

  async function previewSceneIntent(intentText: string) {
    setLightingLoading("intent");
    try {
      const result = await previewLightingIntent(intentText);
      setLightingIntentPreview(result);
      setLightingPreview(result.preview);
    } finally {
      setLightingLoading(null);
    }
  }

  async function previewClimate(profileId: string) {
    setClimateLoading("preview");
    try {
      setClimatePreview(await previewClimateProfile(profileId));
    } finally {
      setClimateLoading(null);
    }
  }

  async function applyClimate(profileId: string) {
    setClimateLoading("apply");
    try {
      setClimatePreview(await applyClimateProfile(profileId));
    } finally {
      setClimateLoading(null);
    }
  }

  async function previewClimateUnsafe(zoneId: string) {
    setClimateLoading("unsafe");
    try {
      setClimatePreview(await previewClimateSetpoint(zoneId, 29, "heat", 60));
    } finally {
      setClimateLoading(null);
    }
  }

  async function previewClimateFromIntent(intentText: string) {
    setClimateLoading("intent");
    try {
      const result = await previewClimateIntent(intentText);
      setClimateIntentPreview(result);
      setClimatePreview(result.preview);
    } finally {
      setClimateLoading(null);
    }
  }

  async function previewSecurity(profileId: string) {
    setSecurityLoading("preview");
    try {
      setSecurityPreview(await previewSecurityProfile(profileId));
    } finally {
      setSecurityLoading(null);
    }
  }

  async function applySecurity(profileId: string) {
    setSecurityLoading("apply");
    try {
      setSecurityPreview(await applySecurityProfile(profileId));
    } finally {
      setSecurityLoading(null);
    }
  }

  async function previewUnlockGuard(accessPointId: string) {
    setSecurityLoading("unlock");
    try {
      setSecurityPreview(await previewSecurityUnlock(accessPointId));
    } finally {
      setSecurityLoading(null);
    }
  }

  async function previewSecurityFromIntent(intentText: string) {
    setSecurityLoading("intent");
    try {
      const result = await previewSecurityIntent(intentText);
      setSecurityIntentPreview(result);
      setSecurityPreview(result.preview);
    } finally {
      setSecurityLoading(null);
    }
  }

  async function previewWater(profileId: string) {
    setWaterLoading("preview");
    try {
      setWaterPreview(await previewWaterProfile(profileId));
    } finally {
      setWaterLoading(null);
    }
  }

  async function applyWater(profileId: string) {
    setWaterLoading("apply");
    try {
      setWaterPreview(await applyWaterProfile(profileId));
    } finally {
      setWaterLoading(null);
    }
  }

  async function previewWaterFromIntent(intentText: string) {
    setWaterLoading("intent");
    try {
      const result = await previewWaterIntent(intentText);
      setWaterIntentPreview(result);
      setWaterPreview(result.preview);
    } finally {
      setWaterLoading(null);
    }
  }

  async function previewEnergy(profileId: string) {
    setEnergyLoading("preview");
    try {
      setEnergyPreview(await previewEnergyProfile(profileId));
    } finally {
      setEnergyLoading(null);
    }
  }

  async function applyEnergy(profileId: string) {
    setEnergyLoading("apply");
    try {
      setEnergyPreview(await applyEnergyProfile(profileId));
    } finally {
      setEnergyLoading(null);
    }
  }

  async function previewEnergyFromIntent(intentText: string) {
    setEnergyLoading("intent");
    try {
      const result = await previewEnergyIntent(intentText);
      setEnergyIntentPreview(result);
      setEnergyPreview(result.preview);
    } finally {
      setEnergyLoading(null);
    }
  }

  async function previewSensing(profileId: string) {
    setSensingLoading("preview");
    try {
      setSensingPreview(await previewSensingProfile(profileId));
    } finally {
      setSensingLoading(null);
    }
  }

  async function previewSensingFromIntent(intentText: string) {
    setSensingLoading("intent");
    try {
      const result = await previewSensingIntent(intentText);
      setSensingIntentPreview(result);
      setSensingPreview(result.preview);
    } finally {
      setSensingLoading(null);
    }
  }

  async function previewModule(moduleId: string) {
    setModuleLoading("preview");
    try {
      setModuleFlagPreview(await previewModuleFlag(moduleId));
    } finally {
      setModuleLoading(null);
    }
  }

  async function previewModuleFromIntent(intentText: string) {
    setModuleLoading("intent");
    try {
      const result = await previewModuleManifestIntent(intentText);
      setModuleIntentPreview(result);
      setModuleFlagPreview(result.preview);
    } finally {
      setModuleLoading(null);
    }
  }

  async function previewBuildPlan(planId: string) {
    setModuleBuildLoading("preview");
    try {
      setModuleBuildPreview(await previewModuleBuildPlan(planId));
    } finally {
      setModuleBuildLoading(null);
    }
  }

  async function previewBuildFromIntent(intentText: string) {
    setModuleBuildLoading("intent");
    try {
      const result = await previewModuleBuildIntent(intentText);
      setModuleBuildIntentPreview(result);
      setModuleBuildPreview(result.preview);
    } finally {
      setModuleBuildLoading(null);
    }
  }

  async function previewMarketplace(requestId: string) {
    setMarketplaceLoading("preview");
    try {
      setMarketplacePreview(await previewMarketplaceRequest(requestId));
    } finally {
      setMarketplaceLoading(null);
    }
  }

  async function previewMarketplaceFromIntent(intentText: string) {
    setMarketplaceLoading("intent");
    try {
      const result = await previewMarketplaceIntent(intentText);
      setMarketplaceIntentPreview(result);
      setMarketplacePreview(result.preview);
    } finally {
      setMarketplaceLoading(null);
    }
  }

  async function previewCertification(profileId: string) {
    setCertificationLoading("preview");
    try {
      setCertificationPreview(await previewCertificationProfile(profileId));
    } finally {
      setCertificationLoading(null);
    }
  }

  async function previewCertificationFromIntent(intentText: string) {
    setCertificationLoading("intent");
    try {
      const result = await previewCertificationIntent(intentText);
      setCertificationIntentPreview(result);
      setCertificationPreview(result.preview);
    } finally {
      setCertificationLoading(null);
    }
  }

  async function decideApproval(decision: "approve" | "reject" | "request_changes") {
    const approval = approvals?.approvals[0];
    if (!approval) return;
    setApprovalDecisionLoading(decision);
    try {
      setApprovalDecision(await recordApprovalDecision(
        approval.id,
        decision,
        decision === "approve"
          ? "Simulation, KRA, policy, and command queue evidence reviewed."
          : decision === "reject"
            ? "Rejected from operator approval workflow."
            : "Requesting policy or route changes before approval.",
      ));
    } finally {
      setApprovalDecisionLoading(null);
    }
  }

  async function runSimulationDrill(scenarioId: string, variantId?: string) {
    setSimulationLoading(true);
    try {
      setSimulationReport(await runSimulationScenario(scenarioId, variantId));
    } finally {
      setSimulationLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="side-rail" aria-label="Module navigation">
        <div className="brand-lockup">
          <div className="brand-mark"><Cpu size={22} /></div>
          <div>
            <strong>EdgeCommand</strong>
            <span>Control Fabric</span>
          </div>
        </div>

        <div className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find modules" />
        </div>

        <nav className="category-nav">
          <button className={activeCategory === "All" ? "active" : ""} onClick={() => setActiveCategory("All")}>
            <Layers3 size={17} />
            <span>All Modules</span>
            <em>{modules.length || "-"}</em>
          </button>
          {categories.map((category) => {
            const Icon = categoryIcons[category] || Boxes;
            const count = modules.filter((mod) => mod.category === category).length;
            return (
              <button
                key={category}
                className={activeCategory === category ? "active" : ""}
                onClick={() => setActiveCategory(category)}
              >
                <Icon size={17} />
                <span>{category}</span>
                <em>{count}</em>
              </button>
            );
          })}
        </nav>

        <div className="rail-footer">
          <span>Tenant</span>
          <strong>{catalog?.product.tenant || "vendorlogic.io"}</strong>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Local Docker Desktop blueprint</p>
            <h1>EdgeCommand Control Fabric Command Centre</h1>
          </div>
          <div className="topbar-actions">
            <StatusPill tone="good" label={overview ? "API online" : "offline mock"} />
            <StatusPill tone={authStatus?.entraEnabled ? "good" : "warn"} label={authStatus?.entraEnabled ? "Entra enforced" : "dev auth"} />
            <StatusPill tone={authStatus?.secretProvider?.keyVaultEnabled ? "good" : "muted"} label={authStatus?.secretProvider?.keyVaultEnabled ? "Key Vault" : "env secrets"} />
            <StatusPill tone="danger" label="P0 path simulated" />
          </div>
        </header>

        <section className="command-band" aria-label="Platform command centre">
          <Metric label="Modules" value={overview?.moduleCount || modules.length || "-"} detail="manifest surfaces" />
          <Metric label="Devices" value={deviceRegistry?.summary.deviceCount || overview?.devices?.deviceCount || "-"} detail="registry seed" tone="good" />
          <Metric label="Events" value={eventLedger?.summary.eventCount || overview?.events?.eventCount || "-"} detail="ledger records" tone="good" />
          <Metric label="Audit" value={eventLedger?.summary.auditRequired || overview?.events?.auditRequired || "-"} detail="durable gates" tone="warn" />
          <Metric label="Rules" value={automations?.summary.armedRules || overview?.automation?.armedRules || "-"} detail="armed automations" tone="good" />
          <Metric label="Policy" value={automations?.summary.policyCount || overview?.automation?.policyCount || "-"} detail="safety packs" tone="danger" />
          <Metric label="Lighting" value={lighting?.summary.enabledSceneCount || commandCentre?.lighting.summary.enabledSceneCount || "-"} detail="enabled scenes" tone="good" />
          <Metric label="Climate" value={climate?.summary.enabledProfileCount || commandCentre?.climate.summary.enabledProfileCount || "-"} detail="comfort profiles" tone="warn" />
          <Metric label="Security" value={security?.summary.enabledProfileCount || commandCentre?.security.summary.enabledProfileCount || "-"} detail="guarded profiles" tone="danger" />
          <Metric label="Water" value={water?.summary.enabledProfileCount || commandCentre?.water.summary.enabledProfileCount || "-"} detail="P0 profiles" tone="danger" />
          <Metric label="Energy" value={energy?.summary.totalSolarWatts || commandCentre?.energy.summary.totalSolarWatts || "-"} detail="solar watts" tone="good" />
          <Metric label="Sensing" value={sensing?.summary.occupiedZoneCount ?? commandCentre?.sensing.summary.occupiedZoneCount ?? "-"} detail="occupied zones" tone="good" />
          <Metric label="Flags" value={moduleManifest?.summary.enabled ?? commandCentre?.moduleManifest?.summary.enabled ?? "-"} detail="enabled modules" tone="good" />
          <Metric label="Builds" value={moduleBuilder?.summary.readyToQueue ?? commandCentre?.moduleBuilder?.summary.readyToQueue ?? "-"} detail="queue-ready" tone="warn" />
          <Metric label="Market" value={moduleMarketplace?.summary.available ?? commandCentre?.moduleMarketplace?.summary.available ?? "-"} detail="available" tone="good" />
          <Metric label="Certs" value={moduleCertification?.summary.passed ?? commandCentre?.moduleCertification?.summary.passed ?? "-"} detail="passed gates" tone="good" />
          <Metric label="Sims" value={simulationLab?.summary.scenarioCount || commandCentre?.simulations.summary.scenarioCount || "-"} detail="failure labs" tone="good" />
          <Metric label="KRA" value={kra?.summary.enabledRulePacks || commandCentre?.risk.summary.enabledRulePacks || "-"} detail="critique packs" tone="warn" />
          <Metric label="Narrowband" value={overview?.narrowband || "-"} detail="semantic SD-WAN" tone="warn" />
          <Metric label="Approvals" value={approvals?.summary.pending || eventLedger?.summary.pendingApprovals || overview?.commandCentre.pendingApprovals || 4} detail="pending gates" tone="warn" />
          <Metric
            label="Identity"
            value={authStatus?.entraEnabled ? "Entra" : "Dev"}
            detail={authStatus?.secretProvider?.keyVaultEnabled ? "Key Vault backed" : "local env"}
          />
        </section>

        <CommandCentreDeck
          commandCentre={commandCentre}
          activeWorkspace={activeWorkspace}
          onWorkspaceChange={setActiveWorkspace}
          modules={modules}
        />

        <EventAuditStrip eventLedger={eventLedger} fallbackSummary={overview?.events || null} />
        <LightingScenesPanel
          lighting={lighting || commandCentre?.lighting || null}
          preview={lightingPreview}
          intentPreview={lightingIntentPreview}
          loading={lightingLoading}
          onPreview={previewScene}
          onApply={applyScene}
          onIntentPreview={previewSceneIntent}
        />
        <ClimateHvacPanel
          climate={climate || commandCentre?.climate || null}
          preview={climatePreview}
          intentPreview={climateIntentPreview}
          loading={climateLoading}
          onPreview={previewClimate}
          onApply={applyClimate}
          onUnsafePreview={previewClimateUnsafe}
          onIntentPreview={previewClimateFromIntent}
        />
        <SecurityAccessPanel
          security={security || commandCentre?.security || null}
          preview={securityPreview}
          intentPreview={securityIntentPreview}
          loading={securityLoading}
          onPreview={previewSecurity}
          onApply={applySecurity}
          onUnlockPreview={previewUnlockGuard}
          onIntentPreview={previewSecurityFromIntent}
        />
        <WaterManagementPanel
          water={water || commandCentre?.water || null}
          preview={waterPreview}
          intentPreview={waterIntentPreview}
          loading={waterLoading}
          onPreview={previewWater}
          onApply={applyWater}
          onIntentPreview={previewWaterFromIntent}
        />
        <EnergyManagementPanel
          energy={energy || commandCentre?.energy || null}
          preview={energyPreview}
          intentPreview={energyIntentPreview}
          loading={energyLoading}
          onPreview={previewEnergy}
          onApply={applyEnergy}
          onIntentPreview={previewEnergyFromIntent}
        />
        <SensingPresencePanel
          sensing={sensing || commandCentre?.sensing || null}
          preview={sensingPreview}
          intentPreview={sensingIntentPreview}
          loading={sensingLoading}
          onPreview={previewSensing}
          onIntentPreview={previewSensingFromIntent}
        />
        <ModuleManifestPanel
          manifest={moduleManifest || commandCentre?.moduleManifest || commandCentre?.modules.manifest || null}
          preview={moduleFlagPreview}
          intentPreview={moduleIntentPreview}
          loading={moduleLoading}
          onPreview={previewModule}
          onIntentPreview={previewModuleFromIntent}
        />
        <ModuleMarketplacePanel
          marketplace={moduleMarketplace || commandCentre?.moduleMarketplace || commandCentre?.modules.marketplace || null}
          preview={marketplacePreview}
          intentPreview={marketplaceIntentPreview}
          loading={marketplaceLoading}
          onPreview={previewMarketplace}
          onIntentPreview={previewMarketplaceFromIntent}
        />
        <ModuleBuilderPanel
          builder={moduleBuilder || commandCentre?.moduleBuilder || commandCentre?.modules.builder || null}
          preview={moduleBuildPreview}
          intentPreview={moduleBuildIntentPreview}
          loading={moduleBuildLoading}
          onPreview={previewBuildPlan}
          onIntentPreview={previewBuildFromIntent}
        />
        <ModuleCertificationPanel
          certification={moduleCertification || commandCentre?.moduleCertification || commandCentre?.modules.certification || null}
          preview={certificationPreview}
          intentPreview={certificationIntentPreview}
          loading={certificationLoading}
          onPreview={previewCertification}
          onIntentPreview={previewCertificationFromIntent}
        />
        <AutomationOpsPanel
          automations={automations}
          approvals={approvals}
          evaluation={automationEvaluation}
          loading={automationLoading}
          onRunScenario={runScenario}
        />
        <ApprovalWorkflowPanel
          approvals={approvals || commandCentre?.approvals || null}
          decision={approvalDecision}
          loading={approvalDecisionLoading}
          onDecision={decideApproval}
        />
        <SimulationLabPanel
          simulation={simulationLab || commandCentre?.simulations || null}
          report={simulationReport}
          loading={simulationLoading}
          onRunScenario={runSimulationDrill}
        />
        <KraOpsPanel kra={kra || commandCentre?.risk || null} />

        <section className="main-grid">
          <div className="module-browser" aria-label="Module list">
            <div className="section-header">
              <div>
                <p className="eyebrow">{activeCategory}</p>
                <h2>Module Surfaces</h2>
              </div>
              <span>{filteredModules.length} visible</span>
            </div>
            <div className="module-list">
              {filteredModules.map((mod) => (
                <ModuleRow
                  key={mod.id}
                  module={mod}
                  active={activeModule?.id === mod.id}
                  onClick={() => setActiveModuleId(mod.id)}
                />
              ))}
            </div>
          </div>

          <div className="dashboard-stack">
            {activeModule && <ModuleDashboard module={activeModule} routes={routes} devices={deviceRegistry?.devices || []} />}
            <IntentWorkbench
              intent={intent}
              onIntentChange={setIntent}
              onRun={runIntent}
              loading={intentLoading}
              proposal={proposal}
              decision={intentDecision}
              decisionLoading={decisionLoading}
              onDecision={decideIntent}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function CommandCentreDeck({
  commandCentre,
  activeWorkspace,
  onWorkspaceChange,
  modules,
}: {
  commandCentre: CommandCentreResponse | null;
  activeWorkspace: CommandCentreWorkspaceId;
  onWorkspaceChange: (workspace: CommandCentreWorkspaceId) => void;
  modules: ModuleDefinition[];
}) {
  const workspaces = commandCentre?.workspaces || [];
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspace) || workspaces[0];

  return (
    <section className="command-centre-deck" aria-label="Global command centre">
      <div className="section-header command-centre-header">
        <div>
          <p className="eyebrow">Global Command Centre</p>
          <h2>Operations Deck</h2>
        </div>
        <div className="event-summary">
          <StatusPill tone={commandCentre?.posture.api === "online" ? "good" : "danger"} label={commandCentre?.posture.api || "loading"} />
          <StatusPill tone={commandCentre?.posture.safetyPosture === "approval_required" ? "warn" : "good"} label={commandCentre?.posture.safetyPosture.replace(/_/g, " ") || "governed"} />
          <StatusPill tone={commandCentre?.posture.secretProvider === "azure-key-vault" ? "good" : "muted"} label={commandCentre?.posture.secretProvider || "secrets"} />
        </div>
      </div>

      {commandCentre ? (
        <>
          <div className="workspace-tabs" role="tablist" aria-label="Command centre workspaces">
            {workspaces.map((workspace) => {
              const Icon = workspaceIcons[workspace.id] || Boxes;
              return (
                <button
                  key={workspace.id}
                  className={activeWorkspace === workspace.id ? "active" : ""}
                  onClick={() => onWorkspaceChange(workspace.id)}
                  role="tab"
                  aria-selected={activeWorkspace === workspace.id}
                >
                  <Icon size={17} />
                  <span>{workspace.label}</span>
                  <em>{workspace.status}</em>
                </button>
              );
            })}
          </div>

          <div className="command-centre-layout">
            <div className="workspace-panel">
              {selectedWorkspace && (
                <div className="workspace-summary">
                  <div>
                    <p className="eyebrow">{selectedWorkspace.label}</p>
                    <h3>{selectedWorkspace.headline}</h3>
                    <span>{selectedWorkspace.detail}</span>
                  </div>
                  <StatusPill tone={commandCentreTone(selectedWorkspace.status)} label={selectedWorkspace.status} />
                </div>
              )}
              {selectedWorkspace && (
                <div className="workspace-metrics">
                  {selectedWorkspace.metrics.map((metric) => (
                    <div key={`${selectedWorkspace.id}-${metric.label}`}>
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                    </div>
                  ))}
                </div>
              )}
              <CommandCentreWorkspaceView commandCentre={commandCentre} activeWorkspace={activeWorkspace} modules={modules} />
            </div>
            <ActionQueue actions={commandCentre.actionQueue} activeWorkspace={activeWorkspace} />
          </div>
        </>
      ) : (
        <div className="command-centre-loading">
          <Activity size={18} />
          <span>Loading command centre data from the API gateway.</span>
        </div>
      )}
    </section>
  );
}

function CommandCentreWorkspaceView({
  commandCentre,
  activeWorkspace,
  modules,
}: {
  commandCentre: CommandCentreResponse;
  activeWorkspace: CommandCentreWorkspaceId;
  modules: ModuleDefinition[];
}) {
  if (activeWorkspace === "modules") {
    const visibleModules = [
      ...commandCentre.modules.hero,
      ...commandCentre.modules.foundations.slice(0, 5),
      ...commandCentre.modules.next,
    ]
      .map((id) => modules.find((mod) => mod.id === id))
      .filter(Boolean) as ModuleDefinition[];
    return (
      <div className="ops-workspace">
        <div className="state-rack">
          {Object.entries(commandCentre.modules.byState).map(([state, count]) => (
            <div key={state}>
              <span>{stateLabel(state)}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
        <div className="ops-table module-ops-table">
          <div className="ops-row ops-head">
            <span>Module</span>
            <span>State</span>
            <span>Risk</span>
            <span>Traffic</span>
          </div>
          {visibleModules.map((mod) => (
            <div className="ops-row" key={mod.id}>
              <strong>{mod.name}</strong>
              <StatusPill tone={mod.state === "hero" || mod.state === "foundation" ? "good" : "warn"} label={stateLabel(mod.state)} />
              <StatusPill tone={riskTone(mod.risk)} label={mod.risk} />
              <span>{mod.trafficClass}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeWorkspace === "devices") {
    const devices = [...commandCentre.devices]
      .sort((a, b) => Number(a.status === "online") - Number(b.status === "online") || b.risk.localeCompare(a.risk))
      .slice(0, 8);
    return (
      <div className="ops-table device-ops-table">
        <div className="ops-row ops-head">
          <span>Device</span>
          <span>Site / Zone</span>
          <span>Status</span>
          <span>Adapter</span>
          <span>Risk</span>
          <span>Link</span>
        </div>
        {devices.map((device) => (
          <div className="ops-row device-ops-row" key={device.id}>
            <strong>{device.name}</strong>
            <span>{device.siteName} / {device.zoneName}</span>
            <StatusPill tone={device.status === "online" ? "good" : device.status === "degraded" ? "warn" : "muted"} label={device.status} />
            <span>{device.adapter}</span>
            <StatusPill tone={riskTone(device.risk)} label={device.risk} />
            <StatusPill tone={device.narrowbandEligible ? "danger" : "neutral"} label={device.narrowbandEligible ? "NB ready" : "standard"} />
          </div>
        ))}
      </div>
    );
  }

  if (activeWorkspace === "automations") {
    return (
      <div className="ops-table automation-ops-table">
        <div className="ops-row ops-head">
          <span>Rule / Policy</span>
          <span>Module</span>
          <span>State</span>
          <span>Traffic</span>
          <span>Gate</span>
        </div>
        {commandCentre.automations.rules.slice(0, 6).map((rule) => (
          <div className="ops-row" key={rule.id}>
            <strong>{rule.name}</strong>
            <span>{titleFromId(rule.moduleId)}</span>
            <StatusPill tone={rule.state === "armed" ? "good" : "warn"} label={rule.state} />
            <span>{rule.trafficClass}</span>
            <span>{rule.approvalMode.replace(/_/g, " ")}</span>
          </div>
        ))}
        {commandCentre.automations.approvals.map((approval) => (
          <div className="ops-row attention-row" key={approval.id}>
            <strong>{approval.deviceName}</strong>
            <span>{titleFromId(approval.moduleId)}</span>
            <StatusPill tone="warn" label={approval.status.replace(/_/g, " ")} />
            <span>{approval.trafficClass}</span>
            <span>{approval.selectedPath}</span>
          </div>
        ))}
      </div>
    );
  }

  if (activeWorkspace === "lighting") {
    return (
      <div className="ops-workspace lighting-workspace">
        <div className="state-rack lighting-state-rack">
          <div>
            <span>Scenes</span>
            <strong>{commandCentre.lighting.summary.enabledSceneCount}</strong>
          </div>
          <div>
            <span>Fixtures</span>
            <strong>{commandCentre.lighting.summary.onlineFixtureCount}/{commandCentre.lighting.summary.fixtureCount}</strong>
          </div>
          <div>
            <span>Schedules</span>
            <strong>{commandCentre.lighting.summary.enabledScheduleCount}</strong>
          </div>
          <div>
            <span>Recipes</span>
            <strong>{commandCentre.lighting.summary.intentRecipeCount}</strong>
          </div>
        </div>
        <div className="ops-table lighting-ops-table">
          <div className="ops-row ops-head">
            <span>Scene</span>
            <span>Mode</span>
            <span>Targets</span>
            <span>Traffic</span>
            <span>Gate</span>
          </div>
          {commandCentre.lighting.scenes.map((scene) => (
            <div className="ops-row" key={scene.id}>
              <strong>{scene.name}</strong>
              <span>{scene.mode}</span>
              <span>{scene.zoneTargets.length} zones</span>
              <StatusPill tone={trafficTone(scene.trafficClass)} label={scene.trafficClass} />
              <StatusPill tone={scene.requiresApproval ? "warn" : "good"} label={scene.requiresApproval ? "approval" : "direct"} />
            </div>
          ))}
        </div>
        <div className="agent-session-strip">
          {commandCentre.lighting.zones.map((zone) => (
            <div key={zone.id}>
              <strong>{zone.name}</strong>
              <span>{zone.onlineFixtures || 0}/{zone.fixtureIds.length} fixture(s) / {zone.circadianBand.replace(/-/g, " ")}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeWorkspace === "climate") {
    return (
      <div className="ops-workspace climate-workspace">
        <div className="state-rack climate-state-rack">
          <div>
            <span>Profiles</span>
            <strong>{commandCentre.climate.summary.enabledProfileCount}</strong>
          </div>
          <div>
            <span>Thermostats</span>
            <strong>{commandCentre.climate.summary.onlineThermostatCount}/{commandCentre.climate.summary.controllableZoneCount}</strong>
          </div>
          <div>
            <span>Setpoint</span>
            <strong>{commandCentre.climate.summary.averageSetpointC}C</strong>
          </div>
          <div>
            <span>Policies</span>
            <strong>{commandCentre.climate.summary.policyCount}</strong>
          </div>
        </div>
        <div className="ops-table climate-ops-table">
          <div className="ops-row ops-head">
            <span>Profile</span>
            <span>Mode</span>
            <span>Targets</span>
            <span>Traffic</span>
            <span>Gate</span>
          </div>
          {commandCentre.climate.profiles.map((profile) => (
            <div className="ops-row" key={profile.id}>
              <strong>{profile.name}</strong>
              <span>{profile.mode}</span>
              <span>{profile.zoneTargets.length} zones</span>
              <StatusPill tone={trafficTone(profile.trafficClass)} label={profile.trafficClass} />
              <StatusPill tone={profile.requiresApproval ? "warn" : "good"} label={profile.requiresApproval ? "approval" : "range checked"} />
            </div>
          ))}
        </div>
        <div className="agent-session-strip">
          {commandCentre.climate.zones.map((zone) => (
            <div key={zone.id}>
              <strong>{zone.name}</strong>
              <span>{zone.controllable ? "controllable" : "sensor only"} / {zone.occupancyMode.replace(/-/g, " ")}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeWorkspace === "approvals") {
    return (
      <div className="ops-workspace approval-workspace">
        <div className="state-rack approval-state-rack">
          <div>
            <span>Pending</span>
            <strong>{commandCentre.approvals.summary.pending}</strong>
          </div>
          <div>
            <span>Ready</span>
            <strong>{commandCentre.approvals.summary.readyForApproval || 0}</strong>
          </div>
          <div>
            <span>Simulation</span>
            <strong>{commandCentre.approvals.summary.simulationAttached || 0}</strong>
          </div>
          <div>
            <span>Policy Rules</span>
            <strong>{commandCentre.approvals.policyRules?.length || 0}</strong>
          </div>
        </div>
        <div className="ops-table approval-ops-table">
          <div className="ops-row ops-head">
            <span>Approval</span>
            <span>Policy</span>
            <span>KRA</span>
            <span>Simulation</span>
            <span>Queue</span>
          </div>
          {commandCentre.approvals.approvals.map((approval) => (
            <div className="ops-row attention-row" key={approval.id}>
              <strong>{approval.deviceName}</strong>
              <StatusPill tone={approval.policy?.readyForApproval ? "good" : "warn"} label={approval.policy?.result.replace(/_/g, " ") || approval.status} />
              <StatusPill tone={approval.critique?.status === "conflict" ? "danger" : "warn"} label={approval.critique?.status.replace(/_/g, " ") || "review"} />
              <StatusPill tone={approval.simulation?.attached ? "good" : "danger"} label={approval.simulation?.attached ? "attached" : "missing"} />
              <span>{approval.commandQueue?.status.replace(/_/g, " ") || "held"}</span>
            </div>
          ))}
        </div>
        <div className="agent-session-strip">
          {(commandCentre.approvals.policyRules || []).slice(0, 4).map((rule) => (
            <div key={rule.id}>
              <strong>{rule.name}</strong>
              <span>{rule.category.replace(/_/g, " ")} / {rule.risk}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeWorkspace === "agents") {
    return (
      <div className="ops-workspace">
        <div className="state-rack agent-state-rack">
          <div>
            <span>Agents</span>
            <strong>{commandCentre.agents.summary.agentCount}</strong>
          </div>
          <div>
            <span>Tools</span>
            <strong>{commandCentre.agents.summary.toolCount}</strong>
          </div>
          <div>
            <span>Permission Gates</span>
            <strong>{commandCentre.agents.summary.approvalRequiredTools}</strong>
          </div>
          <div>
            <span>Audit Calls</span>
            <strong>{commandCentre.agents.summary.auditEventCount}</strong>
          </div>
        </div>
        <div className="ops-table agent-ops-table">
          <div className="ops-row ops-head">
            <span>Tool</span>
            <span>Agent</span>
            <span>Risk</span>
            <span>Gate</span>
            <span>Status</span>
          </div>
          {commandCentre.agents.tools.slice(0, 8).map((tool) => (
            <div className="ops-row" key={tool.id}>
              <strong>{tool.name}</strong>
              <span>{titleFromId(tool.agentId)}</span>
              <StatusPill tone={riskTone(tool.risk)} label={tool.risk} />
              <StatusPill tone={tool.requiresApproval ? "warn" : "good"} label={tool.requiresApproval ? "permission" : "direct"} />
              <span>{tool.status}</span>
            </div>
          ))}
        </div>
        <div className="agent-session-strip">
          {commandCentre.agents.sessions.map((session) => (
            <div key={session.id}>
              <strong>{session.name}</strong>
              <span>{session.requestedTools.length} tools / {session.status.replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeWorkspace === "risk") {
    return (
      <div className="ops-workspace risk-workspace">
        <div className="state-rack risk-state-rack">
          <div>
            <span>Rule Packs</span>
            <strong>{commandCentre.risk.summary.rulePackCount}</strong>
          </div>
          <div>
            <span>Evidence Sources</span>
            <strong>{commandCentre.risk.summary.sourceCount}</strong>
          </div>
          <div>
            <span>Blocking Boundaries</span>
            <strong>{commandCentre.risk.summary.blockingRulePacks}</strong>
          </div>
          <div>
            <span>Audit Evidence</span>
            <strong>{commandCentre.risk.summary.auditEvidenceCount || 0}</strong>
          </div>
        </div>
        <div className="ops-table risk-ops-table">
          <div className="ops-row ops-head">
            <span>Rule Pack</span>
            <span>Category</span>
            <span>Risk</span>
            <span>Boundary</span>
            <span>Status</span>
          </div>
          {commandCentre.risk.rulePacks.map((pack) => (
            <div className="ops-row" key={pack.id}>
              <strong>{pack.name}</strong>
              <span>{pack.category.replace(/_/g, " ")}</span>
              <StatusPill tone={pack.risk === "critical" || pack.risk === "high" ? "danger" : "warn"} label={pack.risk} />
              <StatusPill tone={pack.blocking ? "danger" : "warn"} label={pack.blocking ? "blocking" : "review"} />
              <span>{pack.status}</span>
            </div>
          ))}
        </div>
        <div className="agent-session-strip">
          {commandCentre.risk.seedEvaluations.map((evaluation) => (
            <div key={evaluation.id}>
              <strong>{evaluation.summary}</strong>
              <span>{evaluation.intentClass.replace(/_/g, " ")} / {evaluation.status.replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeWorkspace === "simulations") {
    return (
      <div className="ops-workspace simulation-workspace">
        <div className="state-rack simulation-state-rack">
          <div>
            <span>Scenarios</span>
            <strong>{commandCentre.simulations.summary.scenarioCount}</strong>
          </div>
          <div>
            <span>Variants</span>
            <strong>{commandCentre.simulations.summary.variantCount}</strong>
          </div>
          <div>
            <span>Failure Modes</span>
            <strong>{commandCentre.simulations.summary.failureModeCount}</strong>
          </div>
          <div>
            <span>Attachments</span>
            <strong>{commandCentre.simulations.summary.recentApprovalAttachmentCount || 0}</strong>
          </div>
        </div>
        <div className="ops-table simulation-ops-table">
          <div className="ops-row ops-head">
            <span>Scenario</span>
            <span>Module</span>
            <span>Risk</span>
            <span>Variants</span>
            <span>Traffic</span>
          </div>
          {commandCentre.simulations.scenarios.map((scenario) => (
            <div className="ops-row" key={scenario.id}>
              <strong>{scenario.name}</strong>
              <span>{scenario.moduleId.replace(/-/g, " ")}</span>
              <StatusPill tone={riskTone(scenario.risk as ModuleDefinition["risk"])} label={scenario.risk} />
              <span>{scenario.variants.length}</span>
              <StatusPill tone={trafficTone(scenario.trafficClass)} label={scenario.trafficClass} />
            </div>
          ))}
        </div>
        <div className="agent-session-strip">
          {commandCentre.simulations.recentReports.map((report) => (
            <div key={report.reportId}>
              <strong>{report.scenarioName}</strong>
              <span>{report.status.replace(/_/g, " ")} / {report.approvalAttachmentCount} attachment(s)</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeWorkspace === "connectivity") {
    return (
      <div className="ops-table connectivity-ops-table">
        <div className="ops-row ops-head">
          <span>Path / Route</span>
          <span>Class</span>
          <span>Status</span>
          <span>Score / Bytes</span>
          <span>Ack / Type</span>
        </div>
        {commandCentre.connectivity.links.map((link) => (
          <div className="ops-row" key={link.id}>
            <strong>{link.name}</strong>
            <span>{link.carries.join(", ")}</span>
            <StatusPill tone={link.status === "healthy" || link.status === "ready" ? "good" : "warn"} label={link.status} />
            <span>{link.score}</span>
            <span>{titleFromId(link.class)}</span>
          </div>
        ))}
        {commandCentre.connectivity.routes.map((route) => (
          <div className="ops-row route-ops-row" key={route.id}>
            <strong>{titleFromId(route.command)}</strong>
            <span>{route.class}</span>
            <StatusPill tone={String(route.status).includes("blocked") ? "danger" : route.status === "ready" ? "good" : "warn"} label={String(route.status).includes("blocked") ? "blocked" : route.status.replace(/_/g, " ")} />
            <span>{route.encodedBytes} bytes</span>
            <span>{route.ackRequired ? "required" : "none"}</span>
          </div>
        ))}
      </div>
    );
  }

  if (activeWorkspace === "identity") {
    return (
      <div className="identity-workspace">
        <div className="identity-facts">
          <div><span>Tenant</span><strong>{commandCentre.identity.tenant}</strong></div>
          <div><span>Mode</span><strong>{commandCentre.identity.normalizedMode}</strong></div>
          <div><span>Audience</span><strong>{commandCentre.identity.audience}</strong></div>
          <div><span>Secrets</span><strong>{commandCentre.identity.keyVaultEnabled ? "Key Vault" : "Environment"}</strong></div>
        </div>
        <div className="role-rack">
          {commandCentre.identity.roles.map((role) => <StatusPill key={role} tone="neutral" label={role.replace("Automation.", "")} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="ops-table audit-ops-table">
      <div className="ops-row ops-head">
        <span>Time</span>
        <span>Stream</span>
        <span>Summary</span>
        <span>Status</span>
        <span>Traffic</span>
      </div>
      {commandCentre.audit.events.slice(0, 8).map((event) => (
        <div className="ops-row audit-ops-row" key={event.id}>
          <span>{formatTime(event.timestamp)}</span>
          <StatusPill tone={streamTone(event.stream)} label={event.stream} />
          <strong>{event.summary}</strong>
          <span>{event.status.replace(/_/g, " ")}</span>
          <span>{event.trafficClass}</span>
        </div>
      ))}
    </div>
  );
}

function ActionQueue({
  actions,
  activeWorkspace,
}: {
  actions: CommandCentreResponse["actionQueue"];
  activeWorkspace: CommandCentreWorkspaceId;
}) {
  const visibleActions = actions.filter((action) => action.workspaceId === activeWorkspace);
  const fallbackActions = visibleActions.length > 0 ? visibleActions : actions.slice(0, 5);

  return (
    <aside className="action-queue" aria-label="Command centre action queue">
      <div className="section-header compact">
        <h3>Action Queue</h3>
        <AlertTriangle size={18} />
      </div>
      <div className="action-list">
        {fallbackActions.map((action) => (
          <div className="action-row" key={action.id}>
            <div>
              <strong>{action.title}</strong>
              <span>{action.owner} / {action.detail}</span>
            </div>
            <div className="action-row-meta">
              <StatusPill tone={trafficTone(action.priority)} label={action.priority} />
              <StatusPill tone={action.status.includes("blocked") ? "danger" : action.status.includes("pending") || action.status.includes("degraded") || action.status.includes("standby") ? "warn" : "good"} label={action.status.replace(/_/g, " ")} />
            </div>
          </div>
        ))}
        {fallbackActions.length === 0 && (
          <div className="event-empty">
            <CheckCircle2 size={18} />
            <span>No active actions for this workspace.</span>
          </div>
        )}
      </div>
    </aside>
  );
}

function LightingScenesPanel({
  lighting,
  preview,
  intentPreview,
  loading,
  onPreview,
  onApply,
  onIntentPreview,
}: {
  lighting: LightingDashboardResponse | null;
  preview: LightingScenePreview | null;
  intentPreview: LightingIntentPreview | null;
  loading: "preview" | "apply" | "intent" | null;
  onPreview: (sceneId: string) => void;
  onApply: (sceneId: string) => void;
  onIntentPreview: (intent: string) => void;
}) {
  const scenes = lighting?.scenes || [];
  const zones = lighting?.zones || [];
  const schedules = lighting?.schedules || [];
  const recipes = lighting?.intentRecipes || [];
  const activeSceneId = preview?.scene.id || lighting?.service.defaultSceneId || scenes[0]?.id;
  const activeScene = scenes.find((scene) => scene.id === activeSceneId) || scenes[0];
  const activeRecipe = recipes.find((recipe) => recipe.sceneId === activeScene?.id) || recipes[0];

  return (
    <section className="lighting-scenes-panel" aria-label="Lighting and scenes">
      <div className="section-header lighting-header">
        <div>
          <p className="eyebrow">Lighting And Scenes</p>
          <h2>Scene Command Surface</h2>
        </div>
        <div className="event-summary">
          <StatusPill tone="good" label={`${lighting?.summary.enabledSceneCount || 0} enabled`} />
          <StatusPill tone={lighting?.summary.onlineFixtureCount === lighting?.summary.fixtureCount ? "good" : "warn"} label={`${lighting?.summary.onlineFixtureCount || 0}/${lighting?.summary.fixtureCount || 0} fixtures`} />
          <StatusPill tone={preview?.status === "blocked" ? "danger" : preview?.status === "executed_simulated" ? "good" : "neutral"} label={preview?.status.replace(/_/g, " ") || "ready"} />
        </div>
      </div>

      <div className="lighting-grid">
        <div className="lighting-panel scene-picker-panel">
          <div className="section-header compact">
            <h3>Scenes</h3>
            <Lightbulb size={18} />
          </div>
          <div className="lighting-scene-list">
            {scenes.map((scene) => (
              <div className={`lighting-scene-row ${scene.id === activeSceneId ? "active" : ""}`} key={scene.id}>
                <div>
                  <strong>{scene.name}</strong>
                  <span>{scene.mode} / {scene.zoneTargets.length} target(s)</span>
                </div>
                <div className="lighting-scene-actions">
                  <button onClick={() => onPreview(scene.id)} disabled={Boolean(loading)}>
                    <PlayCircle size={15} />
                    <span>{loading === "preview" && scene.id === activeSceneId ? "Previewing" : "Preview"}</span>
                  </button>
                  <button onClick={() => onApply(scene.id)} disabled={Boolean(loading)}>
                    <CheckCircle2 size={15} />
                    <span>{loading === "apply" && scene.id === activeSceneId ? "Applying" : "Apply"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          {activeRecipe && (
            <button className="lighting-intent-button" onClick={() => onIntentPreview(activeRecipe.exampleIntent)} disabled={Boolean(loading)}>
              <Bot size={16} />
              <span>{loading === "intent" ? "Matching" : activeRecipe.exampleIntent}</span>
            </button>
          )}
        </div>

        <div className="lighting-panel">
          <div className="section-header compact">
            <h3>Zones</h3>
            <Home size={18} />
          </div>
          <div className="lighting-zone-list">
            {zones.map((zone) => (
              <div className="lighting-zone-row" key={zone.id}>
                <div>
                  <strong>{zone.name}</strong>
                  <span>{zone.targetLux} lux / {zone.circadianBand.replace(/-/g, " ")}</span>
                </div>
                <StatusPill tone={zone.onlineFixtures === zone.fixtureIds.length ? "good" : "warn"} label={`${zone.onlineFixtures || 0}/${zone.fixtureIds.length}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="lighting-panel command-plan-panel">
          <div className="section-header compact">
            <h3>{preview ? preview.scene.name : "Command Plan"}</h3>
            <Settings2 size={18} />
          </div>
          <div className="lighting-command-list">
            {(preview?.commands || []).slice(0, 5).map((command) => (
              <div className="lighting-command-row" key={command.id}>
                <div>
                  <strong>{command.deviceName}</strong>
                  <span>{command.selectedPath} / {command.fadeMs}ms / {command.encodedBytes} bytes</span>
                </div>
                <StatusPill tone={command.canExecute ? "good" : "danger"} label={command.status.replace(/_/g, " ")} />
              </div>
            ))}
            {!preview && (
              <div className="event-empty">
                <Activity size={18} />
                <span>Preview a scene to generate fixture-level command plans.</span>
              </div>
            )}
          </div>
          {intentPreview && (
            <div className="lighting-intent-result">
              <strong>{intentPreview.match.name}</strong>
              <span>{Math.round(intentPreview.match.confidence * 100)}% confidence / {intentPreview.match.sceneId.replace(/-/g, " ")}</span>
            </div>
          )}
        </div>

        <div className="lighting-panel">
          <div className="section-header compact">
            <h3>Policy And Schedule</h3>
            <Shield size={18} />
          </div>
          <div className="lighting-policy-list">
            {(preview?.policy.criteria || lighting?.policies || []).slice(0, 5).map((item) => (
              "passed" in item ? (
                <div className="lighting-policy-row" key={item.id}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.id.replace(/_/g, " ")}</span>
                  </div>
                  <StatusPill tone={item.passed ? "good" : "danger"} label={item.passed ? "pass" : "hold"} />
                </div>
              ) : (
                <div className="lighting-policy-row" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.message}</span>
                  </div>
                  <StatusPill tone="good" label={item.risk} />
                </div>
              )
            ))}
            {schedules.slice(0, 3).map((schedule) => (
              <div className="lighting-policy-row schedule" key={schedule.id}>
                <div>
                  <strong>{schedule.name}</strong>
                  <span>{schedule.time} / {schedule.days.length} day(s)</span>
                </div>
                <StatusPill tone={schedule.status === "enabled" ? "good" : "muted"} label={schedule.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ClimateHvacPanel({
  climate,
  preview,
  intentPreview,
  loading,
  onPreview,
  onApply,
  onUnsafePreview,
  onIntentPreview,
}: {
  climate: ClimateDashboardResponse | null;
  preview: ClimatePreview | null;
  intentPreview: ClimateIntentPreview | null;
  loading: "preview" | "apply" | "intent" | "unsafe" | null;
  onPreview: (profileId: string) => void;
  onApply: (profileId: string) => void;
  onUnsafePreview: (zoneId: string) => void;
  onIntentPreview: (intent: string) => void;
}) {
  const profiles = climate?.profiles || [];
  const zones = climate?.zones || [];
  const schedules = climate?.schedules || [];
  const policies = climate?.policies || [];
  const recipes = climate?.intentRecipes || [];
  const activeProfileId = preview?.profile.id.replace(/^ad-hoc-/, "") || profiles[0]?.id;
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || profiles[0];
  const activeRecipe = recipes.find((recipe) => recipe.profileId === activeProfile?.id) || recipes[0];
  const controllableZone = zones.find((zone) => zone.controllable) || zones[0];

  return (
    <section className="climate-hvac-panel" aria-label="Climate and HVAC">
      <div className="section-header climate-header">
        <div>
          <p className="eyebrow">Climate And HVAC</p>
          <h2>Comfort Command Surface</h2>
        </div>
        <div className="event-summary">
          <StatusPill tone="good" label={`${climate?.summary.enabledProfileCount || 0} profiles`} />
          <StatusPill tone={climate?.summary.onlineThermostatCount === climate?.summary.controllableZoneCount ? "good" : "warn"} label={`${climate?.summary.onlineThermostatCount || 0}/${climate?.summary.controllableZoneCount || 0} thermostats`} />
          <StatusPill tone={preview?.status === "blocked" ? "danger" : preview?.status === "executed_simulated" ? "good" : "neutral"} label={preview?.status.replace(/_/g, " ") || "ready"} />
        </div>
      </div>

      <div className="climate-grid">
        <div className="climate-panel profile-picker-panel">
          <div className="section-header compact">
            <h3>Profiles</h3>
            <Thermometer size={18} />
          </div>
          <div className="climate-profile-list">
            {profiles.map((profile) => (
              <div className={`climate-profile-row ${profile.id === activeProfile?.id ? "active" : ""}`} key={profile.id}>
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.mode} / {profile.zoneTargets.length} target(s)</span>
                </div>
                <div className="climate-profile-actions">
                  <button onClick={() => onPreview(profile.id)} disabled={Boolean(loading)}>
                    <PlayCircle size={15} />
                    <span>{loading === "preview" && profile.id === activeProfile?.id ? "Previewing" : "Preview"}</span>
                  </button>
                  <button onClick={() => onApply(profile.id)} disabled={Boolean(loading)}>
                    <CheckCircle2 size={15} />
                    <span>{loading === "apply" && profile.id === activeProfile?.id ? "Applying" : "Apply"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="climate-intent-actions">
            {activeRecipe && (
              <button onClick={() => onIntentPreview(activeRecipe.exampleIntent)} disabled={Boolean(loading)}>
                <Bot size={16} />
                <span>{loading === "intent" ? "Matching" : activeRecipe.exampleIntent}</span>
              </button>
            )}
            {controllableZone && (
              <button className="guard" onClick={() => onUnsafePreview(controllableZone.id)} disabled={Boolean(loading)}>
                <Shield size={16} />
                <span>{loading === "unsafe" ? "Checking" : "Guard"}</span>
              </button>
            )}
          </div>
        </div>

        <div className="climate-panel">
          <div className="section-header compact">
            <h3>Zones</h3>
            <Home size={18} />
          </div>
          <div className="climate-zone-list">
            {zones.map((zone) => {
              const state = zone.thermostat?.observedState || {};
              return (
                <div className="climate-zone-row" key={zone.id}>
                  <div>
                    <strong>{zone.name}</strong>
                    <span>{state.temperatureC ?? "-"}C / set {state.setpointC ?? "-"}C / {zone.occupancyMode}</span>
                  </div>
                  <StatusPill tone={zone.controllable ? "good" : "warn"} label={zone.controllable ? "control" : "sensor"} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="climate-panel climate-command-panel">
          <div className="section-header compact">
            <h3>{preview ? preview.profile.name : "Command Plan"}</h3>
            <Settings2 size={18} />
          </div>
          <div className="climate-command-list">
            {(preview?.commands || []).slice(0, 5).map((command) => (
              <div className="climate-command-row" key={command.id}>
                <div>
                  <strong>{command.deviceName}</strong>
                  <span>{command.desiredState.setpointC}C / {command.desiredState.mode} / {command.encodedBytes} bytes</span>
                </div>
                <StatusPill tone={command.canExecute ? "good" : "danger"} label={command.status.replace(/_/g, " ")} />
              </div>
            ))}
            {!preview && (
              <div className="event-empty">
                <Activity size={18} />
                <span>Preview a profile to generate thermostat command plans.</span>
              </div>
            )}
          </div>
          {intentPreview && (
            <div className="climate-intent-result">
              <strong>{intentPreview.match.name}</strong>
              <span>{Math.round(intentPreview.match.confidence * 100)}% confidence / {intentPreview.match.profileId.replace(/-/g, " ")}</span>
            </div>
          )}
        </div>

        <div className="climate-panel">
          <div className="section-header compact">
            <h3>Policy And Schedule</h3>
            <Shield size={18} />
          </div>
          <div className="climate-policy-list">
            {preview ? (
              preview.policy.criteria.slice(0, 5).map((item) => (
                <div className="climate-policy-row" key={item.id}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.id.replace(/_/g, " ")}</span>
                  </div>
                  <StatusPill tone={item.passed ? "good" : "danger"} label={item.passed ? "pass" : "hold"} />
                </div>
              ))
            ) : (
              policies.slice(0, 4).map((policy) => (
                <div className="climate-policy-row" key={policy.id}>
                  <div>
                    <strong>{policy.name}</strong>
                    <span>{policy.message}</span>
                  </div>
                  <StatusPill tone={policy.risk === "medium" ? "warn" : "good"} label={policy.risk} />
                </div>
              ))
            )}
            {schedules.slice(0, 3).map((schedule) => (
              <div className="climate-policy-row schedule" key={schedule.id}>
                <div>
                  <strong>{schedule.name}</strong>
                  <span>{schedule.time} / {schedule.days.length} day(s)</span>
                </div>
                <StatusPill tone={schedule.status === "enabled" ? "good" : "muted"} label={schedule.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SecurityAccessPanel({
  security,
  preview,
  intentPreview,
  loading,
  onPreview,
  onApply,
  onUnlockPreview,
  onIntentPreview,
}: {
  security: SecurityDashboardResponse | null;
  preview: SecurityPreview | null;
  intentPreview: SecurityIntentPreview | null;
  loading: "preview" | "apply" | "intent" | "unlock" | null;
  onPreview: (profileId: string) => void;
  onApply: (profileId: string) => void;
  onUnlockPreview: (accessPointId: string) => void;
  onIntentPreview: (intent: string) => void;
}) {
  const profiles = security?.profiles || [];
  const accessPoints = security?.accessPoints || [];
  const policies = security?.policies || [];
  const recipes = security?.intentRecipes || [];
  const activeProfileId = preview?.profile.id.replace(/^ad-hoc-/, "") || profiles[0]?.id;
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || profiles[0];
  const activeRecipe = recipes.find((recipe) => recipe.profileId === activeProfile?.id) || recipes[0];
  const unlockPoint = accessPoints.find((point) => point.type === "door_lock") || accessPoints[0];

  return (
    <section className="security-access-panel" aria-label="Security and access">
      <div className="section-header security-header">
        <div>
          <p className="eyebrow">Security And Access</p>
          <h2>Access Command Surface</h2>
        </div>
        <div className="event-summary">
          <StatusPill tone="danger" label={`${security?.summary.accessPointCount || 0} access`} />
          <StatusPill tone={security?.summary.onlineDeviceCount === security?.summary.securityDeviceCount ? "good" : "warn"} label={`${security?.summary.onlineDeviceCount || 0}/${security?.summary.securityDeviceCount || 0} devices`} />
          <StatusPill tone={preview?.status === "approval_required" ? "warn" : preview?.status === "executed_simulated" ? "good" : "neutral"} label={preview?.status.replace(/_/g, " ") || "guarded"} />
        </div>
      </div>

      <div className="security-grid">
        <div className="security-panel profile-picker-panel">
          <div className="section-header compact">
            <h3>Profiles</h3>
            <LockKeyhole size={18} />
          </div>
          <div className="security-profile-list">
            {profiles.map((profile) => (
              <div className={`security-profile-row ${profile.id === activeProfile?.id ? "active" : ""}`} key={profile.id}>
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.mode.replace(/_/g, " ")} / {profile.actions.length} action(s)</span>
                </div>
                <div className="security-profile-actions">
                  <button onClick={() => onPreview(profile.id)} disabled={Boolean(loading)}>
                    <PlayCircle size={15} />
                    <span>{loading === "preview" && profile.id === activeProfile?.id ? "Previewing" : "Preview"}</span>
                  </button>
                  <button onClick={() => onApply(profile.id)} disabled={Boolean(loading)}>
                    <CheckCircle2 size={15} />
                    <span>{loading === "apply" && profile.id === activeProfile?.id ? "Applying" : "Apply"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="security-intent-actions">
            {activeRecipe && (
              <button onClick={() => onIntentPreview(activeRecipe.exampleIntent)} disabled={Boolean(loading)}>
                <Bot size={16} />
                <span>{loading === "intent" ? "Matching" : activeRecipe.exampleIntent}</span>
              </button>
            )}
            {unlockPoint && (
              <button className="guard" onClick={() => onUnlockPreview(unlockPoint.id)} disabled={Boolean(loading)}>
                <Shield size={16} />
                <span>{loading === "unlock" ? "Checking" : "Unlock guard"}</span>
              </button>
            )}
          </div>
        </div>

        <div className="security-panel">
          <div className="section-header compact">
            <h3>Access Points</h3>
            <Home size={18} />
          </div>
          <div className="security-access-list">
            {accessPoints.map((point) => (
              <div className="security-access-row" key={point.id}>
                <div>
                  <strong>{point.name}</strong>
                  <span>{point.type.replace(/_/g, " ")} / {point.pathPreference.join(" -> ")}</span>
                </div>
                <StatusPill tone={point.risk === "high" ? "danger" : "warn"} label={point.trafficClass} />
              </div>
            ))}
          </div>
        </div>

        <div className="security-panel security-command-panel">
          <div className="section-header compact">
            <h3>{preview ? preview.profile.name : "Command Plan"}</h3>
            <Settings2 size={18} />
          </div>
          <div className="security-command-list">
            {(preview?.commands || []).slice(0, 5).map((command) => (
              <div className="security-command-row" key={command.id}>
                <div>
                  <strong>{command.deviceName}</strong>
                  <span>{command.action.replace(/_/g, " ")} / {command.selectedPath} / {command.encodedBytes} bytes</span>
                </div>
                <StatusPill tone={command.policyDecision === "approval_required" ? "warn" : command.canExecute ? "good" : "danger"} label={command.status.replace(/_/g, " ")} />
              </div>
            ))}
            {!preview && (
              <div className="event-empty">
                <Activity size={18} />
                <span>Preview a security profile to generate guarded command plans.</span>
              </div>
            )}
          </div>
          {intentPreview && (
            <div className="security-intent-result">
              <strong>{intentPreview.match.name}</strong>
              <span>{Math.round(intentPreview.match.confidence * 100)}% confidence / {intentPreview.match.profileId.replace(/-/g, " ")}</span>
            </div>
          )}
        </div>

        <div className="security-panel">
          <div className="section-header compact">
            <h3>Policy Boundary</h3>
            <Shield size={18} />
          </div>
          <div className="security-policy-list">
            {preview ? (
              preview.policy.criteria.slice(0, 5).map((item) => (
                <div className="security-policy-row" key={item.id}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.id.replace(/_/g, " ")}</span>
                  </div>
                  <StatusPill tone={item.passed ? "good" : "danger"} label={item.passed ? "pass" : "hold"} />
                </div>
              ))
            ) : (
              policies.slice(0, 4).map((policy) => (
                <div className="security-policy-row" key={policy.id}>
                  <div>
                    <strong>{policy.name}</strong>
                    <span>{policy.message}</span>
                  </div>
                  <StatusPill tone={policy.requiresApproval ? "warn" : "good"} label={policy.risk} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function WaterManagementPanel({
  water,
  preview,
  intentPreview,
  loading,
  onPreview,
  onApply,
  onIntentPreview,
}: {
  water: WaterDashboardResponse | null;
  preview: WaterPreview | null;
  intentPreview: WaterIntentPreview | null;
  loading: "preview" | "apply" | "intent" | null;
  onPreview: (profileId: string) => void;
  onApply: (profileId: string) => void;
  onIntentPreview: (intent: string) => void;
}) {
  const profiles = water?.profiles || [];
  const zones = water?.zones || [];
  const policies = water?.policies || [];
  const recipes = water?.intentRecipes || [];
  const activeProfileId = preview?.profile.id || water?.service.defaultProfileId || profiles[0]?.id;
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || profiles[0];
  const activeRecipe = recipes.find((recipe) => recipe.profileId === activeProfile?.id) || recipes[0];

  return (
    <section className="water-management-panel" aria-label="Water management">
      <div className="section-header water-header">
        <div>
          <p className="eyebrow">Water Management</p>
          <h2>Emergency Shutoff Surface</h2>
        </div>
        <div className="event-summary">
          <StatusPill tone="danger" label={`${water?.summary.zoneCount || 0} zones`} />
          <StatusPill tone={water?.summary.onlineValveCount === water?.summary.valveCount ? "good" : "warn"} label={`${water?.summary.onlineValveCount || 0}/${water?.summary.valveCount || 0} valves`} />
          <StatusPill tone={preview?.status === "approval_required" ? "warn" : preview?.status === "executed_simulated" ? "good" : "neutral"} label={preview?.status.replace(/_/g, " ") || "guarded"} />
        </div>
      </div>

      <div className="water-grid">
        <div className="water-panel profile-picker-panel">
          <div className="section-header compact">
            <h3>Profiles</h3>
            <Droplets size={18} />
          </div>
          <div className="water-profile-list">
            {profiles.map((profile) => (
              <div className={`water-profile-row ${profile.id === activeProfile?.id ? "active" : ""}`} key={profile.id}>
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.mode} / {profile.zoneTargets.length} target(s) / {profile.trafficClass}</span>
                </div>
                <div className="water-profile-actions">
                  <button onClick={() => onPreview(profile.id)} disabled={Boolean(loading)}>
                    <PlayCircle size={15} />
                    <span>{loading === "preview" && profile.id === activeProfile?.id ? "Previewing" : "Preview"}</span>
                  </button>
                  <button onClick={() => onApply(profile.id)} disabled={Boolean(loading)}>
                    <CheckCircle2 size={15} />
                    <span>{loading === "apply" && profile.id === activeProfile?.id ? "Applying" : "Apply"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          {activeRecipe && (
            <button className="water-intent-button" onClick={() => onIntentPreview(activeRecipe.exampleIntent)} disabled={Boolean(loading)}>
              <Bot size={16} />
              <span>{loading === "intent" ? "Matching" : activeRecipe.exampleIntent}</span>
            </button>
          )}
        </div>

        <div className="water-panel">
          <div className="section-header compact">
            <h3>Zones</h3>
            <Home size={18} />
          </div>
          <div className="water-zone-list">
            {zones.map((zone) => {
              const valve = zone.devices?.valve;
              const leak = zone.devices?.leakSensor;
              return (
                <div className="water-zone-row" key={zone.id}>
                  <div>
                    <strong>{zone.name}</strong>
                    <span>{valve?.observedState.position ?? "-"} valve / leak {String(leak?.observedState.leak ?? false)} / {zone.pathPreference.join(" -> ")}</span>
                  </div>
                  <StatusPill tone={zone.trafficClass === "P0_EMERGENCY" ? "danger" : "warn"} label={zone.trafficClass} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="water-panel water-command-panel">
          <div className="section-header compact">
            <h3>{preview ? preview.profile.name : "Command Plan"}</h3>
            <Settings2 size={18} />
          </div>
          <div className="water-command-list">
            {(preview?.commands || []).slice(0, 5).map((command) => (
              <div className="water-command-row" key={command.id}>
                <div>
                  <strong>{command.deviceName}</strong>
                  <span>{command.action} / {command.selectedPath} / {command.encodedBytes} bytes</span>
                </div>
                <StatusPill tone={command.policyDecision === "approval_required" ? "warn" : command.canExecute ? "good" : "danger"} label={command.status.replace(/_/g, " ")} />
              </div>
            ))}
            {!preview && (
              <div className="event-empty">
                <Activity size={18} />
                <span>Preview a water profile to generate valve command plans.</span>
              </div>
            )}
          </div>
          {intentPreview && (
            <div className="water-intent-result">
              <strong>{intentPreview.match.name}</strong>
              <span>{Math.round(intentPreview.match.confidence * 100)}% confidence / {intentPreview.match.profileId.replace(/-/g, " ")}</span>
            </div>
          )}
        </div>

        <div className="water-panel">
          <div className="section-header compact">
            <h3>Policy Evidence</h3>
            <Shield size={18} />
          </div>
          <div className="water-policy-list">
            {preview ? (
              preview.policy.criteria.slice(0, 5).map((item) => (
                <div className="water-policy-row" key={item.id}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.id.replace(/_/g, " ")}</span>
                  </div>
                  <StatusPill tone={item.passed ? "good" : "danger"} label={item.passed ? "pass" : "hold"} />
                </div>
              ))
            ) : (
              policies.slice(0, 5).map((policy) => (
                <div className="water-policy-row" key={policy.id}>
                  <div>
                    <strong>{policy.name}</strong>
                    <span>{policy.message}</span>
                  </div>
                  <StatusPill tone={policy.risk === "high" ? "danger" : "warn"} label={policy.risk} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function EnergyManagementPanel({
  energy,
  preview,
  intentPreview,
  loading,
  onPreview,
  onApply,
  onIntentPreview,
}: {
  energy: EnergyDashboardResponse | null;
  preview: EnergyPreview | null;
  intentPreview: EnergyIntentPreview | null;
  loading: "preview" | "apply" | "intent" | null;
  onPreview: (profileId: string) => void;
  onApply: (profileId: string) => void;
  onIntentPreview: (intent: string) => void;
}) {
  const profiles = energy?.profiles || [];
  const assets = energy?.assets || [];
  const policies = energy?.policies || [];
  const tariffs = energy?.tariffs || [];
  const forecasts = energy?.forecasts || [];
  const recipes = energy?.intentRecipes || [];
  const activeProfileId = preview?.profile.id || energy?.service.defaultProfileId || profiles[0]?.id;
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || profiles[0];
  const activeRecipe = recipes.find((recipe) => recipe.profileId === activeProfile?.id) || recipes[0];
  const forecast = forecasts[0];
  const tariff = tariffs[0];

  return (
    <section className="energy-management-panel" aria-label="Energy and solar management">
      <div className="section-header energy-header">
        <div>
          <p className="eyebrow">Energy And Solar</p>
          <h2>Reserve-Aware Power Surface</h2>
        </div>
        <div className="event-summary">
          <StatusPill tone="good" label={`${energy?.summary.totalSolarWatts || 0}W solar`} />
          <StatusPill tone={Number(energy?.summary.batteryPercent || 0) >= 35 ? "good" : "danger"} label={`${energy?.summary.batteryPercent || 0}% battery`} />
          <StatusPill tone={preview?.status === "approval_required" ? "warn" : preview?.status === "ready" ? "good" : "neutral"} label={preview?.status.replace(/_/g, " ") || "optimizing"} />
        </div>
      </div>

      <div className="energy-grid">
        <div className="energy-panel profile-picker-panel">
          <div className="section-header compact">
            <h3>Profiles</h3>
            <Zap size={18} />
          </div>
          <div className="energy-profile-list">
            {profiles.map((profile) => (
              <div className={`energy-profile-row ${profile.id === activeProfile?.id ? "active" : ""}`} key={profile.id}>
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.mode} / {profile.assetTargets.length} target(s) / {profile.trafficClass}</span>
                </div>
                <div className="energy-profile-actions">
                  <button onClick={() => onPreview(profile.id)} disabled={Boolean(loading)}>
                    <PlayCircle size={15} />
                    <span>{loading === "preview" && profile.id === activeProfile?.id ? "Previewing" : "Preview"}</span>
                  </button>
                  <button onClick={() => onApply(profile.id)} disabled={Boolean(loading)}>
                    <CheckCircle2 size={15} />
                    <span>{loading === "apply" && profile.id === activeProfile?.id ? "Applying" : "Apply"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          {activeRecipe && (
            <button className="energy-intent-button" onClick={() => onIntentPreview(activeRecipe.exampleIntent)} disabled={Boolean(loading)}>
              <Bot size={16} />
              <span>{loading === "intent" ? "Matching" : activeRecipe.exampleIntent}</span>
            </button>
          )}
        </div>

        <div className="energy-panel">
          <div className="section-header compact">
            <h3>Assets</h3>
            <BatteryCharging size={18} />
          </div>
          <div className="energy-asset-list">
            {assets.map((asset) => {
              const meter = asset.devices?.meter;
              const solar = asset.devices?.solarInverter;
              const battery = asset.devices?.battery;
              const charger = asset.devices?.evCharger;
              return (
                <div className="energy-asset-row" key={asset.id}>
                  <div>
                    <strong>{asset.name}</strong>
                    <span>{meter?.observedState.watts ?? 0}W load / {solar?.observedState.generationWatts ?? 0}W solar / {battery?.observedState.stateOfChargePercent ?? 0}% battery / EV {String(charger?.observedState.pluggedIn ?? false)}</span>
                  </div>
                  <StatusPill tone={asset.trafficClass === "P1_SECURITY" ? "warn" : "good"} label={asset.trafficClass} />
                </div>
              );
            })}
          </div>
          {forecast && (
            <div className="energy-forecast">
              <strong>{forecast.name}</strong>
              <span>{forecast.solarKwh}kWh solar / £{forecast.savingForecastGbp.toFixed(2)} saving / {Math.round(forecast.confidence * 100)}% confidence</span>
            </div>
          )}
        </div>

        <div className="energy-panel energy-command-panel">
          <div className="section-header compact">
            <h3>{preview ? preview.profile.name : "Command Plan"}</h3>
            <Settings2 size={18} />
          </div>
          <div className="energy-command-list">
            {(preview?.commands || []).slice(0, 5).map((command) => (
              <div className="energy-command-row" key={command.id}>
                <div>
                  <strong>{command.deviceName}</strong>
                  <span>{command.action} / {command.selectedPath} / {command.encodedBytes} bytes</span>
                </div>
                <StatusPill tone={command.policyDecision === "approval_required" ? "warn" : command.canExecute ? "good" : "danger"} label={command.status.replace(/_/g, " ")} />
              </div>
            ))}
            {!preview && (
              <div className="event-empty">
                <Activity size={18} />
                <span>Preview an energy profile to generate tariff and reserve command plans.</span>
              </div>
            )}
          </div>
          {intentPreview && (
            <div className="energy-intent-result">
              <strong>{intentPreview.match.name}</strong>
              <span>{Math.round(intentPreview.match.confidence * 100)}% confidence / {intentPreview.match.profileId.replace(/-/g, " ")}</span>
            </div>
          )}
        </div>

        <div className="energy-panel">
          <div className="section-header compact">
            <h3>Tariff And Policy</h3>
            <Shield size={18} />
          </div>
          <div className="energy-policy-list">
            {tariff && (
              <div className="energy-policy-row">
                <div>
                  <strong>{tariff.name}</strong>
                  <span>{tariff.currentPencePerKwh}p import / {tariff.exportPencePerKwh}p export / low {tariff.lowWindows[0]?.start}-{tariff.lowWindows[0]?.end}</span>
                </div>
                <StatusPill tone="good" label="tariff" />
              </div>
            )}
            {preview ? (
              preview.policy.criteria.slice(0, 4).map((item) => (
                <div className="energy-policy-row" key={item.id}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.id.replace(/_/g, " ")}</span>
                  </div>
                  <StatusPill tone={item.passed ? "good" : "danger"} label={item.passed ? "pass" : "hold"} />
                </div>
              ))
            ) : (
              policies.slice(0, 4).map((policy) => (
                <div className="energy-policy-row" key={policy.id}>
                  <div>
                    <strong>{policy.name}</strong>
                    <span>{policy.message}</span>
                  </div>
                  <StatusPill tone={policy.risk === "high" ? "danger" : "warn"} label={policy.risk} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SensingPresencePanel({
  sensing,
  preview,
  intentPreview,
  loading,
  onPreview,
  onIntentPreview,
}: {
  sensing: SensingDashboardResponse | null;
  preview: SensingPreview | null;
  intentPreview: SensingIntentPreview | null;
  loading: "preview" | "intent" | null;
  onPreview: (profileId: string) => void;
  onIntentPreview: (intent: string) => void;
}) {
  const profiles = sensing?.profiles || [];
  const zones = sensing?.zones || [];
  const policies = sensing?.policies || [];
  const recipes = sensing?.intentRecipes || [];
  const activeProfileId = preview?.profile.id || sensing?.service.defaultProfileId || profiles[0]?.id;
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || profiles[0];
  const activeRecipe = recipes.find((recipe) => recipe.profileId === activeProfile?.id) || recipes[0];

  return (
    <section className="sensing-presence-panel" aria-label="Occupancy presence and environmental sensing">
      <div className="section-header sensing-header">
        <div>
          <p className="eyebrow">Occupancy / Presence / Environment</p>
          <h2>Privacy-Aware Context Surface</h2>
        </div>
        <div className="event-summary">
          <StatusPill tone="good" label={`${sensing?.summary.occupiedZoneCount || 0}/${sensing?.summary.zoneCount || 0} occupied`} />
          <StatusPill tone="warn" label={`${sensing?.summary.averageCo2Ppm || 0}ppm CO2`} />
          <StatusPill tone={sensing?.summary.privacyStrictZoneCount ? "danger" : "good"} label={`${sensing?.summary.privacyStrictZoneCount || 0} strict`} />
        </div>
      </div>

      <div className="sensing-grid">
        <div className="sensing-panel profile-picker-panel">
          <div className="section-header compact">
            <h3>Profiles</h3>
            <UserRound size={18} />
          </div>
          <div className="sensing-profile-list">
            {profiles.map((profile) => (
              <div className={`sensing-profile-row ${profile.id === activeProfile?.id ? "active" : ""}`} key={profile.id}>
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.mode} / {profile.zoneTargets.length} target(s) / {profile.trafficClass}</span>
                </div>
                <button onClick={() => onPreview(profile.id)} disabled={Boolean(loading)}>
                  <PlayCircle size={15} />
                  <span>{loading === "preview" && profile.id === activeProfile?.id ? "Previewing" : "Preview"}</span>
                </button>
              </div>
            ))}
          </div>
          {activeRecipe && (
            <button className="sensing-intent-button" onClick={() => onIntentPreview(activeRecipe.exampleIntent)} disabled={Boolean(loading)}>
              <Bot size={16} />
              <span>{loading === "intent" ? "Matching" : activeRecipe.exampleIntent}</span>
            </button>
          )}
        </div>

        <div className="sensing-panel">
          <div className="section-header compact">
            <h3>Room Context</h3>
            <Home size={18} />
          </div>
          <div className="sensing-zone-list">
            {zones.map((zone) => {
              const occupancy = zone.devices?.occupancy as { observedState?: Record<string, string | number | boolean> } | null | undefined;
              const air = zone.devices?.airQuality as { observedState?: Record<string, string | number | boolean> } | null | undefined;
              return (
                <div className="sensing-zone-row" key={zone.id}>
                  <div>
                    <strong>{zone.name}</strong>
                    <span>{String(occupancy?.observedState?.occupied ?? false)} / {occupancy?.observedState?.confidence ?? "-"} confidence / {air?.observedState?.co2Ppm ?? "-"}ppm CO2</span>
                  </div>
                  <StatusPill tone={zone.privacyMode === "strict" ? "danger" : "good"} label={zone.privacyMode.replace(/_/g, " ")} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="sensing-panel">
          <div className="section-header compact">
            <h3>{preview ? preview.profile.name : "Context Plan"}</h3>
            <Settings2 size={18} />
          </div>
          <div className="sensing-command-list">
            {(preview?.commands || []).slice(0, 5).map((command) => (
              <div className="sensing-command-row" key={command.id}>
                <div>
                  <strong>{command.zoneName}</strong>
                  <span>{command.action} / {command.observedState.confidence ?? "-"} confidence / {command.observedState.privacyMode}</span>
                </div>
                <StatusPill tone={command.policyDecision === "approval_required" ? "warn" : command.canExecute ? "good" : "danger"} label={command.status.replace(/_/g, " ")} />
              </div>
            ))}
            {!preview && (
              <div className="event-empty">
                <Activity size={18} />
                <span>Preview a sensing profile to generate privacy-aware context evidence.</span>
              </div>
            )}
          </div>
          {intentPreview && (
            <div className="sensing-intent-result">
              <strong>{intentPreview.match.name}</strong>
              <span>{Math.round(intentPreview.match.confidence * 100)}% confidence / {intentPreview.match.profileId.replace(/-/g, " ")}</span>
            </div>
          )}
        </div>

        <div className="sensing-panel">
          <div className="section-header compact">
            <h3>Privacy Policy</h3>
            <Shield size={18} />
          </div>
          <div className="sensing-policy-list">
            {preview ? (
              preview.policy.criteria.slice(0, 5).map((item) => (
                <div className="sensing-policy-row" key={item.id}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.id.replace(/_/g, " ")}</span>
                  </div>
                  <StatusPill tone={item.passed ? "good" : "danger"} label={item.passed ? "pass" : "hold"} />
                </div>
              ))
            ) : (
              policies.slice(0, 5).map((policy) => (
                <div className="sensing-policy-row" key={policy.id}>
                  <div>
                    <strong>{policy.name}</strong>
                    <span>{policy.message}</span>
                  </div>
                  <StatusPill tone={policy.risk === "high" ? "danger" : "warn"} label={policy.risk} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ModuleManifestPanel({
  manifest,
  preview,
  intentPreview,
  loading,
  onPreview,
  onIntentPreview,
}: {
  manifest: ModuleManifestResponse | null;
  preview: ModuleFlagPreview | null;
  intentPreview: ModuleManifestIntentPreview | null;
  loading: "preview" | "intent" | null;
  onPreview: (moduleId: string) => void;
  onIntentPreview: (intent: string) => void;
}) {
  const flags = manifest?.flags || [];
  const lanes = manifest?.buildLanes || [];
  const recipes = manifest?.intentRecipes || [];
  const activeFlagId = preview?.flag.id || flags.find((flag) => flag.state !== "enabled")?.id || flags[0]?.id;
  const activeFlag = flags.find((flag) => flag.id === activeFlagId) || flags[0];
  const activeRecipe = recipes.find((recipe) => recipe.moduleId === activeFlag?.moduleId) || recipes[0];
  const activeLane = preview?.lane || lanes[0] || null;

  return (
    <section className="module-manifest-panel" aria-label="Module manifest and feature flags">
      <div className="section-header manifest-header">
        <div>
          <p className="eyebrow">Module Manifest / Feature Flags</p>
          <h2>Human-Triggered Build Control</h2>
        </div>
        <div className="event-summary">
          <StatusPill tone="good" label={`${manifest?.summary.enabled || 0} enabled`} />
          <StatusPill tone="warn" label={`${manifest?.summary.buildable || 0} buildable`} />
          <StatusPill tone={manifest?.summary.approvalRequired ? "danger" : "good"} label={`${manifest?.summary.approvalRequired || 0} approval`} />
        </div>
      </div>

      <div className="manifest-grid">
        <div className="manifest-panel">
          <div className="section-header compact">
            <h3>Feature Flags</h3>
            <Puzzle size={18} />
          </div>
          <div className="manifest-flag-list">
            {flags.map((flag) => (
              <div className={`manifest-flag-row ${flag.id === activeFlag?.id ? "active" : ""}`} key={flag.id}>
                <div>
                  <strong>{flag.moduleName}</strong>
                  <span>{flag.state} / {flag.readiness.status.replace(/_/g, " ")} / {flag.environment}</span>
                </div>
                <button onClick={() => onPreview(flag.moduleId)} disabled={Boolean(loading)}>
                  <PlayCircle size={15} />
                  <span>{loading === "preview" && flag.id === activeFlag?.id ? "Planning" : "Plan"}</span>
                </button>
              </div>
            ))}
          </div>
          {activeRecipe && (
            <button className="manifest-intent-button" onClick={() => onIntentPreview(activeRecipe.exampleIntent)} disabled={Boolean(loading)}>
              <Bot size={16} />
              <span>{loading === "intent" ? "Matching" : activeRecipe.exampleIntent}</span>
            </button>
          )}
        </div>

        <div className="manifest-panel">
          <div className="section-header compact">
            <h3>Readiness</h3>
            <CheckCircle2 size={18} />
          </div>
          <div className="manifest-readiness">
            <div>
              <span>Catalog coverage</span>
              <strong>{manifest?.summary.catalogCoverage.percent || 0}%</strong>
            </div>
            <div>
              <span>Build lane</span>
              <strong>{activeLane?.name || "No lane"}</strong>
            </div>
            <div>
              <span>Runtime surface</span>
              <strong>{activeFlag?.readiness.runtimeSurface ? "available" : "held"}</strong>
            </div>
            <div>
              <span>Certification</span>
              <strong>{activeFlag?.activation.requiresCertification ? "required" : "optional"}</strong>
            </div>
          </div>
          <div className="manifest-state-grid">
            {(manifest?.flagStates || []).map((state) => (
              <div key={state.id}>
                <strong>{state.name}</strong>
                <span>{state.allowsBuild ? "build" : "hold"} / {state.requiresApproval ? "approval" : "standard"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="manifest-panel">
          <div className="section-header compact">
            <h3>{preview ? preview.flag.moduleName : "Build Plan"}</h3>
            <Settings2 size={18} />
          </div>
          <div className="manifest-stage-list">
            {(preview?.stages || activeLane?.stages.map((stage) => ({ id: stage, label: stage.replace(/-/g, " "), status: "ready" })) || []).map((stage) => (
              <div className="manifest-stage-row" key={stage.id}>
                <div>
                  <strong>{stage.label}</strong>
                  <span>{stage.id.replace(/-/g, " ")}</span>
                </div>
                <StatusPill tone={stage.status === "blocked" ? "danger" : stage.status === "approval_required" ? "warn" : "good"} label={stage.status.replace(/_/g, " ")} />
              </div>
            ))}
          </div>
          {intentPreview?.match && (
            <div className="manifest-intent-result">
              <strong>{intentPreview.match.name}</strong>
              <span>{Math.round(intentPreview.match.confidence * 100)}% confidence / {intentPreview.match.moduleId.replace(/-/g, " ")}</span>
            </div>
          )}
        </div>

        <div className="manifest-panel">
          <div className="section-header compact">
            <h3>Dependencies</h3>
            <GitBranch size={18} />
          </div>
          <div className="manifest-dependency-list">
            {(preview?.flag.dependencyStatuses || activeFlag?.dependencyStatuses || []).map((dependency) => (
              <div className="manifest-dependency-row" key={dependency.moduleId}>
                <div>
                  <strong>{dependency.name}</strong>
                  <span>{dependency.moduleId} / {dependency.state}</span>
                </div>
                <StatusPill tone={dependency.ready ? "good" : "danger"} label={dependency.ready ? "ready" : "hold"} />
              </div>
            ))}
          </div>
          <div className="manifest-artifacts">
            {(preview?.flag.artifacts || activeFlag?.artifacts || []).slice(0, 8).map((artifact) => (
              <span key={artifact}>{artifact.replace(/_/g, " ")}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ModuleMarketplacePanel({
  marketplace,
  preview,
  intentPreview,
  loading,
  onPreview,
  onIntentPreview,
}: {
  marketplace: ModuleMarketplaceResponse | null;
  preview: ModuleMarketplacePreview | null;
  intentPreview: ModuleMarketplaceIntentPreview | null;
  loading: "preview" | "intent" | null;
  onPreview: (requestId: string) => void;
  onIntentPreview: (intent: string) => void;
}) {
  const listings = marketplace?.listings || [];
  const requests = marketplace?.requests || [];
  const collections = marketplace?.curatedCollections || [];
  const recipes = marketplace?.intentRecipes || [];
  const activeRequestId = preview?.request.id || requests[0]?.id;
  const activeRecipe = recipes.find((recipe) => recipe.requestId === activeRequestId) || recipes[0];
  const visibleListings = listings
    .filter((listing) => ["available", "approval_required", "needs_manifest", "installed"].includes(listing.status))
    .slice(0, 8);

  return (
    <section className="module-marketplace-panel" aria-label="Module marketplace dashboard">
      <div className="section-header marketplace-header">
        <div>
          <p className="eyebrow">Module Marketplace</p>
          <h2>Available / Installed / Requested</h2>
        </div>
        <div className="event-summary">
          <StatusPill tone="good" label={`${marketplace?.summary.installed || 0} installed`} />
          <StatusPill tone="warn" label={`${marketplace?.summary.available || 0} available`} />
          <StatusPill tone="danger" label={`${marketplace?.summary.needsManifest || 0} manifest gap`} />
        </div>
      </div>

      <div className="marketplace-grid">
        <div className="marketplace-panel">
          <div className="section-header compact">
            <h3>Requests</h3>
            <Puzzle size={18} />
          </div>
          <div className="marketplace-request-list">
            {requests.map((request) => (
              <div className={`marketplace-request-row ${request.id === activeRequestId ? "active" : ""}`} key={request.id}>
                <div>
                  <strong>{request.name}</strong>
                  <span>{request.moduleId} / {request.listing?.status || request.status}</span>
                </div>
                <button onClick={() => onPreview(request.id)} disabled={Boolean(loading)}>
                  <PlayCircle size={15} />
                  <span>{loading === "preview" && request.id === activeRequestId ? "Previewing" : "Preview"}</span>
                </button>
              </div>
            ))}
          </div>
          {activeRecipe && (
            <button className="marketplace-intent-button" onClick={() => onIntentPreview(activeRecipe.exampleIntent)} disabled={Boolean(loading)}>
              <Bot size={16} />
              <span>{loading === "intent" ? "Matching" : activeRecipe.exampleIntent}</span>
            </button>
          )}
        </div>

        <div className="marketplace-panel">
          <div className="section-header compact">
            <h3>Listings</h3>
            <Boxes size={18} />
          </div>
          <div className="marketplace-listing-list">
            {visibleListings.map((listing) => (
              <div className="marketplace-listing-row" key={listing.moduleId}>
                <div>
                  <strong>{listing.name}</strong>
                  <span>{listing.category} / {listing.queueStatus || listing.readiness}</span>
                </div>
                <StatusPill tone={listing.status === "installed" ? "good" : listing.status === "approval_required" ? "danger" : listing.status === "needs_manifest" ? "warn" : "neutral"} label={listing.status.replace(/_/g, " ")} />
              </div>
            ))}
          </div>
        </div>

        <div className="marketplace-panel">
          <div className="section-header compact">
            <h3>Collections</h3>
            <Layers3 size={18} />
          </div>
          <div className="marketplace-collection-list">
            {collections.map((collection) => (
              <div className="marketplace-collection-row" key={collection.id}>
                <strong>{collection.name}</strong>
                <span>{collection.listings.length}/{collection.moduleIds.length} surfaced</span>
              </div>
            ))}
          </div>
          {intentPreview?.match && (
            <div className="marketplace-intent-result">
              <strong>{intentPreview.match.name}</strong>
              <span>{Math.round(intentPreview.match.confidence * 100)}% confidence / {intentPreview.match.requestId.replace(/-/g, " ")}</span>
            </div>
          )}
        </div>

        <div className="marketplace-panel">
          <div className="section-header compact">
            <h3>{preview ? preview.request.name : "Request Preview"}</h3>
            <ClipboardCheck size={18} />
          </div>
          {preview ? (
            <div className="marketplace-preview-card">
              <div>
                <span>Status</span>
                <strong>{preview.status.replace(/_/g, " ")}</strong>
              </div>
              <div>
                <span>Build plan</span>
                <strong>{preview.buildPreview?.plan.id || preview.listing?.buildPlanId || "manifest first"}</strong>
              </div>
              <div>
                <span>Queue</span>
                <strong>{preview.summary.queueReady ? "ready" : preview.summary.requiresApproval ? "approval" : "hold"}</strong>
              </div>
              <div className="marketplace-next-actions">
                {preview.nextActions.map((action) => <span key={action}>{action.replace(/_/g, " ")}</span>)}
              </div>
            </div>
          ) : (
            <div className="event-empty">
              <Activity size={18} />
              <span>Preview a marketplace request to resolve flag, build, and approval state.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ModuleBuilderPanel({
  builder,
  preview,
  intentPreview,
  loading,
  onPreview,
  onIntentPreview,
}: {
  builder: ModuleBuilderResponse | null;
  preview: ModuleBuildPreview | null;
  intentPreview: ModuleBuildIntentPreview | null;
  loading: "preview" | "intent" | null;
  onPreview: (planId: string) => void;
  onIntentPreview: (intent: string) => void;
}) {
  const plans = builder?.plans || [];
  const recipes = builder?.intentRecipes || [];
  const activePlanId = preview?.plan.id || plans.find((plan) => plan.readiness.canQueue)?.id || plans[0]?.id;
  const activePlan = plans.find((plan) => plan.id === activePlanId) || plans[0];
  const activeRecipe = recipes.find((recipe) => recipe.planId === activePlan?.id) || recipes[0];
  const fragments = preview?.fragments || activePlan?.fragments || [];
  const verification = preview?.verificationCommands || activePlan?.requiredVerification || builder?.verificationCommands || [];

  return (
    <section className="module-builder-panel" aria-label="Module builder and IaC fragments">
      <div className="section-header builder-header">
        <div>
          <p className="eyebrow">Module Builder / IaC Fragments</p>
          <h2>Proposal-Only Build Packages</h2>
        </div>
        <div className="event-summary">
          <StatusPill tone="good" label={`${builder?.summary.readyToQueue || 0} queue ready`} />
          <StatusPill tone="warn" label={`${builder?.summary.composeFragmentCount || 0} compose`} />
          <StatusPill tone="danger" label={`${builder?.summary.azureFragmentCount || 0} Azure`} />
        </div>
      </div>

      <div className="builder-grid">
        <div className="builder-panel">
          <div className="section-header compact">
            <h3>Build Plans</h3>
            <Boxes size={18} />
          </div>
          <div className="builder-plan-list">
            {plans.map((plan) => (
              <div className={`builder-plan-row ${plan.id === activePlan?.id ? "active" : ""}`} key={plan.id}>
                <div>
                  <strong>{plan.name}</strong>
                  <span>{plan.targetEnvironment} / {plan.readiness.queueStatus.replace(/_/g, " ")}</span>
                </div>
                <button onClick={() => onPreview(plan.id)} disabled={Boolean(loading)}>
                  <PlayCircle size={15} />
                  <span>{loading === "preview" && plan.id === activePlan?.id ? "Building" : "Plan"}</span>
                </button>
              </div>
            ))}
          </div>
          {activeRecipe && (
            <button className="builder-intent-button" onClick={() => onIntentPreview(activeRecipe.exampleIntent)} disabled={Boolean(loading)}>
              <Bot size={16} />
              <span>{loading === "intent" ? "Matching" : activeRecipe.exampleIntent}</span>
            </button>
          )}
        </div>

        <div className="builder-panel">
          <div className="section-header compact">
            <h3>Fragments</h3>
            <Puzzle size={18} />
          </div>
          <div className="builder-fragment-list">
            {fragments.slice(0, 6).map((fragment) => (
              <div className="builder-fragment-row" key={`${fragment.kind}-${fragment.id}`}>
                <div>
                  <strong>{fragment.serviceName || fragment.name || fragment.id}</strong>
                  <span>{fragment.kind.replace(/_/g, " ")} / {fragment.profile || fragment.resourceType || fragment.type || "plan"}</span>
                </div>
                <StatusPill tone={fragment.kind.includes("azure") ? "warn" : "good"} label={fragment.mode || "proposal"} />
              </div>
            ))}
          </div>
        </div>

        <div className="builder-panel">
          <div className="section-header compact">
            <h3>{preview ? preview.plan.name : "Verification"}</h3>
            <ClipboardCheck size={18} />
          </div>
          <div className="builder-check-list">
            {verification.map((command) => (
              <div className="builder-check-row" key={command.id}>
                <div>
                  <strong>{command.id}</strong>
                  <span>{command.command}</span>
                </div>
                <StatusPill tone={command.required ? "good" : "muted"} label={command.required ? "required" : "optional"} />
              </div>
            ))}
          </div>
          {intentPreview?.match && (
            <div className="builder-intent-result">
              <strong>{intentPreview.match.name}</strong>
              <span>{Math.round(intentPreview.match.confidence * 100)}% confidence / {intentPreview.match.planId.replace(/-/g, " ")}</span>
            </div>
          )}
        </div>

        <div className="builder-panel">
          <div className="section-header compact">
            <h3>Outputs</h3>
            <GitBranch size={18} />
          </div>
          <div className="builder-output-list">
            {(preview?.plan.expectedOutputs || activePlan?.expectedOutputs || []).map((output) => (
              <div className="builder-output-row" key={output}>
                <strong>{output}</strong>
                <span>proposal only</span>
              </div>
            ))}
          </div>
          <div className="builder-gates">
            {(preview?.plan.approvalGates || activePlan?.approvalGates || []).map((gate) => (
              <span key={gate}>{gate.replace(/-/g, " ")}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ModuleCertificationPanel({
  certification,
  preview,
  intentPreview,
  loading,
  onPreview,
  onIntentPreview,
}: {
  certification: ModuleCertificationResponse | null;
  preview: ModuleCertificationPreview | null;
  intentPreview: ModuleCertificationIntentPreview | null;
  loading: "preview" | "intent" | null;
  onPreview: (profileId: string) => void;
  onIntentPreview: (intent: string) => void;
}) {
  const profiles = certification?.profiles || [];
  const recipes = certification?.intentRecipes || [];
  const activeProfileId = preview?.profile.id || profiles.find((profile) => profile.status !== "passed")?.id || profiles[0]?.id;
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || profiles[0];
  const activeRecipe = recipes.find((recipe) => recipe.profileId === activeProfile?.id) || recipes[0];
  const suites = preview?.testSuites || activeProfile?.testSuites || certification?.testSuites || [];
  const gates = preview?.gates || activeProfile?.gates || [];
  const evidence = preview?.evidence || activeProfile?.evidence || [];

  return (
    <section className="module-certification-panel" aria-label="Module certification and test harness">
      <div className="section-header certification-header">
        <div>
          <p className="eyebrow">Module Certification / Test Harness</p>
          <h2>Enablement Evidence Gate</h2>
        </div>
        <div className="event-summary">
          <StatusPill tone="good" label={`${certification?.summary.passed || 0} passed`} />
          <StatusPill tone="warn" label={`${certification?.summary.approvalRequired || 0} approval`} />
          <StatusPill tone={certification?.summary.failed ? "danger" : "good"} label={`${certification?.summary.failed || 0} failed`} />
        </div>
      </div>

      <div className="certification-grid">
        <div className="certification-panel">
          <div className="section-header compact">
            <h3>Certification Profiles</h3>
            <ClipboardCheck size={18} />
          </div>
          <div className="certification-profile-list">
            {profiles.map((profile) => (
              <div className={`certification-profile-row ${profile.id === activeProfile?.id ? "active" : ""}`} key={profile.id}>
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.moduleId} / {profile.targetEnvironment}</span>
                </div>
                <button onClick={() => onPreview(profile.id)} disabled={Boolean(loading)}>
                  <PlayCircle size={15} />
                  <span>{loading === "preview" && profile.id === activeProfile?.id ? "Checking" : "Check"}</span>
                </button>
              </div>
            ))}
          </div>
          {activeRecipe && (
            <button className="certification-intent-button" onClick={() => onIntentPreview(activeRecipe.exampleIntent)} disabled={Boolean(loading)}>
              <Bot size={16} />
              <span>{loading === "intent" ? "Matching" : activeRecipe.exampleIntent}</span>
            </button>
          )}
        </div>

        <div className="certification-panel">
          <div className="section-header compact">
            <h3>Evidence Gates</h3>
            <Shield size={18} />
          </div>
          <div className="certification-gate-list">
            {gates.map((gate) => (
              <div className="certification-gate-row" key={gate.id}>
                <div>
                  <strong>{gate.name}</strong>
                  <span>{gate.evidenceType.replace(/_/g, " ")}</span>
                </div>
                <StatusPill tone={gate.status === "passed" ? "good" : gate.status === "missing" ? "danger" : "warn"} label={gate.status.replace(/_/g, " ")} />
              </div>
            ))}
          </div>
        </div>

        <div className="certification-panel">
          <div className="section-header compact">
            <h3>Test Suites</h3>
            <FlaskConical size={18} />
          </div>
          <div className="certification-suite-list">
            {suites.map((suite) => (
              <div className="certification-suite-row" key={suite.id}>
                <div>
                  <strong>{suite.name}</strong>
                  <span>{suite.scope.replace(/_/g, " ")} / {suite.commands[0]}</span>
                </div>
                <StatusPill tone={suite.status === "passed" ? "good" : suite.status === "failed" ? "danger" : "warn"} label={(suite.status || "defined").replace(/_/g, " ")} />
              </div>
            ))}
          </div>
          {intentPreview?.match && (
            <div className="certification-intent-result">
              <strong>{intentPreview.match.name}</strong>
              <span>{Math.round(intentPreview.match.confidence * 100)}% confidence / {intentPreview.match.profileId.replace(/-/g, " ")}</span>
            </div>
          )}
        </div>

        <div className="certification-panel">
          <div className="section-header compact">
            <h3>{preview ? preview.profile.name : "Certification Preview"}</h3>
            <CheckCircle2 size={18} />
          </div>
          {preview ? (
            <div className="certification-preview-card">
              <div>
                <span>Status</span>
                <strong>{preview.status.replace(/_/g, " ")}</strong>
              </div>
              <div>
                <span>Build plan</span>
                <strong>{preview.buildPreview?.plan.id || preview.profile.buildPlanId}</strong>
              </div>
              <div>
                <span>Evidence</span>
                <strong>{preview.summary.attachedEvidence.length}/{preview.profile.requiredEvidence.length} attached</strong>
              </div>
              <div>
                <span>Suites</span>
                <strong>{preview.summary.passedSuites}/{preview.testSuites.length} passed</strong>
              </div>
              <div className="certification-next-actions">
                {preview.nextActions.map((action) => <span key={action}>{action.replace(/_/g, " ")}</span>)}
              </div>
            </div>
          ) : (
            <div className="certification-evidence-list">
              {evidence.slice(0, 5).map((item) => (
                <div className="certification-evidence-row" key={item.id}>
                  <strong>{item.type.replace(/_/g, " ")}</strong>
                  <span>{item.summary}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AutomationOpsPanel({
  automations,
  approvals,
  evaluation,
  loading,
  onRunScenario,
}: {
  automations: AutomationResponse | null;
  approvals: ApprovalQueueResponse | null;
  evaluation: AutomationEvaluation | null;
  loading: boolean;
  onRunScenario: (scenarioId: string) => void;
}) {
  const scenarios = automations?.scenarios || [];
  const rules = automations?.rules || [];
  const policies = automations?.policies || [];
  const commands = evaluation?.commands || approvals?.approvals || [];

  return (
    <section className="automation-ops" aria-label="Automation engine and safety policy">
      <div className="section-header automation-header">
        <div>
          <p className="eyebrow">Automation Engine / Safety Policy</p>
          <h2>Policy-Gated Command Planning</h2>
        </div>
        <div className="event-summary">
          <StatusPill tone="good" label={`${automations?.summary.armedRules || 0} armed`} />
          <StatusPill tone="danger" label={`${automations?.summary.p0Rules || 0} P0 rules`} />
          <StatusPill tone="warn" label={`${approvals?.summary.pending || 0} pending`} />
        </div>
      </div>

      <div className="automation-grid">
        <div className="automation-panel scenario-panel">
          <div className="section-header compact">
            <h3>Drill Scenarios</h3>
            <FlaskConical size={18} />
          </div>
          <div className="scenario-list">
            {scenarios.map((scenario) => (
              <button key={scenario.id} onClick={() => onRunScenario(scenario.id)} disabled={loading}>
                <span>{scenario.name}</span>
                <em>{scenario.event.deviceId.replace(/^dev-/, "").replace(/-/g, " ")}</em>
              </button>
            ))}
          </div>
        </div>

        <div className="automation-panel rule-panel">
          <div className="section-header compact">
            <h3>Rules</h3>
            <Settings2 size={18} />
          </div>
          <div className="rule-list">
            {rules.slice(0, 4).map((rule) => (
              <div key={rule.id} className="rule-row">
                <div>
                  <strong>{rule.name}</strong>
                  <span>{rule.moduleId.replace(/-/g, " ")}</span>
                </div>
                <StatusPill tone={riskTone(rule.risk)} label={rule.trafficClass} />
              </div>
            ))}
          </div>
        </div>

        <div className="automation-panel policy-panel">
          <div className="section-header compact">
            <h3>Policies</h3>
            <Shield size={18} />
          </div>
          <div className="policy-list">
            {policies.slice(0, 4).map((policy) => (
              <div key={policy.id} className="policy-row">
                <strong>{policy.name}</strong>
                <span>{policy.requiresApproval ? "approval" : "policy"} / {policy.requiresSimulation ? "simulation" : "direct"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="automation-panel command-panel">
          <div className="section-header compact">
            <h3>{evaluation ? evaluation.scenarioName : "Approval Queue"}</h3>
            <PlayCircle size={18} />
          </div>
          <div className="command-list">
            {commands.slice(0, 4).map((command) => (
              <div key={command.id} className="command-row">
                <div>
                  <strong>{command.deviceName}</strong>
                  <span>{command.selectedPath} / {command.trafficClass}</span>
                </div>
                <StatusPill tone={command.status === "ready_to_execute" ? "good" : command.status === "blocked" ? "danger" : "warn"} label={command.status.replace(/_/g, " ")} />
              </div>
            ))}
            {commands.length === 0 && (
              <div className="event-empty">
                <Activity size={18} />
                <span>Run a drill scenario to generate command plans.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ApprovalWorkflowPanel({
  approvals,
  decision,
  loading,
  onDecision,
}: {
  approvals: ApprovalQueueResponse | null;
  decision: ApprovalDecisionResponse | null;
  loading: "approve" | "reject" | "request_changes" | null;
  onDecision: (decision: "approve" | "reject" | "request_changes") => void;
}) {
  const records = approvals?.approvals || [];
  const record = decision?.approval || records[0];
  const policyRules = approvals?.policyRules || [];
  const criteria = record?.policy?.criteria || [];

  return (
    <section className="approval-workflow-panel" aria-label="Human approval and policy workflow">
      <div className="section-header approval-header">
        <div>
          <p className="eyebrow">Human Approval / Policy Workflow</p>
          <h2>Decision Gate And Command Queue</h2>
        </div>
        <div className="event-summary">
          <StatusPill tone="warn" label={`${approvals?.summary.pending || 0} pending`} />
          <StatusPill tone="good" label={`${approvals?.summary.readyForApproval || 0} ready`} />
          <StatusPill tone={decision?.state === "rejected" ? "danger" : decision?.state === "approved" ? "good" : "neutral"} label={decision?.state.replace(/_/g, " ") || "awaiting human"} />
        </div>
      </div>

      <div className="approval-grid">
        <div className="approval-panel approval-record-panel">
          <div className="section-header compact">
            <h3>{record?.deviceName || "Approval Record"}</h3>
            <ClipboardCheck size={18} />
          </div>
          {record ? (
            <div className="approval-record-card">
              <div className="approval-record-top">
                <div>
                  <strong>{record.proposal?.title || record.commandId}</strong>
                  <span>{record.selectedPath} / {record.trafficClass}</span>
                </div>
                <StatusPill tone={intentStatusTone(record.status)} label={record.status.replace(/_/g, " ")} />
              </div>
              <div className="approval-facts">
                <div><span>Policy</span><strong>{record.policy?.result.replace(/_/g, " ") || "review"}</strong></div>
                <div><span>KRA</span><strong>{record.critique?.status || "review"}</strong></div>
                <div><span>Simulation</span><strong>{record.simulation?.attached ? "attached" : "missing"}</strong></div>
                <div><span>Queue</span><strong>{record.commandQueue?.status.replace(/_/g, " ") || "held"}</strong></div>
              </div>
              <div className="decision-bar approval-decision-bar">
                <button className="decision-button accept" onClick={() => onDecision("approve")} disabled={Boolean(loading) || !record}>
                  <CheckCircle2 size={16} />
                  <span>{loading === "approve" ? "Recording" : "Approve"}</span>
                </button>
                <button className="decision-button modify" onClick={() => onDecision("request_changes")} disabled={Boolean(loading) || !record}>
                  <Settings2 size={16} />
                  <span>{loading === "request_changes" ? "Recording" : "Changes"}</span>
                </button>
                <button className="decision-button reject" onClick={() => onDecision("reject")} disabled={Boolean(loading) || !record}>
                  <XCircle size={16} />
                  <span>{loading === "reject" ? "Recording" : "Reject"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="event-empty">
              <CheckCircle2 size={18} />
              <span>No approval records are waiting.</span>
            </div>
          )}
        </div>

        <div className="approval-panel">
          <div className="section-header compact">
            <h3>Policy Criteria</h3>
            <Shield size={18} />
          </div>
          <div className="approval-criteria-list">
            {criteria.map((item) => (
              <div className="approval-criteria-row" key={item.id}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.id.replace(/_/g, " ")}</span>
                </div>
                <StatusPill tone={item.passed ? "good" : "danger"} label={item.passed ? "pass" : "hold"} />
              </div>
            ))}
            {policyRules.slice(0, 2).map((rule) => (
              <div className="approval-criteria-row policy" key={rule.id}>
                <div>
                  <strong>{rule.name}</strong>
                  <span>{rule.message}</span>
                </div>
                <StatusPill tone={rule.risk === "critical" ? "danger" : "warn"} label={rule.risk} />
              </div>
            ))}
          </div>
        </div>

        <div className="approval-panel">
          <div className="section-header compact">
            <h3>Evidence Chain</h3>
            <Layers3 size={18} />
          </div>
          <div className="approval-evidence-list">
            {(record?.simulation?.evidence || []).slice(0, 4).map((item) => (
              <div className="approval-evidence-row" key={item}>
                <strong>{item}</strong>
                <span>simulation proof</span>
              </div>
            ))}
            {(record?.critique?.evidencePointers || []).slice(0, 4).map((item) => (
              <div className="approval-evidence-row" key={item.id}>
                <strong>{item.label}</strong>
                <span>{item.sourceId} / {item.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="approval-panel">
          <div className="section-header compact">
            <h3>{decision ? "Recorded Decision" : "Command Queue"}</h3>
            <PlayCircle size={18} />
          </div>
          {decision ? (
            <div className="decision-result approval-result">
              <strong>{decision.policyResult.replace(/_/g, " ")}</strong>
              <span>{decision.actor.name} / {formatTime(decision.decidedAt)} / {decision.commandQueue.status.replace(/_/g, " ")}</span>
            </div>
          ) : (
            <div className="approval-command-card">
              <strong>{record?.commandQueue?.queueId || "queue waiting"}</strong>
              <span>{record?.commandQueue?.executionBoundary.replace(/_/g, " ") || "separate signed command path"}</span>
              <StatusPill tone={record?.commandQueue?.canExecute ? "good" : "warn"} label={record?.commandQueue?.status.replace(/_/g, " ") || "held"} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SimulationLabPanel({
  simulation,
  report,
  loading,
  onRunScenario,
}: {
  simulation: SimulationLabResponse | null;
  report: SimulationReport | null;
  loading: boolean;
  onRunScenario: (scenarioId: string, variantId?: string) => void;
}) {
  const scenarios = simulation?.scenarios || [];
  const links = report?.variants[0]?.links || simulation?.links || [];
  const routeOutcomes = report?.variants.flatMap((variant) => variant.routeOutcomes) || [];
  const attachments = report?.approvalAttachments || [];
  const recentReports = simulation?.recentReports || [];

  return (
    <section className="simulation-lab" aria-label="Simulation lab">
      <div className="section-header simulation-header">
        <div>
          <p className="eyebrow">Simulation Lab</p>
          <h2>Failure Injection And Approval Evidence</h2>
        </div>
        <div className="event-summary">
          <StatusPill tone="good" label={`${simulation?.summary.scenarioCount || 0} labs`} />
          <StatusPill tone="warn" label={`${simulation?.summary.failureModeCount || 0} failures`} />
          <StatusPill tone={report?.status === "failed" ? "danger" : "good"} label={report?.status.replace(/_/g, " ") || "ready"} />
        </div>
      </div>

      <div className="simulation-grid">
        <div className="simulation-panel scenario-panel">
          <div className="section-header compact">
            <h3>Scenario Runner</h3>
            <FlaskConical size={18} />
          </div>
          <div className="scenario-list">
            {scenarios.map((scenario) => (
              <button key={scenario.id} onClick={() => onRunScenario(scenario.id)} disabled={loading}>
                <span>{scenario.name}</span>
                <em>{scenario.variants.length} variants / {scenario.trafficClass}</em>
              </button>
            ))}
          </div>
        </div>

        <div className="simulation-panel">
          <div className="section-header compact">
            <h3>Link Constraints</h3>
            <RadioTower size={18} />
          </div>
          <div className="sim-link-list">
            {links.map((link) => (
              <div className="sim-link-row" key={link.id}>
                <div>
                  <strong>{link.name}</strong>
                  <span>{link.latencyMs}ms / {link.maxPayloadBytes} bytes / {link.energyCost}</span>
                </div>
                <StatusPill tone={link.status === "available" ? "good" : link.status === "down" ? "danger" : "warn"} label={link.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="simulation-panel">
          <div className="section-header compact">
            <h3>{report ? report.scenario.name : "Recent Reports"}</h3>
            <ClipboardCheck size={18} />
          </div>
          {report ? (
            <div className="sim-report-list">
              {report.variants.map((variant) => (
                <div className="sim-report-row" key={variant.id}>
                  <div>
                    <strong>{variant.name}</strong>
                    <span>{variant.failureModes.map(titleFromId).join(", ") || "Nominal"} / {variant.safetyVerdict.replace(/_/g, " ")}</span>
                  </div>
                  <StatusPill tone={variant.status === "failed" || variant.status === "blocked" ? "danger" : variant.status === "safe_hold" ? "warn" : "good"} label={variant.status.replace(/_/g, " ")} />
                </div>
              ))}
            </div>
          ) : (
            <div className="sim-report-list">
              {recentReports.map((item) => (
                <div className="sim-report-row" key={item.reportId}>
                  <div>
                    <strong>{item.scenarioName}</strong>
                    <span>{item.variantCount} variant(s) / {item.approvalAttachmentCount} attachment(s)</span>
                  </div>
                  <StatusPill tone={item.status === "failed" ? "danger" : item.status.includes("approval") ? "warn" : "good"} label={item.status.replace(/_/g, " ")} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="simulation-panel">
          <div className="section-header compact">
            <h3>Route Proof</h3>
            <GitBranch size={18} />
          </div>
          <div className="sim-route-list">
            {routeOutcomes.slice(0, 5).map((route) => (
              <div className="sim-route-row" key={`${route.commandId}-${route.selectedPath}`}>
                <div>
                  <strong>{route.selectedPath}</strong>
                  <span>{route.encodedBytes}/{route.maxPayloadBytes} bytes / {route.latencyMs}ms / ack {route.ackRequired ? "required" : "none"}</span>
                </div>
                <StatusPill tone={route.status === "pass" ? "good" : "danger"} label={route.status} />
              </div>
            ))}
            {attachments.slice(0, 3).map((attachment) => (
              <div className="sim-route-row attachment" key={attachment.id}>
                <div>
                  <strong>{attachment.commandId}</strong>
                  <span>{attachment.safetyVerdict.replace(/_/g, " ")}</span>
                </div>
                <StatusPill tone="warn" label="attached" />
              </div>
            ))}
            {routeOutcomes.length === 0 && attachments.length === 0 && (
              <div className="event-empty">
                <Activity size={18} />
                <span>Run a simulation to generate route proof and approval attachments.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function KraOpsPanel({ kra }: { kra: KraDashboardResponse | null }) {
  const sources = kra?.sources || [];
  const rulePacks = kra?.rulePacks || [];
  const evidence = kra?.recentEvidence || [];

  return (
    <section className="kra-ops" aria-label="Knowledge and risk agent">
      <div className="section-header kra-header">
        <div>
          <p className="eyebrow">Knowledge And Risk Agent</p>
          <h2>Grounding And Risk Review</h2>
        </div>
        <div className="event-summary">
          <StatusPill tone={kra?.posture.executionBoundary === "no_agent_direct_execution" ? "good" : "danger"} label={kra?.posture.executionBoundary.replace(/_/g, " ") || "loading"} />
          <StatusPill tone={kra?.summary.blockingRulePacks ? "danger" : "good"} label={`${kra?.summary.blockingRulePacks || 0} blocking`} />
          <StatusPill tone="warn" label={`${kra?.summary.enabledRulePacks || 0} packs`} />
        </div>
      </div>

      <div className="kra-grid">
        <div className="kra-panel kra-posture-panel">
          <div className="section-header compact">
            <h3>Posture</h3>
            <Shield size={18} />
          </div>
          <div className="identity-facts kra-facts">
            <div><span>Status</span><strong>{kra?.posture.status || "loading"}</strong></div>
            <div><span>Sources</span><strong>{kra?.summary.sourceCount || 0}</strong></div>
            <div><span>Policies</span><strong>{kra?.summary.policyCount || 0}</strong></div>
            <div><span>Evidence</span><strong>{kra?.summary.auditEvidenceCount || 0}</strong></div>
          </div>
        </div>

        <div className="kra-panel">
          <div className="section-header compact">
            <h3>Evidence Sources</h3>
            <Layers3 size={18} />
          </div>
          <div className="source-list">
            {sources.map((source) => (
              <div className="source-row" key={source.id}>
                <div>
                  <strong>{source.name}</strong>
                  <span>{source.owner} / {source.sourceType}</span>
                </div>
                <StatusPill tone={source.status === "ready" ? "good" : "warn"} label={source.required ? "required" : source.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="kra-panel">
          <div className="section-header compact">
            <h3>Rule Packs</h3>
            <ClipboardCheck size={18} />
          </div>
          <div className="rule-pack-list">
            {rulePacks.map((pack) => (
              <div className="rule-pack-row" key={pack.id}>
                <div>
                  <strong>{pack.name}</strong>
                  <span>{pack.message}</span>
                </div>
                <div className="tool-plan-meta">
                  <StatusPill tone={pack.risk === "critical" || pack.risk === "high" ? "danger" : "warn"} label={pack.risk} />
                  <StatusPill tone={pack.blocking ? "danger" : "good"} label={pack.blocking ? "block" : "review"} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="kra-panel">
          <div className="section-header compact">
            <h3>Recent Evidence</h3>
            <Activity size={18} />
          </div>
          <div className="evidence-list">
            {evidence.map((item) => (
              <div className="evidence-row" key={item.id}>
                <div>
                  <strong>{item.summary}</strong>
                  <span>{formatTime(item.timestamp)} / {item.moduleId.replace(/-/g, " ")}</span>
                </div>
                <StatusPill tone={severityTone(item.severity)} label={item.status.replace(/_/g, " ")} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function EventAuditStrip({
  eventLedger,
  fallbackSummary,
}: {
  eventLedger: EventLedgerResponse | null;
  fallbackSummary: EventLedgerSummary | null;
}) {
  const summary = eventLedger?.summary || fallbackSummary;
  const events = eventLedger?.events || [];

  return (
    <section className="event-audit-strip" aria-label="Event ledger and audit posture">
      <div className="section-header event-header">
        <div>
          <p className="eyebrow">Event Bus / Telemetry / Audit</p>
          <h2>Operational Ledger</h2>
        </div>
        <div className="event-summary">
          <StatusPill tone="good" label={`${summary?.telemetryCount || 0} telemetry`} />
          <StatusPill tone="warn" label={`${summary?.commandCount || 0} commands`} />
          <StatusPill tone="danger" label={`${summary?.criticalCount || 0} P0/critical`} />
        </div>
      </div>

      <div className="event-grid">
        {events.length > 0 ? (
          events.slice(0, 6).map((event) => <EventCard key={event.id} event={event} />)
        ) : (
          <div className="event-empty">
            <Activity size={18} />
            <span>Waiting for event ledger data from the API gateway.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function EventCard({ event }: { event: FabricEvent }) {
  const verified = event.status === "acknowledged" || event.status === "enforced" || event.status === "ready";
  return (
    <article className={`event-card ${event.stream}`}>
      <div className="event-card-top">
        <div className="event-stream">
          {verified ? <CheckCircle2 size={16} /> : event.auditRequired ? <Shield size={16} /> : <Activity size={16} />}
          <strong>{event.stream}</strong>
        </div>
        <span>{formatTime(event.timestamp)}</span>
      </div>
      <p>{event.summary}</p>
      <div className="event-card-meta">
        <StatusPill tone={severityTone(event.severity)} label={event.severity} />
        <StatusPill tone={streamTone(event.stream)} label={event.status.replace(/_/g, " ")} />
        <StatusPill tone={trafficTone(event.trafficClass)} label={event.trafficClass} />
        {event.auditRequired && <StatusPill tone="danger" label="audit" />}
      </div>
    </article>
  );
}

function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "good" | "warn" | "danger" | "neutral" | "muted" }) {
  return <span className={`status-pill ${tone}`}>{label}</span>;
}

function Metric({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "good" | "warn" | "danger" | "neutral";
}) {
  return (
    <div className={`metric-tile ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{detail}</em>
    </div>
  );
}

function ModuleRow({ module, active, onClick }: { module: ModuleDefinition; active: boolean; onClick: () => void }) {
  const Icon = iconForModule(module);
  return (
    <button className={`module-row ${active ? "active" : ""}`} onClick={onClick}>
      <span className="module-icon"><Icon size={18} /></span>
      <span className="module-row-copy">
        <strong>{module.name}</strong>
        <em>{module.description}</em>
      </span>
      <span className={`risk-dot ${riskTone(module.risk)}`} title={`${module.risk} risk`} />
    </button>
  );
}

function ModuleDashboard({
  module,
  routes,
  devices,
}: {
  module: ModuleDefinition;
  routes: NarrowbandRoutes | null;
  devices: DeviceDefinition[];
}) {
  const Icon = iconForModule(module);
  const narrowbandRoutes = routes?.routes || [];
  const routeForModule = module.narrowbandSuitability ? narrowbandRoutes[0] : narrowbandRoutes.find((route) => route.class === module.trafficClass);
  const matchingDevices = devices.filter((device) => {
    const capabilityMatch = device.capabilities.some((capability) => module.capabilities.includes(capability));
    const adapterMatch = module.adapters.includes(device.adapter);
    return capabilityMatch || adapterMatch;
  });

  return (
    <section className="module-dashboard" aria-label={`${module.name} dashboard`}>
      <div className="module-hero">
        <div className="module-hero-main">
          <div className="hero-icon"><Icon size={28} /></div>
          <div>
            <p className="eyebrow">{module.category}</p>
            <h2>{module.name}</h2>
            <p>{module.description}</p>
          </div>
        </div>
        <div className="hero-status">
          <StatusPill tone={module.state === "hero" || module.state === "foundation" ? "good" : module.state === "planned" ? "muted" : "warn"} label={stateLabel(module.state)} />
          <StatusPill tone={riskTone(module.risk)} label={`${module.risk} risk`} />
          <StatusPill tone={trafficTone(module.trafficClass)} label={module.trafficClass} />
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="surface-panel">
          <div className="section-header compact">
            <h3>Management Surface</h3>
            <Settings2 size={18} />
          </div>
          <div className="kpi-strip">
            {module.kpis.map((kpi) => <span key={kpi}>{kpi}</span>)}
          </div>
          <ControlMatrix module={module} />
        </section>

        <section className="surface-panel">
          <div className="section-header compact">
            <h3>Automation Readiness</h3>
            <PlayCircle size={18} />
          </div>
          <ReadinessList module={module} />
        </section>

        <section className="surface-panel">
          <div className="section-header compact">
            <h3>Device Coverage</h3>
            <Gauge size={18} />
          </div>
          <DeviceCoverage devices={matchingDevices} />
        </section>

        <section className="surface-panel">
          <div className="section-header compact">
            <h3>Agent And Policy</h3>
            <Bot size={18} />
          </div>
          <AgentPolicy module={module} />
        </section>

        <section className="surface-panel">
          <div className="section-header compact">
            <h3>Narrowband Fit</h3>
            <RadioTower size={18} />
          </div>
          <NarrowbandFit module={module} route={routeForModule || null} />
        </section>
      </div>
    </section>
  );
}

function DeviceCoverage({ devices }: { devices: DeviceDefinition[] }) {
  const visible = devices.slice(0, 5);
  const extra = Math.max(0, devices.length - visible.length);

  if (devices.length === 0) {
    return (
      <div className="device-empty">
        <AlertTriangle size={18} />
        <span>No seeded device bindings yet. A future module enablement can add adapters or simulated devices.</span>
      </div>
    );
  }

  return (
    <div className="device-coverage">
      {visible.map((device) => (
        <div className="device-row" key={device.id}>
          <div>
            <strong>{device.name}</strong>
            <span>{device.siteId.replace(/-/g, " ")} / {device.zoneId.replace(/-/g, " ")}</span>
          </div>
          <div className="device-row-meta">
            <StatusPill tone={device.status === "online" ? "good" : device.status === "degraded" ? "warn" : "muted"} label={device.status} />
            {device.narrowbandEligible && <StatusPill tone="danger" label="NB" />}
          </div>
        </div>
      ))}
      {extra > 0 && <span className="device-extra">+{extra} more matching devices</span>}
    </div>
  );
}

function ControlMatrix({ module }: { module: ModuleDefinition }) {
  return (
    <div className="matrix">
      <MatrixBlock title="Capabilities" values={module.capabilities} />
      <MatrixBlock title="Services" values={module.services} />
      <MatrixBlock title="Adapters" values={module.adapters} />
      <MatrixBlock title="Dashboards" values={module.dashboards} />
    </div>
  );
}

function MatrixBlock({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="matrix-block">
      <strong>{title}</strong>
      <div>
        {values.map((value) => <span key={value}>{value.replace(/_/g, " ")}</span>)}
      </div>
    </div>
  );
}

function ReadinessList({ module }: { module: ModuleDefinition }) {
  const items = [
    ["Manifest", "Ready", "good"],
    ["Local service shell", module.state === "planned" ? "Planned" : "Mocked", module.state === "planned" ? "muted" : "warn"],
    ["Safety policy", module.risk === "high" ? "Approval gate" : "Standard", module.risk === "high" ? "warn" : "good"],
    ["Simulation", module.risk === "high" ? "Required" : "Optional", module.risk === "high" ? "danger" : "good"],
  ] as const;
  return (
    <div className="readiness-list">
      {items.map(([label, value, tone]) => (
        <div key={label}>
          <span>{label}</span>
          <StatusPill tone={tone} label={value} />
        </div>
      ))}
    </div>
  );
}

function AgentPolicy({ module }: { module: ModuleDefinition }) {
  return (
    <div className="agent-panel">
      <div className="agent-lane">
        <strong>AIP</strong>
        <span>Can propose enablement, automation rules, and dashboard actions for {module.name}.</span>
      </div>
      <div className="agent-lane">
        <strong>KRA</strong>
        <span>Grounds against {module.policies[0] || "module policy"} and flags conflicts before execution.</span>
      </div>
      <div className="policy-chips">
        {module.policies.map((policy) => <span key={policy}>{policy}</span>)}
      </div>
    </div>
  );
}

function NarrowbandFit({
  module,
  route,
}: {
  module: ModuleDefinition;
  route: NarrowbandRoutes["routes"][number] | null;
}) {
  const blocked = module.trafficClass === "P4_BULK";
  return (
    <div className="narrowband-panel">
      <div className={`route-signal ${blocked ? "blocked" : module.narrowbandSuitability ? "native" : "standard"}`}>
        <RadioTower size={22} />
        <div>
          <strong>{module.narrowbandSuitability || (blocked ? "Blocked" : "Control-plane only")}</strong>
          <span>{blocked ? "Rich media and bulk traffic stay off constrained links." : "Signed semantic commands and telemetry deltas only."}</span>
        </div>
      </div>
      {route && (
        <div className="route-detail">
          <div><span>Selected path</span><strong>{route.selectedPath}</strong></div>
          <div><span>Encoded</span><strong>{route.encodedBytes || "n/a"} bytes</strong></div>
          <div><span>TTL</span><strong>{route.ttlSeconds || "n/a"}s</strong></div>
          <div><span>Ack</span><strong>{route.ackRequired ? "required" : "not required"}</strong></div>
        </div>
      )}
    </div>
  );
}

function IntentWorkbench({
  intent,
  onIntentChange,
  onRun,
  loading,
  proposal,
  decision,
  decisionLoading,
  onDecision,
}: {
  intent: string;
  onIntentChange: (value: string) => void;
  onRun: () => void;
  loading: boolean;
  proposal: IntentProposalResponse | null;
  decision: IntentDecisionResponse | null;
  decisionLoading: "accept" | "modify" | "reject" | null;
  onDecision: (decision: "accept" | "modify" | "reject") => void;
}) {
  const proposals = proposal?.aip.proposals || [];
  const firstProposal = proposals[0];

  return (
    <section className="intent-workbench" aria-label="Agent intent workbench">
      <div className="section-header">
        <div>
          <p className="eyebrow">AIP plus KRA</p>
          <h2>Human Intent Workbench</h2>
        </div>
        <button className="primary-action" onClick={onRun} disabled={loading}>
          <PlayCircle size={17} />
          <span>{loading ? "Proposing" : "Generate plan"}</span>
        </button>
      </div>
      <textarea value={intent} onChange={(event) => onIntentChange(event.target.value)} />
      {proposal ? (
        <>
          <div className="intent-session-strip">
            <div>
              <span>Session</span>
              <strong>{proposal.sessionId || proposal.session_id}</strong>
            </div>
            <div>
              <span>Intent class</span>
              <strong>{titleFromId(proposal.intent.class)}</strong>
            </div>
            <div>
              <span>Confidence</span>
              <strong>{proposal.intent.confidence} {Math.round(proposal.intent.confidenceScore * 100)}%</strong>
            </div>
            <div>
              <span>MCP plan</span>
              <strong>{proposal.mcp.readyCount}/{proposal.mcp.requestedToolCount} ready</strong>
            </div>
          </div>

          <div className="proposal-grid intent-proposal-grid">
            <div className="proposal-column aip-column">
              <div className="proposal-toolbar">
                <h3>AIP Proposals</h3>
                <StatusPill tone={intentStatusTone(proposal.status)} label={proposal.status.replace(/_/g, " ")} />
              </div>
              {proposals.map((item) => {
                const capabilities = item.requiredCapabilities?.length ? item.requiredCapabilities : item.required_capabilities;
                const services = item.requiredServices?.length ? item.requiredServices : item.required_services;
                const gates = item.requiredGates || [];
                const tools = item.requiredTools || [];
                return (
                  <article className="proposal-item" key={item.proposalId || item.proposal_id}>
                    <div className="proposal-item-top">
                      <strong>{item.title}</strong>
                      <StatusPill tone={intentStatusTone(item.status)} label={item.status.replace(/_/g, " ")} />
                    </div>
                    <div className="proposal-card-meta">
                      <StatusPill tone={riskTone(item.risk as ModuleDefinition["risk"])} label={`${item.risk} risk`} />
                      <StatusPill tone={intentStatusTone(item.confidence)} label={`${item.confidence} confidence`} />
                      <span>{item.moduleId || item.module_id}</span>
                      <span>{item.targetDashboard || item.target_dashboard}</span>
                    </div>
                    <p>{item.expectedImpact || item.expected_impact}</p>
                    <div className="proposal-gates">
                      {gates.map((gate) => <span key={gate}>{gate.replace(/_/g, " ")}</span>)}
                      {tools.map((tool) => <em key={tool}>{tool}</em>)}
                    </div>
                    <div className="proposal-foot">
                      <RotateCcw size={14} />
                      <span>{item.rollbackPath}</span>
                    </div>
                    <div className="proposal-foot">
                      <ClipboardCheck size={14} />
                      <span>{services.slice(0, 4).join(", ") || capabilities.slice(0, 4).join(", ")}</span>
                    </div>
                    <div className="proposal-rule">
                      <LockKeyhole size={14} />
                      <span>{item.executionRule}</span>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="proposal-column critique">
              <div className="proposal-toolbar">
                <h3>KRA Critique</h3>
                <StatusPill tone={intentStatusTone(proposal.kra.status)} label={proposal.kra.status.replace(/_/g, " ")} />
              </div>
              <p>{proposal.kra.critique}</p>
              <p>{proposal.kra.narrowband_note}</p>
              <div className="grounding-list">
                {proposal.kra.grounding_pointers.map((pointer, index) => <span key={`${pointer}-${index}`}>{pointer}</span>)}
                {proposal.kra.frames.map((frame) => <span key={frame}>{frame}</span>)}
              </div>
              {proposal.kra.findings && proposal.kra.findings.length > 0 && (
                <div className="kra-finding-list">
                  {proposal.kra.findings.slice(0, 5).map((finding) => (
                    <div className="kra-finding-row" key={finding.id}>
                      <strong>{finding.title}</strong>
                      <span>{finding.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="proposal-column mcp-column">
              <div className="proposal-toolbar">
                <h3>MCP Tool Plan</h3>
                <StatusPill tone={intentStatusTone(proposal.mcp.status)} label={proposal.mcp.status.replace(/_/g, " ")} />
              </div>
              <div className="tool-plan-list">
                {proposal.mcp.toolPlans.map((tool) => (
                  <div className="tool-plan-row" key={tool.toolId}>
                    <div>
                      <strong>{tool.name}</strong>
                      <span>{tool.toolId}</span>
                    </div>
                    <div className="tool-plan-meta">
                      <StatusPill tone={riskTone(tool.risk as ModuleDefinition["risk"])} label={tool.risk} />
                      <StatusPill tone={intentStatusTone(tool.status)} label={tool.status.replace(/_/g, " ")} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="decision-bar">
                <button className="decision-button accept" onClick={() => onDecision("accept")} disabled={!firstProposal || Boolean(decisionLoading)}>
                  <CheckCircle2 size={16} />
                  <span>{decisionLoading === "accept" ? "Recording" : "Accept"}</span>
                </button>
                <button className="decision-button modify" onClick={() => onDecision("modify")} disabled={!firstProposal || Boolean(decisionLoading)}>
                  <Settings2 size={16} />
                  <span>{decisionLoading === "modify" ? "Recording" : "Modify"}</span>
                </button>
                <button className="decision-button reject" onClick={() => onDecision("reject")} disabled={!firstProposal || Boolean(decisionLoading)}>
                  <XCircle size={16} />
                  <span>{decisionLoading === "reject" ? "Recording" : "Reject"}</span>
                </button>
              </div>
              {decision && (
                <div className="decision-result">
                  <strong>{decision.state.replace(/_/g, " ")}</strong>
                  <span>{decision.nextActions.map((action) => action.replace(/_/g, " ")).join(" / ")}</span>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="proposal-empty">
          <AlertTriangle size={18} />
          <span>Generate a plan to see proposal cards, KRA critique, narrowband notes, and approval hints.</span>
        </div>
      )}
    </section>
  );
}

export default App;
