import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildModuleBuilderDashboard, previewBuildPlan } from "./moduleBuilder.mjs";
import { buildModuleManifestDashboard, previewModuleFlag } from "./moduleManifest.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const marketplacePath = resolve(here, "../../../packages/module-marketplace/module-marketplace.json");

export function loadModuleMarketplace() {
  return JSON.parse(readFileSync(marketplacePath, "utf8"));
}

function countBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function findModule(catalog, moduleId) {
  return (catalog.modules || []).find((module) => module.id === moduleId) || null;
}

function marketplaceStatus({ flag, plan, uncovered }) {
  if (uncovered) return "needs_manifest";
  if (flag?.state === "enabled") return "installed";
  if (flag?.readiness?.requiresApproval || plan?.readiness?.approvalRequired) return "approval_required";
  if (plan?.readiness?.canQueue || flag?.readiness?.canBuild) return "available";
  return "requested";
}

function resolveListings({ marketplace, catalog, manifest, builder }) {
  const manifestDashboard = buildModuleManifestDashboard({ manifest, catalog });
  const builderDashboard = buildModuleBuilderDashboard({ builder, manifest, catalog });
  const plansByModule = new Map((builderDashboard.plans || []).map((plan) => [plan.moduleId, plan]));
  const flagsByModule = new Map((manifestDashboard.flags || []).map((flag) => [flag.moduleId, flag]));

  const flaggedListings = (manifestDashboard.flags || []).map((flag) => {
    const module = findModule(catalog, flag.moduleId);
    const plan = plansByModule.get(flag.moduleId) || null;
    const status = marketplaceStatus({ flag, plan, uncovered: false });
    return {
      moduleId: flag.moduleId,
      name: flag.moduleName,
      category: flag.category,
      description: flag.description,
      risk: flag.risk,
      trafficClass: flag.trafficClass,
      status,
      flagState: flag.state,
      readiness: flag.readiness.status,
      buildPlanId: plan?.id || null,
      queueStatus: plan?.readiness.queueStatus || null,
      canRequest: status === "available",
      requiresApproval: Boolean(flag.readiness.requiresApproval || plan?.readiness.approvalRequired),
      collectionIds: (marketplace.curatedCollections || [])
        .filter((collection) => (collection.moduleIds || []).includes(flag.moduleId))
        .map((collection) => collection.id),
      kpis: module?.kpis || [],
    };
  });

  const uncoveredListings = (manifestDashboard.uncoveredCatalogModules || []).map((entry) => {
    const module = findModule(catalog, entry.moduleId);
    return {
      moduleId: entry.moduleId,
      name: entry.name,
      category: entry.category,
      description: module?.description || "Catalog module needs a marketplace manifest before build planning.",
      risk: entry.risk,
      trafficClass: module?.trafficClass || "P2_CONTROL",
      status: "needs_manifest",
      flagState: null,
      readiness: "needs_manifest",
      buildPlanId: null,
      queueStatus: null,
      canRequest: true,
      requiresApproval: entry.risk === "high",
      collectionIds: (marketplace.curatedCollections || [])
        .filter((collection) => (collection.moduleIds || []).includes(entry.moduleId))
        .map((collection) => collection.id),
      kpis: module?.kpis || [],
    };
  });

  return [...flaggedListings, ...uncoveredListings];
}

export function summarizeModuleMarketplace(marketplace = loadModuleMarketplace(), catalog, manifest, builder) {
  const listings = resolveListings({ marketplace, catalog, manifest, builder });
  return {
    schemaVersion: marketplace.schemaVersion,
    listingCount: listings.length,
    installed: listings.filter((listing) => listing.status === "installed").length,
    available: listings.filter((listing) => listing.status === "available").length,
    requested: listings.filter((listing) => listing.status === "requested").length,
    approvalRequired: listings.filter((listing) => listing.status === "approval_required").length,
    needsManifest: listings.filter((listing) => listing.status === "needs_manifest").length,
    queueReady: listings.filter((listing) => listing.queueStatus === "ready_to_queue").length,
    collectionCount: (marketplace.curatedCollections || []).length,
    requestCount: (marketplace.requests || []).length,
    byStatus: countBy(listings, (listing) => listing.status),
    byCategory: countBy(listings, (listing) => listing.category),
    byRisk: countBy(listings, (listing) => listing.risk),
  };
}

export function buildModuleMarketplaceDashboard({ marketplace = loadModuleMarketplace(), catalog, manifest, builder }) {
  const listings = resolveListings({ marketplace, catalog, manifest, builder });
  const listingsById = new Map(listings.map((listing) => [listing.moduleId, listing]));
  const requests = (marketplace.requests || []).map((request) => ({
    ...request,
    listing: listingsById.get(request.moduleId) || null,
  }));

  return {
    service: marketplace.service,
    featureModule: marketplace.featureModule,
    summary: summarizeModuleMarketplace(marketplace, catalog, manifest, builder),
    requestStates: marketplace.requestStates || [],
    curatedCollections: (marketplace.curatedCollections || []).map((collection) => ({
      ...collection,
      listings: (collection.moduleIds || []).map((moduleId) => listingsById.get(moduleId)).filter(Boolean),
    })),
    listings,
    requests,
    intentRecipes: marketplace.intentRecipes || [],
    recentMarketplaceRuns: marketplace.recentMarketplaceRuns || [],
    rule: marketplace.service.rule,
  };
}

function findRequest(marketplace, id) {
  return (marketplace.requests || []).find((request) => request.id === id || request.moduleId === id) || null;
}

function scoreRecipe(recipe, intent) {
  const text = String(intent || "").toLowerCase();
  return (recipe.keywords || []).reduce((score, keyword) => (
    text.includes(String(keyword).toLowerCase()) ? score + 1 : score
  ), 0);
}

export function matchMarketplaceIntent(marketplace, intent) {
  return (marketplace.intentRecipes || [])
    .map((recipe) => ({ ...recipe, score: scoreRecipe(recipe, intent) }))
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence)[0] || null;
}

export function previewMarketplaceRequest({ marketplace = loadModuleMarketplace(), catalog, manifest, builder, requestId, actor = null }) {
  const request = findRequest(marketplace, requestId);
  if (!request) return { error: "marketplace_request_not_found", id: requestId };

  const dashboard = buildModuleMarketplaceDashboard({ marketplace, catalog, manifest, builder });
  const listing = dashboard.listings.find((entry) => entry.moduleId === request.moduleId) || null;
  const flagPreview = previewModuleFlag({
    manifest,
    catalog,
    moduleId: request.moduleId,
    actor: actor || { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  });
  const buildPreview = listing?.buildPlanId ? previewBuildPlan({
    builder,
    manifest,
    catalog,
    planId: listing.buildPlanId,
    actor: actor || { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  }) : null;
  const now = new Date().toISOString();
  const status = buildPreview?.status || flagPreview.status || listing?.status || request.status;

  return {
    previewId: `marketplace_request_${request.id}_${Date.now()}`,
    createdAt: now,
    tenant: marketplace.tenant,
    service: marketplace.service,
    actor: actor || { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
    status,
    request,
    listing,
    flagPreview: flagPreview.error ? null : flagPreview,
    buildPreview: buildPreview?.error ? null : buildPreview,
    summary: {
      canRequest: Boolean(listing?.canRequest),
      requiresApproval: Boolean(listing?.requiresApproval || buildPreview?.summary.requiresApproval || flagPreview.summary?.requiresApproval),
      hasBuildPlan: Boolean(listing?.buildPlanId),
      queueReady: buildPreview?.summary.canQueue || false,
    },
    nextActions: buildPreview?.summary.canQueue
      ? ["queue_build_plan", "run_verification", "prepare_certification"]
      : listing?.requiresApproval
        ? ["attach_human_approval", "review_policy_gates", "prepare_certification"]
        : listing?.status === "needs_manifest"
          ? ["create_manifest_flag", "define_build_plan", "rerun_marketplace_preview"]
          : ["refresh_marketplace_state", "review_module_request"],
    event: {
      id: `marketplace-${request.id}-${Date.now()}`,
      timestamp: now,
      tenant: marketplace.tenant,
      siteId: null,
      zoneId: null,
      deviceId: null,
      moduleId: request.moduleId,
      stream: "module",
      severity: listing?.requiresApproval ? "warning" : "info",
      actor: {
        type: "human",
        id: actor?.subject || "system-preview",
        displayName: actor?.name || "System Preview",
      },
      action: "module.marketplace.request.previewed",
      summary: `${request.name} marketplace request resolved to ${status}.`,
      status,
      trafficClass: request.priority,
      auditRequired: true,
      payload: {
        requestId: request.id,
        moduleId: request.moduleId,
        buildPlanId: listing?.buildPlanId || null,
      },
    },
  };
}

export function previewMarketplaceIntent({ marketplace = loadModuleMarketplace(), catalog, manifest, builder, intent = "", actor = null }) {
  const match = matchMarketplaceIntent(marketplace, intent);
  const preview = previewMarketplaceRequest({
    marketplace,
    catalog,
    manifest,
    builder,
    requestId: match?.requestId || marketplace.service.defaultRequestId,
    actor,
  });

  return {
    intent,
    match: match ? {
      id: match.id,
      name: match.name,
      requestId: match.requestId,
      confidence: match.confidence,
      score: match.score,
    } : null,
    preview,
  };
}
