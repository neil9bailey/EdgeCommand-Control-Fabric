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
