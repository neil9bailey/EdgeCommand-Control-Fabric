import test from "node:test";
import assert from "node:assert/strict";
import { loadApprovalWorkflow } from "../src/approvalWorkflow.mjs";
import { buildAuthConfig, publicAuthStatus } from "../src/auth.mjs";
import { loadAutomationEngine } from "../src/automationEngine.mjs";
import { loadCatalog } from "../src/catalog.mjs";
import { loadClimateHvac } from "../src/climateHvac.mjs";
import { buildApprovalQueue, buildCommandCentre, defaultNarrowbandRoutes } from "../src/commandCentre.mjs";
import { loadDeviceRegistry } from "../src/deviceRegistry.mjs";
import { loadEnergyManagement } from "../src/energyManagement.mjs";
import { loadEventLedger } from "../src/eventLedger.mjs";
import { loadKraEngine } from "../src/kraEngine.mjs";
import { loadLightingScenes } from "../src/lightingScenes.mjs";
import { loadMcpOrchestrator } from "../src/mcpOrchestrator.mjs";
import { loadSecurityAccess } from "../src/securityAccess.mjs";
import { loadSensingPresence } from "../src/sensingPresence.mjs";
import { loadWaterManagement } from "../src/waterManagement.mjs";
import { loadSimulationLab } from "../src/simulationLab.mjs";

function commandCentreFixture() {
  const authConfig = buildAuthConfig({ AUTH_MODE: "development", APP_ENV: "development" });
  return buildCommandCentre({
    catalog: loadCatalog(),
    deviceRegistry: loadDeviceRegistry(),
    eventLedger: loadEventLedger(),
    automationEngine: loadAutomationEngine(),
    mcpOrchestrator: loadMcpOrchestrator(),
    kraEngine: loadKraEngine(),
    simulationLab: loadSimulationLab(),
    approvalWorkflow: loadApprovalWorkflow(),
    lightingScenes: loadLightingScenes(),
    climateHvac: loadClimateHvac(),
    securityAccess: loadSecurityAccess(),
    waterManagement: loadWaterManagement(),
    energyManagement: loadEnergyManagement(),
    sensingPresence: loadSensingPresence(),
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
    "lighting",
    "climate",
    "security",
    "water",
    "energy",
    "sensing",
    "approvals",
    "agents",
    "risk",
    "simulations",
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
  assert.ok(commandCentre.actionQueue.some((action) => action.workspaceId === "lighting"));
  assert.ok(commandCentre.actionQueue.some((action) => action.workspaceId === "climate"));
  assert.ok(commandCentre.actionQueue.some((action) => action.workspaceId === "security"));
  assert.ok(commandCentre.actionQueue.some((action) => action.workspaceId === "water"));
  assert.ok(commandCentre.actionQueue.some((action) => action.workspaceId === "energy"));
  assert.ok(commandCentre.actionQueue.some((action) => action.workspaceId === "sensing"));
  assert.ok(commandCentre.actionQueue.some((action) => action.workspaceId === "approvals"));
  assert.ok(commandCentre.actionQueue.some((action) => action.workspaceId === "agents"));
  assert.ok(commandCentre.actionQueue.some((action) => action.workspaceId === "risk"));
  assert.ok(commandCentre.actionQueue.some((action) => action.workspaceId === "simulations"));
  assert.ok(commandCentre.actionQueue.some((action) => action.workspaceId === "connectivity"));
  assert.ok(commandCentre.connectivity.routes.some((route) => route.selectedPath === "lorawan"));
  assert.ok(commandCentre.automations.approvals.every((approval) => approval.status === "pending_approval"));
  assert.ok(commandCentre.automations.approvals.every((approval) => approval.simulation.attached));
  assert.equal(commandCentre.approvals.summary.readyForApproval, 1);
  assert.equal(commandCentre.approvals.policyRules.length, 5);
  assert.equal(commandCentre.lighting.summary.enabledSceneCount, 4);
  assert.equal(commandCentre.lighting.summary.onlineFixtureCount, 4);
  assert.equal(commandCentre.climate.summary.enabledProfileCount, 4);
  assert.equal(commandCentre.climate.summary.onlineThermostatCount, 3);
  assert.equal(commandCentre.security.summary.enabledProfileCount, 4);
  assert.equal(commandCentre.security.summary.accessPointCount, 3);
  assert.equal(commandCentre.water.summary.enabledProfileCount, 4);
  assert.equal(commandCentre.water.summary.valveCount, 2);
  assert.equal(commandCentre.energy.summary.enabledProfileCount, 4);
  assert.equal(commandCentre.energy.summary.totalSolarWatts, 1860);
  assert.equal(commandCentre.sensing.summary.enabledProfileCount, 4);
  assert.equal(commandCentre.sensing.summary.occupiedZoneCount, 1);
  assert.equal(commandCentre.agents.summary.toolCount, 22);
  assert.equal(commandCentre.risk.summary.rulePackCount, 6);
  assert.equal(commandCentre.simulations.summary.scenarioCount, 3);
});

test("shared approval queue and narrowband route helpers stay aligned", () => {
  const approvals = buildApprovalQueue(loadAutomationEngine(), loadDeviceRegistry());
  const routes = defaultNarrowbandRoutes();

  assert.equal(approvals.summary.pending, 1);
  assert.equal(approvals.approvals[0].selectedPath, "lorawan");
  assert.equal(routes.routes.find((route) => route.id === "route_camera_p4").status, "blocked_from_narrowband");
});
