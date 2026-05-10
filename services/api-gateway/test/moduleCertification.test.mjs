import test from "node:test";
import assert from "node:assert/strict";
import { loadCatalog } from "../src/catalog.mjs";
import { loadModuleBuilder } from "../src/moduleBuilder.mjs";
import {
  buildModuleCertificationDashboard,
  loadModuleCertification,
  previewCertificationIntent,
  previewCertificationProfile,
  summarizeModuleCertification,
} from "../src/moduleCertification.mjs";
import { loadModuleManifest } from "../src/moduleManifest.mjs";
import { loadModuleMarketplace } from "../src/moduleMarketplace.mjs";

function context() {
  return {
    certification: loadModuleCertification(),
    marketplace: loadModuleMarketplace(),
    builder: loadModuleBuilder(),
    manifest: loadModuleManifest(),
    catalog: loadCatalog(),
  };
}

test("module certification summarizes profiles and evidence gates", () => {
  const summary = summarizeModuleCertification(...Object.values(context()));

  assert.equal(summary.profileCount, 3);
  assert.equal(summary.passed, 1);
  assert.equal(summary.approvalRequired, 2);
  assert.equal(summary.testSuiteCount, 6);
  assert.equal(summary.harnessRunCount, 3);
  assert.equal(summary.queueReady, 1);
});

test("module certification dashboard enriches marketplace builder and manifest state", () => {
  const dashboard = buildModuleCertificationDashboard(context());
  const mqtt = dashboard.profiles.find((profile) => profile.moduleId === "mqtt-esphome");
  const lorawan = dashboard.profiles.find((profile) => profile.moduleId === "lorawan-adapter");

  assert.equal(dashboard.featureModule.state, "foundation");
  assert.equal(mqtt.request.id, "request-mqtt-esphome");
  assert.equal(mqtt.listing.queueStatus, "ready_to_queue");
  assert.equal(mqtt.flag.moduleId, "mqtt-esphome");
  assert.equal(lorawan.readiness.requiresApproval, true);
});

test("certification preview links marketplace build previews and pass evidence", () => {
  const result = previewCertificationProfile({
    ...context(),
    profileId: "cert-mqtt-esphome-foundation",
    actor: { subject: "tester", name: "Tester", roles: ["Automation.Admin"] },
  });

  assert.equal(result.profile.moduleId, "mqtt-esphome");
  assert.equal(result.status, "passed");
  assert.equal(result.summary.canEnable, true);
  assert.equal(result.summary.queueReady, true);
  assert.equal(result.buildPreview.plan.id, "build-mqtt-esphome-local");
  assert.equal(result.marketplacePreview.request.id, "request-mqtt-esphome");
  assert.ok(result.nextActions.includes("prepare_enablement_record"));
});

test("certification intent routes LoRaWAN to approval-required profile", () => {
  const result = previewCertificationIntent({
    ...context(),
    intent: "Certify LoRaWAN emergency downlink support before module enablement.",
  });

  assert.equal(result.match.profileId, "cert-lorawan-adapter-governed");
  assert.equal(result.preview.profile.moduleId, "lorawan-adapter");
  assert.equal(result.preview.summary.requiresApproval, true);
  assert.ok(result.preview.nextActions.includes("attach_human_approval"));
});
