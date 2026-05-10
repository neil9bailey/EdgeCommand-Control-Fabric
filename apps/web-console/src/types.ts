export interface ModuleDefinition {
  id: string;
  name: string;
  category: string;
  state: string;
  risk: "low" | "medium" | "high";
  description: string;
  services: string[];
  dashboards: string[];
  agents: string[];
  adapters: string[];
  capabilities: string[];
  policies: string[];
  kpis: string[];
  trafficClass: string;
  narrowbandSuitability?: string;
}

export interface ModuleCatalog {
  product: {
    name: string;
    tenant: string;
    environment: string;
    tagline: string;
  };
  categories: string[];
  modules: ModuleDefinition[];
}

export interface PlatformOverview {
  product: ModuleCatalog["product"];
  moduleCount: number;
  categoryCount: number;
  byCategory: Record<string, number>;
  byState: Record<string, number>;
  highRisk: number;
  narrowband: number;
  devices?: DeviceRegistrySummary;
  events?: EventLedgerSummary;
  runtime: {
    service: string;
    mode: string;
    time: string;
    dockerDesktopTarget: boolean;
    azureTarget: string;
  };
  commandCentre: {
    readiness: string;
    activeSite: string;
    safetyPosture: string;
    pendingApprovals: number;
    criticalEvents: number;
    narrowbandReadiness: string;
    agentMode: string;
    eventLedger?: string;
    deviceRegistry?: string;
  };
  links: Array<{
    id: string;
    name: string;
    class: string;
    status: string;
    score: number;
    carries: string[];
  }>;
}

export interface DeviceDefinition {
  id: string;
  name: string;
  siteId: string;
  zoneId: string;
  adapter: string;
  manufacturer: string;
  model: string;
  trustTier: string;
  status: string;
  lastSeen: string;
  capabilities: string[];
  observedState: Record<string, string | number | boolean>;
  desiredState: Record<string, string | number | boolean>;
  narrowbandEligible: boolean;
}

export interface DeviceRegistrySummary {
  schemaVersion: string;
  siteCount: number;
  zoneCount: number;
  deviceCount: number;
  capabilityCount: number;
  highRiskDevices: number;
  narrowbandEligible: number;
  byStatus: Record<string, number>;
  byAdapter: Record<string, number>;
  bySite: Record<string, number>;
  capabilityUse: Record<string, number>;
}

export interface DeviceRegistryResponse {
  devices: DeviceDefinition[];
  summary: DeviceRegistrySummary;
  filters: Record<string, string>;
}

export interface FabricEvent {
  id: string;
  timestamp: string;
  tenant: string;
  siteId: string | null;
  zoneId: string | null;
  deviceId: string | null;
  moduleId: string;
  stream: "audit" | "telemetry" | "command" | "agent" | "module" | "policy";
  severity: "info" | "warning" | "critical";
  actor: {
    type: string;
    id: string;
    displayName: string;
  };
  action: string;
  summary: string;
  status: string;
  trafficClass: string;
  auditRequired: boolean;
  payload: Record<string, string | number | boolean | string[]>;
}

export interface EventLedgerSummary {
  schemaVersion: string;
  eventCount: number;
  auditRequired: number;
  commandCount: number;
  telemetryCount: number;
  pendingApprovals: number;
  criticalCount: number;
  latestTimestamp: string | null;
  byStream: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  byTrafficClass: Record<string, number>;
  byModule: Record<string, number>;
}

export interface EventLedgerResponse {
  events: FabricEvent[];
  summary: EventLedgerSummary;
  filters: Record<string, string>;
}

export interface IntentProposalResponse {
  session_id: string;
  created_at: string;
  input: string;
  aip: {
    role: string;
    rule: string;
    proposals: Array<{
      proposal_id: string;
      module_id: string;
      title: string;
      target_dashboard: string;
      risk: string;
      expected_impact: string;
      required_services: string[];
      required_capabilities: string[];
      status: string;
    }>;
  };
  kra: {
    role: string;
    rule: string;
    status: string;
    grounding_pointers: string[];
    critique: string;
    narrowband_note: string;
  };
  next_actions: string[];
}

export interface NarrowbandRoutes {
  controller: string;
  rule: string;
  routes: Array<{
    id: string;
    command: string;
    class: string;
    selectedPath: string;
    encodedBytes: number;
    ttlSeconds: number;
    ackRequired: boolean;
    status: string;
  }>;
}
