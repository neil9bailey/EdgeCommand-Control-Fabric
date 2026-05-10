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

