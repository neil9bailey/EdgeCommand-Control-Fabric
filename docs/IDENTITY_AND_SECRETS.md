# Identity And Secrets

Date: 2026-05-10

EdgeCommand follows the DIIaC bridge pattern for Entra ID and JWT validation while adding a shared Azure Key Vault loader for Entra, LLM, and vendor API secrets.

## Runtime Modes

- `AUTH_MODE=development`: local Docker mode. The API attaches a local development principal with all EdgeCommand roles.
- `AUTH_MODE=entra_jwt_rs256`: production mode. The API validates Entra JWTs using issuer, audience, tenant, and JWKS.
- `AUTH_MODE=entra`: accepted as an alias for `entra_jwt_rs256`.
- `AUTH_MODE=entra_jwt_hs256`: integration-test-only mode for deterministic tests. Do not use in production.

## Entra JWT Settings

These values can be set directly as environment variables or hydrated from Azure Key Vault:

- `ENTRA_TENANT_ID` or `ENTRA_EXPECTED_TENANT_ID`
- `ENTRA_EXPECTED_AUDIENCE`
- `ENTRA_EXPECTED_ISSUERS`
- `ENTRA_OIDC_DISCOVERY_URL`
- `ENTRA_JWKS_URI`
- `ENTRA_ROLE_CLAIM`
- `ENTRA_GROUP_TO_ROLE_JSON`
- `ENTRA_PRINCIPAL_TO_ROLE_JSON`

The API accepts both `api://<client-id>` and bare `<client-id>` audience forms so v1 and v2 Entra access token shapes can be handled by the same configuration. If issuers are not explicitly supplied and a tenant ID is present, the API derives the standard v2 issuer plus the legacy `sts.windows.net` issuer.

## EdgeCommand Roles

- `Automation.Admin`
- `Automation.Security`
- `Automation.AgentApprover`
- `Automation.Operator`
- `Automation.Installer`
- `Automation.Viewer`

DIIaC-style aliases are normalized: `admin`, `standard`, `operator`, `viewer`, `installer`, `security`, and `agent approver`.

## Shared Key Vault

Set `AZURE_KEY_VAULT_URL` to the same Key Vault used by DIIaC. The API uses Azure Identity and Key Vault Secrets SDKs to load configured secret names at startup. Existing environment variables win unless `AZURE_KEY_VAULT_OVERWRITE=true`.

Default secret name mapping:

- `ENTRA_TENANT_ID`: `edgecommand-entra-tenant-id`
- `ENTRA_EXPECTED_AUDIENCE`: `edgecommand-entra-expected-audience`
- `ENTRA_EXPECTED_ISSUERS`: `edgecommand-entra-expected-issuers`
- `ENTRA_GROUP_TO_ROLE_JSON`: `edgecommand-entra-group-to-role-json`
- `ENTRA_PRINCIPAL_TO_ROLE_JSON`: `edgecommand-entra-principal-to-role-json`
- `OPENAI_API_KEY`: `edgecommand-openai-api-key`
- `AZURE_OPENAI_API_KEY`: `edgecommand-azure-openai-api-key`
- `AZURE_OPENAI_ENDPOINT`: `edgecommand-azure-openai-endpoint`
- `ANTHROPIC_API_KEY`: `edgecommand-anthropic-api-key`
- `GITHUB_TOKEN`: `edgecommand-github-token`
- `POSTMAN_API_KEY`: `edgecommand-postman-api-key`
- `HOME_ASSISTANT_TOKEN`: `edgecommand-home-assistant-token`
- `MQTT_USERNAME`: `edgecommand-mqtt-username`
- `MQTT_PASSWORD`: `edgecommand-mqtt-password`

To point at existing DIIaC secret names:

```powershell
$env:AZURE_KEY_VAULT_URL="https://<shared-diiac-vault>.vault.azure.net"
$env:AZURE_KEY_VAULT_SECRET_NAMES_JSON='{"OPENAI_API_KEY":"<existing-openai-secret-name>","ENTRA_TENANT_ID":"<existing-tenant-secret-name>"}'
```

For Azure Container Apps, enable the API app managed identity and grant it `Key Vault Secrets User` on the shared vault.

## References

- Microsoft identity platform access token validation: https://learn.microsoft.com/entra/identity-platform/access-tokens#validate-tokens
- Azure Key Vault Secrets JavaScript client: https://learn.microsoft.com/javascript/api/overview/azure/keyvault-secrets-readme
- Azure Container Apps secret and Key Vault properties: https://learn.microsoft.com/azure/templates/microsoft.app/containerapps
