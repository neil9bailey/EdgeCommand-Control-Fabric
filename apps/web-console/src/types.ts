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
  automation?: AutomationSummary;
  identity?: AuthStatus;
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

export interface AuthStatus {
  mode: string;
  normalizedMode: string;
  entraEnabled: boolean;
  jwtValidation: string;
  tenant: string;
  audience: string;
  issuerPinning: string;
  jwks: string;
  roleClaim: string;
  groupRoleMapEntries: number;
  principalRoleMapEntries: number;
  roles: string[];
  secretProvider?: {
    provider: string;
    keyVaultEnabled: boolean;
    keyVaultRequired: boolean;
    mappedEnvironmentNames?: string[];
    lastLoad?: {
      provider: string;
      keyVaultEnabled: boolean;
      loaded: string[];
      skipped: string[];
      missing: string[];
      failed: Array<{ envName: string; reason: string }>;
    } | null;
  };
}

export interface AutomationSummary {
  schemaVersion: string;
  ruleCount: number;
  armedRules: number;
  policyCount: number;
  sceneCount: number;
  scenarioCount: number;
  approvalRequired: number;
  p0Rules: number;
  byState: Record<string, number>;
  byRisk: Record<string, number>;
  byModule: Record<string, number>;
}

export interface AutomationPolicy {
  id: string;
  name: string;
  risk: "low" | "medium" | "high";
  scope: string[];
  requiresApproval: boolean;
  requiresSimulation: boolean;
  requiresSignedCommand: boolean;
  approvalRoles: string[];
  emergencyBypass: string;
  blockReasons: string[];
}

export interface AutomationRule {
  id: string;
  name: string;
  state: string;
  moduleId: string;
  risk: "low" | "medium" | "high";
  trafficClass: string;
  policies: string[];
  approvalMode: string;
  simulationProfile: string;
}

export interface AutomationScenario {
  id: string;
  name: string;
  event: {
    deviceId: string;
    capability: string;
    observedState: Record<string, string | number | boolean>;
  };
}

export interface AutomationCommand {
  id: string;
  ruleId: string;
  actionId: string;
  type: string;
  moduleId: string;
  deviceId: string | null;
  deviceName: string;
  capability: string;
  desiredState: Record<string, string | number | boolean>;
  message: string | null;
  trafficClass: string;
  selectedPath: string;
  encodedBytes: number;
  ackRequired: boolean;
  status: string;
  canExecute: boolean;
  approvalRequired: boolean;
  simulationRequired: boolean;
  signedCommandRequired: boolean;
  policyDecision: string;
  policyReasons: string[];
}

export interface AutomationEvaluation {
  evaluationId: string;
  createdAt: string;
  scenarioId: string;
  scenarioName: string;
  matchedRuleCount: number;
  commandCount: number;
  pendingApprovalCount: number;
  blockedCount: number;
  readyCount: number;
  commands: AutomationCommand[];
}

export interface AutomationResponse {
  engine: {
    id: string;
    mode: string;
    defaultPolicy: string;
    rulesArmed: boolean;
  };
  policies: AutomationPolicy[];
  rules: AutomationRule[];
  scenes: Array<{ id: string; name: string; moduleId: string; rules: string[]; requiresApproval: boolean; dashboards: string[] }>;
  scenarios: AutomationScenario[];
  summary: AutomationSummary;
}

export interface ApprovalQueueResponse {
  approvals: Array<{
    id: string;
    commandId: string;
    ruleId: string;
    deviceId: string | null;
    deviceName: string;
    moduleId: string;
    trafficClass: string;
    selectedPath: string;
    status: string;
    requiredRoles: string[];
    reasons: string[];
  }>;
  summary: {
    pending: number;
    total: number;
    sourceScenario: string;
  };
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
