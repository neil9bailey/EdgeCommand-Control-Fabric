# EdgeCommand Control Fabric

This workspace contains the blueprint for a modular, agentic, Azure-ready home automation platform with local Docker Desktop development and a first-of-kind Semantic Narrowband SD-WAN architecture for LoRaWAN-class remote control.

Start here:

- [Product Blueprint](docs/PRODUCT_BLUEPRINT.md)
- [Product And Module Design Canvas](docs/DESIGN_CANVAS.md)
- [Epic Roadmap](docs/EPIC_ROADMAP.md)
- [Identity And Secrets](docs/IDENTITY_AND_SECRETS.md)
- [Build Status](docs/BUILD_STATUS.md)

Current status:

- Planning artifacts created.
- E01 scaffold complete with a Docker-first workspace, API gateway, shared module catalogue, and React mock console.
- E02 identity, Entra JWT, and shared Key Vault secret loading foundation is complete.
- E03 device registry foundation is complete.
- E04 event ledger, telemetry summary, command stream, and audit foundation is complete.
- E05 automation engine and safety policy foundation is complete.
- E06 web console and global command centre hardening is complete.
- E07 MCP orchestrator foundation is complete.
- E08 Automation Intent Partner foundation is complete.
- E09 Knowledge and Risk Agent foundation is complete.
- E10 Simulation Lab foundation is complete.
- E11 Human Approval and Policy Workflow foundation is complete.
- E12 Lighting and Scenes foundation is complete.
- E13 Climate and HVAC is the next active build slice.
- The DIIaC reference folder remains read-only and unmodified.

Core direction:

- Docker-first local microservices.
- Azure Container Apps target architecture.
- Entra ID / AD integration through JWT-based APIs.
- Shared Azure Key Vault for Entra, LLM, and vendor API secrets.
- MCP-style agents for human-intent automation.
- AIP proposes actions; KRA critiques and grounds them.
- Feature modules can be requested, planned, built, tested, enabled, and monitored.
- Narrowband LoRaWAN SD-WAN is treated as semantic command routing, not ordinary bulk IP routing.

## Local Development

Install dependencies:

```powershell
npm install
```

Run the local API and web console:

```powershell
npm run dev
```

Local URLs:

- Web console: http://localhost:5174
- API gateway: http://localhost:3101
- API health: http://localhost:3101/health
- Command centre API: http://localhost:3101/api/command-centre
- MCP orchestrator API: http://localhost:3101/api/mcp
- Intent engine API: http://localhost:3101/api/intent
- KRA engine API: http://localhost:3101/api/kra
- Simulation lab API: http://localhost:3101/api/simulations
- Approval workflow API: http://localhost:3101/api/approvals
- Lighting and scenes API: http://localhost:3101/api/lighting

Docker Desktop target:

```powershell
docker compose up --build
```

Note: Docker Desktop must be running before the compose stack can start.

Local auth defaults to development mode. To test Entra and Key Vault-backed configuration, copy `.env.example`, set `AUTH_MODE=entra_jwt_rs256`, configure `AZURE_KEY_VAULT_URL` or the Entra env vars directly, then restart the stack.
