import test from "node:test";
import assert from "node:assert/strict";
import { loadDeviceRegistry } from "../src/deviceRegistry.mjs";
import {
  buildSensingDashboard,
  loadSensingPresence,
  previewSensingIntent,
  previewSensingProfile,
  summarizeSensingPresence,
} from "../src/sensingPresence.mjs";

const operator = {
  subject: "operator-local",
  name: "Local Operator",
  roles: ["Automation.Operator"],
};

test("sensing package loads zones profiles policies and recipes", () => {
  const sensing = loadSensingPresence();
  const summary = summarizeSensingPresence(sensing, loadDeviceRegistry());

  assert.equal(sensing.service.moduleId, "occupancy-presence");
  assert.equal(summary.schemaVersion, "0.1.0");
  assert.equal(summary.zoneCount, 3);
  assert.equal(summary.occupancySensorCount, 3);
  assert.equal(summary.presenceSensorCount, 1);
  assert.equal(summary.airQualitySensorCount, 1);
  assert.equal(summary.profileCount, 4);
  assert.equal(summary.intentRecipeCount, 4);
});

test("sensing dashboard enriches zones with occupancy presence and air quality", () => {
  const dashboard = buildSensingDashboard({
    sensing: loadSensingPresence(),
    deviceRegistry: loadDeviceRegistry(),
  });

  assert.equal(dashboard.featureModule.state, "foundation");
  assert.ok(dashboard.zones.some((zone) => zone.id === "presence-zone-living" && zone.devices.occupancy));
  assert.ok(dashboard.zones.some((zone) => zone.id === "presence-zone-living" && zone.devices.airQuality));
  assert.ok(dashboard.zones.some((zone) => zone.id === "presence-zone-bedroom" && zone.privacyMode === "strict"));
});

test("room aware comfort preview attaches privacy and environmental evidence", () => {
  const preview = previewSensingProfile({
    sensing: loadSensingPresence(),
    deviceRegistry: loadDeviceRegistry(),
    profileId: "profile-room-aware-comfort",
    actor: operator,
  });

  assert.equal(preview.status, "ready");
  assert.equal(preview.profile.name, "Room Aware Comfort");
  assert.equal(preview.summary.commandCount, 1);
  assert.equal(preview.commands[0].observedState.occupied, true);
  assert.equal(preview.commands[0].observedState.co2Ppm, 612);
  assert.ok(preview.policy.criteria.find((criterion) => criterion.id === "privacy_respected").passed);
});

test("privacy hold remains approval required", () => {
  const preview = previewSensingProfile({
    sensing: loadSensingPresence(),
    deviceRegistry: loadDeviceRegistry(),
    profileId: "profile-privacy-hold",
    actor: operator,
  });

  assert.equal(preview.status, "approval_required");
  assert.equal(preview.policy.canApply, false);
  assert.equal(preview.commands[0].policyDecision, "approval_required");
  assert.ok(preview.nextActions.includes("request_privacy_review"));
});

test("sensing intent preview selects air quality response", () => {
  const result = previewSensingIntent({
    sensing: loadSensingPresence(),
    deviceRegistry: loadDeviceRegistry(),
    intent: "If CO2 or VOC rises, recommend ventilation using room presence evidence.",
    actor: operator,
  });

  assert.equal(result.match.profileId, "profile-air-quality-response");
  assert.equal(result.preview.profile.id, "profile-air-quality-response");
  assert.equal(result.preview.commands[0].capability, "air_quality");
});
