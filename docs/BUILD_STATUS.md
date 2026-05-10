# Build Status

Date: 2026-05-10

This file tracks completed delivery slices so the local and remote repository stay in sync.

## Completed

### E01 - Repository, Local Runtime, And Engineering Baseline

Status: complete and pushed to `origin/main`.

Commit: `c1a5857 Initialize EdgeCommand Control Fabric scaffold`

Delivered:

- Docker-first workspace.
- API gateway service.
- React/Vite web console.
- Shared module catalogue with 57 module surfaces.
- Local Docker Compose stack.
- Azure Container Apps IaC skeleton.
- Blueprint, design canvas, and epic roadmap.

Verification:

- `npm test`
- `npm run build`
- `npm run health`
- Docker Compose health.
- Browser render verification.

### E02 - Identity And Entra-Ready Auth

Status: complete and pushed to `origin/main`.

Delivered:

- Entra-ready JWT auth middleware for API gateway.
- `AUTH_MODE=development`, `entra`, `entra_jwt_rs256`, and integration-test-only `entra_jwt_hs256` modes.
- JWT validation for audience, issuer, tenant, expiry, and JWKS-backed RS256 signatures.
- EdgeCommand role model with DIIaC-style role aliases, group mapping, and principal mapping.
- `/auth/status` and `/auth/me` identity endpoints.
- Shared Azure Key Vault loader for Entra, LLM, and external API secrets.
- Docker Compose and Azure IaC parameters for shared Key Vault configuration.
- Identity and secrets documentation.

Verification:

- `npm run test -w services/api-gateway`
- `npm test`
- `npm run build`
- `az bicep build --file infra/azure/main.bicep`
- `docker compose up --build -d`
- `npm run health`
- API verification for `/auth/status`, `/auth/me`, and identity-aware `/api/intent/propose`.
- Browser render verification for the dashboard identity posture.

### E03 - Device Registry And Capability Model

Status: complete and pushed to `origin/main`.

Commit: `d95e28a Add device registry foundation`

Delivered:

- File-backed seed registry for sites, zones, capability definitions, and devices.
- API endpoints for devices, sites, and capabilities.
- Dashboard device coverage wired into module surfaces.
- Registry summary in the command centre.
- Tests for registry loading, filtering, and hero scenario devices.

Verification:

- `npm test`
- `npm run build`
- `npm run health`
- Docker Compose health.
- API verification for `/api/devices` and `/api/devices?capability=water_valve`.
- Browser render verification for Water Management device coverage.

### E04 - Event Bus, Telemetry, And Audit

Status: complete and pushed to `origin/main`.

Delivered:

- File-backed event ledger seed package for telemetry, command, audit, agent, policy, and module lifecycle events.
- Event summary APIs for ledger counts, audit-bound records, pending approvals, critical/P0 posture, stream counts, and traffic classes.
- API endpoints for `/api/events`, `/api/audit`, `/api/telemetry/summary`, and `/api/commands`.
- Command centre metrics wired to live event/audit summary data.
- Operational Ledger dashboard strip showing recent events, stream, severity, traffic class, status, and audit markers.
- Tests for event ledger loading, filtering, degraded telemetry, and summary posture.

Verification:

- `npm test`
- `npm run build`
- `docker compose up --build -d`
- `npm run health`
- API verification for `/api/events`, `/api/audit`, `/api/telemetry/summary`, and `/api/platform/overview`.
- Browser render verification for the Operational Ledger dashboard.

### E05 - Automation Engine And Safety Policy

Status: complete and pushed to `origin/main`.

Delivered:

- File-backed automation engine seed package for rules, scenes, scenarios, and safety policies.
- Deterministic rule matching for device telemetry and schedule-style triggers.
- Condition evaluation against the device registry.
- Command planning for valve, lock, EV, notification, and narrowband-path actions.
- Safety policy gates for physical actuation, simulation, approval, signed commands, manual override, and constrained-link routing.
- API endpoints for `/api/automations`, `/api/automations/evaluate`, `/api/automations/scenarios/:id/run`, and `/api/approvals`.
- Command centre summary now includes armed automation and policy counts.
- Automation dashboard panel for drill scenarios, rules, policies, and approval queue.
- Tests for approval-gated leak response, approved execution readiness, manual override blocking, LoRaWAN command routing, and EV reserve guard.

Verification:

- `npm test`
- `npm run build`
- `docker compose up --build -d`
- `npm run health`
- API verification for `/api/automations`, `/api/automations/scenarios/:id/run`, and `/api/approvals`.
- Browser render verification for the Automation Engine / Safety Policy panel, LoRaWAN leak drill, EV reserve drill, and approval queue.

### E06 - Web Console And Global Command Centre

Status: complete and pushed to `origin/main`.

Delivered:

- Consolidated `/api/command-centre` management-service contract for the operator deck.
- Shared command-centre helpers for link inventory, narrowband routes, and preview approval queue.
- Global Command Centre operations deck in the web console.
- Workspace tabs for modules, devices, automations, connectivity, identity, and audit.
- Workspace-aware action queue covering pending approvals, degraded devices, standby/blocked routes, and critical audit evidence.
- Desktop-oriented operational tables backed by live API data.
- Tests for command-centre workspaces, action queue contents, approval queue alignment, and narrowband route alignment.

Verification:

- `npm test`
- `npm run build`
- `docker compose up --build -d`
- `npm run health`
- API verification for `/api/command-centre`.
- Browser render verification for the Operations Deck and Connectivity workspace tab.

### E07 - MCP Orchestrator

Status: complete and pushed to `origin/main`.

Delivered:

- File-backed MCP orchestrator package with agents, permission scopes, registered tools, seed sessions, and tool-call audit records.
- API gateway MCP service for summaries, tool lookup/filtering, session planning, guarded tool execution, and audit listing.
- Role/scope permission model for Admin, Operator, AgentApprover, Security, and Viewer roles.
- Explicit permission gate for high-risk tools including device command proposals, automation rule compilation, narrowband command encoding, and module enablement.
- Deterministic local tool execution simulation with audit event generation.
- Global Command Centre Agents workspace showing tools, agents, permission gates, sessions, and MCP actions.
- Tests for MCP tool registration, filtering, session planning, unregistered-tool denial, high-risk permission gating, approved execution, audit records, and command-centre integration.

Verification:

- `npm run test -w services/api-gateway`
- `npm test`
- `npm run build`
- `docker compose up --build -d`
- `npm run health`
- API verification for `/api/mcp`, `/api/mcp/sessions/plan`, `/api/mcp/tools/:id/execute`, `/api/mcp/audit`, and `/api/command-centre`.
- Browser DOM verification for the Agents workspace.

### E08 - Automation Intent Partner

Status: complete and pushed to `origin/main`.

Delivered:

- File-backed intent engine package with deterministic AIP frames for leak response, narrowband fallback, module enablement, energy reserve, and security access.
- API gateway intent service for engine metadata, seed sessions, structured session creation, proposal generation, and accept/modify/reject decisions.
- AIP proposal model with confidence, status, required gates, required tools, rollback path, target modules, and strict propose-only execution rule.
- KRA-ready critique context attached to every intent session with grounding pointers, risk register, narrowband note, and required-review flag.
- MCP session planning embedded into intent output so inferred tool calls show ready, permission-required, and denied states.
- Web console Human Intent Workbench with proposal cards, KRA critique, MCP tool plan, session summary, and decision controls.
- Tests for intent engine loading, leak plus LoRaWAN proposal planning, module enablement planning, and decision event generation.

Verification:

- `npm run test -w services/api-gateway`
- `npm run typecheck -w apps/web-console`
- `npm test`
- `npm run build`
- `docker compose up --build -d`
- `npm run health`
- API verification for `/api/intent`, `/api/intent/propose`, and `/api/intent/sessions/:id/decisions`.
- Browser verification for Generate Plan, proposal cards, KRA critique, MCP tool plan, and Accept decision recording.

### E09 - Knowledge And Risk Agent

Status: complete and pushed to `origin/main`.

Delivered:

- File-backed KRA engine package with critique-only rule packs, evidence source registry, and seed evaluations.
- API gateway KRA service for source/rule-pack dashboard data and deterministic proposal evaluation.
- `/api/kra` dashboard contract and `/api/kra/evaluate` protected evaluation endpoint.
- AIP sessions now include first-class KRA evaluations with findings, evidence pointers, proposal reviews, verdicts, and audit-ready policy events.
- KRA grounding across safety policies, module catalog, device capabilities, automation rules, MCP tools, narrowband constraints, and audit evidence.
- Conflict blocker for any proposal that claims direct execution from AIP/KRA output.
- Global Command Centre Risk workspace and KRA operations dashboard panel in the web console.
- Tests for KRA loading, leak plus LoRaWAN grounding, direct-execution blocking, module enablement governance, dashboard summary, and command-centre risk integration.

Verification:

- `npm run test -w services/api-gateway`
- `npm run typecheck -w apps/web-console`
- `npm test`
- `npm run build`
- `docker compose up --build -d`
- `npm run health`
- API verification for `/api/kra`, `/api/kra/evaluate`, `/api/intent/propose`, and `/api/command-centre`.
- Browser verification for the Risk workspace, KRA operations panel, Human Intent Workbench KRA findings, and clean browser console.

### E10 - Simulation Lab

Status: complete and pushed to `origin/main`.

Delivered:

- File-backed Simulation Lab package with deterministic scenarios, link constraints, simulated device groups, failure modes, variants, and report templates.
- API gateway simulation service for dashboard data, scenario runs, variant runs, failure injection, route proof, report generation, and simulation audit events.
- `/api/simulations`, `/api/simulations/run`, and `/api/simulations/scenarios/:id/run` endpoints.
- Leak/shutoff, broadband outage, LoRaWAN delay, payload pressure, manual override, offline sensor, and EV reserve dry-run coverage.
- Approval queue records now carry attached simulation evidence when high-risk commands require simulation before approval.
- Global Command Centre Simulations workspace and Simulation Lab dashboard panel in the web console.
- Tests for simulation loading, leak shutoff approval evidence, broadband outage LoRaWAN routing, payload constraints, safe-hold failure injection, dashboard reports, approval evidence mapping, and command-centre simulation integration.

Verification:

- `npm run test -w services/api-gateway`
- `npm run typecheck -w apps/web-console`
- `npm test`
- `npm run build`
- `docker compose up --build -d`
- `npm run health`
- API verification for `/api/simulations`, `/api/simulations/scenarios/:id/run`, `/api/approvals`, and `/api/command-centre`.
- Browser verification for the Simulations workspace, Simulation Lab panel, remote-cottage outage run, LoRaWAN route proof, approval attachment evidence, and clean browser console.

### E11 - Human Approval And Policy Workflow

Status: complete and pushed to `origin/main`.

Delivered:

- File-backed Approval Workflow package with lifecycle states, decision types, policy rules, emergency exception metadata, export profiles, and seed decisions.
- API gateway approval workflow service for approval dashboard records, role-gated decisions, signed command queue readiness, rejection blocking, and audit exports.
- `/api/approvals`, `/api/approvals/:id`, `/api/approvals/:id/decisions`, and `/api/approvals/audit/export` endpoints.
- Approval records now include human decision metadata, proposal context, KRA critique, policy result, simulation evidence, lifecycle, and command queue state.
- Global Command Centre Approvals workspace and Human Approval / Policy Workflow dashboard panel in the web console.
- Tests for workflow loading, pending high-risk approvals, KRA/simulation evidence, approval-to-command-queue flow, rejection blocking, role denial, audit export contents, and command-centre approval integration.

Verification:

- `npm run test -w services/api-gateway`
- `npm run typecheck -w apps/web-console`
- `npm test`
- `npm run build`
- `docker compose up --build -d`
- `npm run health`
- API verification for `/api/approvals`, `/api/approvals/:id/decisions`, `/api/approvals/audit/export`, and `/api/command-centre`.
- Browser verification for the Approvals workspace, approval workflow panel, policy criteria, KRA/simulation evidence, approval decision recording, signed command queue transition, and clean browser console.

### E12 - Lighting And Scenes

Status: complete and pushed to `origin/main`.

Delivered:

- File-backed Lighting And Scenes package with zones, fixtures, scene profiles, schedules, policies, intent recipes, feature-module metadata, and recent run seeds.
- Expanded device registry with additional light fixtures, a living-room zone, scene and colour-temperature capabilities.
- API gateway lighting service for dashboard data, scene preview, simulated scene apply, and intent-to-scene preview.
- `/api/lighting`, `/api/lighting/scenes/:id/preview`, `/api/lighting/scenes/:id/apply`, and `/api/lighting/intent/preview` endpoints.
- MCP orchestrator lighting scene preview/apply tools, low-risk permissions, deterministic tool execution, and AIP lighting scene frame.
- Global Command Centre Lighting workspace and Lighting And Scenes dashboard panel in the web console.
- Tests for lighting package loading, dashboard enrichment, preview planning, simulated apply, intent recipe matching, MCP lighting tools, AIP lighting proposals, and command-centre lighting integration.

Verification:

- `npm run test -w services/api-gateway`
- `npm run typecheck -w apps/web-console`
- `npm test`
- `npm run build`
- `docker compose up --build -d`
- `npm run health`
- API verification for `/api/lighting`, `/api/lighting/scenes/:id/preview`, `/api/lighting/scenes/:id/apply`, `/api/lighting/intent/preview`, and `/api/command-centre`.
- Browser verification for the Lighting workspace, Lighting And Scenes panel, scene preview, simulated scene apply, intent recipe matching, and clean browser console.

### E13 - Climate And HVAC

Status: complete and pushed to `origin/main`.

Delivered:

- File-backed Climate And HVAC package with climate zones, comfort profiles, schedules, safe setpoint policies, humidity guardrails, intent recipes, feature-module metadata, and recent run seeds.
- Expanded device registry with bedroom zone, climate capabilities, thermostat devices, humidity/temperature state, and a utility-room sensor zone.
- API gateway climate service for dashboard data, profile preview, simulated profile apply, safe/unsafe setpoint preview/apply, and intent-to-profile preview.
- `/api/climate`, `/api/climate/profiles/:id/preview`, `/api/climate/profiles/:id/apply`, `/api/climate/zones/:id/setpoint/preview`, `/api/climate/zones/:id/setpoint/apply`, and `/api/climate/intent/preview` endpoints.
- MCP orchestrator climate profile preview and setpoint apply tools, medium-risk permissions, deterministic tool execution, and AIP climate comfort frame.
- Global Command Centre Climate workspace and Climate And HVAC dashboard panel in the web console.
- Tests for climate package loading, dashboard enrichment, safe profile preview, simulated apply, unsafe setpoint blocking, intent recipe matching, MCP climate tools, AIP climate proposals, and command-centre climate integration.

Verification:

- `npm run test -w services/api-gateway`
- `npm run typecheck -w apps/web-console`
- `npm test`
- `npm run build`
- `docker compose up --build -d`
- `npm run health`
- API verification for `/api/climate`, `/api/climate/profiles/:id/preview`, `/api/climate/profiles/:id/apply`, `/api/climate/zones/:id/setpoint/preview`, `/api/climate/intent/preview`, and `/api/command-centre`.
- Browser verification for the Climate workspace, Climate And HVAC panel, comfort profile preview, simulated profile apply, unsafe setpoint guard, intent recipe matching, and clean browser console.

## Next

### E14 - Security And Access

Status: next planned build slice.
