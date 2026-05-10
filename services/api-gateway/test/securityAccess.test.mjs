import test from "node:test";
import assert from "node:assert/strict";
import { loadDeviceRegistry } from "../src/deviceRegistry.mjs";
import {
  applyAccessPointCommand,
  applySecurityProfile,
  buildSecurityDashboard,
  loadSecurityAccess,
  previewAccessPointCommand,
  previewSecurityIntent,
  previewSecurityProfile,
  summarizeSecurityAccess,
} from "../src/securityAccess.mjs";

const securityOperator = {
  subject: "security-local",
  name: "Local Security Operator",
  roles: ["Automation.Security"],
};

test("security access package loads access points profiles and intent recipes", () => {
  const security = loadSecurityAccess();
  const summary = summarizeSecurityAccess(security, loadDeviceRegistry());

  assert.equal(security.service.moduleId, "security-access");
  assert.equal(summary.schemaVersion, "0.1.0");
  assert.equal(summary.accessPointCount, 3);
  assert.equal(summary.profileCount, 4);
  assert.equal(summary.enabledProfileCount, 4);
  assert.equal(summary.intentRecipeCount, 3);
  assert.equal(summary.policyCount, 4);
});

test("security dashboard enriches access points with device state", () => {
  const dashboard = buildSecurityDashboard({
    security: loadSecurityAccess(),
    deviceRegistry: loadDeviceRegistry(),
  });

  assert.equal(dashboard.featureModule.state, "foundation");
  assert.ok(dashboard.accessPoints.some((point) => point.id === "access-front-door" && point.devices.length === 2));
  assert.ok(dashboard.accessPoints.some((point) => point.id === "access-cottage-gate" && point.devices.some((device) => device.adapter === "lorawan")));
});

test("night secure preview builds safe lock arm and gate check plan", () => {
  const preview = previewSecurityProfile({
    security: loadSecurityAccess(),
    deviceRegistry: loadDeviceRegistry(),
    profileId: "profile-night-secure",
    actor: securityOperator,
  });

  assert.equal(preview.status, "ready");
  assert.equal(preview.profile.name, "Night Secure");
  assert.equal(preview.summary.commandCount, 3);
  assert.equal(preview.summary.blockedCount, 0);
  assert.equal(preview.summary.approvalCount, 0);
  assert.equal(preview.policy.canApply, true);
  assert.ok(preview.commands.every((command) => command.status === "ready_to_execute"));
  assert.equal(preview.event.action, "security.profile.previewed");
});

test("safe security profile apply returns simulated execution commands", () => {
  const applied = applySecurityProfile({
    security: loadSecurityAccess(),
    deviceRegistry: loadDeviceRegistry(),
    profileId: "profile-away-armed",
    actor: securityOperator,
  });

  assert.equal(applied.status, "executed_simulated");
  assert.equal(applied.applyAttempted, true);
  assert.ok(applied.commands.every((command) => command.status === "executed_simulated"));
  assert.ok(applied.nextActions.includes("refresh_security_state"));
  assert.equal(applied.event.action, "security.profile.applied");
});

test("remote unlock is approval required before apply", () => {
  const preview = previewAccessPointCommand({
    security: loadSecurityAccess(),
    deviceRegistry: loadDeviceRegistry(),
    accessPointId: "access-front-door",
    action: "unlock",
    desiredState: { locked: false },
    actor: securityOperator,
  });
  const applied = applyAccessPointCommand({
    security: loadSecurityAccess(),
    deviceRegistry: loadDeviceRegistry(),
    accessPointId: "access-front-door",
    action: "unlock",
    desiredState: { locked: false },
    actor: securityOperator,
  });

  assert.equal(preview.status, "approval_required");
  assert.equal(preview.policy.canApply, false);
  assert.equal(preview.summary.approvalCount, 1);
  assert.ok(preview.commands[0].policyReasons.includes("human_approval_required"));
  assert.equal(applied.status, "approval_required");
  assert.equal(applied.event.action, "security.access.apply.blocked");
});

test("security intent preview selects matching night secure profile", () => {
  const result = previewSecurityIntent({
    security: loadSecurityAccess(),
    deviceRegistry: loadDeviceRegistry(),
    intent: "Secure the house for night, lock the front door, arm stay mode, and prepare for sleep.",
    actor: securityOperator,
  });

  assert.equal(result.match.profileId, "profile-night-secure");
  assert.equal(result.preview.profile.id, "profile-night-secure");
  assert.equal(result.preview.summary.commandCount, 3);
});
