import test from "node:test";
import assert from "node:assert/strict";
import { loadDeviceRegistry } from "../src/deviceRegistry.mjs";
import {
  applyLightingScene,
  buildLightingDashboard,
  loadLightingScenes,
  previewLightingIntent,
  previewLightingScene,
  summarizeLightingScenes,
} from "../src/lightingScenes.mjs";

const operator = {
  subject: "operator-local",
  name: "Local Operator",
  roles: ["Automation.Operator"],
};

test("lighting scenes package loads zones fixtures scenes schedules and intent recipes", () => {
  const lighting = loadLightingScenes();
  const summary = summarizeLightingScenes(lighting, loadDeviceRegistry());

  assert.equal(lighting.service.moduleId, "lighting-scenes");
  assert.equal(summary.schemaVersion, "0.1.0");
  assert.equal(summary.zoneCount, 4);
  assert.equal(summary.fixtureCount, 4);
  assert.equal(summary.onlineFixtureCount, 4);
  assert.equal(summary.sceneCount, 4);
  assert.equal(summary.enabledSceneCount, 4);
  assert.equal(summary.intentRecipeCount, 3);
});

test("lighting dashboard enriches zones with fixture device state", () => {
  const dashboard = buildLightingDashboard({
    lighting: loadLightingScenes(),
    deviceRegistry: loadDeviceRegistry(),
  });

  assert.equal(dashboard.summary.enabledScheduleCount, 2);
  assert.ok(dashboard.zones.some((zone) => zone.zoneId === "kitchen" && zone.onlineFixtures === 1));
  assert.ok(dashboard.fixtures.every((fixture) => fixture.status === "online"));
  assert.equal(dashboard.featureModule.state, "foundation");
});

test("scene preview builds low-risk command plan without execution", () => {
  const preview = previewLightingScene({
    lighting: loadLightingScenes(),
    deviceRegistry: loadDeviceRegistry(),
    sceneId: "scene-evening-wind-down",
    actor: operator,
  });

  assert.equal(preview.status, "ready");
  assert.equal(preview.scene.name, "Evening Wind Down");
  assert.equal(preview.summary.commandCount, 3);
  assert.equal(preview.summary.blockedCount, 0);
  assert.equal(preview.policy.canApply, true);
  assert.ok(preview.policy.criteria.every((criterion) => criterion.passed));
  assert.ok(preview.commands.every((command) => command.status === "ready_to_execute"));
  assert.equal(preview.event.action, "lighting.scene.previewed");
});

test("scene apply returns simulated execution commands and audit event", () => {
  const applied = applyLightingScene({
    lighting: loadLightingScenes(),
    deviceRegistry: loadDeviceRegistry(),
    sceneId: "scene-night-path",
    actor: operator,
  });

  assert.equal(applied.status, "executed_simulated");
  assert.equal(applied.applyAttempted, true);
  assert.ok(applied.commands.every((command) => command.status === "executed_simulated"));
  assert.ok(applied.nextActions.includes("refresh_observed_state"));
  assert.equal(applied.event.action, "lighting.scene.applied");
});

test("lighting intent preview selects the matching scene recipe", () => {
  const result = previewLightingIntent({
    lighting: loadLightingScenes(),
    deviceRegistry: loadDeviceRegistry(),
    intent: "Make the kitchen bright for cooking.",
    actor: operator,
  });

  assert.equal(result.match.sceneId, "scene-cooking-focus");
  assert.equal(result.preview.scene.id, "scene-cooking-focus");
  assert.equal(result.preview.summary.commandCount, 2);
});
