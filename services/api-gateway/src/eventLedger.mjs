import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ledgerPath = resolve(here, "../../../packages/event-ledger/events.json");

export function loadEventLedger() {
  return JSON.parse(readFileSync(ledgerPath, "utf8"));
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function matchesStringFilter(event, filters, key) {
  const value = first(filters[key]);
  if (!value) return true;
  return event[key] === value;
}

function matchesAuditFilter(event, value) {
  if (value === undefined) return true;
  const normalized = String(first(value)).toLowerCase();
  if (normalized === "true") return event.auditRequired === true;
  if (normalized === "false") return event.auditRequired === false;
  return true;
}

export function filterEvents(ledger, filters = {}) {
  const events = ledger.events || [];
  const filtered = events.filter((event) => {
    if (!matchesStringFilter(event, filters, "stream")) return false;
    if (!matchesStringFilter(event, filters, "severity")) return false;
    if (!matchesStringFilter(event, filters, "siteId")) return false;
    if (!matchesStringFilter(event, filters, "zoneId")) return false;
    if (!matchesStringFilter(event, filters, "deviceId")) return false;
    if (!matchesStringFilter(event, filters, "moduleId")) return false;
    if (!matchesStringFilter(event, filters, "status")) return false;
    if (!matchesStringFilter(event, filters, "trafficClass")) return false;
    if (!matchesAuditFilter(event, filters.auditRequired)) return false;
    return true;
  });

  const limit = Number(first(filters.limit) || filtered.length);
  return [...filtered]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, Number.isFinite(limit) && limit > 0 ? limit : filtered.length);
}

export function summarizeEventLedger(ledger = loadEventLedger()) {
  const events = ledger.events || [];
  const byStream = {};
  const bySeverity = {};
  const byStatus = {};
  const byTrafficClass = {};
  const byModule = {};
  let auditRequired = 0;
  let commandCount = 0;
  let telemetryCount = 0;
  let pendingApprovals = 0;
  let criticalCount = 0;
  let latestTimestamp = null;

  for (const event of events) {
    byStream[event.stream] = (byStream[event.stream] || 0) + 1;
    bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
    byStatus[event.status] = (byStatus[event.status] || 0) + 1;
    byTrafficClass[event.trafficClass] = (byTrafficClass[event.trafficClass] || 0) + 1;
    byModule[event.moduleId] = (byModule[event.moduleId] || 0) + 1;

    if (event.auditRequired) auditRequired += 1;
    if (event.stream === "command") commandCount += 1;
    if (event.stream === "telemetry") telemetryCount += 1;
    if (event.status === "pending_approval" || event.action === "approval.pending") pendingApprovals += 1;
    if (event.severity === "critical" || event.trafficClass === "P0_EMERGENCY") criticalCount += 1;
    if (!latestTimestamp || new Date(event.timestamp) > new Date(latestTimestamp)) latestTimestamp = event.timestamp;
  }

  return {
    schemaVersion: ledger.schemaVersion,
    eventCount: events.length,
    auditRequired,
    commandCount,
    telemetryCount,
    pendingApprovals,
    criticalCount,
    latestTimestamp,
    byStream,
    bySeverity,
    byStatus,
    byTrafficClass,
    byModule,
  };
}

export function summarizeTelemetry(ledger = loadEventLedger()) {
  const telemetry = filterEvents(ledger, { stream: "telemetry" });
  const bySite = {};
  const byDevice = {};
  const degradedLinks = [];

  for (const event of telemetry) {
    bySite[event.siteId] = (bySite[event.siteId] || 0) + 1;
    if (event.deviceId) byDevice[event.deviceId] = (byDevice[event.deviceId] || 0) + 1;
    if (event.status === "degraded" || event.action === "telemetry.link.degraded") {
      degradedLinks.push(event);
    }
  }

  return {
    telemetryCount: telemetry.length,
    latestTimestamp: telemetry[0]?.timestamp || null,
    bySite,
    byDevice,
    degradedLinkCount: degradedLinks.length,
    degradedLinks: degradedLinks.slice(0, 5),
    recent: telemetry.slice(0, 8),
  };
}
