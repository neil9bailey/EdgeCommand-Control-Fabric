import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const registryPath = resolve(here, "../../../packages/device-registry/registry.json");

export function loadDeviceRegistry() {
  return JSON.parse(readFileSync(registryPath, "utf8"));
}

export function findDevice(registry, id) {
  return (registry.devices || []).find((device) => device.id === id);
}

export function filterDevices(registry, filters = {}) {
  return (registry.devices || []).filter((device) => {
    if (filters.siteId && device.siteId !== filters.siteId) return false;
    if (filters.zoneId && device.zoneId !== filters.zoneId) return false;
    if (filters.status && device.status !== filters.status) return false;
    if (filters.adapter && device.adapter !== filters.adapter) return false;
    if (filters.capability && !(device.capabilities || []).includes(filters.capability)) return false;
    if (filters.narrowbandEligible === "true" && !device.narrowbandEligible) return false;
    if (filters.narrowbandEligible === "false" && device.narrowbandEligible) return false;
    return true;
  });
}

export function summarizeDeviceRegistry(registry = loadDeviceRegistry()) {
  const devices = registry.devices || [];
  const byStatus = {};
  const byAdapter = {};
  const bySite = {};
  const capabilityUse = {};
  let highRiskDevices = 0;
  let narrowbandEligible = 0;

  const capabilityRisk = new Map((registry.capabilityDefinitions || []).map((cap) => [cap.id, cap.risk]));

  for (const device of devices) {
    byStatus[device.status] = (byStatus[device.status] || 0) + 1;
    byAdapter[device.adapter] = (byAdapter[device.adapter] || 0) + 1;
    bySite[device.siteId] = (bySite[device.siteId] || 0) + 1;
    if (device.narrowbandEligible) narrowbandEligible += 1;
    if ((device.capabilities || []).some((cap) => capabilityRisk.get(cap) === "high")) highRiskDevices += 1;
    for (const cap of device.capabilities || []) {
      capabilityUse[cap] = (capabilityUse[cap] || 0) + 1;
    }
  }

  return {
    schemaVersion: registry.schemaVersion,
    siteCount: (registry.sites || []).length,
    zoneCount: (registry.zones || []).length,
    deviceCount: devices.length,
    capabilityCount: (registry.capabilityDefinitions || []).length,
    highRiskDevices,
    narrowbandEligible,
    byStatus,
    byAdapter,
    bySite,
    capabilityUse,
  };
}

