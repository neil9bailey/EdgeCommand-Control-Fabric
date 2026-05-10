import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findDevice, loadDeviceRegistry } from "./deviceRegistry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const lightingPath = resolve(here, "../../../packages/lighting-scenes/lighting-scenes.json");

export function loadLightingScenes() {
  return JSON.parse(readFileSync(lightingPath, "utf8"));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function titleFromId(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function countBy(items, field) {
  return items.reduce((acc, item) => {
    const value = item[field] || "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function actorProfile(actor = {}) {
  return {
    subject: actor.subject || "local-dev-operator",
    name: actor.name || "Local Development Operator",
    roles: safeArray(actor.roles),
  };
}

function fixtureMap(lighting) {
  return new Map(safeArray(lighting.fixtures).map((fixture) => [fixture.id, fixture]));
}

function sceneMap(lighting) {
  return new Map(safeArray(lighting.scenes).map((scene) => [scene.id, scene]));
}

function zoneFixtures(lighting, target) {
  const fixtures = safeArray(lighting.fixtures);
  if (target.fixtureId) return fixtures.filter((fixture) => fixture.id === target.fixtureId);
  if (Array.isArray(target.fixtureIds)) {
    const requested = new Set(target.fixtureIds);
    return fixtures.filter((fixture) => requested.has(fixture.id));
  }
  return fixtures.filter((fixture) => fixture.zoneId === target.zoneId);
}

function selectedPath(fixture, device) {
  const preferences = safeArray(fixture.pathPreference);
  if (preferences.includes("lan")) return "lan";
  if (preferences.includes(device?.adapter)) return device.adapter;
  return preferences[0] || device?.adapter || "lan";
}

function targetForFixture(scene, fixture) {
  return safeArray(scene.zoneTargets).find((target) =>
    target.fixtureId === fixture.id ||
    safeArray(target.fixtureIds).includes(fixture.id) ||
    target.zoneId === fixture.zoneId,
  );
}

function normalizeDesiredState(target, fixture) {
  const desiredState = {};
  if (target.on !== undefined) desiredState.on = Boolean(target.on);
  if (target.brightness !== undefined) desiredState.brightness = Number(target.brightness);
  if (target.colorTemperatureK !== undefined && safeArray(fixture.supports).includes("colorTemperatureK")) {
    desiredState.colorTemperatureK = Number(target.colorTemperatureK);
  }
  return desiredState;
}

function commandStatus(fixture, device, apply) {
  const manualOverride = Boolean(fixture.manualOverride || device?.observedState?.manualOverride);
  if (!device) return { status: "blocked_missing_device", canExecute: false, reason: "device_not_found" };
  if (device.status !== "online") return { status: "blocked_device_offline", canExecute: false, reason: "device_offline" };
  if (manualOverride) return { status: "blocked_manual_override", canExecute: false, reason: "manual_override" };
  return { status: apply ? "executed_simulated" : "ready_to_execute", canExecute: true, reason: "policy_passed" };
}

function buildSceneCommand({ scene, fixture, device, target, index, apply }) {
  const policy = commandStatus(fixture, device, apply);
  const encodedBytes = Math.max(28, Math.ceil(Number(scene.commandProfile?.encodedBytes || 48) / Math.max(1, safeArray(scene.zoneTargets).length)));
  return {
    id: `${scene.id}-cmd-${index + 1}`,
    sceneId: scene.id,
    fixtureId: fixture.id,
    deviceId: fixture.deviceId,
    deviceName: device?.name || fixture.name,
    zoneId: fixture.zoneId,
    type: "set_state",
    moduleId: "lighting-scenes",
    capability: "light",
    desiredState: normalizeDesiredState(target, fixture),
    fadeMs: target.fadeMs || fixture.defaultFadeMs || 800,
    trafficClass: scene.trafficClass,
    selectedPath: selectedPath(fixture, device),
    encodedBytes,
    ackRequired: Boolean(scene.commandProfile?.ackRequired),
    status: policy.status,
    canExecute: policy.canExecute,
    policyDecision: policy.canExecute ? "allow" : "blocked",
    policyReasons: [policy.reason, ...safeArray(scene.policies)],
  };
}

function buildPolicyResult(lighting, scene, commands) {
  const scenePolicies = new Set(safeArray(scene.policies));
  const policies = safeArray(lighting.policies).filter((policy) => scenePolicies.has(policy.id));
  const blocked = commands.filter((command) => !command.canExecute);
  return {
    result: blocked.length > 0 ? "blocked" : "ready",
    canApply: blocked.length === 0,
    requiresApproval: Boolean(scene.requiresApproval),
    policies: policies.map((policy) => ({
      id: policy.id,
      name: policy.name,
      risk: policy.risk,
      message: policy.message,
    })),
    criteria: [
      { id: "manual_override_clear", label: "Manual override clear", passed: !commands.some((command) => command.policyReasons.includes("manual_override")) },
      { id: "devices_online", label: "All fixtures online", passed: !commands.some((command) => command.policyReasons.includes("device_offline") || command.policyReasons.includes("device_not_found")) },
      { id: "low_risk_scene", label: "Low risk scene", passed: !scene.requiresApproval },
      { id: "audit_required", label: "Audit event generated", passed: true },
    ],
  };
}

function buildLightingEvent({ scene, actor, status, commandCount, action }) {
  return {
    id: `lighting-${scene.id}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    tenant: "vendorlogic.io",
    siteId: "home-hq",
    zoneId: null,
    deviceId: null,
    moduleId: "lighting-scenes",
    stream: "command",
    severity: status === "blocked" ? "warning" : "info",
    actor: {
      type: "human",
      id: actor.subject,
      displayName: actor.name,
    },
    action,
    summary: `${scene.name} ${status.replace(/_/g, " ")} with ${commandCount} lighting command(s).`,
    status,
    trafficClass: scene.trafficClass,
    auditRequired: true,
    payload: {
      sceneId: scene.id,
      commandCount,
      executionBoundary: "simulated-scene-command-plan-only",
    },
  };
}

export function summarizeLightingScenes(lighting = loadLightingScenes(), deviceRegistry = loadDeviceRegistry()) {
  const fixtures = safeArray(lighting.fixtures);
  const fixtureDevices = fixtures.map((fixture) => findDevice(deviceRegistry, fixture.deviceId)).filter(Boolean);
  const onlineFixtures = fixtureDevices.filter((device) => device.status === "online").length;
  const enabledScenes = safeArray(lighting.scenes).filter((scene) => scene.status === "enabled").length;
  const totalBrightness = fixtureDevices.reduce((sum, device) => sum + Number(device.observedState?.brightness || 0), 0);

  return {
    schemaVersion: lighting.schemaVersion,
    zoneCount: safeArray(lighting.zones).length,
    fixtureCount: fixtures.length,
    onlineFixtureCount: onlineFixtures,
    sceneCount: safeArray(lighting.scenes).length,
    enabledSceneCount: enabledScenes,
    scheduleCount: safeArray(lighting.schedules).length,
    enabledScheduleCount: safeArray(lighting.schedules).filter((schedule) => schedule.status === "enabled").length,
    policyCount: safeArray(lighting.policies).length,
    intentRecipeCount: safeArray(lighting.intentRecipes).length,
    recentRunCount: safeArray(lighting.recentSceneRuns).length,
    averageBrightness: fixtureDevices.length > 0 ? Math.round(totalBrightness / fixtureDevices.length) : 0,
    byMode: countBy(safeArray(lighting.scenes), "mode"),
    byFixtureAdapter: countBy(fixtureDevices, "adapter"),
  };
}

export function findLightingScene(lighting = loadLightingScenes(), sceneId) {
  return sceneMap(lighting).get(sceneId) || null;
}

export function buildLightingDashboard({
  lighting = loadLightingScenes(),
  deviceRegistry = loadDeviceRegistry(),
} = {}) {
  const fixtures = fixtureMap(lighting);
  const zones = safeArray(lighting.zones).map((zone) => {
    const zoneFixtureIds = safeArray(zone.fixtureIds);
    const zoneFixtureDevices = zoneFixtureIds.map((id) => {
      const fixture = fixtures.get(id);
      const device = fixture ? findDevice(deviceRegistry, fixture.deviceId) : null;
      return {
        ...fixture,
        deviceName: device?.name || fixture?.name,
        status: device?.status || "missing",
        observedState: device?.observedState || {},
        adapter: device?.adapter || "unknown",
      };
    }).filter(Boolean);
    return {
      ...zone,
      fixtures: zoneFixtureDevices,
      onlineFixtures: zoneFixtureDevices.filter((fixture) => fixture.status === "online").length,
    };
  });

  return {
    service: lighting.service,
    featureModule: lighting.featureModule,
    summary: summarizeLightingScenes(lighting, deviceRegistry),
    zones,
    fixtures: safeArray(lighting.fixtures).map((fixture) => {
      const device = findDevice(deviceRegistry, fixture.deviceId);
      return {
        ...fixture,
        deviceName: device?.name || fixture.name,
        status: device?.status || "missing",
        observedState: device?.observedState || {},
        desiredState: device?.desiredState || {},
        adapter: device?.adapter || "unknown",
      };
    }),
    scenes: safeArray(lighting.scenes),
    schedules: safeArray(lighting.schedules),
    policies: safeArray(lighting.policies),
    intentRecipes: safeArray(lighting.intentRecipes),
    recentSceneRuns: safeArray(lighting.recentSceneRuns),
    rule: lighting.service?.rule,
  };
}

export function previewLightingScene({
  lighting = loadLightingScenes(),
  deviceRegistry = loadDeviceRegistry(),
  sceneId,
  actor = {},
  apply = false,
} = {}) {
  const scene = findLightingScene(lighting, sceneId || lighting.service?.defaultSceneId);
  if (!scene) {
    return {
      error: "lighting_scene_not_found",
      id: sceneId || lighting.service?.defaultSceneId,
    };
  }

  const targets = safeArray(scene.zoneTargets);
  const fixtures = [];
  for (const target of targets) {
    fixtures.push(...zoneFixtures(lighting, target).map((fixture) => ({ fixture, target })));
  }

  const seen = new Set();
  const commands = fixtures
    .filter(({ fixture }) => {
      if (seen.has(fixture.id)) return false;
      seen.add(fixture.id);
      return true;
    })
    .map(({ fixture, target }, index) =>
      buildSceneCommand({
        scene,
        fixture,
        device: findDevice(deviceRegistry, fixture.deviceId),
        target: targetForFixture(scene, fixture) || target,
        index,
        apply,
      }),
    );
  const policy = buildPolicyResult(lighting, scene, commands);
  const status = policy.canApply ? (apply ? "executed_simulated" : "ready") : "blocked";
  const actorInfo = actorProfile(actor);

  return {
    previewId: `lighting_preview_${Date.now()}`,
    createdAt: new Date().toISOString(),
    tenant: lighting.tenant,
    service: lighting.service,
    scene: {
      id: scene.id,
      name: scene.name,
      mode: scene.mode,
      status: scene.status,
      trafficClass: scene.trafficClass,
      triggers: safeArray(scene.triggers),
      requiresApproval: Boolean(scene.requiresApproval),
    },
    actor: actorInfo,
    status,
    summary: {
      commandCount: commands.length,
      readyCount: commands.filter((command) => command.canExecute).length,
      blockedCount: commands.filter((command) => !command.canExecute).length,
      zoneCount: new Set(commands.map((command) => command.zoneId)).size,
      encodedBytes: commands.reduce((sum, command) => sum + command.encodedBytes, 0),
    },
    policy,
    commands,
    nextActions: policy.canApply
      ? apply
        ? ["record_audit", "wait_for_adapter_ack", "refresh_observed_state"]
        : ["operator_can_apply_scene", "record_scene_preview", "preserve_manual_override_boundary"]
      : ["clear_manual_override_or_restore_device", "preview_scene_again"],
    event: buildLightingEvent({
      scene,
      actor: actorInfo,
      status,
      commandCount: commands.length,
      action: apply ? "lighting.scene.applied" : "lighting.scene.previewed",
    }),
  };
}

export function applyLightingScene(options = {}) {
  const preview = previewLightingScene({ ...options, apply: false });
  if (preview.error) return preview;
  if (!preview.policy.canApply) {
    return {
      ...preview,
      applyAttempted: true,
      status: "blocked",
      event: {
        ...preview.event,
        action: "lighting.scene.apply.blocked",
        status: "blocked",
      },
    };
  }
  return {
    ...previewLightingScene({ ...options, apply: true }),
    applyAttempted: true,
  };
}

function scoreRecipe(intent, recipe) {
  const text = String(intent || "").toLowerCase();
  return safeArray(recipe.keywords).reduce((score, keyword) => score + (text.includes(String(keyword).toLowerCase()) ? 1 : 0), 0);
}

export function previewLightingIntent({
  lighting = loadLightingScenes(),
  deviceRegistry = loadDeviceRegistry(),
  intent = "",
  actor = {},
} = {}) {
  const scored = safeArray(lighting.intentRecipes)
    .map((recipe) => ({ recipe, score: scoreRecipe(intent, recipe) }))
    .sort((a, b) => b.score - a.score || Number(b.recipe.confidence || 0) - Number(a.recipe.confidence || 0));
  const match = scored.find((item) => item.score > 0) || scored[0];
  if (!match) {
    return {
      error: "lighting_intent_recipe_not_found",
      intent,
    };
  }
  return {
    intent,
    match: {
      id: match.recipe.id,
      name: match.recipe.name,
      sceneId: match.recipe.sceneId,
      confidence: match.recipe.confidence,
      score: match.score,
    },
    preview: previewLightingScene({
      lighting,
      deviceRegistry,
      sceneId: match.recipe.sceneId,
      actor,
    }),
  };
}
