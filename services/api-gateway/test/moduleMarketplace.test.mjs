import test from "node:test";
import assert from "node:assert/strict";
import { loadCatalog } from "../src/catalog.mjs";
import { loadModuleBuilder } from "../src/moduleBuilder.mjs";
import { loadModuleManifest } from "../src/moduleManifest.mjs";
import {
  buildModuleMarketplaceDashboard,
  loadModuleMarketplace,
  previewMarketplaceIntent,
  previewMarketplaceRequest,
  summarizeModuleMarketplace,
} from "../src/moduleMarketplace.mjs";

test("module marketplace summarizes installed available and manifest gaps", () => {
  const catalog = loadCatalog();
  const manifest = loadModuleManifest();
  const builder = loadModuleBuilder();
  const marketplace = loadModuleMarketplace();
  const summary = summarizeModuleMarketplace(marketplace, catalog, manifest, builder);

  assert.equal(marketplace.service.moduleId, "module-marketplace");
  assert.ok(summary.listingCount >= catalog.modules.length);
  assert.equal(summary.installed, 6);
  assert.ok(summary.available >= 1);
  assert.ok(summary.needsManifest > 0);
  assert.equal(summary.queueReady, 1);
});

test("module marketplace dashboard composes collections listings and requests", () => {
  const dashboard = buildModuleMarketplaceDashboard({
    marketplace: loadModuleMarketplace(),
    catalog: loadCatalog(),
    manifest: loadModuleManifest(),
    builder: loadModuleBuilder(),
  });
  const mqtt = dashboard.listings.find((listing) => listing.moduleId === "mqtt-esphome");
  const starter = dashboard.curatedCollections.find((collection) => collection.id === "starter-home-on-steroids");

  assert.equal(dashboard.featureModule.state, "foundation");
  assert.equal(mqtt.status, "available");
  assert.equal(mqtt.queueStatus, "ready_to_queue");
  assert.ok(starter.listings.length >= 6);
  assert.equal(dashboard.requests.length, 3);
});

test("marketplace request preview links flag and build previews", () => {
  const result = previewMarketplaceRequest({
    marketplace: loadModuleMarketplace(),
    catalog: loadCatalog(),
    manifest: loadModuleManifest(),
    builder: loadModuleBuilder(),
    requestId: "request-mqtt-esphome",
    actor: { subject: "tester", name: "Tester", roles: ["Automation.Admin"] },
  });

  assert.equal(result.request.moduleId, "mqtt-esphome");
  assert.equal(result.summary.canRequest, true);
  assert.equal(result.summary.queueReady, true);
  assert.equal(result.buildPreview.plan.id, "build-mqtt-esphome-local");
  assert.ok(result.nextActions.includes("queue_build_plan"));
});

test("marketplace intent preview routes LoRaWAN to approval-required request", () => {
  const result = previewMarketplaceIntent({
    marketplace: loadModuleMarketplace(),
    catalog: loadCatalog(),
    manifest: loadModuleManifest(),
    builder: loadModuleBuilder(),
    intent: "Add LoRaWAN support for remote emergency control.",
  });

  assert.equal(result.match.requestId, "request-lorawan-adapter");
  assert.equal(result.preview.request.moduleId, "lorawan-adapter");
  assert.equal(result.preview.summary.requiresApproval, true);
  assert.ok(result.preview.nextActions.includes("attach_human_approval"));
});
