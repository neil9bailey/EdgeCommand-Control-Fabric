# Azure IaC Skeleton

This folder starts the Azure Container Apps target architecture for the EdgeCommand Control Fabric.

Current resources:

- Log Analytics workspace.
- Container Apps managed environment.
- Key Vault with RBAC authorization.
- API gateway container app.
- Web console container app.

The images are placeholders until CI/CD publishes real images to Azure Container Registry. Production hardening should add managed identity, private ingress for internal services, ACR, WAF/Front Door, storage/database resources, and per-service Container Apps.

