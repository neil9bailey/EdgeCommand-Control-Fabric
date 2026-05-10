import test from "node:test";
import assert from "node:assert/strict";
import {
  filterEvents,
  loadEventLedger,
  summarizeEventLedger,
  summarizeTelemetry,
} from "../src/eventLedger.mjs";

test("event ledger loads cross-stream operational events", () => {
  const ledger = loadEventLedger();
  const summary = summarizeEventLedger(ledger);

  assert.equal(summary.schemaVersion, "0.1.0");
  assert.ok(summary.eventCount >= 18);
  assert.ok(summary.byStream.telemetry >= 6);
  assert.ok(summary.byStream.command >= 3);
  assert.ok(summary.byStream.audit >= 3);
  assert.ok(summary.byStream.agent >= 2);
  assert.ok(summary.byStream.policy >= 2);
  assert.ok(summary.byTrafficClass.P0_EMERGENCY >= 4);
  assert.ok(summary.auditRequired >= 10);
  assert.ok(summary.pendingApprovals >= 2);
});

test("event ledger supports module, stream, severity, and audit filters", () => {
  const ledger = loadEventLedger();

  const commandEvents = filterEvents(ledger, { stream: "command" });
  assert.ok(commandEvents.length >= 3);
  assert.ok(commandEvents.every((event) => event.stream === "command"));

  const waterEvents = filterEvents(ledger, { moduleId: "water-management" });
  assert.ok(waterEvents.length >= 5);
  assert.ok(waterEvents.every((event) => event.moduleId === "water-management"));

  const criticalEvents = filterEvents(ledger, { severity: "critical" });
  assert.equal(criticalEvents.length, 1);
  assert.equal(criticalEvents[0].trafficClass, "P0_EMERGENCY");

  const auditEvents = filterEvents(ledger, { auditRequired: "true" });
  assert.ok(auditEvents.length >= 10);
  assert.ok(auditEvents.every((event) => event.auditRequired === true));
});

test("telemetry summary exposes degraded links and recent observations", () => {
  const ledger = loadEventLedger();
  const telemetry = summarizeTelemetry(ledger);

  assert.ok(telemetry.telemetryCount >= 6);
  assert.ok(telemetry.bySite["home-hq"] >= 3);
  assert.ok(telemetry.bySite["remote-cottage"] >= 2);
  assert.equal(telemetry.degradedLinkCount, 1);
  assert.equal(telemetry.degradedLinks[0].moduleId, "narrowband-control-plane");
  assert.ok(telemetry.recent[0].timestamp >= telemetry.recent.at(-1).timestamp);
});
