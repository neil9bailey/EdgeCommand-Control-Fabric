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
    simulationLab?: string;
    lightingScenes?: string;
    climateHvac?: string;
    securityAccess?: string;
    waterManagement?: string;
    energyManagement?: string;
    sensingPresence?: string;
    moduleManifest?: string;
    moduleBuilder?: string;
    moduleMarketplace?: string;
    moduleCertification?: string;
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
  workflow?: {
    id: string;
    name: string;
    mode: string;
    tenant: string;
    executionBoundary: string;
    defaultState: string;
    rule: string;
  };
  approvals: ApprovalRecord[];
  summary: {
    schemaVersion?: string;
    stateCount?: number;
    decisionCount?: number;
    policyRuleCount?: number;
    emergencyExceptionCount?: number;
    auditExportProfileCount?: number;
    seedDecisionCount?: number;
    pending: number;
    total: number;
    sourceScenario: string;
    simulationAttached?: number;
    readyForApproval?: number;
    byDecision?: Record<string, number>;
  };
  policyRules?: ApprovalPolicyRule[];
  decisions?: ApprovalDecisionDefinition[];
  emergencyExceptions?: Array<{
    id: string;
    name: string;
    trafficClass: string;
    status: string;
    allowedModules: string[];
    requires: string[];
    expiresSeconds: number;
  }>;
  auditExportProfiles?: Array<{ id: string; name: string; format: string; fields: string[] }>;
  recentDecisions?: Array<{ id: string; approvalId: string; decision: string; actor: string; summary: string }>;
}

export interface ApprovalPolicyRule {
  id: string;
  name: string;
  risk: "high" | "critical" | string;
  category: string;
  requires: string[];
  message: string;
}

export interface ApprovalDecisionDefinition {
  id: "approve" | "reject" | "request_changes" | string;
  label: string;
  resultState: string;
  requiresRoles: string[];
  commandQueueStatus: string;
}

export interface ApprovalRecord {
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
  proposal?: IntentProposal;
  critique?: {
    evaluationId: string;
    status: string;
    verdict: string;
    findingCount: number;
    blockerCount: number;
    findings: KraFinding[];
    evidencePointers: KraEvidencePointer[];
    nextActions: string[];
  };
  policy?: {
    result: string;
    readyForApproval: boolean;
    requiredRoles: string[];
    rules: Array<{ id: string; name: string; risk: string; category: string; message: string }>;
    criteria: Array<{ id: string; label: string; passed: boolean }>;
    emergencyException: null | {
      id: string;
      status: string;
      expiresSeconds: number;
      requires: string[];
    };
  };
  simulation?: {
    required: boolean;
    attached: boolean;
    reportId: string | null;
    scenarioId: string | null;
    variantId: string | null;
    status: string;
    safetyVerdict: string;
    evidence: string[];
  };
  lifecycle?: Array<{ state: string; status: string; detail: string }>;
  commandQueue?: {
    queueId: string;
    commandId: string;
    status: string;
    commandStatus: string;
    canExecute: boolean;
    executionBoundary: string;
    selectedPath: string;
    trafficClass: string;
    encodedBytes: number;
    ackRequired: boolean;
    signingRequired: boolean;
  };
  decision?: null | ApprovalDecisionResponse;
}

export interface ApprovalDecisionResponse {
  decisionId: string;
  approvalId: string;
  commandId: string;
  decision: string;
  state: string;
  note: string;
  decidedAt: string;
  actor: {
    subject: string;
    name: string;
    roles: string[];
  };
  policyResult: string;
  approval: ApprovalRecord;
  commandQueue: NonNullable<ApprovalRecord["commandQueue"]>;
  nextActions: string[];
  event: FabricEvent;
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

export interface SimulationSummary {
  schemaVersion: string;
  scenarioCount: number;
  variantCount: number;
  failureModeCount: number;
  linkCount: number;
  simulatedDeviceGroupCount: number;
  reportTemplateCount: number;
  approvalAttachmentReady: number;
  narrowbandVariantCount: number;
  recentReportCount?: number;
  recentApprovalAttachmentCount?: number;
  byRisk: Record<string, number>;
  byTrafficClass: Record<string, number>;
  byFailureCategory: Record<string, number>;
}

export interface SimulationLink {
  id: string;
  name: string;
  class: string;
  status: string;
  latencyMs: number;
  jitterMs: number;
  maxPayloadBytes: number;
  ackSupported: boolean;
  carries: string[];
  energyCost: string;
}

export interface SimulationDeviceGroup {
  id: string;
  name: string;
  siteId: string;
  deviceIds: string[];
  capabilities: string[];
  stateSource: string;
  status: string;
}

export interface SimulationFailureMode {
  id: string;
  name: string;
  category: string;
  severity: "medium" | "high" | string;
  target: string;
  effect: string;
}

export interface SimulationVariantDefinition {
  id: string;
  name: string;
  failureModes: string[];
  expectedOutcome: string;
}

export interface SimulationScenarioDefinition {
  id: string;
  name: string;
  moduleId: string;
  automationScenarioId: string;
  risk: "medium" | "high" | string;
  trafficClass: string;
  objective: string;
  defaultVariantId: string;
  variants: SimulationVariantDefinition[];
}

export interface SimulationRecentReport {
  reportId: string;
  createdAt: string;
  scenarioId: string;
  scenarioName: string;
  status: string;
  variantCount: number;
  approvalAttachmentCount: number;
  routePassCount: number;
  routeFailCount: number;
  nextActions: string[];
}

export interface SimulationRouteOutcome {
  commandId: string;
  deviceId: string | null;
  selectedPath: string;
  trafficClass: string;
  encodedBytes: number;
  maxPayloadBytes: number;
  latencyMs: number;
  jitterMs: number;
  ackRequired: boolean;
  ackSupported: boolean;
  payloadFits: boolean;
  pathAvailable: boolean;
  latencyFits: boolean;
  ackFits: boolean;
  status: string;
}

export interface SimulationApprovalAttachment {
  id: string;
  reportId: string;
  scenarioId: string;
  variantId: string;
  commandId: string;
  ruleId: string;
  status: string;
  safetyVerdict: string;
  evidence: string[];
}

export interface SimulationVariantResult {
  id: string;
  name: string;
  status: string;
  expectedOutcome: string;
  failureModes: string[];
  failureModeDetails: SimulationFailureMode[];
  automation: AutomationEvaluation | null;
  links: SimulationLink[];
  routeOutcomes: SimulationRouteOutcome[];
  approvalAttachments: SimulationApprovalAttachment[];
  safetyVerdict: string;
}

export interface SimulationReport {
  reportId: string;
  createdAt: string;
  lab: {
    id: string;
    name: string;
    mode: string;
    tenant: string;
    executionBoundary: string;
    defaultScenario: string;
    rule: string;
  };
  scenario: {
    id: string;
    name: string;
    moduleId: string;
    automationScenarioId: string;
    risk: string;
    trafficClass: string;
    objective: string;
  };
  status: string;
  summary: {
    variantCount: number;
    passedCount: number;
    safeHoldCount: number;
    failedCount: number;
    commandCount: number;
    pendingApprovalCount: number;
    blockedCommandCount: number;
    approvalAttachmentCount: number;
    routePassCount: number;
    routeFailCount: number;
    byStatus: Record<string, number>;
  };
  variants: SimulationVariantResult[];
  approvalAttachments: SimulationApprovalAttachment[];
  nextActions: string[];
  events: FabricEvent[];
}

export interface SimulationLabResponse {
  lab: SimulationReport["lab"];
  summary: SimulationSummary;
  links: SimulationLink[];
  simulatedDevices: SimulationDeviceGroup[];
  failureModes: SimulationFailureMode[];
  scenarios: SimulationScenarioDefinition[];
  reportTemplates: Array<{ id: string; name: string; requiredFields: string[] }>;
  recentReports: SimulationRecentReport[];
  rule: string;
}

export interface LightingSummary {
  schemaVersion: string;
  zoneCount: number;
  fixtureCount: number;
  onlineFixtureCount: number;
  sceneCount: number;
  enabledSceneCount: number;
  scheduleCount: number;
  enabledScheduleCount: number;
  policyCount: number;
  intentRecipeCount: number;
  recentRunCount: number;
  averageBrightness: number;
  byMode: Record<string, number>;
  byFixtureAdapter: Record<string, number>;
}

export interface LightingFixture {
  id: string;
  deviceId: string;
  zoneId: string;
  name: string;
  fixtureType: string;
  supports: string[];
  defaultFadeMs: number;
  manualOverride: boolean;
  pathPreference: string[];
  deviceName?: string;
  status?: string;
  adapter?: string;
  observedState?: Record<string, string | number | boolean>;
  desiredState?: Record<string, string | number | boolean>;
}

export interface LightingZone {
  id: string;
  siteId: string;
  zoneId: string;
  name: string;
  targetLux: number;
  occupancyMode: string;
  circadianBand: string;
  fixtureIds: string[];
  fixtures?: LightingFixture[];
  onlineFixtures?: number;
}

export interface LightingScene {
  id: string;
  name: string;
  status: string;
  mode: string;
  trafficClass: string;
  requiresApproval: boolean;
  policies: string[];
  triggers: string[];
  commandProfile: {
    encodedBytes: number;
    ackRequired: boolean;
    ttlSeconds: number;
  };
  zoneTargets: Array<{
    zoneId: string;
    fixtureId?: string;
    fixtureIds?: string[];
    on: boolean;
    brightness: number;
    colorTemperatureK?: number;
    fadeMs: number;
  }>;
}

export interface LightingSchedule {
  id: string;
  name: string;
  sceneId: string;
  status: string;
  time: string;
  days: string[];
}

export interface LightingPolicy {
  id: string;
  name: string;
  risk: string;
  scope: string[];
  requiresApproval: boolean;
  requiresAudit: boolean;
  message: string;
}

export interface LightingIntentRecipe {
  id: string;
  name: string;
  keywords: string[];
  sceneId: string;
  confidence: number;
  exampleIntent: string;
}

export interface LightingSceneRun {
  id: string;
  sceneId: string;
  status: string;
  actor: string;
  commandCount: number;
  summary: string;
}

export interface LightingCommand {
  id: string;
  sceneId: string;
  fixtureId: string;
  deviceId: string;
  deviceName: string;
  zoneId: string;
  type: string;
  moduleId: string;
  capability: string;
  desiredState: Record<string, string | number | boolean>;
  fadeMs: number;
  trafficClass: string;
  selectedPath: string;
  encodedBytes: number;
  ackRequired: boolean;
  status: string;
  canExecute: boolean;
  policyDecision: string;
  policyReasons: string[];
}

export interface LightingScenePreview {
  previewId: string;
  createdAt: string;
  tenant: string;
  service: LightingDashboardResponse["service"];
  scene: {
    id: string;
    name: string;
    mode: string;
    status: string;
    trafficClass: string;
    triggers: string[];
    requiresApproval: boolean;
  };
  actor: {
    subject: string;
    name: string;
    roles: string[];
  };
  status: string;
  summary: {
    commandCount: number;
    readyCount: number;
    blockedCount: number;
    zoneCount: number;
    encodedBytes: number;
  };
  policy: {
    result: string;
    canApply: boolean;
    requiresApproval: boolean;
    policies: Array<{ id: string; name: string; risk: string; message: string }>;
    criteria: Array<{ id: string; label: string; passed: boolean }>;
  };
  commands: LightingCommand[];
  nextActions: string[];
  event: FabricEvent;
  applyAttempted?: boolean;
}

export interface LightingIntentPreview {
  intent: string;
  match: {
    id: string;
    name: string;
    sceneId: string;
    confidence: number;
    score: number;
  };
  preview: LightingScenePreview;
}

export interface LightingDashboardResponse {
  service: {
    id: string;
    name: string;
    moduleId: string;
    mode: string;
    executionBoundary: string;
    defaultSceneId: string;
    rule: string;
  };
  featureModule: {
    moduleId: string;
    state: string;
    buildStrategy: string;
    enabledBy: string[];
    buildArtifacts: string[];
  };
  summary: LightingSummary;
  zones: LightingZone[];
  fixtures: LightingFixture[];
  scenes: LightingScene[];
  schedules: LightingSchedule[];
  policies: LightingPolicy[];
  intentRecipes: LightingIntentRecipe[];
  recentSceneRuns: LightingSceneRun[];
  rule: string;
}

export interface ClimateSummary {
  schemaVersion: string;
  zoneCount: number;
  controllableZoneCount: number;
  onlineThermostatCount: number;
  profileCount: number;
  enabledProfileCount: number;
  scheduleCount: number;
  enabledScheduleCount: number;
  policyCount: number;
  intentRecipeCount: number;
  recentRunCount: number;
  averageTemperatureC: number;
  averageSetpointC: number;
  byMode: Record<string, number>;
  byAdapter: Record<string, number>;
}

export interface ClimateZone {
  id: string;
  siteId: string;
  zoneId: string;
  name: string;
  thermostatDeviceId: string;
  sensorDeviceIds: string[];
  occupancyMode: string;
  comfortBand: {
    heatMinC: number;
    heatMaxC: number;
    coolMinC: number;
    coolMaxC: number;
  };
  ecoSetpointC: number;
  awaySetpointC: number;
  frostSetpointC: number;
  priority: string;
  controllable?: boolean;
  thermostat?: null | {
    id: string;
    name: string;
    status: string;
    adapter: string;
    capabilities: string[];
    observedState: Record<string, string | number | boolean>;
    desiredState: Record<string, string | number | boolean>;
  };
  sensors?: Array<{
    id: string;
    name: string;
    status: string;
    adapter: string;
    observedState: Record<string, string | number | boolean>;
  }>;
}

export interface ClimateProfile {
  id: string;
  name: string;
  mode: string;
  status: string;
  trafficClass: string;
  requiresApproval: boolean;
  policies: string[];
  zoneTargets: Array<{
    zoneId: string;
    setpointC: number;
    mode: string;
    holdMinutes: number;
  }>;
  commandProfile: {
    encodedBytes: number;
    ackRequired: boolean;
    ttlSeconds: number;
  };
}

export interface ClimateSchedule {
  id: string;
  name: string;
  profileId: string;
  status: string;
  time: string;
  days: string[];
}

export interface ClimatePolicy {
  id: string;
  name: string;
  risk: string;
  scope: string[];
  requiresApproval: boolean;
  requiresAudit: boolean;
  minHeatC?: number;
  maxHeatC?: number;
  minCoolC?: number;
  maxCoolC?: number;
  minHumidity?: number;
  maxHumidity?: number;
  message: string;
}

export interface ClimateIntentRecipe {
  id: string;
  name: string;
  keywords: string[];
  profileId: string;
  confidence: number;
  exampleIntent: string;
}

export interface ClimateProfileRun {
  id: string;
  profileId: string;
  status: string;
  actor: string;
  commandCount: number;
  summary: string;
}

export interface ClimateCommand {
  id: string;
  profileId: string;
  zoneId: string;
  deviceId: string | null;
  deviceName: string;
  type: string;
  moduleId: string;
  capability: string;
  desiredState: Record<string, string | number | boolean>;
  observedState: Record<string, string | number | boolean>;
  trafficClass: string;
  selectedPath: string;
  encodedBytes: number;
  ackRequired: boolean;
  status: string;
  canExecute: boolean;
  policyDecision: string;
  policyReasons: string[];
}

export interface ClimatePreview {
  previewId: string;
  createdAt: string;
  tenant: string;
  service: ClimateDashboardResponse["service"];
  profile: {
    id: string;
    name: string;
    mode: string;
    status: string;
    trafficClass: string;
    requiresApproval: boolean;
  };
  actor: {
    subject: string;
    name: string;
    roles: string[];
  };
  status: string;
  summary: {
    commandCount: number;
    readyCount: number;
    blockedCount: number;
    zoneCount: number;
    encodedBytes: number;
  };
  policy: {
    result: string;
    canApply: boolean;
    requiresApproval: boolean;
    policies: Array<{ id: string; name: string; risk: string; message: string }>;
    criteria: Array<{ id: string; label: string; passed: boolean }>;
  };
  commands: ClimateCommand[];
  nextActions: string[];
  event: FabricEvent;
  applyAttempted?: boolean;
}

export interface ClimateIntentPreview {
  intent: string;
  match: {
    id: string;
    name: string;
    profileId: string;
    confidence: number;
    score: number;
  };
  preview: ClimatePreview;
}

export interface ClimateDashboardResponse {
  service: {
    id: string;
    name: string;
    moduleId: string;
    mode: string;
    executionBoundary: string;
    defaultZoneId: string;
    rule: string;
  };
  featureModule: {
    moduleId: string;
    state: string;
    buildStrategy: string;
    enabledBy: string[];
    buildArtifacts: string[];
  };
  summary: ClimateSummary;
  zones: ClimateZone[];
  profiles: ClimateProfile[];
  schedules: ClimateSchedule[];
  policies: ClimatePolicy[];
  intentRecipes: ClimateIntentRecipe[];
  recentProfileRuns: ClimateProfileRun[];
  rule: string;
}

export interface SecuritySummary {
  schemaVersion: string;
  accessPointCount: number;
  onlineDeviceCount: number;
  securityDeviceCount: number;
  profileCount: number;
  enabledProfileCount: number;
  approvalProfileCount: number;
  policyCount: number;
  intentRecipeCount: number;
  recentRunCount: number;
  byType: Record<string, number>;
  byPath: Record<string, number>;
}

export interface SecurityAccessPoint {
  id: string;
  name: string;
  siteId: string;
  zoneId: string;
  type: string;
  lockDeviceId?: string;
  alarmDeviceId?: string;
  gateDeviceId?: string;
  sensorDeviceId?: string;
  risk: string;
  trafficClass: string;
  pathPreference: string[];
  policies: string[];
  devices?: Array<{
    id: string;
    name: string;
    status: string;
    adapter: string;
    capabilities: string[];
    observedState: Record<string, string | number | boolean>;
    desiredState: Record<string, string | number | boolean>;
  }>;
}

export interface SecurityProfile {
  id: string;
  name: string;
  mode: string;
  status: string;
  trafficClass: string;
  requiresApproval: boolean;
  policies: string[];
  actions: Array<{
    accessPointId: string;
    action: string;
    desiredState: Record<string, string | number | boolean>;
  }>;
  commandProfile: {
    encodedBytes: number;
    ackRequired: boolean;
    ttlSeconds: number;
  };
}

export interface SecurityPolicy {
  id: string;
  name: string;
  risk: string;
  scope: string[];
  requiresApproval: boolean;
  requiresAudit: boolean;
  message: string;
}

export interface SecurityIntentRecipe {
  id: string;
  name: string;
  keywords: string[];
  profileId: string;
  confidence: number;
  exampleIntent: string;
}

export interface SecurityRun {
  id: string;
  profileId: string;
  status: string;
  actor: string;
  commandCount: number;
  summary: string;
}

export interface SecurityCommand {
  id: string;
  profileId: string;
  accessPointId: string;
  accessPointName: string;
  deviceId: string | null;
  deviceName: string;
  siteId: string | null;
  zoneId: string | null;
  type: string;
  moduleId: string;
  capability: string;
  action: string;
  desiredState: Record<string, string | number | boolean>;
  observedState: Record<string, string | number | boolean>;
  trafficClass: string;
  selectedPath: string;
  encodedBytes: number;
  ackRequired: boolean;
  status: string;
  canExecute: boolean;
  requiresApproval: boolean;
  policyDecision: string;
  policyReasons: string[];
}

export interface SecurityPreview {
  previewId: string;
  createdAt: string;
  tenant: string;
  service: SecurityDashboardResponse["service"];
  profile: {
    id: string;
    name: string;
    mode: string;
    status: string;
    trafficClass: string;
    requiresApproval: boolean;
  };
  actor: {
    subject: string;
    name: string;
    roles: string[];
  };
  status: string;
  summary: {
    commandCount: number;
    readyCount: number;
    approvalCount: number;
    blockedCount: number;
    accessPointCount: number;
    encodedBytes: number;
  };
  policy: {
    result: string;
    canApply: boolean;
    requiresApproval: boolean;
    policies: Array<{ id: string; name: string; risk: string; message: string }>;
    criteria: Array<{ id: string; label: string; passed: boolean }>;
  };
  commands: SecurityCommand[];
  nextActions: string[];
  event: FabricEvent;
  applyAttempted?: boolean;
}

export interface SecurityIntentPreview {
  intent: string;
  match: {
    id: string;
    name: string;
    profileId: string;
    confidence: number;
    score: number;
  };
  preview: SecurityPreview;
}

export interface SecurityDashboardResponse {
  service: {
    id: string;
    name: string;
    moduleId: string;
    mode: string;
    executionBoundary: string;
    defaultProfileId: string;
    defaultAccessPointId: string;
    rule: string;
  };
  featureModule: {
    moduleId: string;
    state: string;
    buildStrategy: string;
    enabledBy: string[];
    buildArtifacts: string[];
  };
  summary: SecuritySummary;
  accessPoints: SecurityAccessPoint[];
  profiles: SecurityProfile[];
  policies: SecurityPolicy[];
  intentRecipes: SecurityIntentRecipe[];
  recentSecurityRuns: SecurityRun[];
  rule: string;
}

export interface WaterSummary {
  schemaVersion: string;
  zoneCount: number;
  valveCount: number;
  onlineValveCount: number;
  leakSensorCount: number;
  activeLeakCount: number;
  profileCount: number;
  enabledProfileCount: number;
  approvalProfileCount: number;
  policyCount: number;
  intentRecipeCount: number;
  recentRunCount: number;
  byPath: Record<string, number>;
}

export interface WaterZone {
  id: string;
  name: string;
  siteId: string;
  zoneId: string;
  leakSensorDeviceId: string;
  valveDeviceId: string;
  flowMeterDeviceId?: string;
  gatewayDeviceId?: string;
  risk: string;
  trafficClass: string;
  pathPreference: string[];
  policies: string[];
  devices?: Record<string, null | {
    id: string;
    name: string;
    status: string;
    adapter: string;
    observedState: Record<string, string | number | boolean>;
    desiredState: Record<string, string | number | boolean>;
  }>;
}

export interface WaterProfile {
  id: string;
  name: string;
  mode: string;
  status: string;
  trafficClass: string;
  requiresApproval: boolean;
  policies: string[];
  zoneTargets: Array<{ zoneId: string; action: string; desiredState: Record<string, string | number | boolean> }>;
  automationScenarioId?: string;
  simulationScenarioId?: string;
  commandProfile: { encodedBytes: number; ackRequired: boolean; ttlSeconds: number };
}

export interface WaterPolicy {
  id: string;
  name: string;
  risk: string;
  scope: string[];
  requiresApproval: boolean;
  requiresSimulation: boolean;
  requiresAudit: boolean;
  message: string;
}

export interface WaterIntentRecipe {
  id: string;
  name: string;
  keywords: string[];
  profileId: string;
  confidence: number;
  exampleIntent: string;
}

export interface WaterCommand {
  id: string;
  profileId: string;
  zoneId: string;
  zoneName: string;
  deviceId: string | null;
  deviceName: string;
  action: string;
  desiredState: Record<string, string | number | boolean>;
  observedState: Record<string, string | number | boolean>;
  leakState: Record<string, string | number | boolean>;
  flowState: Record<string, string | number | boolean>;
  trafficClass: string;
  selectedPath: string;
  encodedBytes: number;
  ackRequired: boolean;
  status: string;
  canExecute: boolean;
  requiresApproval: boolean;
  policyDecision: string;
  policyReasons: string[];
}

export interface WaterPreview {
  previewId: string;
  createdAt: string;
  tenant: string;
  service: WaterDashboardResponse["service"];
  profile: {
    id: string;
    name: string;
    mode: string;
    status: string;
    trafficClass: string;
    requiresApproval: boolean;
    automationScenarioId: string | null;
    simulationScenarioId: string | null;
  };
  actor: { subject: string; name: string; roles: string[] };
  status: string;
  summary: {
    commandCount: number;
    readyCount: number;
    approvalCount: number;
    blockedCount: number;
    encodedBytes: number;
    automationCommandCount: number;
  };
  policy: {
    result: string;
    canApply: boolean;
    requiresApproval: boolean;
    policies: Array<{ id: string; name: string; risk: string; message: string }>;
    criteria: Array<{ id: string; label: string; passed: boolean }>;
  };
  commands: WaterCommand[];
  automation?: AutomationEvaluation | null;
  nextActions: string[];
  event: FabricEvent;
  applyAttempted?: boolean;
}

export interface WaterIntentPreview {
  intent: string;
  match: { id: string; name: string; profileId: string; confidence: number; score: number };
  preview: WaterPreview;
}

export interface WaterDashboardResponse {
  service: {
    id: string;
    name: string;
    moduleId: string;
    mode: string;
    executionBoundary: string;
    defaultProfileId: string;
    defaultZoneId: string;
    rule: string;
  };
  featureModule: { moduleId: string; state: string; buildStrategy: string; enabledBy: string[]; buildArtifacts: string[] };
  summary: WaterSummary;
  zones: WaterZone[];
  profiles: WaterProfile[];
  policies: WaterPolicy[];
  intentRecipes: WaterIntentRecipe[];
  recentWaterRuns: Array<{ id: string; profileId: string; status: string; actor: string; commandCount: number; summary: string }>;
  automationRules: AutomationRule[];
  automationScenarios: AutomationScenario[];
  rule: string;
}

export interface EnergySummary {
  schemaVersion: string;
  assetCount: number;
  meterCount: number;
  solarInverterCount: number;
  batteryCount: number;
  evChargerCount: number;
  onlineAssetDeviceCount: number;
  totalLoadWatts: number;
  totalSolarWatts: number;
  netGridWatts: number;
  batteryPercent: number;
  profileCount: number;
  enabledProfileCount: number;
  approvalProfileCount: number;
  policyCount: number;
  tariffCount: number;
  intentRecipeCount: number;
  recentRunCount: number;
  byMode: Record<string, number>;
}

export interface EnergyAsset {
  id: string;
  name: string;
  siteId: string;
  zoneId: string;
  meterDeviceId: string;
  solarInverterDeviceId: string;
  batteryDeviceId: string;
  evChargerDeviceId: string;
  risk: string;
  trafficClass: string;
  pathPreference: string[];
  policies: string[];
  devices?: Record<string, null | {
    id: string;
    name: string;
    status: string;
    adapter: string;
    observedState: Record<string, string | number | boolean>;
    desiredState: Record<string, string | number | boolean>;
  }>;
}

export interface EnergyProfile {
  id: string;
  name: string;
  mode: string;
  status: string;
  trafficClass: string;
  requiresApproval: boolean;
  policies: string[];
  assetTargets: Array<{ assetId: string; action: string; desiredState: Record<string, string | number | boolean | string[]> }>;
  automationScenarioId?: string;
  simulationScenarioId?: string;
  commandProfile: { encodedBytes: number; ackRequired: boolean; ttlSeconds: number };
}

export interface EnergyPolicy {
  id: string;
  name: string;
  risk: string;
  scope: string[];
  requiresApproval: boolean;
  requiresSimulation: boolean;
  requiresAudit: boolean;
  minimumReservePercent?: number;
  message: string;
}

export interface EnergyTariff {
  id: string;
  name: string;
  currency: string;
  currentPencePerKwh: number;
  exportPencePerKwh: number;
  lowWindows: Array<{ start: string; end: string; pencePerKwh: number }>;
  peakWindows: Array<{ start: string; end: string; pencePerKwh: number }>;
}

export interface EnergyForecast {
  id: string;
  name: string;
  solarKwh: number;
  loadKwh: number;
  batteryEndPercent: number;
  evFlexibleKwh: number;
  savingForecastGbp: number;
  confidence: number;
}

export interface EnergyIntentRecipe {
  id: string;
  name: string;
  keywords: string[];
  profileId: string;
  confidence: number;
  exampleIntent: string;
}

export interface EnergyCommand {
  id: string;
  profileId: string;
  assetId: string;
  assetName: string;
  deviceId: string | null;
  deviceName: string;
  capability: string;
  action: string;
  desiredState: Record<string, string | number | boolean | string[]>;
  observedState: Record<string, string | number | boolean>;
  energyState: {
    loadWatts: number;
    solarWatts: number;
    batteryPercent: number;
    evPluggedIn: boolean;
  };
  trafficClass: string;
  selectedPath: string;
  encodedBytes: number;
  ackRequired: boolean;
  status: string;
  canExecute: boolean;
  requiresApproval: boolean;
  policyDecision: string;
  policyReasons: string[];
}

export interface EnergyPreview {
  previewId: string;
  createdAt: string;
  tenant: string;
  service: EnergyDashboardResponse["service"];
  profile: {
    id: string;
    name: string;
    mode: string;
    status: string;
    trafficClass: string;
    requiresApproval: boolean;
    automationScenarioId: string | null;
    simulationScenarioId: string | null;
  };
  actor: { subject: string; name: string; roles: string[] };
  status: string;
  summary: {
    commandCount: number;
    readyCount: number;
    approvalCount: number;
    blockedCount: number;
    encodedBytes: number;
    forecastSavingGbp: number;
    automationCommandCount: number;
  };
  policy: {
    result: string;
    canApply: boolean;
    requiresApproval: boolean;
    policies: Array<{ id: string; name: string; risk: string; message: string }>;
    criteria: Array<{ id: string; label: string; passed: boolean }>;
  };
  commands: EnergyCommand[];
  automation?: AutomationEvaluation | null;
  nextActions: string[];
  event: FabricEvent;
  applyAttempted?: boolean;
}

export interface EnergyIntentPreview {
  intent: string;
  match: { id: string; name: string; profileId: string; confidence: number; score: number };
  preview: EnergyPreview;
}

export interface EnergyDashboardResponse {
  service: {
    id: string;
    name: string;
    moduleId: string;
    mode: string;
    executionBoundary: string;
    defaultProfileId: string;
    defaultAssetId: string;
    rule: string;
  };
  featureModule: { moduleId: string; state: string; buildStrategy: string; enabledBy: string[]; buildArtifacts: string[] };
  summary: EnergySummary;
  assets: EnergyAsset[];
  profiles: EnergyProfile[];
  policies: EnergyPolicy[];
  tariffs: EnergyTariff[];
  forecasts: EnergyForecast[];
  intentRecipes: EnergyIntentRecipe[];
  recentEnergyRuns: Array<{ id: string; profileId: string; status: string; actor: string; commandCount: number; summary: string }>;
  automationRules: AutomationRule[];
  automationScenarios: AutomationScenario[];
  rule: string;
}

export interface SensingSummary {
  schemaVersion: string;
  zoneCount: number;
  occupancySensorCount: number;
  presenceSensorCount: number;
  airQualitySensorCount: number;
  occupiedZoneCount: number;
  averageConfidence: number;
  averageCo2Ppm: number;
  privacyStrictZoneCount: number;
  profileCount: number;
  enabledProfileCount: number;
  approvalProfileCount: number;
  policyCount: number;
  intentRecipeCount: number;
  recentRunCount: number;
  byPrivacyMode: Record<string, number>;
}

export interface SensingZone {
  id: string;
  name: string;
  siteId: string;
  zoneId: string;
  occupancyDeviceId?: string;
  presenceDeviceId?: string;
  airQualityDeviceId?: string;
  temperatureDeviceIds?: string[];
  privacyMode: string;
  risk: string;
  trafficClass: string;
  policies: string[];
  devices?: Record<string, null | {
    id: string;
    name: string;
    status: string;
    adapter: string;
    observedState: Record<string, string | number | boolean>;
    desiredState?: Record<string, string | number | boolean>;
  } | Array<{
    id: string;
    name: string;
    status: string;
    adapter: string;
    observedState: Record<string, string | number | boolean>;
  }>>;
}

export interface SensingProfile {
  id: string;
  name: string;
  mode: string;
  status: string;
  trafficClass: string;
  requiresApproval: boolean;
  policies: string[];
  zoneTargets: Array<{ zoneId: string; action: string; minimumConfidence: number }>;
  commandProfile: { encodedBytes: number; ackRequired: boolean; ttlSeconds: number };
}

export interface SensingPolicy {
  id: string;
  name: string;
  risk: string;
  scope: string[];
  requiresApproval: boolean;
  requiresSimulation: boolean;
  requiresAudit: boolean;
  message: string;
}

export interface SensingIntentRecipe {
  id: string;
  name: string;
  keywords: string[];
  profileId: string;
  confidence: number;
  exampleIntent: string;
}

export interface SensingCommand {
  id: string;
  profileId: string;
  zoneId: string;
  zoneName: string;
  deviceId: string | null;
  deviceName: string;
  capability: string;
  action: string;
  observedState: Record<string, string | number | boolean | null>;
  trafficClass: string;
  selectedPath: string;
  encodedBytes: number;
  ackRequired: boolean;
  status: string;
  canExecute: boolean;
  requiresApproval: boolean;
  policyDecision: string;
  policyReasons: string[];
}

export interface SensingPreview {
  previewId: string;
  createdAt: string;
  tenant: string;
  service: SensingDashboardResponse["service"];
  profile: { id: string; name: string; mode: string; status: string; trafficClass: string; requiresApproval: boolean };
  actor: { subject: string; name: string; roles: string[] };
  status: string;
  summary: { commandCount: number; readyCount: number; approvalCount: number; blockedCount: number; encodedBytes: number };
  policy: {
    result: string;
    canApply: boolean;
    requiresApproval: boolean;
    policies: Array<{ id: string; name: string; risk: string; message: string }>;
    criteria: Array<{ id: string; label: string; passed: boolean }>;
  };
  commands: SensingCommand[];
  nextActions: string[];
  event: FabricEvent;
}

export interface SensingIntentPreview {
  intent: string;
  match: { id: string; name: string; profileId: string; confidence: number; score: number };
  preview: SensingPreview;
}

export interface SensingDashboardResponse {
  service: {
    id: string;
    name: string;
    moduleId: string;
    mode: string;
    executionBoundary: string;
    defaultProfileId: string;
    defaultZoneId: string;
    rule: string;
  };
  featureModule: { moduleId: string; state: string; buildStrategy: string; enabledBy: string[]; buildArtifacts: string[] };
  summary: SensingSummary;
  zones: SensingZone[];
  profiles: SensingProfile[];
  policies: SensingPolicy[];
  intentRecipes: SensingIntentRecipe[];
  recentSensingRuns: Array<{ id: string; profileId: string; status: string; actor: string; commandCount: number; summary: string }>;
  rule: string;
}

export interface ModuleManifestSummary {
  schemaVersion: string;
  flagCount: number;
  enabled: number;
  buildable: number;
  approvalRequired: number;
  blocked: number;
  artifactKindCount: number;
  buildLaneCount: number;
  intentRecipeCount: number;
  catalogCoverage: { covered: number; total: number; percent: number };
  byState: Record<string, number>;
  byReadiness: Record<string, number>;
  byRisk: Record<string, number>;
}

export interface ModuleFlagState {
  id: string;
  name: string;
  allowsRuntimeSurface: boolean;
  allowsBuild: boolean;
  requiresApproval: boolean;
}

export interface ModuleFlagDependency {
  moduleId: string;
  name: string;
  present: boolean;
  state: string;
  ready: boolean;
}

export interface ModuleFeatureFlag {
  id: string;
  moduleId: string;
  moduleName: string;
  category: string;
  catalogState: string;
  state: string;
  environment: string;
  version: string;
  owner: string;
  risk: "low" | "medium" | "high" | string;
  trafficClass: string;
  narrowbandSuitability: string | null;
  description: string;
  dependencies: string[];
  dependencyStatuses: ModuleFlagDependency[];
  missingDependencies: ModuleFlagDependency[];
  artifacts: string[];
  missingArtifacts: string[];
  activation: { strategy: string; requiresApproval: boolean; requiresCertification: boolean; requiresTests: boolean };
  evidence: string[];
  stateDefinition: ModuleFlagState | null;
  readiness: {
    canBuild: boolean;
    canEnable: boolean;
    requiresApproval: boolean;
    runtimeSurface: boolean;
    status: string;
  };
}

export interface ModuleBuildLane {
  id: string;
  name: string;
  stages: string[];
  targetEnvironment: string;
}

export interface ModuleManifestIntentRecipe {
  id: string;
  name: string;
  keywords: string[];
  moduleId: string;
  confidence: number;
  exampleIntent: string;
}

export interface ModuleFlagPreview {
  previewId: string;
  createdAt: string;
  tenant: string;
  service: ModuleManifestResponse["service"];
  actor: { subject: string; name: string; roles: string[] };
  status: string;
  flag: ModuleFeatureFlag;
  lane: ModuleBuildLane | null;
  stages: Array<{ id: string; label: string; status: string }>;
  summary: {
    dependencyCount: number;
    missingDependencyCount: number;
    artifactCount: number;
    missingArtifactCount: number;
    canBuild: boolean;
    canEnable: boolean;
    requiresApproval: boolean;
  };
  nextActions: string[];
  event: FabricEvent;
}

export interface ModuleManifestIntentPreview {
  intent: string;
  match: null | { id: string; name: string; moduleId: string; confidence: number; score: number };
  preview: ModuleFlagPreview;
}

export interface ModuleManifestResponse {
  service: {
    id: string;
    name: string;
    moduleId: string;
    mode: string;
    executionBoundary: string;
    defaultEnvironment: string;
    rule: string;
  };
  featureModule: { moduleId: string; state: string; buildStrategy: string; enabledBy: string[]; buildArtifacts: string[] };
  summary: ModuleManifestSummary;
  flagStates: ModuleFlagState[];
  artifactKinds: string[];
  flags: ModuleFeatureFlag[];
  buildLanes: ModuleBuildLane[];
  intentRecipes: ModuleManifestIntentRecipe[];
  uncoveredCatalogModules: Array<{ moduleId: string; name: string; category: string; state: string; risk: string; recommendedFlagState: string }>;
  recentManifestRuns: Array<{ id: string; moduleId: string; status: string; actor: string; summary: string }>;
  rule: string;
}

export interface ModuleBuilderSummary {
  schemaVersion: string;
  planCount: number;
  readyToQueue: number;
  approvalRequired: number;
  certificationRequired: number;
  composeFragmentCount: number;
  azureFragmentCount: number;
  migrationHookCount: number;
  verificationCommandCount: number;
  byStatus: Record<string, number>;
  byQueueStatus: Record<string, number>;
  byEnvironment: Record<string, number>;
  byRisk: Record<string, number>;
}

export interface ModuleBuildPlanState {
  id: string;
  name: string;
  canQueue: boolean;
  requiresApproval: boolean;
}

export interface ModuleBuildFragment {
  id: string;
  kind: string;
  serviceName?: string;
  image?: string;
  profile?: string;
  dependsOn?: string[];
  ports?: string[];
  environment?: string[];
  resourceType?: string;
  name?: string;
  scale?: { minReplicas: number; maxReplicas: number };
  secretBindings?: string[];
  type?: string;
  target?: string;
  mode?: string;
}

export interface ModuleVerificationCommand {
  id: string;
  command: string;
  required: boolean;
}

export interface ModuleBuildPlan {
  id: string;
  moduleId: string;
  name: string;
  status: string;
  targetEnvironment: string;
  laneId: string;
  flagId: string;
  risk: "low" | "medium" | "high" | string;
  trafficClass: string;
  requiresApproval: boolean;
  requiresCertification: boolean;
  objective: string;
  composeFragments: ModuleBuildFragment[];
  azureFragments: ModuleBuildFragment[];
  migrationHooks: ModuleBuildFragment[];
  testPacks: string[];
  dashboardSurfaces: string[];
  agentTools: string[];
  approvalGates: string[];
  expectedOutputs: string[];
  flag?: ModuleFeatureFlag;
  lane?: ModuleBuildLane | null;
  state?: ModuleBuildPlanState | null;
  manifestPreview?: ModuleFlagPreview | null;
  fragments: ModuleBuildFragment[];
  requiredVerification: ModuleVerificationCommand[];
  readiness: {
    canQueue: boolean;
    queueStatus: string;
    approvalRequired: boolean;
    certificationRequired: boolean;
    fragmentCount: number;
    composeFragmentCount: number;
    azureFragmentCount: number;
    migrationHookCount: number;
    verificationCommandCount: number;
  };
}

export interface ModuleBuildPreview {
  previewId: string;
  createdAt: string;
  tenant: string;
  service: ModuleBuilderResponse["service"];
  actor: { subject: string; name: string; roles: string[] };
  status: string;
  plan: ModuleBuildPlan;
  stages: Array<{ id: string; label: string; status: string }>;
  fragments: ModuleBuildFragment[];
  verificationCommands: ModuleVerificationCommand[];
  summary: {
    fragmentCount: number;
    composeFragmentCount: number;
    azureFragmentCount: number;
    migrationHookCount: number;
    verificationCommandCount: number;
    canQueue: boolean;
    requiresApproval: boolean;
    requiresCertification: boolean;
  };
  nextActions: string[];
  event: FabricEvent;
}

export interface ModuleBuildIntentPreview {
  intent: string;
  match: null | { id: string; name: string; planId: string; confidence: number; score: number; source: string };
  preview: ModuleBuildPreview;
}

export interface ModuleBuilderResponse {
  service: {
    id: string;
    name: string;
    moduleId: string;
    mode: string;
    executionBoundary: string;
    defaultPlanId: string;
    rule: string;
  };
  featureModule: { moduleId: string; state: string; buildStrategy: string; enabledBy: string[]; buildArtifacts: string[] };
  summary: ModuleBuilderSummary;
  buildPlanStates: ModuleBuildPlanState[];
  fragmentKinds: string[];
  verificationCommands: ModuleVerificationCommand[];
  plans: ModuleBuildPlan[];
  intentRecipes: Array<{ id: string; name: string; keywords: string[]; planId: string; confidence: number; exampleIntent: string }>;
  recentBuildRuns: Array<{ id: string; planId: string; moduleId: string; status: string; actor: string; summary: string }>;
  rule: string;
}

export interface ModuleMarketplaceSummary {
  schemaVersion: string;
  listingCount: number;
  installed: number;
  available: number;
  requested: number;
  approvalRequired: number;
  needsManifest: number;
  queueReady: number;
  collectionCount: number;
  requestCount: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byRisk: Record<string, number>;
}

export interface ModuleMarketplaceListing {
  moduleId: string;
  name: string;
  category: string;
  description: string;
  risk: "low" | "medium" | "high" | string;
  trafficClass: string;
  status: string;
  flagState: string | null;
  readiness: string;
  buildPlanId: string | null;
  queueStatus: string | null;
  canRequest: boolean;
  requiresApproval: boolean;
  collectionIds: string[];
  kpis: string[];
}

export interface ModuleMarketplaceRequest {
  id: string;
  name: string;
  moduleId: string;
  intent: string;
  status: string;
  priority: string;
  requestedBy: string;
  listing?: ModuleMarketplaceListing | null;
}

export interface ModuleMarketplacePreview {
  previewId: string;
  createdAt: string;
  tenant: string;
  service: ModuleMarketplaceResponse["service"];
  actor: { subject: string; name: string; roles: string[] };
  status: string;
  request: ModuleMarketplaceRequest;
  listing: ModuleMarketplaceListing | null;
  flagPreview: ModuleFlagPreview | null;
  buildPreview: ModuleBuildPreview | null;
  summary: { canRequest: boolean; requiresApproval: boolean; hasBuildPlan: boolean; queueReady: boolean };
  nextActions: string[];
  event: FabricEvent;
}

export interface ModuleMarketplaceIntentPreview {
  intent: string;
  match: null | { id: string; name: string; requestId: string; confidence: number; score: number };
  preview: ModuleMarketplacePreview;
}

export interface ModuleMarketplaceResponse {
  service: {
    id: string;
    name: string;
    moduleId: string;
    mode: string;
    executionBoundary: string;
    defaultRequestId: string;
    rule: string;
  };
  featureModule: { moduleId: string; state: string; buildStrategy: string; enabledBy: string[]; buildArtifacts: string[] };
  summary: ModuleMarketplaceSummary;
  requestStates: Array<{ id: string; name: string; canRequest: boolean; requiresApproval: boolean }>;
  curatedCollections: Array<{ id: string; name: string; moduleIds: string[]; listings: ModuleMarketplaceListing[] }>;
  listings: ModuleMarketplaceListing[];
  requests: ModuleMarketplaceRequest[];
  intentRecipes: Array<{ id: string; name: string; keywords: string[]; requestId: string; confidence: number; exampleIntent: string }>;
  recentMarketplaceRuns: Array<{ id: string; requestId: string; moduleId: string; status: string; actor: string; summary: string }>;
  rule: string;
}

export interface ModuleCertificationSummary {
  schemaVersion: string;
  profileCount: number;
  passed: number;
  readyForCertification: number;
  approvalRequired: number;
  failed: number;
  blocked: number;
  canEnable: number;
  testSuiteCount: number;
  harnessRunCount: number;
  evidenceRequirementCount: number;
  queueReady: number;
  byStatus: Record<string, number>;
  byRisk: Record<string, number>;
  byTargetEnvironment: Record<string, number>;
}

export interface ModuleCertificationEvidence {
  id: string;
  type: string;
  status: string;
  summary: string;
}

export interface ModuleCertificationGate {
  id: string;
  name: string;
  evidenceType: string;
  status: string;
}

export interface ModuleCertificationSuite {
  id: string;
  name: string;
  scope: string;
  requiredEvidence: string[];
  commands: string[];
  risk: "low" | "medium" | "high" | string;
  status?: string;
  durationMs?: number;
}

export interface ModuleCertificationHarnessRun {
  id: string;
  profileId: string;
  moduleId: string;
  status: string;
  actor: string;
  suiteResults: Array<{ suiteId: string; status: string; durationMs: number }>;
  summary: string;
}

export interface ModuleCertificationProfile {
  id: string;
  name: string;
  moduleId: string;
  requestId: string;
  buildPlanId: string;
  targetEnvironment: string;
  status: string;
  risk: "low" | "medium" | "high" | string;
  trafficClass: string;
  requiresApproval: boolean;
  requiredEvidence: string[];
  testSuiteIds: string[];
  gates: ModuleCertificationGate[];
  evidence: ModuleCertificationEvidence[];
  nextActions: string[];
  readiness: {
    canEnable: boolean;
    inferredStatus: string;
    missingEvidence: string[];
    attachedEvidence: string[];
    suiteCount: number;
    passedSuites: number;
    pendingSuites: number;
    failedSuites: number;
    requiresApproval: boolean;
    marketplaceStatus: string;
    buildQueueStatus: string | null;
  };
  flag?: ModuleFeatureFlag | null;
  listing?: ModuleMarketplaceListing | null;
  request?: ModuleMarketplaceRequest | null;
  testSuites: ModuleCertificationSuite[];
  harnessRun?: ModuleCertificationHarnessRun | null;
}

export interface ModuleCertificationPreview {
  previewId: string;
  createdAt: string;
  tenant: string;
  service: ModuleCertificationResponse["service"];
  actor: { subject: string; name: string; roles: string[] };
  status: string;
  profile: ModuleCertificationProfile;
  gates: ModuleCertificationGate[];
  evidence: ModuleCertificationEvidence[];
  testSuites: ModuleCertificationSuite[];
  harnessRun: ModuleCertificationHarnessRun | null;
  marketplacePreview: ModuleMarketplacePreview | null;
  buildPreview: ModuleBuildPreview | null;
  summary: {
    canEnable: boolean;
    requiresApproval: boolean;
    missingEvidence: string[];
    attachedEvidence: string[];
    passedSuites: number;
    pendingSuites: number;
    failedSuites: number;
    queueReady: boolean;
  };
  nextActions: string[];
  event: FabricEvent;
}

export interface ModuleCertificationIntentPreview {
  intent: string;
  match: null | { id: string; name: string; profileId: string; confidence: number; score: number };
  preview: ModuleCertificationPreview;
}

export interface ModuleCertificationResponse {
  service: {
    id: string;
    name: string;
    moduleId: string;
    mode: string;
    executionBoundary: string;
    defaultProfileId: string;
    defaultHarnessRunId: string;
    rule: string;
  };
  featureModule: { moduleId: string; state: string; buildStrategy: string; enabledBy: string[]; buildArtifacts: string[] };
  summary: ModuleCertificationSummary;
  certificationStates: Array<{ id: string; name: string; canEnable: boolean; requiresApproval: boolean }>;
  evidenceTypes: string[];
  testSuites: ModuleCertificationSuite[];
  profiles: ModuleCertificationProfile[];
  harnessRuns: ModuleCertificationHarnessRun[];
  intentRecipes: Array<{ id: string; name: string; keywords: string[]; profileId: string; confidence: number; exampleIntent: string }>;
  rule: string;
}

export interface MqttEsphomeSummary {
  schemaVersion: string;
  brokerStatus: string;
  mappingCount: number;
  mappedDeviceCount: number;
  onlineMappedDevices: number;
  commandProfileCount: number;
  discoveryProfileCount: number;
  readyDiscoveryProfiles: number;
  stateSampleCount: number;
  recentRunCount: number;
  approvalRequiredCommands: number;
  publishableMappings: number;
  byCapability: Record<string, number>;
  byRisk: Record<string, number>;
  byQos: Record<string, number>;
}

export interface MqttBroker {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  status: string;
  authMode: string;
  secretRefs: string[];
}

export interface MqttTopicMapping {
  id: string;
  deviceId: string;
  nodeId: string;
  capability: string;
  stateTopic: string;
  commandTopic: string | null;
  availabilityTopic: string;
  payloadTemplate: Record<string, string | number | boolean>;
  qos: number;
  retain: boolean;
  risk: "low" | "medium" | "high" | string;
  trafficClass: string;
  requiresApproval: boolean;
  device?: DeviceDefinition | null;
  capabilityDefinition?: { id: string; class: string; risk: string; trafficClass: string } | null;
  discovery?: MqttDiscoveryProfile | null;
  stateSample?: MqttStateSample | null;
  readiness: {
    deviceKnown: boolean;
    deviceOnline: boolean;
    commandTopicAllowed: boolean;
    canPublish: boolean;
    registryCapabilities: string[];
  };
}

export interface MqttDiscoveryProfile {
  id: string;
  name: string;
  nodeId: string;
  deviceId: string;
  component: string;
  discoveryTopic: string;
  payload: Record<string, string | number | boolean>;
  status: string;
  device?: DeviceDefinition | null;
}

export interface MqttCommandProfile {
  id: string;
  name: string;
  mappingId: string;
  deviceId: string;
  desiredState: Record<string, string | number | boolean>;
  qos: number;
  retain: boolean;
  trafficClass: string;
  requiresApproval: boolean;
  mapping?: MqttTopicMapping | null;
  device?: DeviceDefinition | null;
}

export interface MqttStateSample {
  id: string;
  mappingId: string;
  topic: string;
  direction: string;
  payload: Record<string, string | number | boolean>;
  status: string;
}

export interface MqttPublishPreview {
  previewId: string;
  createdAt: string;
  tenant: string;
  service: MqttEsphomeResponse["service"];
  actor: { subject: string; name: string; roles: string[] };
  status: string;
  command: MqttCommandProfile;
  mapping: MqttTopicMapping | null;
  device: DeviceDefinition | null;
  publish: { topic: string | null; payload: Record<string, string | number | boolean>; qos: number; retain: boolean; brokerId: string; simulated: boolean };
  summary: { canPublish: boolean; requiresApproval: boolean; approvalSatisfied: boolean; deviceOnline: boolean; encodedBytes: number };
  policy: { result: string; rules: Array<{ id: string; name: string; risk: string; requiresApproval: boolean; message: string }> };
  nextActions: string[];
  event: FabricEvent;
  publishAttempted?: boolean;
}

export interface MqttDiscoveryPreview {
  previewId: string;
  createdAt: string;
  tenant: string;
  service: MqttEsphomeResponse["service"];
  actor: { subject: string; name: string; roles: string[] };
  status: string;
  profile: MqttDiscoveryProfile;
  device: DeviceDefinition | null;
  discoveryTopic: string;
  payload: Record<string, string | number | boolean>;
  summary: { deviceKnown: boolean; capabilityCount: number; retainRecommended: boolean; canPublishDiscovery: boolean };
  nextActions: string[];
}

export interface MqttEsphomeIntentPreview {
  intent: string;
  match: null | { id: string; name: string; commandId: string; confidence: number; score: number };
  preview: MqttPublishPreview;
}

export interface MqttEsphomeResponse {
  service: {
    id: string;
    name: string;
    moduleId: string;
    mode: string;
    executionBoundary: string;
    defaultCommandId: string;
    defaultDiscoveryProfileId: string;
    rule: string;
  };
  featureModule: { moduleId: string; state: string; buildStrategy: string; enabledBy: string[]; buildArtifacts: string[] };
  broker: MqttBroker;
  summary: MqttEsphomeSummary;
  topicMappings: MqttTopicMapping[];
  discoveryProfiles: MqttDiscoveryProfile[];
  commandProfiles: MqttCommandProfile[];
  stateSamples: MqttStateSample[];
  policies: Array<{ id: string; name: string; risk: string; requiresApproval: boolean; message: string }>;
  intentRecipes: Array<{ id: string; name: string; keywords: string[]; commandId: string; confidence: number; exampleIntent: string }>;
  recentMqttRuns: Array<{ id: string; commandId: string; mappingId: string; status: string; actor: string; summary: string }>;
  certification: null | { status: string; profileId: string; canEnable: boolean; evidenceAttached: number; requiredEvidence: number };
  rule: string;
}

export interface MatterThreadSummary {
  schemaVersion: string;
  fabricStatus: string;
  bindingCount: number;
  matterRegistryDevices: number;
  onlineMatterDevices: number;
  threadNetworkCount: number;
  healthyThreadNetworks: number;
  borderRouterCount: number;
  onlineBorderRouters: number;
  commissioningProfileCount: number;
  readyCommissioningProfiles: number;
  commandProfileCount: number;
  approvalRequiredCommands: number;
  commandableBindings: number;
  byDeviceType: Record<string, number>;
  byRisk: Record<string, number>;
  byThread: Record<string, number>;
}

export interface MatterFabric {
  id: string;
  name: string;
  fabricId: string;
  compressedFabricId: string;
  controllerNodeId: string;
  rootCaStatus: string;
  status: string;
}

export interface ThreadBorderRouter {
  id: string;
  name: string;
  siteId: string;
  zoneId: string;
  status: string;
  transport: string;
  threadRole: string;
  rssi: number;
  lastSeen: string;
}

export interface ThreadNetwork {
  id: string;
  name: string;
  siteId: string;
  status: string;
  borderRouterIds: string[];
  datasetStatus: string;
  channel: number;
  panId: string;
  extendedPanId: string;
  meshLocalPrefix: string;
  borderRouters?: ThreadBorderRouter[];
  health?: MatterThreadHealthSample | null;
}

export interface MatterThreadHealthSample {
  id: string;
  threadNetworkId: string;
  status: string;
  routerCount: number;
  commissionedThreadDevices: number;
  packetErrorPercent: number;
  averageRssi: number;
}

export interface MatterDeviceBinding {
  id: string;
  deviceId: string;
  nodeId: string;
  endpoint: number;
  deviceType: string;
  clusters: string[];
  threadNetworkId: string | null;
  fabricStatus: string;
  risk: "low" | "medium" | "high" | string;
  trafficClass: string;
  device?: DeviceDefinition | null;
  threadNetwork?: ThreadNetwork | null;
  readiness: {
    deviceKnown: boolean;
    deviceOnline: boolean;
    fabricReady: boolean;
    threadHealthy: boolean;
    canCommand: boolean;
    registryCapabilities: string[];
  };
}

export interface MatterCommissioningProfile {
  id: string;
  name: string;
  deviceId: string;
  method: string;
  fabricId: string;
  threadNetworkId: string | null;
  requiresApproval: boolean;
  status: string;
  checklist: string[];
  device?: DeviceDefinition | null;
  threadNetwork?: ThreadNetwork | null;
}

export interface MatterCommandProfile {
  id: string;
  name: string;
  bindingId: string;
  deviceId: string;
  cluster: string;
  command: string;
  desiredState: Record<string, string | number | boolean>;
  requiresApproval: boolean;
  trafficClass: string;
  binding?: MatterDeviceBinding | null;
  device?: DeviceDefinition | null;
}

export interface MatterCommandPreview {
  previewId: string;
  createdAt: string;
  tenant: string;
  service: MatterThreadResponse["service"];
  actor: { subject: string; name: string; roles: string[] };
  status: string;
  command: MatterCommandProfile;
  binding: MatterDeviceBinding | null;
  device: DeviceDefinition | null;
  fabric: MatterFabric;
  invoke: { nodeId: string | null; endpoint: number | null; cluster: string; command: string; desiredState: Record<string, string | number | boolean>; simulated: boolean };
  summary: { canExecute: boolean; requiresApproval: boolean; approvalSatisfied: boolean; deviceOnline: boolean; threadPath: boolean };
  policy: { result: string; rules: Array<{ id: string; name: string; risk: string; requiresApproval: boolean; message: string }> };
  nextActions: string[];
  event: FabricEvent;
  executeAttempted?: boolean;
}

export interface MatterCommissioningPreview {
  previewId: string;
  createdAt: string;
  tenant: string;
  service: MatterThreadResponse["service"];
  actor: { subject: string; name: string; roles: string[] };
  status: string;
  profile: MatterCommissioningProfile;
  device: DeviceDefinition | null;
  fabric: MatterFabric;
  threadNetwork: ThreadNetwork | null;
  checklist: Array<{ id: string; label: string; passed: boolean }>;
  summary: { deviceKnown: boolean; threadRequired: boolean; threadHealthy: boolean; requiresApproval: boolean; approvalSatisfied: boolean; canCommission: boolean };
  nextActions: string[];
}

export interface MatterThreadIntentPreview {
  intent: string;
  match: null | { id: string; name: string; commandId: string | null; commissioningId: string | null; confidence: number; score: number };
  preview: MatterCommandPreview | MatterCommissioningPreview;
}

export interface MatterThreadResponse {
  service: {
    id: string;
    name: string;
    moduleId: string;
    mode: string;
    executionBoundary: string;
    defaultCommissioningId: string;
    defaultCommandId: string;
    rule: string;
  };
  featureModule: { moduleId: string; state: string; buildStrategy: string; enabledBy: string[]; buildArtifacts: string[] };
  fabric: MatterFabric;
  summary: MatterThreadSummary;
  module: ModuleDefinition | null;
  threadNetworks: ThreadNetwork[];
  borderRouters: ThreadBorderRouter[];
  deviceBindings: MatterDeviceBinding[];
  commissioningProfiles: MatterCommissioningProfile[];
  commandProfiles: MatterCommandProfile[];
  healthSamples: MatterThreadHealthSample[];
  policies: Array<{ id: string; name: string; risk: string; requiresApproval: boolean; message: string }>;
  intentRecipes: Array<{ id: string; name: string; keywords: string[]; commandId?: string; commissioningId?: string; confidence: number; exampleIntent: string }>;
  recentMatterRuns: Array<{ id: string; commandId: string; bindingId: string; status: string; actor: string; summary: string }>;
  rule: string;
}

export interface ZigbeeSummary {
  schemaVersion: string;
  coordinatorStatus: string;
  bindingCount: number;
  zigbeeRegistryDevices: number;
  onlineZigbeeDevices: number;
  routeCount: number;
  healthyRoutes: number;
  watchRoutes: number;
  lowBatteryDevices: number;
  permitJoinProfileCount: number;
  readyPermitJoinProfiles: number;
  reportingProfileCount: number;
  readyReportingProfiles: number;
  commandProfileCount: number;
  approvalRequiredCommands: number;
  commandableBindings: number;
  averageLqi: number;
  byDeviceType: Record<string, number>;
  byRisk: Record<string, number>;
  byRole: Record<string, number>;
}

export interface ZigbeeCoordinator {
  id: string;
  name: string;
  siteId: string;
  zoneId: string;
  driver: string;
  transport: string;
  networkPanId: string;
  extendedPanId: string;
  channel: number;
  status: string;
  networkKeyRef: string;
  permitJoin: boolean;
  lastSeen: string;
}

export interface ZigbeeMeshRoute {
  id: string;
  deviceId: string;
  parentIeee: string;
  depth: number;
  lqi: number;
  rssi: number;
  role: string;
  batteryPercent: number | null;
  lastSeenMinutes: number;
  status: string;
  device?: DeviceDefinition | null;
  binding?: ZigbeeDeviceBinding | null;
}

export interface ZigbeeDeviceBinding {
  id: string;
  deviceId: string;
  ieeeAddress: string;
  networkAddress: string;
  endpoint: number;
  deviceType: string;
  clusters: string[];
  capability: string;
  risk: "low" | "medium" | "high" | string;
  trafficClass: string;
  device?: DeviceDefinition | null;
  route?: ZigbeeMeshRoute | null;
  readiness: {
    deviceKnown: boolean;
    deviceOnline: boolean;
    coordinatorOnline: boolean;
    routeHealthy: boolean;
    batteryOk: boolean;
    canCommand: boolean;
    registryCapabilities: string[];
  };
}

export interface ZigbeePermitJoinProfile {
  id: string;
  name: string;
  siteId: string;
  coordinatorId: string;
  durationSeconds: number;
  allowedManufacturers: string[];
  allowedDeviceTypes: string[];
  requiresApproval: boolean;
  status: string;
  checklist: string[];
}

export interface ZigbeeReportingProfile {
  id: string;
  name: string;
  bindingId: string;
  deviceId: string;
  cluster: string;
  attribute: string;
  minIntervalSeconds: number;
  maxIntervalSeconds: number;
  reportableChange: number;
  status: string;
  binding?: ZigbeeDeviceBinding | null;
  device?: DeviceDefinition | null;
}

export interface ZigbeeCommandProfile {
  id: string;
  name: string;
  bindingId: string | null;
  deviceId: string | null;
  permitJoinId?: string;
  cluster: string;
  command: string;
  desiredState: Record<string, string | number | boolean>;
  requiresApproval: boolean;
  trafficClass: string;
  binding?: ZigbeeDeviceBinding | null;
  permitJoin?: ZigbeePermitJoinProfile | null;
  device?: DeviceDefinition | null;
}

export interface ZigbeeCommandPreview {
  previewId: string;
  createdAt: string;
  tenant: string;
  service: ZigbeeResponse["service"];
  actor: { subject: string; name: string; roles: string[] };
  status: string;
  command: ZigbeeCommandProfile;
  binding: ZigbeeDeviceBinding | null;
  permitJoin: ZigbeePermitJoinProfile | null;
  device: DeviceDefinition | null;
  coordinator: ZigbeeCoordinator;
  frame: { ieeeAddress: string | null; networkAddress: string | null; endpoint: number | null; cluster: string; command: string; desiredState: Record<string, string | number | boolean>; simulated: boolean };
  summary: { canExecute: boolean; requiresApproval: boolean; approvalSatisfied: boolean; deviceOnline: boolean; routeStatus: string };
  policy: { result: string; rules: Array<{ id: string; name: string; risk: string; requiresApproval: boolean; message: string }> };
  nextActions: string[];
  event: FabricEvent;
  executeAttempted?: boolean;
}

export interface ZigbeePermitJoinPreview {
  previewId: string;
  createdAt: string;
  tenant: string;
  service: ZigbeeResponse["service"];
  actor: { subject: string; name: string; roles: string[] };
  status: string;
  profile: ZigbeePermitJoinProfile;
  coordinator: ZigbeeCoordinator;
  checklist: Array<{ id: string; label: string; passed: boolean }>;
  summary: { coordinatorOnline: boolean; durationSeconds: number; allowlistCount: number; requiresApproval: boolean; approvalSatisfied: boolean; canPermitJoin: boolean };
  nextActions: string[];
}

export interface ZigbeeReportingPreview {
  previewId: string;
  createdAt: string;
  tenant: string;
  service: ZigbeeResponse["service"];
  status: string;
  profile: ZigbeeReportingProfile;
  binding: ZigbeeDeviceBinding | null;
  device: DeviceDefinition | null;
  coordinator: ZigbeeCoordinator;
  configureReporting: { ieeeAddress: string | null; endpoint: number | null; cluster: string; attribute: string; minIntervalSeconds: number; maxIntervalSeconds: number; reportableChange: number; simulated: boolean };
  summary: { deviceKnown: boolean; deviceOnline: boolean; coordinatorOnline: boolean; canConfigure: boolean; watchRoute: boolean };
  nextActions: string[];
}

export interface ZigbeeIntentPreview {
  intent: string;
  match: null | { id: string; name: string; commandId: string | null; permitJoinId: string | null; reportingId: string | null; confidence: number; score: number };
  preview: ZigbeeCommandPreview | ZigbeePermitJoinPreview | ZigbeeReportingPreview;
}

export interface ZigbeeResponse {
  service: {
    id: string;
    name: string;
    moduleId: string;
    mode: string;
    executionBoundary: string;
    defaultPermitJoinId: string;
    defaultCommandId: string;
    defaultReportingId: string;
    rule: string;
  };
  featureModule: { moduleId: string; state: string; buildStrategy: string; enabledBy: string[]; buildArtifacts: string[] };
  coordinator: ZigbeeCoordinator;
  module: ModuleDefinition | null;
  summary: ZigbeeSummary;
  meshRoutes: ZigbeeMeshRoute[];
  deviceBindings: ZigbeeDeviceBinding[];
  permitJoinProfiles: ZigbeePermitJoinProfile[];
  reportingProfiles: ZigbeeReportingProfile[];
  commandProfiles: ZigbeeCommandProfile[];
  healthSamples: Array<{ id: string; coordinatorId: string; status: string; pairedDevices: number; healthyRoutes: number; watchRoutes: number; averageLqi: number; lowBatteryDevices: number; staleDevices: number }>;
  policies: Array<{ id: string; name: string; risk: string; requiresApproval: boolean; message: string }>;
  intentRecipes: Array<{ id: string; name: string; keywords: string[]; commandId?: string; permitJoinId?: string; reportingId?: string; confidence: number; exampleIntent: string }>;
  recentZigbeeRuns: Array<{ id: string; commandId: string; bindingId: string; status: string; actor: string; summary: string }>;
  rule: string;
}

export type CommandCentreWorkspaceId = "modules" | "devices" | "automations" | "lighting" | "climate" | "security" | "water" | "energy" | "sensing" | "approvals" | "agents" | "risk" | "simulations" | "connectivity" | "identity" | "audit";

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
    manifest?: ModuleManifestResponse;
    builder?: ModuleBuilderResponse;
    marketplace?: ModuleMarketplaceResponse;
    certification?: ModuleCertificationResponse;
    mqttEsphome?: MqttEsphomeResponse;
    matterThread?: MatterThreadResponse;
    zigbee?: ZigbeeResponse;
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
  lighting: LightingDashboardResponse;
  climate: ClimateDashboardResponse;
  security: SecurityDashboardResponse;
  water: WaterDashboardResponse;
  energy: EnergyDashboardResponse;
  sensing: SensingDashboardResponse;
  moduleManifest?: ModuleManifestResponse;
  moduleBuilder?: ModuleBuilderResponse;
  moduleMarketplace?: ModuleMarketplaceResponse;
  moduleCertification?: ModuleCertificationResponse;
  mqttEsphome?: MqttEsphomeResponse;
  matterThread?: MatterThreadResponse;
  zigbee?: ZigbeeResponse;
  approvals: ApprovalQueueResponse;
  agents: {
    orchestrator: McpResponse["orchestrator"];
    tools: McpTool[];
    agents: McpAgent[];
    sessions: McpSession[];
    audit: McpToolCall[];
    summary: McpSummary;
  };
  risk: KraDashboardResponse;
  simulations: SimulationLabResponse;
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
