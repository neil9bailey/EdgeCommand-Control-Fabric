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
  Cloud,
  Cpu,
  Droplets,
  FlaskConical,
  Gauge,
  GitBranch,
  Home,
  KeyRound,
  Layers3,
  Lightbulb,
  LockKeyhole,
  PlayCircle,
  Puzzle,
  RadioTower,
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
  Zap,
  type LucideIcon,
} from "lucide-react";
import { fetchCatalog, fetchDevices, fetchNarrowbandRoutes, fetchOverview, proposeIntent } from "./api";
import type {
  DeviceDefinition,
  DeviceRegistryResponse,
  IntentProposalResponse,
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

function App() {
  const [catalog, setCatalog] = useState<ModuleCatalog | null>(null);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [routes, setRoutes] = useState<NarrowbandRoutes | null>(null);
  const [deviceRegistry, setDeviceRegistry] = useState<DeviceRegistryResponse | null>(null);
  const [activeCategory, setActiveCategory] = useState("Home Automation");
  const [activeModuleId, setActiveModuleId] = useState("water-management");
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState(defaultIntent);
  const [proposal, setProposal] = useState<IntentProposalResponse | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);

  useEffect(() => {
    void fetchCatalog().then(setCatalog);
    void fetchOverview().then(setOverview);
    void fetchNarrowbandRoutes().then(setRoutes);
    void fetchDevices().then(setDeviceRegistry);
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
    try {
      setProposal(await proposeIntent(intent));
    } finally {
      setIntentLoading(false);
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
            <StatusPill tone="warn" label="Entra ready" />
            <StatusPill tone="danger" label="P0 path simulated" />
          </div>
        </header>

        <section className="command-band" aria-label="Platform command centre">
          <Metric label="Modules" value={overview?.moduleCount || modules.length || "-"} detail="manifest surfaces" />
          <Metric label="Devices" value={deviceRegistry?.summary.deviceCount || overview?.devices?.deviceCount || "-"} detail="registry seed" tone="good" />
          <Metric label="High Risk" value={overview?.highRisk || "-"} detail="policy gated" tone="danger" />
          <Metric label="Narrowband" value={overview?.narrowband || "-"} detail="semantic SD-WAN" tone="warn" />
          <Metric label="Approvals" value={overview?.commandCentre.pendingApprovals || 4} detail="agent proposals" tone="warn" />
          <Metric label="Mode" value={overview?.commandCentre.agentMode || "mock"} detail="AIP/KRA" />
        </section>

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
            />
          </div>
        </section>
      </main>
    </div>
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
}: {
  intent: string;
  onIntentChange: (value: string) => void;
  onRun: () => void;
  loading: boolean;
  proposal: IntentProposalResponse | null;
}) {
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
        <div className="proposal-grid">
          <div className="proposal-column">
            <h3>AIP Proposals</h3>
            {proposal.aip.proposals.map((item) => (
              <div className="proposal-item" key={item.proposal_id}>
                <strong>{item.title}</strong>
                <span>{item.target_dashboard}</span>
                <em>{item.required_capabilities.join(", ")}</em>
              </div>
            ))}
          </div>
          <div className="proposal-column critique">
            <h3>KRA Critique</h3>
            <p>{proposal.kra.critique}</p>
            <p>{proposal.kra.narrowband_note}</p>
            <div className="grounding-list">
              {proposal.kra.grounding_pointers.map((pointer) => <span key={pointer}>{pointer}</span>)}
            </div>
          </div>
        </div>
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
