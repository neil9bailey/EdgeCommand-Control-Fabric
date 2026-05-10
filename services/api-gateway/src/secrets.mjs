export const DEFAULT_KEY_VAULT_SECRET_NAMES = {
  ENTRA_TENANT_ID: "edgecommand-entra-tenant-id",
  ENTRA_EXPECTED_AUDIENCE: "edgecommand-entra-expected-audience",
  ENTRA_EXPECTED_ISSUERS: "edgecommand-entra-expected-issuers",
  ENTRA_GROUP_TO_ROLE_JSON: "edgecommand-entra-group-to-role-json",
  ENTRA_PRINCIPAL_TO_ROLE_JSON: "edgecommand-entra-principal-to-role-json",
  EDGECOMMAND_INTERNAL_API_TOKEN: "edgecommand-internal-api-token",
  OPENAI_API_KEY: "edgecommand-openai-api-key",
  AZURE_OPENAI_API_KEY: "edgecommand-azure-openai-api-key",
  AZURE_OPENAI_ENDPOINT: "edgecommand-azure-openai-endpoint",
  ANTHROPIC_API_KEY: "edgecommand-anthropic-api-key",
  GITHUB_TOKEN: "edgecommand-github-token",
  POSTMAN_API_KEY: "edgecommand-postman-api-key",
  HOME_ASSISTANT_TOKEN: "edgecommand-home-assistant-token",
  MQTT_USERNAME: "edgecommand-mqtt-username",
  MQTT_PASSWORD: "edgecommand-mqtt-password",
};

function parseJsonObject(raw, fallback = {}) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function splitCsv(raw) {
  return String(raw || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildSecretNameMap(env = process.env) {
  return {
    ...DEFAULT_KEY_VAULT_SECRET_NAMES,
    ...parseJsonObject(env.AZURE_KEY_VAULT_SECRET_NAMES_JSON),
  };
}

export function getSecretProviderStatus(env = process.env, lastLoad = null) {
  const keyVaultEnabled = Boolean(env.AZURE_KEY_VAULT_URL);
  const map = buildSecretNameMap(env);

  return {
    provider: keyVaultEnabled ? "azure_key_vault" : "environment",
    keyVaultEnabled,
    keyVaultRequired: env.AZURE_KEY_VAULT_REQUIRED === "true",
    overwriteEnvironment: env.AZURE_KEY_VAULT_OVERWRITE === "true",
    mappedEnvironmentNames: Object.keys(map).sort(),
    lastLoad,
  };
}

export async function loadExternalSecrets({ env = process.env, logger = console } = {}) {
  const keyVaultUrl = env.AZURE_KEY_VAULT_URL;
  const required = env.AZURE_KEY_VAULT_REQUIRED === "true";
  const overwrite = env.AZURE_KEY_VAULT_OVERWRITE === "true";
  const requiredEnvNames = splitCsv(env.AZURE_KEY_VAULT_REQUIRED_SECRET_ENV_NAMES);
  const enforcedEnvNames = required
    ? requiredEnvNames.length
      ? requiredEnvNames
      : Object.keys(buildSecretNameMap(env))
    : requiredEnvNames;
  const secretNameMap = buildSecretNameMap(env);

  const summary = {
    provider: keyVaultUrl ? "azure_key_vault" : "environment",
    keyVaultEnabled: Boolean(keyVaultUrl),
    loaded: [],
    skipped: [],
    missing: [],
    failed: [],
  };

  if (!keyVaultUrl) {
    summary.skipped.push("AZURE_KEY_VAULT_URL");
    if (required) {
      throw new Error("AZURE_KEY_VAULT_URL is required when AZURE_KEY_VAULT_REQUIRED=true");
    }
    return summary;
  }

  const [{ DefaultAzureCredential }, { SecretClient }] = await Promise.all([
    import("@azure/identity"),
    import("@azure/keyvault-secrets"),
  ]);

  const client = new SecretClient(keyVaultUrl, new DefaultAzureCredential());

  for (const [envName, secretName] of Object.entries(secretNameMap)) {
    if (!secretName) continue;
    if (env[envName] && !overwrite) {
      summary.skipped.push(envName);
      continue;
    }

    try {
      const secret = await client.getSecret(secretName);
      if (typeof secret.value === "string" && secret.value.length > 0) {
        env[envName] = secret.value;
        summary.loaded.push(envName);
      } else {
        summary.missing.push(envName);
      }
    } catch (error) {
      summary.failed.push({ envName, reason: error.name || "secret_load_failed" });
      if (enforcedEnvNames.includes(envName)) {
        throw new Error(`Failed to load required Key Vault secret for ${envName}: ${error.message}`);
      }
      logger.warn?.(`[secrets] ${envName} was not loaded from Key Vault: ${error.name || error.message}`);
    }
  }

  if (enforcedEnvNames.length > 0) {
    const missingRequired = enforcedEnvNames.filter((envName) => !env[envName]);
    if (missingRequired.length > 0) {
      throw new Error(`Required Key Vault secrets missing: ${missingRequired.join(", ")}`);
    }
  }

  return summary;
}
