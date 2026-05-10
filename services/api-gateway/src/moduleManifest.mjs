import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(here, "../../../packages/module-manifest/module-manifest.json");

export function loadModuleManifest() {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function countBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function findCatalogModule(catalog, moduleId) {
  return (catalog.modules || []).find((module) => module.id === moduleId) || null;
}

function flagStateDefinition(manifest, state) {
  return (manifest.flagStates || []).find((entry) => entry.id === state) || null;
}

function resolveFlag({ flag, manifest, catalog }) {
  const module = findCatalogModule(catalog, flag.moduleId);
  const dependencyStatuses = (flag.dependencies || []).map((moduleId) => {
    const dependency = findCatalogModule(catalog, moduleId);
    const dependencyFlag = (manifest.flags || []).find((entry) => entry.moduleId === moduleId);
    const state = dependencyFlag?.state || dependency?.state || "catalog_only";
    return {
      moduleId,
      name: dependency?.name || moduleId,
      present: Boolean(dependency),
      state,
      ready: Boolean(dependency) && ["enabled", "foundation", "hero", "preview"].includes(state),
    };
  });
  const missingDependencies = dependencyStatuses.filter((item) => !item.present || !item.ready);
  const stateDefinition = flagStateDefinition(manifest, flag.state);
  const requiredArtifacts = flag.artifacts || [];
  const missingArtifacts = (manifest.artifactKinds || []).filter((kind) => {
    if (["iac_fragment", "simulation_pack"].includes(kind)) return false;
    return flag.state === "enabled" && !requiredArtifacts.includes(kind);
  });
  const canBuild = Boolean(stateDefinition?.allowsBuild) && missingDependencies.length === 0;
  const canEnable = ["enabled", "preview"].includes(flag.state) && missingDependencies.length === 0 && missingArtifacts.length === 0;
  const requiresApproval = Boolean(stateDefinition?.requiresApproval || flag.activation?.requiresApproval || module?.risk === "high");

  return {
    ...flag,
    moduleName: module?.name || flag.moduleId,
    category: module?.category || "Uncatalogued",
    catalogState: module?.state || "missing",
    trafficClass: module?.trafficClass || "P2_CONTROL",
    narrowbandSuitability: module?.narrowbandSuitability || null,
    description: module?.description || "Module is not present in the catalogue.",
    stateDefinition,
    dependencyStatuses,
    missingDependencies,
    missingArtifacts,
    readiness: {
      canBuild,
      canEnable,
      requiresApproval,
      runtimeSurface: Boolean(stateDefinition?.allowsRuntimeSurface),
      status: missingDependencies.length > 0
        ? "blocked_dependencies"
        : missingArtifacts.length > 0
          ? "missing_artifacts"
          : requiresApproval && flag.state !== "enabled"
            ? "approval_required"
            : canEnable
              ? "ready"
              : canBuild
                ? "buildable"
                : "discoverable",
    },
  };
}

export function summarizeModuleManifest(manifest = loadModuleManifest(), catalog = { modules: [] }) {
  const resolvedFlags = (manifest.flags || []).map((flag) => resolveFlag({ flag, manifest, catalog }));
  const enabled = resolvedFlags.filter((flag) => flag.state === "enabled").length;
  const buildable = resolvedFlags.filter((flag) => flag.readiness.canBuild).length;
  const approvalRequired = resolvedFlags.filter((flag) => flag.readiness.requiresApproval).length;
  const blocked = resolvedFlags.filter((flag) => flag.readiness.status.startsWith("blocked")).length;
  const catalogModules = catalog.modules || [];
  const flagModuleIds = new Set(resolvedFlags.map((flag) => flag.moduleId));
  const uncoveredCatalogModules = catalogModules.filter((module) => !flagModuleIds.has(module.id));

  return {
    schemaVersion: manifest.schemaVersion,
    flagCount: resolvedFlags.length,
    enabled,
    buildable,
    approvalRequired,
    blocked,
    artifactKindCount: (manifest.artifactKinds || []).length,
    buildLaneCount: (manifest.buildLanes || []).length,
    intentRecipeCount: (manifest.intentRecipes || []).length,
    catalogCoverage: {
      covered: catalogModules.length - uncoveredCatalogModules.length,
      total: catalogModules.length,
      percent: catalogModules.length ? Math.round(((catalogModules.length - uncoveredCatalogModules.length) / catalogModules.length) * 100) : 0,
    },
    byState: countBy(resolvedFlags, (flag) => flag.state),
    byReadiness: countBy(resolvedFlags, (flag) => flag.readiness.status),
    byRisk: countBy(resolvedFlags, (flag) => flag.risk),
  };
}

export function buildModuleManifestDashboard({ manifest = loadModuleManifest(), catalog }) {
  const flags = (manifest.flags || []).map((flag) => resolveFlag({ flag, manifest, catalog }));
  const uncoveredCatalogModules = (catalog.modules || [])
    .filter((module) => !flags.some((flag) => flag.moduleId === module.id))
    .map((module) => ({
      moduleId: module.id,
      name: module.name,
      category: module.category,
      state: module.state,
      risk: module.risk,
      recommendedFlagState: module.state === "foundation" || module.state === "hero" ? "preview" : "discoverable",
    }));

  return {
    service: manifest.service,
    featureModule: manifest.featureModule,
    summary: summarizeModuleManifest(manifest, catalog),
    flagStates: manifest.flagStates || [],
    artifactKinds: manifest.artifactKinds || [],
    flags,
    buildLanes: manifest.buildLanes || [],
    intentRecipes: manifest.intentRecipes || [],
    uncoveredCatalogModules,
    recentManifestRuns: manifest.recentManifestRuns || [],
    rule: manifest.service.rule,
  };
}

export function findModuleFlag(manifest, catalog, moduleId) {
  const flag = (manifest.flags || []).find((entry) => entry.moduleId === moduleId || entry.id === moduleId);
  if (!flag) return null;
  return resolveFlag({ flag, manifest, catalog });
}

function scoreRecipe(recipe, intent) {
  const text = String(intent || "").toLowerCase();
  return (recipe.keywords || []).reduce((score, keyword) => (
    text.includes(String(keyword).toLowerCase()) ? score + 1 : score
  ), 0);
}

export function matchManifestIntent(manifest, intent) {
  const recipes = manifest.intentRecipes || [];
  const ranked = recipes
    .map((recipe) => ({ ...recipe, score: scoreRecipe(recipe, intent) }))
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence);
  return ranked[0] || null;
}

export function previewModuleFlag({ manifest = loadModuleManifest(), catalog, moduleId, intent = "", actor = null }) {
  const requestedModuleId = moduleId || matchManifestIntent(manifest, intent)?.moduleId || manifest.service.moduleId;
  const flag = findModuleFlag(manifest, catalog, requestedModuleId);
  if (!flag) {
    return { error: "module_flag_not_found", id: requestedModuleId };
  }

  const lane = (manifest.buildLanes || []).find((entry) => (
    flag.moduleId.includes("adapter") || flag.moduleId.includes("mqtt") || flag.moduleId.includes("lorawan")
      ? entry.id === "lane-connectivity-adapter"
      : entry.id === "lane-foundation-module"
  )) || (manifest.buildLanes || [])[0] || null;
  const now = new Date().toISOString();
  const stages = (lane?.stages || []).map((stage) => ({
    id: stage,
    label: stage.replace(/-/g, " "),
    status: flag.readiness.status === "blocked_dependencies"
      ? "blocked"
      : stage === "approval" && flag.readiness.requiresApproval
        ? "approval_required"
        : "ready",
  }));

  return {
    previewId: `module_flag_${flag.moduleId}_${Date.now()}`,
    createdAt: now,
    tenant: manifest.tenant,
    service: manifest.service,
    actor: actor || { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
    status: flag.readiness.status,
    flag,
    lane,
    stages,
    summary: {
      dependencyCount: flag.dependencyStatuses.length,
      missingDependencyCount: flag.missingDependencies.length,
      artifactCount: flag.artifacts.length,
      missingArtifactCount: flag.missingArtifacts.length,
      canBuild: flag.readiness.canBuild,
      canEnable: flag.readiness.canEnable,
      requiresApproval: flag.readiness.requiresApproval,
    },
    nextActions: flag.readiness.status === "ready"
      ? ["record_manifest_evidence", "surface_runtime_dashboard", "preserve_feature_flag"]
      : flag.readiness.status === "approval_required"
        ? ["attach_human_approval", "run_module_certification", "prepare_build_queue_item"]
        : flag.readiness.status === "buildable"
          ? ["prepare_build_queue_item", "generate_iac_fragment", "run_local_tests"]
          : ["resolve_dependencies", "refresh_manifest", "recheck_policy"],
    event: {
      id: `module-manifest-${flag.moduleId}-${Date.now()}`,
      timestamp: now,
      tenant: manifest.tenant,
      siteId: null,
      zoneId: null,
      deviceId: null,
      moduleId: flag.moduleId,
      stream: "module",
      severity: flag.readiness.requiresApproval ? "warning" : "info",
      actor: {
        type: "human",
        id: actor?.subject || "system-preview",
        displayName: actor?.name || "System Preview",
      },
      action: "module.flag.previewed",
      summary: `${flag.moduleName} flag preview is ${flag.readiness.status}.`,
      status: flag.readiness.status,
      trafficClass: flag.trafficClass,
      auditRequired: true,
      payload: {
        flagId: flag.id,
        state: flag.state,
        canBuild: flag.readiness.canBuild,
        canEnable: flag.readiness.canEnable,
      },
    },
  };
}

export function previewModuleIntent({ manifest = loadModuleManifest(), catalog, intent = "", actor = null }) {
  const match = matchManifestIntent(manifest, intent);
  const preview = previewModuleFlag({
    manifest,
    catalog,
    moduleId: match?.moduleId,
    intent,
    actor,
  });

  return {
    intent,
    match: match ? {
      id: match.id,
      name: match.name,
      moduleId: match.moduleId,
      confidence: match.confidence,
      score: match.score,
    } : null,
    preview,
  };
}
