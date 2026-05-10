import fallbackCatalog from "../../../packages/module-catalog/catalog.json";
import type {
  AuthStatus,
  ApprovalQueueResponse,
  AutomationEvaluation,
  AutomationResponse,
  CommandCentreResponse,
  DeviceRegistryResponse,
  EventLedgerResponse,
  IntentDecisionResponse,
  IntentProposalResponse,
  KraDashboardResponse,
  McpResponse,
  ModuleCatalog,
  NarrowbandRoutes,
  PlatformOverview,
  SimulationLabResponse,
  SimulationReport,
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
