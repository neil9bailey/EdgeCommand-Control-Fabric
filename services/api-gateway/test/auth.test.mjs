import test from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import {
  buildAuthConfig,
  createAuthMiddleware,
  normalizeRole,
  resolvePrincipal,
  validateJwt,
} from "../src/auth.mjs";

const tenantId = "11111111-2222-3333-4444-555555555555";
const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
const secret = new TextEncoder().encode("edgecommand-test-secret");

async function signToken(claims = {}) {
  return new SignJWT({
    tid: tenantId,
    sub: "user-1",
    oid: "object-1",
    name: "Test Operator",
    roles: ["Automation.Operator"],
    ...claims,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(claims.aud || "edgecommand-api")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

function hsConfig(extra = {}) {
  return buildAuthConfig({
    AUTH_MODE: "entra_jwt_hs256",
    ENTRA_EXPECTED_TENANT_ID: tenantId,
    ENTRA_EXPECTED_AUDIENCE: "api://edgecommand-api",
    ENTRA_JWT_HS256_SECRET: "edgecommand-test-secret",
    ...extra,
  });
}

test("auth config normalizes DIIaC-style Entra settings", () => {
  const config = buildAuthConfig({
    AUTH_MODE: "entra",
    ENTRA_EXPECTED_TENANT_ID: tenantId,
    ENTRA_EXPECTED_AUDIENCE: "api://edgecommand-api",
  });

  assert.equal(config.mode, "entra_jwt_rs256");
  assert.equal(config.enabled, true);
  assert.deepEqual(config.acceptedAudiences.sort(), ["api://edgecommand-api", "edgecommand-api"].sort());
  assert.ok(config.expectedIssuers.includes(issuer));
  assert.ok(config.expectedIssuers.includes(`https://sts.windows.net/${tenantId}/`));
  assert.equal(config.jwksUri, `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`);
});

test("role normalization supports EdgeCommand and DIIaC role names", () => {
  assert.equal(normalizeRole("admin"), "Automation.Admin");
  assert.equal(normalizeRole("standard"), "Automation.Operator");
  assert.equal(normalizeRole("AgentApprover"), "Automation.AgentApprover");
  assert.equal(normalizeRole("Automation.Security"), "Automation.Security");
});

test("HS256 test mode validates audience variants and resolves roles", async () => {
  const config = hsConfig({
    ENTRA_GROUP_TO_ROLE_JSON: JSON.stringify({
      "group-security": { roles: ["Automation.Security", "Automation.AgentApprover"] },
    }),
  });
  const token = await signToken({
    aud: "edgecommand-api",
    roles: ["standard"],
    groups: ["group-security"],
  });

  const claims = await validateJwt(token, config);
  const principal = resolvePrincipal(claims, config);

  assert.equal(claims.tid, tenantId);
  assert.equal(principal.primaryRole, "Automation.Security");
  assert.ok(principal.roles.includes("Automation.AgentApprover"));
  assert.ok(principal.roles.includes("Automation.Operator"));
});

test("JWT validation rejects the wrong tenant", async () => {
  const token = await signToken({ tid: "wrong-tenant" });

  await assert.rejects(() => validateJwt(token, hsConfig()), /tenant_id_mismatch/);
});

test("auth middleware requires bearer tokens in Entra mode", async () => {
  const req = { method: "GET", path: "/api/modules", headers: {} };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalled = false;

  await createAuthMiddleware({ config: hsConfig(), publicPaths: new Set() })(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "authentication_required");
});

test("development mode attaches a local operator principal", async () => {
  const req = { method: "GET", path: "/api/modules", headers: {} };
  const res = {};
  let nextCalled = false;

  await createAuthMiddleware({
    config: buildAuthConfig({ AUTH_MODE: "development", APP_ENV: "development" }),
    publicPaths: new Set(),
  })(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.auth.primaryRole, "Automation.Admin");
  assert.ok(req.auth.roles.includes("Automation.Viewer"));
});
