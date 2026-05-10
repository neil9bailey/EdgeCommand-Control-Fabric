import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSecretNameMap,
  getSecretProviderStatus,
  loadExternalSecrets,
} from "../src/secrets.mjs";

test("secret map includes Entra, LLM, and external API defaults", () => {
  const map = buildSecretNameMap();

  assert.equal(map.ENTRA_TENANT_ID, "edgecommand-entra-tenant-id");
  assert.equal(map.OPENAI_API_KEY, "edgecommand-openai-api-key");
  assert.equal(map.AZURE_OPENAI_API_KEY, "edgecommand-azure-openai-api-key");
  assert.equal(map.POSTMAN_API_KEY, "edgecommand-postman-api-key");
});

test("secret map can point EdgeCommand names at an existing DIIaC Key Vault", () => {
  const map = buildSecretNameMap({
    AZURE_KEY_VAULT_SECRET_NAMES_JSON: JSON.stringify({
      OPENAI_API_KEY: "diiac-openai-api-key",
      ENTRA_TENANT_ID: "diiac-entra-tenant-id",
    }),
  });

  assert.equal(map.OPENAI_API_KEY, "diiac-openai-api-key");
  assert.equal(map.ENTRA_TENANT_ID, "diiac-entra-tenant-id");
  assert.equal(map.GITHUB_TOKEN, "edgecommand-github-token");
});

test("secret provider status is environment-only until Key Vault URL is configured", () => {
  const status = getSecretProviderStatus({});

  assert.equal(status.provider, "environment");
  assert.equal(status.keyVaultEnabled, false);
  assert.ok(status.mappedEnvironmentNames.includes("OPENAI_API_KEY"));
});

test("secret loader skips Azure calls when no Key Vault URL is configured", async () => {
  const summary = await loadExternalSecrets({ env: {}, logger: { warn() {} } });

  assert.equal(summary.provider, "environment");
  assert.equal(summary.keyVaultEnabled, false);
  assert.deepEqual(summary.loaded, []);
  assert.ok(summary.skipped.includes("AZURE_KEY_VAULT_URL"));
});

test("required Key Vault mode fails fast without a vault URL", async () => {
  await assert.rejects(
    () => loadExternalSecrets({ env: { AZURE_KEY_VAULT_REQUIRED: "true" }, logger: { warn() {} } }),
    /AZURE_KEY_VAULT_URL is required/,
  );
});
