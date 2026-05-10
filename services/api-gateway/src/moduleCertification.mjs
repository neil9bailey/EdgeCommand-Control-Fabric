import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { previewBuildPlan } from "./moduleBuilder.mjs";
import { buildModuleManifestDashboard } from "./moduleManifest.mjs";
import { buildModuleMarketplaceDashboard, previewMarketplaceRequest } from "./moduleMarketplace.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const certificationPath = resolve(here, "../../../packages/module-certification/module-certification.json");

export function loadModuleCertification() {
  return JSON.parse(readFileSync(certificationPath, "utf8"));
}

function countBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function findProfile(certification, id) {
  return (certification.profiles || []).find((profile) => (
    profile.id === id || profile.moduleId === id || profile.buildPlanId === id || profile.requestId === id
  )) || null;
}

function latestHarnessRun(certification, profileId) {
  return [...(certification.harnessRuns || [])].reverse().find((run) => run.profileId === profileId) || null;
}

function scoreRecipe(recipe, intent) {
  const text = String(intent || "").toLowerCase();
  return (recipe.keywords || []).reduce((score, keyword) => (
    text.includes(String(keyword).toLowerCase()) ? score + 1 : score
  ), 0);
}

export function matchCertificationIntent(certification, intent) {
  return (certification.intentRecipes || [])
    .map((recipe) => ({ ...recipe, score: scoreRecipe(recipe, intent) }))
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence)[0] || null;
}

function resolveProfile({ certification, marketplace, builder, manifest, catalog, profile }) {
  const manifestDashboard = buildModuleManifestDashboard({ manifest, catalog });
  const marketplaceDashboard = buildModuleMarketplaceDashboard({ marketplace, catalog, manifest, builder });
  const flag = (manifestDashboard.flags || []).find((entry) => entry.moduleId === profile.moduleId) || null;
  const listing = (marketplaceDashboard.listings || []).find((entry) => entry.moduleId === profile.moduleId) || null;
  const request = (marketplaceDashboard.requests || []).find((entry) => entry.id === profile.requestId) || null;
  const harnessRun = latestHarnessRun(certification, profile.id);
  const suites = (profile.testSuiteIds || []).map((suiteId) => {
    const suite = (certification.testSuites || []).find((entry) => entry.id === suiteId) || { id: suiteId, name: suiteId, requiredEvidence: [] };
    const result = (harnessRun?.suiteResults || []).find((entry) => entry.suiteId === suiteId);
    return {
      ...suite,
      status: result?.status || "pending",
      durationMs: result?.durationMs || 0,
    };
  });
  const attachedEvidence = new Set((profile.evidence || []).filter((entry) => entry.status === "attached").map((entry) => entry.type));
  const missingEvidence = (profile.requiredEvidence || []).filter((type) => !attachedEvidence.has(type));
  const failedSuite = suites.some((suite) => suite.status === "failed");
  const pendingSuite = suites.some((suite) => ["pending", "approval_required"].includes(suite.status));
  const missingApproval = profile.requiresApproval && !attachedEvidence.has("approval_record");
  const inferredStatus = failedSuite
    ? "failed"
    : missingApproval
      ? "approval_required"
      : missingEvidence.length > 0 || pendingSuite
        ? "ready_for_certification"
        : "passed";

  return {
    ...profile,
    status: profile.status || inferredStatus,
    readiness: {
      canEnable: inferredStatus === "passed" && profile.status === "passed",
      inferredStatus,
      missingEvidence,
      attachedEvidence: [...attachedEvidence],
      suiteCount: suites.length,
      passedSuites: suites.filter((suite) => suite.status === "passed").length,
      pendingSuites: suites.filter((suite) => ["pending", "approval_required"].includes(suite.status)).length,
      failedSuites: suites.filter((suite) => suite.status === "failed").length,
      requiresApproval: Boolean(profile.requiresApproval || missingApproval),
      marketplaceStatus: listing?.status || request?.status || "unknown",
      buildQueueStatus: listing?.queueStatus || null,
    },
    flag,
    listing,
    request,
    testSuites: suites,
    harnessRun,
  };
}

function resolveProfiles({ certification, marketplace, builder, manifest, catalog }) {
  return (certification.profiles || []).map((profile) => resolveProfile({
    certification,
    marketplace,
    builder,
    manifest,
    catalog,
    profile,
  }));
}

export function summarizeModuleCertification(certification = loadModuleCertification(), marketplace, builder, manifest, catalog) {
  const profiles = resolveProfiles({ certification, marketplace, builder, manifest, catalog });
  return {
    schemaVersion: certification.schemaVersion,
    profileCount: profiles.length,
    passed: profiles.filter((profile) => profile.status === "passed").length,
    readyForCertification: profiles.filter((profile) => profile.status === "ready_for_certification").length,
    approvalRequired: profiles.filter((profile) => profile.status === "approval_required").length,
    failed: profiles.filter((profile) => profile.status === "failed").length,
    blocked: profiles.filter((profile) => profile.status === "blocked").length,
    canEnable: profiles.filter((profile) => profile.readiness.canEnable).length,
    testSuiteCount: (certification.testSuites || []).length,
    harnessRunCount: (certification.harnessRuns || []).length,
    evidenceRequirementCount: profiles.reduce((sum, profile) => sum + (profile.requiredEvidence || []).length, 0),
    queueReady: profiles.filter((profile) => profile.readiness.buildQueueStatus === "ready_to_queue").length,
    byStatus: countBy(profiles, (profile) => profile.status),
    byRisk: countBy(profiles, (profile) => profile.risk),
    byTargetEnvironment: countBy(profiles, (profile) => profile.targetEnvironment),
  };
}

export function buildModuleCertificationDashboard({ certification = loadModuleCertification(), marketplace, builder, manifest, catalog }) {
  const profiles = resolveProfiles({ certification, marketplace, builder, manifest, catalog });
  return {
    service: certification.service,
    featureModule: certification.featureModule,
    summary: summarizeModuleCertification(certification, marketplace, builder, manifest, catalog),
    certificationStates: certification.certificationStates || [],
    evidenceTypes: certification.evidenceTypes || [],
    testSuites: certification.testSuites || [],
    profiles,
    harnessRuns: certification.harnessRuns || [],
    intentRecipes: certification.intentRecipes || [],
    rule: certification.service.rule,
  };
}

export function previewCertificationProfile({ certification = loadModuleCertification(), marketplace, builder, manifest, catalog, profileId, actor = null }) {
  const profile = findProfile(certification, profileId);
  if (!profile) return { error: "module_certification_profile_not_found", id: profileId };

  const resolvedProfile = resolveProfile({ certification, marketplace, builder, manifest, catalog, profile });
  const marketplacePreview = resolvedProfile.requestId ? previewMarketplaceRequest({
    marketplace,
    catalog,
    manifest,
    builder,
    requestId: resolvedProfile.requestId,
    actor: actor || { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  }) : null;
  const buildPreview = resolvedProfile.buildPlanId ? previewBuildPlan({
    builder,
    manifest,
    catalog,
    planId: resolvedProfile.buildPlanId,
    actor: actor || { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
  }) : null;
  const now = new Date().toISOString();
  const severity = resolvedProfile.status === "failed" || resolvedProfile.status === "blocked"
    ? "critical"
    : resolvedProfile.status === "approval_required"
      ? "warning"
      : "info";

  return {
    previewId: `module_certification_${resolvedProfile.id}_${Date.now()}`,
    createdAt: now,
    tenant: certification.tenant,
    service: certification.service,
    actor: actor || { subject: "system-preview", name: "System Preview", roles: ["Automation.Operator"] },
    status: resolvedProfile.status,
    profile: resolvedProfile,
    gates: resolvedProfile.gates || [],
    evidence: resolvedProfile.evidence || [],
    testSuites: resolvedProfile.testSuites,
    harnessRun: resolvedProfile.harnessRun,
    marketplacePreview: marketplacePreview?.error ? null : marketplacePreview,
    buildPreview: buildPreview?.error ? null : buildPreview,
    summary: {
      canEnable: resolvedProfile.readiness.canEnable,
      requiresApproval: resolvedProfile.readiness.requiresApproval,
      missingEvidence: resolvedProfile.readiness.missingEvidence,
      attachedEvidence: resolvedProfile.readiness.attachedEvidence,
      passedSuites: resolvedProfile.readiness.passedSuites,
      pendingSuites: resolvedProfile.readiness.pendingSuites,
      failedSuites: resolvedProfile.readiness.failedSuites,
      queueReady: resolvedProfile.readiness.buildQueueStatus === "ready_to_queue",
    },
    nextActions: resolvedProfile.status === "passed"
      ? ["prepare_enablement_record", "stage_adapter_scaffold", "keep_preview_boundary"]
      : resolvedProfile.status === "approval_required"
        ? ["attach_human_approval", "run_required_verification", "refresh_certification_preview"]
        : resolvedProfile.status === "failed"
          ? ["inspect_failed_suite", "block_enablement", "open_fix_plan"]
          : resolvedProfile.nextActions || ["attach_missing_evidence", "rerun_certification"],
    event: {
      id: `module-certification-${resolvedProfile.id}-${Date.now()}`,
      timestamp: now,
      tenant: certification.tenant,
      siteId: null,
      zoneId: null,
      deviceId: null,
      moduleId: resolvedProfile.moduleId,
      stream: "module",
      severity,
      actor: {
        type: "human",
        id: actor?.subject || "system-preview",
        displayName: actor?.name || "System Preview",
      },
      action: "module.certification.previewed",
      summary: `${resolvedProfile.name} certification resolved to ${resolvedProfile.status}.`,
      status: resolvedProfile.status,
      trafficClass: resolvedProfile.trafficClass,
      auditRequired: true,
      payload: {
        profileId: resolvedProfile.id,
        moduleId: resolvedProfile.moduleId,
        buildPlanId: resolvedProfile.buildPlanId,
        missingEvidence: resolvedProfile.readiness.missingEvidence,
      },
    },
  };
}

export function previewCertificationIntent({ certification = loadModuleCertification(), marketplace, builder, manifest, catalog, intent = "", actor = null }) {
  const match = matchCertificationIntent(certification, intent);
  const preview = previewCertificationProfile({
    certification,
    marketplace,
    builder,
    manifest,
    catalog,
    profileId: match?.profileId || certification.service.defaultProfileId,
    actor,
  });

  return {
    intent,
    match: match ? {
      id: match.id,
      name: match.name,
      profileId: match.profileId,
      confidence: match.confidence,
      score: match.score,
    } : null,
    preview,
  };
}
