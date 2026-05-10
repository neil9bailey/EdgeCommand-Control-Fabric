import test from "node:test";
import assert from "node:assert/strict";
import { loadCatalog } from "../src/catalog.mjs";
import {
  buildModuleManifestDashboard,
  loadModuleManifest,
  previewModuleFlag,
  previewModuleIntent,
  summarizeModuleManifest,
} from "../src/moduleManifest.mjs";

test("module manifest summarizes feature flags against the catalog", () => {
  const catalog = loadCatalog();
  const manifest = loadModuleManifest();
  const summary = summarizeModuleManifest(manifest, catalog);

  assert.equal(manifest.service.moduleId, "module-marketplace");
  assert.ok(summary.flagCount >= 9);
  assert.ok(summary.enabled >= 6);
  assert.ok(summary.buildable >= 1);
  assert.ok(summary.catalogCoverage.percent > 0);
  assert.equal(summary.byState.enabled, 6);
});

test("module manifest dashboard resolves dependency and artifact readiness", () => {
  const dashboard = buildModuleManifestDashboard({
    manifest: loadModuleManifest(),
    catalog: loadCatalog(),
  });
  const mqtt = dashboard.flags.find((flag) => flag.moduleId === "mqtt-esphome");
  const lorawan = dashboard.flags.find((flag) => flag.moduleId === "lorawan-adapter");

  assert.equal(dashboard.featureModule.state, "foundation");
  assert.equal(mqtt.readiness.status, "buildable");
  assert.equal(mqtt.readiness.canBuild, true);
  assert.equal(lorawan.readiness.requiresApproval, true);
  assert.ok(dashboard.uncoveredCatalogModules.length > 0);
});

test("module flag preview creates a governed build plan", () => {
  const result = previewModuleFlag({
    manifest: loadModuleManifest(),
    catalog: loadCatalog(),
    moduleId: "mqtt-esphome",
    actor: { subject: "tester", name: "Tester", roles: ["Automation.Admin"] },
  });

  assert.equal(result.flag.moduleId, "mqtt-esphome");
  assert.equal(result.status, "buildable");
  assert.equal(result.summary.canBuild, true);
  assert.ok(result.stages.some((stage) => stage.id === "adapter-contract"));
  assert.ok(result.nextActions.includes("prepare_build_queue_item"));
});

test("module intent preview routes LoRaWAN requests to the guarded adapter", () => {
  const result = previewModuleIntent({
    manifest: loadModuleManifest(),
    catalog: loadCatalog(),
    intent: "Plan the LoRaWAN adapter for remote narrowband downlinks.",
  });

  assert.equal(result.match.moduleId, "lorawan-adapter");
  assert.equal(result.preview.flag.moduleId, "lorawan-adapter");
  assert.equal(result.preview.summary.requiresApproval, true);
  assert.ok(result.preview.nextActions.includes("attach_human_approval"));
});
