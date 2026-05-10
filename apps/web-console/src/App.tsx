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
  fetchApprovals,
  fetchAuthStatus,
  fetchAutomations,
  fetchCatalog,
  fetchCommandCentre,
  fetchDevices,
  fetchEvents,
  fetchKra,
  fetchNarrowbandRoutes,
  fetchOverview,
  proposeIntent,
  recordIntentDecision,
  runAutomationScenario,
} from "./api";
import type {
  AuthStatus,
  ApprovalQueueResponse,
  AutomationEvaluation,
  AutomationResponse,
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
  ModuleCatalog,
  ModuleDefinition,
  NarrowbandRoutes,
  PlatformOverview,
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
  agents: GitBranch,
  risk: Shield,
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
  const [approvals, setApprovals] = useState<ApprovalQueueResponse | null>(null);
  const [kra, setKra] = useState<KraDashboardResponse | null>(null);
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
    void fetchApprovals().then(setApprovals);
    void fetchKra().then(setKra);
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
        <AutomationOpsPanel
          automations={automations}
          approvals={approvals}
          evaluation={automationEvaluation}
          loading={automationLoading}
          onRunScenario={runScenario}
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
