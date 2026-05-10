import test from "node:test";
import assert from "node:assert/strict";
import { loadCatalog, summarizeCatalog, findModule } from "../src/catalog.mjs";

test("catalog exposes the full module spine", () => {
  const catalog = loadCatalog();
  const summary = summarizeCatalog(catalog);
  assert.equal(catalog.product.tenant, "vendorlogic.io");
  assert.ok(summary.moduleCount >= 40);
  assert.ok(summary.narrowband >= 8);
  assert.ok(summary.highRisk >= 10);
});

test("hero modules are present", () => {
  const catalog = loadCatalog();
  assert.equal(findModule(catalog, "water-management").state, "foundation");
  assert.equal(findModule(catalog, "energy-solar").state, "foundation");
  assert.equal(findModule(catalog, "battery-backup").state, "foundation");
  assert.equal(findModule(catalog, "narrowband-control-plane").state, "hero");
  assert.equal(findModule(catalog, "mcp-orchestrator").category, "Core Platform");
});
