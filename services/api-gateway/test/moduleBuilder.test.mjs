import test from "node:test";
import assert from "node:assert/strict";
import { loadCatalog } from "../src/catalog.mjs";
import { loadModuleManifest } from "../src/moduleManifest.mjs";
import {
  buildModuleBuilderDashboard,
  loadModuleBuilder,
  previewBuildIntent,
  previewBuildPlan,
  summarizeModuleBuilder,
} from "../src/moduleBuilder.mjs";

test("module builder summarizes plan and fragment readiness", () => {
  const catalog = loadCatalog();
  const manifest = loadModuleManifest();
  const builder = loadModuleBuilder();
  const summary = summarizeModuleBuilder(builder, manifest, catalog);

  assert.equal(builder.service.moduleId, "module-marketplace");
  assert.equal(summary.planCount, 3);
  assert.equal(summary.readyToQueue, 1);
  assert.equal(summary.approvalRequired, 2);
  assert.ok(summary.composeFragmentCount >= 2);
  assert.ok(summary.azureFragmentCount >= 3);
});

test("module builder dashboard enriches plans with manifest flags", () => {
  const dashboard = buildModuleBuilderDashboard({
    builder: loadModuleBuilder(),
    manifest: loadModuleManifest(),
    catalog: loadCatalog(),
  });
  const mqtt = dashboard.plans.find((plan) => plan.id === "build-mqtt-esphome-local");
  const lorawan = dashboard.plans.find((plan) => plan.id === "build-lorawan-adapter-local");

  assert.equal(dashboard.featureModule.state, "foundation");
  assert.equal(mqtt.readiness.queueStatus, "ready_to_queue");
  assert.equal(mqtt.flag.state, "discoverable");
  assert.equal(lorawan.readiness.queueStatus, "approval_required");
  assert.equal(lorawan.readiness.approvalRequired, true);
});

test("module build preview exposes fragments verification and next actions", () => {
  const result = previewBuildPlan({
    builder: loadModuleBuilder(),
    manifest: loadModuleManifest(),
    catalog: loadCatalog(),
    planId: "build-mqtt-esphome-local",
    actor: { subject: "tester", name: "Tester", roles: ["Automation.Admin"] },
  });

  assert.equal(result.plan.moduleId, "mqtt-esphome");
  assert.equal(result.status, "ready_to_queue");
  assert.equal(result.summary.canQueue, true);
  assert.ok(result.fragments.some((fragment) => fragment.kind === "docker_compose_service"));
  assert.ok(result.verificationCommands.some((command) => command.id === "docker"));
  assert.ok(result.nextActions.includes("generate_fragments"));
});

test("module build intent preview routes LoRaWAN requests to approval-gated plan", () => {
  const result = previewBuildIntent({
    builder: loadModuleBuilder(),
    manifest: loadModuleManifest(),
    catalog: loadCatalog(),
    intent: "Build the LoRaWAN adapter for remote narrowband gateways.",
  });

  assert.equal(result.match.planId, "build-lorawan-adapter-local");
  assert.equal(result.preview.plan.moduleId, "lorawan-adapter");
  assert.equal(result.preview.summary.requiresApproval, true);
  assert.ok(result.preview.nextActions.includes("attach_human_approval"));
});
