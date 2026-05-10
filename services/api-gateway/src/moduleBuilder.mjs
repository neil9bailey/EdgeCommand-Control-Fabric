import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findModuleFlag, matchManifestIntent, previewModuleFlag } from "./moduleManifest.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const builderPath = resolve(here, "../../../packages/module-builder/module-builder.json");

export function loadModuleBuilder() {
  return JSON.parse(readFileSync(builderPath, "utf8"));
}

function countBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function findPlan(builder, id) {
  return (builder.plans || []).find((plan) => plan.id === id || plan.moduleId === id || plan.flagId === id) || null;
}

function findLane(manifest, laneId) {
  return (manifest.buildLanes || []).find((lane) => lane.id === laneId) || null;
}

function findState(builder, stateId) {
  return (builder.buildPlanStates || []).find((state) => state.id === stateId) || null;
}

function resolvePlan({ builder, manifest, catalog, plan }) {
  const flag = findModuleFlag(manifest, catalog, plan.flagId || plan.moduleId);
  const manifestPreview = previewModuleFlag({
    manifest,
    catalog,
    moduleId: plan.moduleId,
    actor: { subject: "module-builder", name: "Module Builder", roles: ["Automation.AgentApprover"] },
  });
  const lane = findLane(manifest, plan.laneId);
  const state = findState(builder, plan.status);
  const fragments = [
    ...(plan.composeFragments || []).map((fragment) => ({ ...fragment, kind: "docker_compose_service" })),
    ...(plan.azureFragments || []).map((fragment) => ({ ...fragment, kind: "azure_container_app" })),
    ...(plan.migrationHooks || []).map((fragment) => ({ ...fragment, kind: "migration_hook" })),
  ];
  const requiredVerification = (builder.verificationCommands || []).filter((command) => command.required);
  const missingFlag = !flag;
  const blockedByManifest = manifestPreview.error || manifestPreview.status === "blocked_dependencies";
  const approvalRequired = Boolean(plan.requiresApproval || flag?.readiness.requiresApproval || state?.requiresApproval);
  const canQueue = Boolean(state?.canQueue && !missingFlag && !blockedByManifest && !approvalRequired);
  const queueStatus = missingFlag
    ? "missing_flag"
    : blockedByManifest
      ? "blocked_by_manifest"
      : approvalRequired && !state?.canQueue
        ? "approval_required"
        : canQueue
          ? "ready_to_queue"
          : "draft";

  return {
    ...plan,
    flag,
    lane,
    state,
    manifestPreview: manifestPreview.error ? null : manifestPreview,
    fragments,
    requiredVerification,
    readiness: {
      canQueue,
      queueStatus,
      approvalRequired,
      certificationRequired: Boolean(plan.requiresCertification),
      fragmentCount: fragments.length,
      composeFragmentCount: (plan.composeFragments || []).length,
      azureFragmentCount: (plan.azureFragments || []).length,
      migrationHookCount: (plan.migrationHooks || []).length,
      verificationCommandCount: requiredVerification.length,
    },
  };
}

export function summarizeModuleBuilder(builder = loadModuleBuilder(), manifest, catalog) {
  const plans = (builder.plans || []).map((plan) => resolvePlan({ builder, manifest, catalog, plan }));
  return {
    schemaVersion: builder.schemaVersion,
    planCount: plans.length,
    readyToQueue: plans.filter((plan) => plan.readiness.canQueue).length,
    approvalRequired: plans.filter((plan) => plan.readiness.approvalRequired).length,
    certificationRequired: plans.filter((plan) => plan.readiness.certificationRequired).length,
    composeFragmentCount: plans.reduce((sum, plan) => sum + plan.readiness.composeFragmentCount, 0),
    azureFragmentCount: plans.reduce((sum, plan) => sum + plan.readiness.azureFragmentCount, 0),
    migrationHookCount: plans.reduce((sum, plan) => sum + plan.readiness.migrationHookCount, 0),
    verificationCommandCount: (builder.verificationCommands || []).length,
    byStatus: countBy(plans, (plan) => plan.status),
    byQueueStatus: countBy(plans, (plan) => plan.readiness.queueStatus),
    byEnvironment: countBy(plans, (plan) => plan.targetEnvironment),
    byRisk: countBy(plans, (plan) => plan.risk),
  };
}

export function buildModuleBuilderDashboard({ builder = loadModuleBuilder(), manifest, catalog }) {
  const plans = (builder.plans || []).map((plan) => resolvePlan({ builder, manifest, catalog, plan }));
  return {
    service: builder.service,
    featureModule: builder.featureModule,
    summary: summarizeModuleBuilder(builder, manifest, catalog),
    buildPlanStates: builder.buildPlanStates || [],
    fragmentKinds: builder.fragmentKinds || [],
    verificationCommands: builder.verificationCommands || [],
    plans,
    intentRecipes: builder.intentRecipes || [],
    recentBuildRuns: builder.recentBuildRuns || [],
    rule: builder.service.rule,
  };
}

function scoreRecipe(recipe, intent) {
  const text = String(intent || "").toLowerCase();
  return (recipe.keywords || []).reduce((score, keyword) => (
    text.includes(String(keyword).toLowerCase()) ? score + 1 : score
  ), 0);
}

export function matchBuilderIntent(builder, manifest, intent) {
  const builderMatches = (builder.intentRecipes || [])
    .map((recipe) => ({ ...recipe, score: scoreRecipe(recipe, intent), source: "module-builder" }))
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence);
  if (builderMatches[0]?.score > 0) return builderMatches[0];

  const manifestMatch = matchManifestIntent(manifest, intent);
  if (!manifestMatch) return null;
  const plan = (builder.plans || []).find((entry) => entry.moduleId === manifestMatch.moduleId);
  if (!plan) return null;
  return {
    id: `builder-${manifestMatch.id}`,
    name: manifestMatch.name,
    planId: plan.id,
    confidence: manifestMatch.confidence,
    score: manifestMatch.score,
    source: "module-manifest",
  };
}

export function previewBuildPlan({ builder = loadModuleBuilder(), manifest, catalog, planId, actor = null }) {
  const plan = findPlan(builder, planId);
  if (!plan) return { error: "module_build_plan_not_found", id: planId };

  const resolvedPlan = resolvePlan({ builder, manifest, catalog, plan });
  const now = new Date().toISOString();
  const stageIds = resolvedPlan.lane?.stages || [];
  const stages = stageIds.map((stage) => ({
    id: stage,
    label: stage.replace(/-/g, " "),
    status: resolvedPlan.readiness.queueStatus === "blocked_by_manifest"
      ? "blocked"
      : stage === "approval" && resolvedPlan.readiness.approvalRequired
        ? "approval_required"
        : "ready",
  }));

  return {
    previewId: `module_build_${resolvedPlan.id}_${Date.now()}`,
    createdAt: now,
    tenant: builder.tenant,
    service: builder.service,
    actor: actor || { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
    status: resolvedPlan.readiness.queueStatus,
    plan: resolvedPlan,
    stages,
    fragments: resolvedPlan.fragments,
    verificationCommands: resolvedPlan.requiredVerification,
    summary: {
      fragmentCount: resolvedPlan.readiness.fragmentCount,
      composeFragmentCount: resolvedPlan.readiness.composeFragmentCount,
      azureFragmentCount: resolvedPlan.readiness.azureFragmentCount,
      migrationHookCount: resolvedPlan.readiness.migrationHookCount,
      verificationCommandCount: resolvedPlan.readiness.verificationCommandCount,
      canQueue: resolvedPlan.readiness.canQueue,
      requiresApproval: resolvedPlan.readiness.approvalRequired,
      requiresCertification: resolvedPlan.readiness.certificationRequired,
    },
    nextActions: resolvedPlan.readiness.canQueue
      ? ["create_build_branch", "generate_fragments", "run_required_verification", "prepare_certification_record"]
      : resolvedPlan.readiness.approvalRequired
        ? ["attach_human_approval", "run_simulation_pack", "prepare_certification_record"]
        : ["resolve_manifest_blockers", "refresh_build_plan", "rerun_policy_check"],
    event: {
      id: `module-build-${resolvedPlan.id}-${Date.now()}`,
      timestamp: now,
      tenant: builder.tenant,
      siteId: null,
      zoneId: null,
      deviceId: null,
      moduleId: resolvedPlan.moduleId,
      stream: "module",
      severity: resolvedPlan.readiness.approvalRequired ? "warning" : "info",
      actor: {
        type: "human",
        id: actor?.subject || "system-preview",
        displayName: actor?.name || "System Preview",
      },
      action: "module.build.previewed",
      summary: `${resolvedPlan.name} build plan is ${resolvedPlan.readiness.queueStatus}.`,
      status: resolvedPlan.readiness.queueStatus,
      trafficClass: resolvedPlan.trafficClass,
      auditRequired: true,
      payload: {
        planId: resolvedPlan.id,
        moduleId: resolvedPlan.moduleId,
        targetEnvironment: resolvedPlan.targetEnvironment,
        canQueue: resolvedPlan.readiness.canQueue,
      },
    },
  };
}

export function previewBuildIntent({ builder = loadModuleBuilder(), manifest, catalog, intent = "", actor = null }) {
  const match = matchBuilderIntent(builder, manifest, intent);
  const preview = previewBuildPlan({
    builder,
    manifest,
    catalog,
    planId: match?.planId || builder.service.defaultPlanId,
    actor,
  });

  return {
    intent,
    match: match ? {
      id: match.id,
      name: match.name,
      planId: match.planId,
      confidence: match.confidence,
      score: match.score,
      source: match.source,
    } : null,
    preview,
  };
}
