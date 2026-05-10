import fallbackCatalog from "../../../packages/module-catalog/catalog.json";
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
  DeviceRegistryResponse,
  EnergyDashboardResponse,
  EnergyIntentPreview,
  EnergyPreview,
  EventLedgerResponse,
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
  ModuleMarketplaceIntentPreview,
  ModuleMarketplacePreview,
  ModuleMarketplaceResponse,
  McpResponse,
  ModuleManifestResponse,
  ModuleManifestIntentPreview,
  ModuleCatalog,
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
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3101";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchCatalog(): Promise<ModuleCatalog> {
  try {
    const response = await getJson<{ product: ModuleCatalog["product"]; categories: string[]; modules: ModuleCatalog["modules"] }>("/api/modules");
    return {
      product: response.product,
      categories: response.categories,
      modules: response.modules,
    };
  } catch {
    return fallbackCatalog as ModuleCatalog;
  }
}

export async function fetchOverview(): Promise<PlatformOverview | null> {
  try {
    return await getJson<PlatformOverview>("/api/platform/overview");
  } catch {
    return null;
  }
}

export async function fetchCommandCentre(): Promise<CommandCentreResponse | null> {
  try {
    return await getJson<CommandCentreResponse>("/api/command-centre");
  } catch {
    return null;
  }
}

export async function fetchMcp(): Promise<McpResponse | null> {
  try {
    return await getJson<McpResponse>("/api/mcp");
  } catch {
    return null;
  }
}

export async function fetchKra(): Promise<KraDashboardResponse | null> {
  try {
    return await getJson<KraDashboardResponse>("/api/kra");
  } catch {
    return null;
  }
}

export async function fetchSimulationLab(): Promise<SimulationLabResponse | null> {
  try {
    return await getJson<SimulationLabResponse>("/api/simulations");
  } catch {
    return null;
  }
}

export async function fetchAuthStatus(): Promise<AuthStatus | null> {
  try {
    return await getJson<AuthStatus>("/auth/status");
  } catch {
    return null;
  }
}

export async function fetchNarrowbandRoutes(): Promise<NarrowbandRoutes | null> {
  try {
    return await getJson<NarrowbandRoutes>("/api/narrowband/routes");
  } catch {
    return null;
  }
}

export async function fetchDevices(): Promise<DeviceRegistryResponse | null> {
  try {
    return await getJson<DeviceRegistryResponse>("/api/devices");
  } catch {
    return null;
  }
}

export async function fetchEvents(): Promise<EventLedgerResponse | null> {
  try {
    return await getJson<EventLedgerResponse>("/api/events");
  } catch {
    return null;
  }
}

export async function fetchAutomations(): Promise<AutomationResponse | null> {
  try {
    return await getJson<AutomationResponse>("/api/automations");
  } catch {
    return null;
  }
}

export async function fetchApprovals(): Promise<ApprovalQueueResponse | null> {
  try {
    return await getJson<ApprovalQueueResponse>("/api/approvals");
  } catch {
    return null;
  }
}

export async function fetchLighting(): Promise<LightingDashboardResponse | null> {
  try {
    return await getJson<LightingDashboardResponse>("/api/lighting");
  } catch {
    return null;
  }
}

export async function fetchClimate(): Promise<ClimateDashboardResponse | null> {
  try {
    return await getJson<ClimateDashboardResponse>("/api/climate");
  } catch {
    return null;
  }
}

export async function fetchSecurity(): Promise<SecurityDashboardResponse | null> {
  try {
    return await getJson<SecurityDashboardResponse>("/api/security");
  } catch {
    return null;
  }
}

export async function fetchWater(): Promise<WaterDashboardResponse | null> {
  try {
    return await getJson<WaterDashboardResponse>("/api/water");
  } catch {
    return null;
  }
}

export async function fetchEnergy(): Promise<EnergyDashboardResponse | null> {
  try {
    return await getJson<EnergyDashboardResponse>("/api/energy");
  } catch {
    return null;
  }
}

export async function fetchSensing(): Promise<SensingDashboardResponse | null> {
  try {
    return await getJson<SensingDashboardResponse>("/api/sensing");
  } catch {
    return null;
  }
}

export async function fetchModuleManifest(): Promise<ModuleManifestResponse | null> {
  try {
    return await getJson<ModuleManifestResponse>("/api/module-manifest");
  } catch {
    return null;
  }
}

export async function fetchModuleBuilder(): Promise<ModuleBuilderResponse | null> {
  try {
    return await getJson<ModuleBuilderResponse>("/api/module-builder");
  } catch {
    return null;
  }
}

export async function fetchModuleMarketplace(): Promise<ModuleMarketplaceResponse | null> {
  try {
    return await getJson<ModuleMarketplaceResponse>("/api/module-marketplace");
  } catch {
    return null;
  }
}

export async function fetchModuleCertification(): Promise<ModuleCertificationResponse | null> {
  try {
    return await getJson<ModuleCertificationResponse>("/api/module-certification");
  } catch {
    return null;
  }
}

export async function previewLightingScene(sceneId: string): Promise<LightingScenePreview> {
  const response = await fetch(`${API_BASE}/api/lighting/scenes/${sceneId}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<LightingScenePreview>;
}

export async function applyLightingScene(sceneId: string): Promise<LightingScenePreview> {
  const response = await fetch(`${API_BASE}/api/lighting/scenes/${sceneId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<LightingScenePreview>;
}

export async function previewLightingIntent(intent: string): Promise<LightingIntentPreview> {
  const response = await fetch(`${API_BASE}/api/lighting/intent/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<LightingIntentPreview>;
}

export async function previewClimateProfile(profileId: string): Promise<ClimatePreview> {
  const response = await fetch(`${API_BASE}/api/climate/profiles/${profileId}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<ClimatePreview>;
}

export async function applyClimateProfile(profileId: string): Promise<ClimatePreview> {
  const response = await fetch(`${API_BASE}/api/climate/profiles/${profileId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<ClimatePreview>;
}

export async function previewClimateSetpoint(
  zoneId: string,
  setpointC: number,
  mode = "heat",
  holdMinutes = 60,
): Promise<ClimatePreview> {
  const response = await fetch(`${API_BASE}/api/climate/zones/${zoneId}/setpoint/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ setpointC, mode, holdMinutes }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<ClimatePreview>;
}

export async function previewClimateIntent(intent: string): Promise<ClimateIntentPreview> {
  const response = await fetch(`${API_BASE}/api/climate/intent/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<ClimateIntentPreview>;
}

export async function previewSecurityProfile(profileId: string): Promise<SecurityPreview> {
  const response = await fetch(`${API_BASE}/api/security/profiles/${profileId}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<SecurityPreview>;
}

export async function applySecurityProfile(profileId: string): Promise<SecurityPreview> {
  const response = await fetch(`${API_BASE}/api/security/profiles/${profileId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<SecurityPreview>;
}

export async function previewSecurityUnlock(accessPointId: string): Promise<SecurityPreview> {
  const response = await fetch(`${API_BASE}/api/security/access-points/${accessPointId}/command/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "unlock", desiredState: { locked: false } }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<SecurityPreview>;
}

export async function previewSecurityIntent(intent: string): Promise<SecurityIntentPreview> {
  const response = await fetch(`${API_BASE}/api/security/intent/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<SecurityIntentPreview>;
}

export async function previewWaterProfile(profileId: string): Promise<WaterPreview> {
  const response = await fetch(`${API_BASE}/api/water/profiles/${profileId}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<WaterPreview>;
}

export async function applyWaterProfile(profileId: string): Promise<WaterPreview> {
  const response = await fetch(`${API_BASE}/api/water/profiles/${profileId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<WaterPreview>;
}

export async function previewWaterIntent(intent: string): Promise<WaterIntentPreview> {
  const response = await fetch(`${API_BASE}/api/water/intent/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<WaterIntentPreview>;
}

export async function previewEnergyProfile(profileId: string): Promise<EnergyPreview> {
  const response = await fetch(`${API_BASE}/api/energy/profiles/${profileId}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<EnergyPreview>;
}

export async function applyEnergyProfile(profileId: string): Promise<EnergyPreview> {
  const response = await fetch(`${API_BASE}/api/energy/profiles/${profileId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<EnergyPreview>;
}

export async function previewEnergyIntent(intent: string): Promise<EnergyIntentPreview> {
  const response = await fetch(`${API_BASE}/api/energy/intent/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<EnergyIntentPreview>;
}

export async function previewSensingProfile(profileId: string): Promise<SensingPreview> {
  const response = await fetch(`${API_BASE}/api/sensing/profiles/${profileId}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<SensingPreview>;
}

export async function previewSensingIntent(intent: string): Promise<SensingIntentPreview> {
  const response = await fetch(`${API_BASE}/api/sensing/intent/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<SensingIntentPreview>;
}

export async function previewModuleFlag(moduleId: string): Promise<ModuleFlagPreview> {
  const response = await fetch(`${API_BASE}/api/module-manifest/flags/${moduleId}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<ModuleFlagPreview>;
}

export async function previewModuleManifestIntent(intent: string): Promise<ModuleManifestIntentPreview> {
  const response = await fetch(`${API_BASE}/api/module-manifest/intent/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<ModuleManifestIntentPreview>;
}

export async function previewModuleBuildPlan(planId: string): Promise<ModuleBuildPreview> {
  const response = await fetch(`${API_BASE}/api/module-builder/plans/${planId}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<ModuleBuildPreview>;
}

export async function previewModuleBuildIntent(intent: string): Promise<ModuleBuildIntentPreview> {
  const response = await fetch(`${API_BASE}/api/module-builder/intent/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<ModuleBuildIntentPreview>;
}

export async function previewMarketplaceRequest(requestId: string): Promise<ModuleMarketplacePreview> {
  const response = await fetch(`${API_BASE}/api/module-marketplace/requests/${requestId}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<ModuleMarketplacePreview>;
}

export async function previewMarketplaceIntent(intent: string): Promise<ModuleMarketplaceIntentPreview> {
  const response = await fetch(`${API_BASE}/api/module-marketplace/intent/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<ModuleMarketplaceIntentPreview>;
}

export async function previewCertificationProfile(profileId: string): Promise<ModuleCertificationPreview> {
  const response = await fetch(`${API_BASE}/api/module-certification/profiles/${profileId}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<ModuleCertificationPreview>;
}

export async function previewCertificationIntent(intent: string): Promise<ModuleCertificationIntentPreview> {
  const response = await fetch(`${API_BASE}/api/module-certification/intent/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<ModuleCertificationIntentPreview>;
}

export async function recordApprovalDecision(
  approvalId: string,
  decision: "approve" | "reject" | "request_changes",
  note = "",
): Promise<ApprovalDecisionResponse> {
  const response = await fetch(`${API_BASE}/api/approvals/${approvalId}/decisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, note }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<ApprovalDecisionResponse>;
}

export async function runAutomationScenario(scenarioId: string): Promise<AutomationEvaluation> {
  const response = await fetch(`${API_BASE}/api/automations/scenarios/${scenarioId}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<AutomationEvaluation>;
}

export async function runSimulationScenario(scenarioId: string, variantId?: string): Promise<SimulationReport> {
  const response = await fetch(`${API_BASE}/api/simulations/scenarios/${scenarioId}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ variantId }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<SimulationReport>;
}

export async function proposeIntent(intent: string): Promise<IntentProposalResponse> {
  const response = await fetch(`${API_BASE}/api/intent/propose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<IntentProposalResponse>;
}

export async function recordIntentDecision(
  sessionId: string,
  proposalId: string,
  decision: "accept" | "modify" | "reject",
  note = "",
): Promise<IntentDecisionResponse> {
  const response = await fetch(`${API_BASE}/api/intent/sessions/${sessionId}/decisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proposalId, decision, note }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<IntentDecisionResponse>;
}
