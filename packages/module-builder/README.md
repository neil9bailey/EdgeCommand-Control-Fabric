# Module Builder And IaC Fragments

E19 adds the proposal-only build planner that turns module manifest flags into concrete local Docker and Azure build packages.

The builder does not mutate `docker-compose.yml`, Bicep files, or service source in this foundation slice. It produces a governed plan that can later be approved, certified, and applied by the module certification and builder automation epics.

Each build package describes:

- The target module and feature flag.
- Compose service fragments for Docker Desktop.
- Azure Container Apps and Key Vault binding fragments.
- Migration hooks and adapter contracts.
- Verification commands.
- Human approval and certification requirements.

This keeps human-triggered module builds precise, inspectable, and safe before any generated infrastructure changes land in the repo.
