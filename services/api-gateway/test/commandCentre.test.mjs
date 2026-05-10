import test from "node:test";
import assert from "node:assert/strict";
import { buildAuthConfig, publicAuthStatus } from "../src/auth.mjs";
import { loadAutomationEngine } from "../src/automationEngine.mjs";
import { loadCatalog } from "../src/catalog.mjs";
import { buildApprovalQueue, buildCommandCentre, defaultNarrowbandRoutes } from "../src/commandCentre.mjs";
import { loadDeviceRegistry } from "../src/deviceRegistry.mjs";
import { loadEventLedger } from "../src/eventLedger.mjs";
import { loadMcpOrchestrator } from "../src/mcpOrchestrator.mjs";

function commandCentreFixture() {
  const authConfig = buildAuthConfig({ AUTH_MODE: "development", APP_ENV: "development" });
  return buildCommandCentre({
    catalog: loadCatalog(),
    deviceRegistry: loadDeviceRegistry(),
    eventLedger: loadEventLedger(),
    automationEngine: loadAutomationEngine(),
    mcpOrchestrator: loadMcpOrchestrator(),
    authStatus: publicAuthStatus(authConfig, {
      provider: "environment",
      keyVaultEnabled: false,
      keyVaultRequired: false,
      mappedEnvironmentNames: ["OPENAI_API_KEY"],
    }),
  });
}

test("command centre builds all operational workspaces", () => {
  const commandCentre = commandCentreFixture();

  assert.equal(commandCentre.schemaVersion, "0.1.0");
  assert.equal(commandCentre.product.tenant, "vendorlogic.io");
  assert.deepEqual(commandCentre.workspaces.map((workspace) => workspace.id), [
    "modules",
    "devices",
    "automations",
    "agents",
    "connectivity",
    "identity",
    "audit",
  ]);
  assert.ok(commandCentre.posture.unresolvedApprovals >= 1);
  assert.ok(commandCentre.devices.some((device) => device.id === "dev-cottage-gateway-01" && device.status === "degraded"));
  assert.ok(commandCentre.audit.events.every((event) => event.auditRequired));
});

test("command centre action queue includes safety approval and route attention", () => {
  const commandCentre = commandCentreFixture();

  assert.ok(commandCentre.actionQueue.some((action) => action.id.startsWith("approval-")));
  assert.ok(commandCentre.actionQueue.some((action) => action.workspaceId === "agents"));
  assert.ok(commandCentre.actionQueue.some((action) => action.workspaceId === "connectivity"));
  assert.ok(commandCentre.connectivity.routes.some((route) => route.selectedPath === "lorawan"));
  assert.ok(commandCentre.automations.approvals.every((approval) => approval.status === "pending_approval"));
  assert.equal(commandCentre.agents.summary.toolCount, 10);
});

test("shared approval queue and narrowband route helpers stay aligned", () => {
  const approvals = buildApprovalQueue(loadAutomationEngine(), loadDeviceRegistry());
  const routes = defaultNarrowbandRoutes();

  assert.equal(approvals.summary.pending, 1);
  assert.equal(approvals.approvals[0].selectedPath, "lorawan");
  assert.equal(routes.routes.find((route) => route.id === "route_camera_p4").status, "blocked_from_narrowband");
});
