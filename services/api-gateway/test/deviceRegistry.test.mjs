import test from "node:test";
import assert from "node:assert/strict";
import {
  filterDevices,
  findDevice,
  loadDeviceRegistry,
  summarizeDeviceRegistry,
} from "../src/deviceRegistry.mjs";

test("device registry loads sites, zones, capabilities, and devices", () => {
  const registry = loadDeviceRegistry();
  const summary = summarizeDeviceRegistry(registry);

  assert.equal(summary.schemaVersion, "0.1.0");
  assert.equal(summary.siteCount, 2);
  assert.ok(summary.zoneCount >= 8);
  assert.ok(summary.capabilityCount >= 16);
  assert.ok(summary.deviceCount >= 14);
  assert.ok(summary.highRiskDevices >= 6);
  assert.ok(summary.narrowbandEligible >= 6);
});

test("registry supports capability and site filters", () => {
  const registry = loadDeviceRegistry();

  const waterValves = filterDevices(registry, { capability: "water_valve" });
  assert.equal(waterValves.length, 2);
  assert.ok(waterValves.every((device) => device.capabilities.includes("water_valve")));

  const remoteDevices = filterDevices(registry, { siteId: "remote-cottage" });
  assert.equal(remoteDevices.length, 5);
  assert.ok(remoteDevices.every((device) => device.siteId === "remote-cottage"));
});

test("registry finds hero scenario devices", () => {
  const registry = loadDeviceRegistry();
  const gateway = findDevice(registry, "dev-cottage-gateway-01");
  const valve = findDevice(registry, "dev-cottage-valve-01");

  assert.equal(gateway.observedState.lorawan, "ready");
  assert.equal(valve.narrowbandEligible, true);
  assert.equal(valve.desiredState.position, "open");
});
