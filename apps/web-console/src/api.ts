import fallbackCatalog from "../../../packages/module-catalog/catalog.json";
import type {
  AuthStatus,
  DeviceRegistryResponse,
  EventLedgerResponse,
  IntentProposalResponse,
  ModuleCatalog,
  NarrowbandRoutes,
  PlatformOverview,
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

export async function proposeIntent(intent: string): Promise<IntentProposalResponse> {
  const response = await fetch(`${API_BASE}/api/intent/propose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<IntentProposalResponse>;
}
