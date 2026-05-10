import { createRemoteJWKSet, errors as joseErrors, jwtVerify } from "jose";

export const EDGE_ROLES = [
  "Automation.Admin",
  "Automation.Security",
  "Automation.AgentApprover",
  "Automation.Operator",
  "Automation.Installer",
  "Automation.Viewer",
];

const ROLE_PRIORITY = new Map(EDGE_ROLES.map((role, index) => [role, EDGE_ROLES.length - index]));
const remoteJwks = new Map();

function splitCsv(raw) {
  return String(raw || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonObject(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function acceptedAudiences(expectedAudience) {
  if (!expectedAudience) return [];
  const audiences = new Set([expectedAudience]);
  if (expectedAudience.startsWith("api://")) {
    audiences.add(expectedAudience.slice(6));
  } else {
    audiences.add(`api://${expectedAudience}`);
  }
  return [...audiences];
}

function normalizeMode(rawMode) {
  const mode = String(rawMode || "development").toLowerCase();
  if (mode === "entra") return "entra_jwt_rs256";
  return mode;
}

function defaultIssuers(tenantId) {
  if (!tenantId) return [];
  return [`https://login.microsoftonline.com/${tenantId}/v2.0`, `https://sts.windows.net/${tenantId}/`];
}

export function buildAuthConfig(env = process.env) {
  const tenantId = env.ENTRA_TENANT_ID || env.ENTRA_EXPECTED_TENANT_ID || "";
  const expectedAudience = env.ENTRA_EXPECTED_AUDIENCE || "";
  const configuredIssuers = splitCsv(env.ENTRA_EXPECTED_ISSUERS || env.ENTRA_EXPECTED_ISSUER);
  const mode = normalizeMode(env.AUTH_MODE);

  return {
    appEnv: env.APP_ENV || "development",
    rawMode: env.AUTH_MODE || "development",
    mode,
    enabled: mode === "entra_jwt_rs256" || mode === "entra_jwt_hs256",
    tenantId,
    expectedAudience,
    acceptedAudiences: acceptedAudiences(expectedAudience),
    expectedIssuers: configuredIssuers.length ? configuredIssuers : defaultIssuers(tenantId),
    oidcDiscoveryUrl:
      env.ENTRA_OIDC_DISCOVERY_URL ||
      (tenantId ? `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration` : ""),
    jwksUri: env.ENTRA_JWKS_URI || (tenantId ? `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys` : ""),
    roleClaim: env.ENTRA_ROLE_CLAIM || "roles",
    groupRoleMap: parseJsonObject(env.ENTRA_GROUP_TO_ROLE_JSON),
    principalRoleMap: parseJsonObject(env.ENTRA_PRINCIPAL_TO_ROLE_JSON),
    hs256Secret: env.ENTRA_JWT_HS256_SECRET || "",
  };
}

function getRemoteJwks(jwksUri) {
  if (!remoteJwks.has(jwksUri)) {
    remoteJwks.set(jwksUri, createRemoteJWKSet(new URL(jwksUri)));
  }
  return remoteJwks.get(jwksUri);
}

export function normalizeRole(raw) {
  if (!raw || typeof raw !== "string") return null;
  const compact = raw.toLowerCase().replace(/[\s_-]+/g, "").replace(/^automation\./, "automation");
  const aliases = {
    admin: "Automation.Admin",
    automationadmin: "Automation.Admin",
    security: "Automation.Security",
    automationsecurity: "Automation.Security",
    approver: "Automation.AgentApprover",
    agentapprover: "Automation.AgentApprover",
    automationagentapprover: "Automation.AgentApprover",
    standard: "Automation.Operator",
    operator: "Automation.Operator",
    automationoperator: "Automation.Operator",
    installer: "Automation.Installer",
    automationinstaller: "Automation.Installer",
    customer: "Automation.Viewer",
    viewer: "Automation.Viewer",
    automationviewer: "Automation.Viewer",
  };
  return aliases[compact] || EDGE_ROLES.find((role) => role.toLowerCase() === raw.toLowerCase()) || null;
}

function mappingRoles(entry) {
  if (!entry) return [];
  if (typeof entry === "string") return [normalizeRole(entry)].filter(Boolean);
  if (Array.isArray(entry)) return entry.map(normalizeRole).filter(Boolean);
  if (typeof entry === "object") {
    return [
      normalizeRole(entry.role),
      ...(Array.isArray(entry.roles) ? entry.roles.map(normalizeRole) : []),
    ].filter(Boolean);
  }
  return [];
}

function sortRoles(roles) {
  return [...new Set(roles)].sort((a, b) => (ROLE_PRIORITY.get(b) || 0) - (ROLE_PRIORITY.get(a) || 0));
}

export function inferTokenType(claims = {}) {
  if (String(claims.idtyp || "").toLowerCase() === "app") return "app_only";
  if (typeof claims.scp === "string" && claims.scp.trim()) return "delegated";
  if (claims.oid || claims.upn || claims.preferred_username || claims.email) return "delegated";
  if (claims.appid || claims.azp) return "app_only";
  return "delegated";
}

export function resolvePrincipal(claims = {}, config = buildAuthConfig()) {
  const roles = [];
  const roleClaim = claims[config.roleClaim];

  if (Array.isArray(roleClaim)) {
    for (const role of roleClaim) {
      roles.push(...mappingRoles(config.groupRoleMap[role]));
      roles.push(normalizeRole(role));
    }
  } else if (typeof roleClaim === "string") {
    roles.push(normalizeRole(roleClaim));
  }

  if (Array.isArray(claims.groups)) {
    for (const groupId of claims.groups) {
      roles.push(...mappingRoles(config.groupRoleMap[groupId]));
    }
  }

  for (const principalId of [claims.appid, claims.azp, claims.oid]) {
    if (principalId && config.principalRoleMap[principalId]) {
      roles.push(...mappingRoles(config.principalRoleMap[principalId]));
    }
  }

  const sortedRoles = sortRoles(roles.filter(Boolean));
  if (sortedRoles.length === 0) return null;

  return {
    subject: claims.sub,
    objectId: claims.oid || null,
    name: claims.name || claims.preferred_username || claims.sub || "unknown",
    email: claims.email || claims.preferred_username || null,
    tenantId: claims.tid || config.tenantId || null,
    roles: sortedRoles,
    primaryRole: sortedRoles[0],
    roleClaim: claims[config.roleClaim] || [],
    groups: claims.groups || [],
    principalId: claims.appid || claims.azp || null,
    tokenType: inferTokenType(claims),
    issuedAt: claims.iat ? new Date(claims.iat * 1000).toISOString() : null,
    expiresAt: claims.exp ? new Date(claims.exp * 1000).toISOString() : null,
  };
}

export async function validateJwt(token, config = buildAuthConfig()) {
  const validationOptions = {
    audience: config.acceptedAudiences.length ? config.acceptedAudiences : undefined,
    issuer: config.expectedIssuers.length ? config.expectedIssuers : undefined,
  };

  const key =
    config.mode === "entra_jwt_hs256"
      ? new TextEncoder().encode(config.hs256Secret)
      : getRemoteJwks(config.jwksUri);

  if (config.mode === "entra_jwt_hs256" && !config.hs256Secret) {
    throw new Error("ENTRA_JWT_HS256_SECRET is required for HS256 test mode");
  }
  if (config.mode === "entra_jwt_rs256" && !config.jwksUri) {
    throw new Error("ENTRA_TENANT_ID or ENTRA_JWKS_URI is required for RS256 mode");
  }

  const { payload } = await jwtVerify(token, key, {
    ...validationOptions,
    algorithms: config.mode === "entra_jwt_hs256" ? ["HS256"] : undefined,
  });

  if (config.tenantId && payload.tid !== config.tenantId) {
    throw new Error("tenant_id_mismatch");
  }

  return payload;
}

export function createDevelopmentPrincipal() {
  return {
    subject: "local-dev-operator",
    objectId: null,
    name: "Local Development Operator",
    email: null,
    tenantId: "vendorlogic.io",
    roles: EDGE_ROLES,
    primaryRole: "Automation.Admin",
    roleClaim: EDGE_ROLES,
    groups: [],
    principalId: null,
    tokenType: "local_development",
    issuedAt: null,
    expiresAt: null,
  };
}

export function publicAuthStatus(config = buildAuthConfig(), secretProvider = null) {
  return {
    mode: config.rawMode,
    normalizedMode: config.mode,
    entraEnabled: config.enabled,
    jwtValidation: config.enabled ? "required" : "not_required_in_local_dev",
    tenant: config.tenantId || "vendorlogic.io",
    audience: config.expectedAudience ? "configured" : "missing",
    issuerPinning: config.expectedIssuers.length > 0 ? "configured" : "missing",
    jwks: config.jwksUri ? "configured" : "missing",
    roleClaim: config.roleClaim,
    groupRoleMapEntries: Object.keys(config.groupRoleMap).length,
    principalRoleMapEntries: Object.keys(config.principalRoleMap).length,
    roles: EDGE_ROLES,
    secretProvider,
  };
}

export function createAuthMiddleware({ config = buildAuthConfig(), publicPaths = new Set(), secretProvider = null } = {}) {
  return async function authMiddleware(req, res, next) {
    if (req.method === "OPTIONS" || publicPaths.has(req.path)) return next();

    if (!config.enabled) {
      if (config.appEnv === "production") {
        return res.status(503).json({
          error: "auth_mode_misconfigured",
          message: "AUTH_MODE must be entra_jwt_rs256 in production.",
          auth: publicAuthStatus(config, secretProvider),
        });
      }
      req.auth = createDevelopmentPrincipal();
      req.actor = req.auth;
      return next();
    }

    const internalToken = process.env.EDGECOMMAND_INTERNAL_API_TOKEN || "";
    const providedInternalToken = req.headers["x-edgecommand-token"] || "";
    if (internalToken && providedInternalToken && providedInternalToken === internalToken) {
      req.auth = {
        ...createDevelopmentPrincipal(),
        subject: "internal-service",
        name: "Internal Service",
        tokenType: "internal_service_token",
      };
      req.actor = req.auth;
      return next();
    }

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "authentication_required",
        message: "Bearer token required.",
        auth_mode: config.rawMode,
      });
    }

    try {
      const claims = await validateJwt(authHeader.slice(7), config);
      const principal = resolvePrincipal(claims, config);
      if (!principal) {
        return res.status(403).json({
          error: "role_not_resolved",
          message: "Token is valid, but no EdgeCommand role could be resolved.",
          auth_mode: config.rawMode,
        });
      }
      req.auth = principal;
      req.actor = principal;
      next();
    } catch (error) {
      const expired = error instanceof joseErrors.JWTExpired;
      const claimFailure = error instanceof joseErrors.JWTClaimValidationFailed;
      return res.status(401).json({
        error: expired ? "token_expired" : claimFailure ? "claim_validation_failed" : "token_invalid",
        message: error.message,
        auth_mode: config.rawMode,
      });
    }
  };
}

export function requireRoles(allowedRoles = []) {
  return function roleMiddleware(req, res, next) {
    const roles = req.auth?.roles || [];
    if (!allowedRoles.some((role) => roles.includes(role))) {
      return res.status(403).json({
        error: "insufficient_role",
        required: allowedRoles,
      });
    }
    next();
  };
}
