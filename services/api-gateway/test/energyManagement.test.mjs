import test from "node:test";
import assert from "node:assert/strict";
import { loadAutomationEngine } from "../src/automationEngine.mjs";
import { loadDeviceRegistry } from "../src/deviceRegistry.mjs";
import {
  applyEnergyProfile,
  buildEnergyDashboard,
  loadEnergyManagement,
  previewEnergyIntent,
  previewEnergyProfile,
  summarizeEnergyManagement,
} from "../src/energyManagement.mjs";

const operator = {
  subject: "operator-local",
  name: "Local Operator",
  roles: ["Automation.Operator"],
};

test("energy management package loads assets profiles policies tariffs and forecasts", () => {
  const energy = loadEnergyManagement();
  const summary = summarizeEnergyManagement(energy, loadDeviceRegistry());

  assert.equal(energy.service.moduleId, "energy-solar");
  assert.equal(summary.schemaVersion, "0.1.0");
  assert.equal(summary.assetCount, 1);
  assert.equal(summary.solarInverterCount, 1);
  assert.equal(summary.batteryCount, 1);
  assert.equal(summary.evChargerCount, 1);
  assert.equal(summary.profileCount, 4);
  assert.equal(summary.intentRecipeCount, 4);
  assert.equal(summary.totalSolarWatts, 1860);
});

test("energy dashboard enriches home core with meter solar battery and EV devices", () => {
  const dashboard = buildEnergyDashboard({
    energy: loadEnergyManagement(),
    deviceRegistry: loadDeviceRegistry(),
    automationEngine: loadAutomationEngine(),
  });

  assert.equal(dashboard.featureModule.state, "foundation");
  assert.equal(dashboard.automationRules.length, 1);
  assert.equal(dashboard.assets[0].devices.meter.id, "dev-energy-meter-01");
  assert.equal(dashboard.assets[0].devices.solarInverter.id, "dev-solar-inverter-01");
  assert.equal(dashboard.assets[0].devices.battery.id, "dev-home-battery-01");
  assert.equal(dashboard.assets[0].devices.evCharger.id, "dev-ev-charger-01");
});

test("solar surplus EV preview prepares reserve-aware command evidence", () => {
  const preview = previewEnergyProfile({
    energy: loadEnergyManagement(),
    deviceRegistry: loadDeviceRegistry(),
    automationEngine: loadAutomationEngine(),
    profileId: "profile-solar-surplus-ev",
    actor: operator,
  });

  assert.equal(preview.status, "ready");
  assert.equal(preview.profile.name, "Solar Surplus EV Assist");
  assert.equal(preview.summary.commandCount, 1);
  assert.equal(preview.commands[0].capability, "ev_charger");
  assert.equal(preview.commands[0].selectedPath, "lan");
  assert.equal(preview.commands[0].energyState.solarWatts, 1860);
  assert.ok(preview.policy.criteria.find((criterion) => criterion.id === "battery_reserve_preserved").passed);
});

test("outage critical loads remain approval required and cannot apply directly", () => {
  const preview = previewEnergyProfile({
    energy: loadEnergyManagement(),
    deviceRegistry: loadDeviceRegistry(),
    automationEngine: loadAutomationEngine(),
    profileId: "profile-outage-critical-loads",
    actor: operator,
  });
  const applied = applyEnergyProfile({
    energy: loadEnergyManagement(),
    deviceRegistry: loadDeviceRegistry(),
    automationEngine: loadAutomationEngine(),
    profileId: "profile-outage-critical-loads",
    actor: operator,
  });

  assert.equal(preview.status, "approval_required");
  assert.equal(preview.policy.canApply, false);
  assert.equal(preview.commands[0].capability, "critical_load");
  assert.ok(preview.nextActions.includes("attach_simulation_evidence"));
  assert.equal(applied.event.action, "energy.profile.apply.blocked");
});

test("energy intent preview selects battery reserve guard", () => {
  const result = previewEnergyIntent({
    energy: loadEnergyManagement(),
    deviceRegistry: loadDeviceRegistry(),
    automationEngine: loadAutomationEngine(),
    intent: "Hold EV charging if the battery reserve is at risk.",
    actor: operator,
  });

  assert.equal(result.match.profileId, "profile-battery-reserve-guard");
  assert.equal(result.preview.profile.id, "profile-battery-reserve-guard");
  assert.equal(result.preview.commands[0].action, "hold_ev_charge");
});
