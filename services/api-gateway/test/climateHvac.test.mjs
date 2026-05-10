import test from "node:test";
import assert from "node:assert/strict";
import { loadDeviceRegistry } from "../src/deviceRegistry.mjs";
import {
  applyClimateProfile,
  applyClimateSetpoint,
  buildClimateDashboard,
  loadClimateHvac,
  previewClimateIntent,
  previewClimateProfile,
  previewClimateSetpoint,
  summarizeClimateHvac,
} from "../src/climateHvac.mjs";

const operator = {
  subject: "operator-local",
  name: "Local Operator",
  roles: ["Automation.Operator"],
};

test("climate HVAC package loads zones profiles schedules and intent recipes", () => {
  const climate = loadClimateHvac();
  const summary = summarizeClimateHvac(climate, loadDeviceRegistry());

  assert.equal(climate.service.moduleId, "climate-hvac");
  assert.equal(summary.schemaVersion, "0.1.0");
  assert.equal(summary.zoneCount, 4);
  assert.equal(summary.controllableZoneCount, 3);
  assert.equal(summary.onlineThermostatCount, 3);
  assert.equal(summary.profileCount, 4);
  assert.equal(summary.enabledProfileCount, 4);
  assert.equal(summary.intentRecipeCount, 3);
});

test("climate dashboard enriches zones with thermostat state", () => {
  const dashboard = buildClimateDashboard({
    climate: loadClimateHvac(),
    deviceRegistry: loadDeviceRegistry(),
  });

  assert.equal(dashboard.summary.enabledScheduleCount, 2);
  assert.ok(dashboard.zones.some((zone) => zone.id === "climate-zone-living" && zone.controllable));
  assert.ok(dashboard.zones.some((zone) => zone.id === "climate-zone-utility" && !zone.controllable));
  assert.equal(dashboard.featureModule.state, "foundation");
});

test("climate profile preview builds safe setpoint command plan", () => {
  const preview = previewClimateProfile({
    climate: loadClimateHvac(),
    deviceRegistry: loadDeviceRegistry(),
    profileId: "profile-evening-comfort",
    actor: operator,
  });

  assert.equal(preview.status, "ready");
  assert.equal(preview.profile.name, "Evening Comfort");
  assert.equal(preview.summary.commandCount, 3);
  assert.equal(preview.summary.blockedCount, 0);
  assert.equal(preview.policy.canApply, true);
  assert.ok(preview.policy.criteria.every((criterion) => criterion.passed));
  assert.ok(preview.commands.every((command) => command.status === "ready_to_execute"));
  assert.equal(preview.event.action, "climate.profile.previewed");
});

test("climate profile apply returns simulated execution commands", () => {
  const applied = applyClimateProfile({
    climate: loadClimateHvac(),
    deviceRegistry: loadDeviceRegistry(),
    profileId: "profile-comfort-morning",
    actor: operator,
  });

  assert.equal(applied.status, "executed_simulated");
  assert.equal(applied.applyAttempted, true);
  assert.ok(applied.commands.every((command) => command.status === "executed_simulated"));
  assert.ok(applied.nextActions.includes("refresh_climate_state"));
  assert.equal(applied.event.action, "climate.profile.applied");
});

test("unsafe climate setpoint is blocked before apply", () => {
  const preview = previewClimateSetpoint({
    climate: loadClimateHvac(),
    deviceRegistry: loadDeviceRegistry(),
    zoneId: "climate-zone-hall",
    setpointC: 29,
    mode: "heat",
    actor: operator,
  });
  const applied = applyClimateSetpoint({
    climate: loadClimateHvac(),
    deviceRegistry: loadDeviceRegistry(),
    zoneId: "climate-zone-hall",
    setpointC: 29,
    mode: "heat",
    actor: operator,
  });

  assert.equal(preview.status, "blocked");
  assert.equal(preview.policy.canApply, false);
  assert.ok(preview.commands[0].policyReasons.includes("unsafe_setpoint"));
  assert.equal(applied.status, "blocked");
  assert.equal(applied.event.action, "climate.setpoint.apply.blocked");
});

test("climate intent preview selects matching comfort profile", () => {
  const result = previewClimateIntent({
    climate: loadClimateHvac(),
    deviceRegistry: loadDeviceRegistry(),
    intent: "Make the house warm and comfortable for the evening.",
    actor: operator,
  });

  assert.equal(result.match.profileId, "profile-evening-comfort");
  assert.equal(result.preview.profile.id, "profile-evening-comfort");
  assert.equal(result.preview.summary.commandCount, 3);
});
