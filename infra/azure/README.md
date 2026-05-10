# Azure IaC Skeleton

This folder starts the Azure Container Apps target architecture for the EdgeCommand Control Fabric.

Current resources:

- Log Analytics workspace.
- Container Apps managed environment.
- Key Vault with RBAC authorization.
- API gateway container app.
- Web console container app.

The API gateway now has a system-assigned managed identity. Set `sharedKeyVaultUrl` to the existing DIIaC Key Vault URL if EdgeCommand should hydrate Entra, LLM, and vendor API secrets from the same vault. Grant the API managed identity `Key Vault Secrets User` on that shared vault before enabling `AZURE_KEY_VAULT_REQUIRED=true`.

The images are placeholders until CI/CD publishes real images to Azure Container Registry. Production hardening should add private ingress for internal services, ACR, WAF/Front Door, storage/database resources, and per-service Container Apps.
