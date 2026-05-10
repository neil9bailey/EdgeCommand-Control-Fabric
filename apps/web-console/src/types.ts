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
    automationEngine?: string;
    intentEngine?: string;
    riskAgent?: string;
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
  payload: Record<string, unknown>;
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

export interface McpSummary {
  schemaVersion: string;
  toolCount: number;
  enabledTools: number;
  agentCount: number;
  sessionCount: number;
  activeSessions: number;
  auditEventCount: number;
  highRiskTools: number;
  approvalRequiredTools: number;
  byRisk: Record<string, number>;
  byAgent: Record<string, number>;
  byModule: Record<string, number>;
}

export interface McpAgent {
  id: string;
  name: string;
  rule: string;
  status: string;
  tools: string[];
}

export interface McpTool {
  id: string;
  name: string;
  agentId: string;
  moduleId: string;
  description: string;
  status: string;
  risk: "low" | "medium" | "high";
  trafficClass: string;
  scopes: string[];
  allowedRoles: string[];
  requiresApproval: boolean;
  auditRequired: boolean;
  inputHints: string[];
}

export interface McpSession {
  id: string;
  name: string;
  status: string;
  actor: string;
  intent: string;
  requestedTools: string[];
}

export interface McpToolCall {
  id: string;
  sessionId: string;
  toolId: string;
  timestamp: string;
  actor: string;
  status: string;
  decision: string;
  summary: string;
}

export interface McpResponse {
  orchestrator: {
    id: string;
    name: string;
    mode: string;
    defaultDecision: string;
    auditStream: string;
    tenant: string;
  };
  agents: McpAgent[];
  permissionScopes: Array<{ id: string; name: string; risk: string }>;
  tools: McpTool[];
  sessions: McpSession[];
  audit: McpToolCall[];
  summary: McpSummary;
}

export type CommandCentreWorkspaceId = "modules" | "devices" | "automations" | "agents" | "risk" | "connectivity" | "identity" | "audit";

export interface CommandCentreMetric {
  label: string;
  value: string | number;
}

export interface CommandCentreWorkspace {
  id: CommandCentreWorkspaceId;
  label: string;
  headline: string;
  detail: string;
  status: "ready" | "attention" | "blocked" | "governed";
  metrics: CommandCentreMetric[];
}

export interface CommandCentreAction {
  id: string;
  priority: string;
  workspaceId: CommandCentreWorkspaceId;
  title: string;
  owner: string;
  status: string;
  detail: string;
  evidence: string[];
}

export interface CommandCentreDevice {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
  zoneId: string;
  zoneName: string;
  adapter: string;
  status: string;
  risk: "low" | "medium" | "high";
  trustTier: string;
  lastSeen: string;
  capabilities: string[];
  narrowbandEligible: boolean;
}

export interface CommandCentreResponse {
  schemaVersion: string;
  generatedAt: string;
  product: ModuleCatalog["product"];
  posture: {
    readiness: string;
    api: string;
    dockerDesktop: boolean;
    safetyPosture: string;
    identityMode: string;
    secretProvider: string;
    unresolvedApprovals: number;
    criticalEvents: number;
    degradedDevices: number;
    constrainedRoutes: number;
  };
  workspaces: CommandCentreWorkspace[];
  actionQueue: CommandCentreAction[];
  modules: {
    byState: Record<string, number>;
    hero: string[];
    next: string[];
    foundations: string[];
  };
  devices: CommandCentreDevice[];
  automations: {
    rules: AutomationRule[];
    policies: AutomationPolicy[];
    scenes: AutomationResponse["scenes"];
    scenarios: AutomationScenario[];
    approvals: ApprovalQueueResponse["approvals"];
    summary: AutomationSummary;
  };
  agents: {
    orchestrator: McpResponse["orchestrator"];
    tools: McpTool[];
    agents: McpAgent[];
    sessions: McpSession[];
    audit: McpToolCall[];
    summary: McpSummary;
  };
  risk: KraDashboardResponse;
  connectivity: {
    links: PlatformOverview["links"];
    routes: NarrowbandRoutes["routes"];
    rule: string;
  };
  identity: {
    mode: string;
    normalizedMode: string;
    tenant: string;
    audience: string;
    entraEnabled: boolean;
    roles: string[];
    keyVaultEnabled: boolean;
    secretProvider?: AuthStatus["secretProvider"];
  };
  audit: {
    events: FabricEvent[];
    summary: EventLedgerSummary;
  };
}

export interface IntentSignalSet {
  siteHints: string[];
  targetModules: string[];
  capabilities: string[];
  urgency: string;
  narrowbandMentioned: boolean;
}

export interface IntentMatchedFrame {
  id: string;
  name: string;
  intentClass: string;
}

export interface IntentProposal {
  proposal_id: string;
  proposalId: string;
  type: string;
  module_id: string;
  moduleId: string;
  title: string;
  target_dashboard: string;
  targetDashboard: string;
  risk: "low" | "medium" | "high" | string;
  confidence: string;
  confidenceScore: number;
  expected_impact: string;
  expectedImpact: string;
  rollbackPath: string;
  required_services: string[];
  requiredServices: string[];
  required_capabilities: string[];
  requiredCapabilities: string[];
  requiredPolicies: string[];
  requiredGates: string[];
  requiredTools: string[];
  status: string;
  canExecute: boolean;
  executionRule: string;
}

export interface IntentMcpToolPlan {
  toolId: string;
  name: string;
  agentId: string | null;
  moduleId: string | null;
  risk: "low" | "medium" | "high" | string;
  trafficClass: string;
  status: string;
  decision: string;
  canExecute: boolean;
  requiresApproval: boolean;
  auditRequired: boolean;
  reasons: string[];
}

export interface IntentDecisionResponse {
  decisionId: string;
  sessionId: string;
  proposalId: string;
  decision: string;
  state: string;
  note: string;
  actor: {
    subject: string;
    name: string;
    roles: string[];
  };
  nextActions: string[];
  event: FabricEvent;
}

export interface KraSummary {
  schemaVersion: string;
  sourceCount: number;
  requiredSourceCount: number;
  rulePackCount: number;
  enabledRulePacks: number;
  blockingRulePacks: number;
  seedEvaluationCount: number;
  critiqueOnly: boolean;
  byRisk: Record<string, number>;
  policyCount?: number;
  highRiskDevices?: number;
  auditEvidenceCount?: number;
  kraToolCount?: number;
  moduleCount?: number;
}

export interface KraEvidenceSource {
  id: string;
  name: string;
  sourceType: string;
  owner: string;
  required: boolean;
  status: string;
}

export interface KraRulePack {
  id: string;
  name: string;
  risk: "medium" | "high" | "critical" | string;
  category: string;
  status: string;
  blocking: boolean;
  trigger?: string;
  capabilities?: string[];
  proposalTypes?: string[];
  requires: string[];
  message: string;
}

export interface KraSeedEvaluation {
  id: string;
  status: string;
  intentClass: string;
  summary: string;
}

export interface KraRecentEvidence {
  id: string;
  stream: FabricEvent["stream"];
  status: string;
  severity: FabricEvent["severity"];
  moduleId: string;
  summary: string;
  timestamp: string;
}

export interface KraEvidencePointer {
  id: string;
  sourceId: string;
  type: string;
  label: string;
  target: string;
  reason: string;
  status: string;
}

export interface KraFinding {
  id: string;
  proposalId: string | null;
  proposalTitle: string;
  severity: "info" | "warning" | "high" | "critical" | string;
  status: string;
  category: string;
  rulePackId: string;
  title: string;
  detail: string;
  evidence: string[];
  requiredActions: string[];
}

export interface KraProposalReview {
  proposalId: string;
  title: string;
  moduleId: string;
  risk: string;
  status: string;
  severity: string;
  findingCount: number;
  blockerCount: number;
  requiredGates: string[];
  missingGates: string[];
  evidencePointers: string[];
  decision: string;
}

export interface KraEvaluation {
  evaluationId: string;
  createdAt: string;
  role: string;
  rule: string;
  status: string;
  verdict: string;
  intent: string;
  summary: {
    proposalCount: number;
    findingCount: number;
    blockerCount: number;
    conflictCount: number;
    missingContextCount: number;
    requiredReview: boolean;
    highRiskProposalCount: number;
    narrowbandFindingCount: number;
    evidencePointerCount: number;
    sourcesUsed: string[];
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  findings: KraFinding[];
  proposalReviews: KraProposalReview[];
  evidencePointers: KraEvidencePointer[];
  grounding: {
    policies: KraEvidencePointer[];
    modules: KraEvidencePointer[];
    capabilities: KraEvidencePointer[];
    tools: KraEvidencePointer[];
    events: KraEvidencePointer[];
  };
  nextActions: string[];
  event: FabricEvent;
}

export interface KraDashboardResponse {
  engine: {
    id: string;
    name: string;
    mode: string;
    rule: string;
    tenant: string;
    defaultStatus: string;
  };
  summary: KraSummary;
  posture: {
    status: string;
    rule: string;
    sourceHealth: string;
    executionBoundary: string;
  };
  sources: KraEvidenceSource[];
  rulePacks: KraRulePack[];
  seedEvaluations: KraSeedEvaluation[];
  recentEvidence: KraRecentEvidence[];
  statusModel?: string[];
  severityModel?: string[];
}

export interface IntentProposalResponse {
  session_id: string;
  sessionId: string;
  created_at: string;
  createdAt: string;
  input: string;
  status: string;
  intent: {
    class: string;
    summary: string;
    confidence: string;
    confidenceScore: number;
    extractedSignals: IntentSignalSet;
    matchedFrames: IntentMatchedFrame[];
  };
  aip: {
    role: string;
    rule: string;
    status: string;
    proposals: IntentProposal[];
  };
  kra: {
    role: string;
    rule: string;
    status: string;
    grounding_pointers: string[];
    critique: string;
    narrowband_note: string;
    risk_register: string[];
    required_review: boolean;
    frames: string[];
    evaluationId?: string;
    verdict?: string;
    summary?: KraEvaluation["summary"];
    findings?: KraFinding[];
    proposalReviews?: KraProposalReview[];
    evidencePointers?: KraEvidencePointer[];
    nextActions?: string[];
  };
  kraEvaluation?: KraEvaluation;
  mcp: {
    sessionId: string;
    status: string;
    requestedToolCount: number;
    readyCount: number;
    requiresPermissionCount: number;
    deniedCount: number;
    toolPlans: IntentMcpToolPlan[];
    nextActions: string[];
  };
  actor: {
    subject?: string;
    name?: string;
    roles: string[];
  };
  next_actions: string[];
  nextActions: string[];
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
