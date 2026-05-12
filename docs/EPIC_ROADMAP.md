# Epic Roadmap

Date: 2026-05-10

This roadmap turns the product blueprint into buildable increments. Each epic is intended to be independently understandable, testable, and suitable for agent-assisted delivery.

## Release Phases

### Phase 0 - Blueprint And Product Spine

Goal: define the product, architecture, module model, and build path.

Epics:

- E00 Product blueprint and build governance.
- E01 Repository, local runtime, and engineering baseline.

### Phase 1 - Local Platform Foundation

Goal: get a full local Docker Desktop platform running with simulated devices.

Epics:

- E02 Identity and Entra-ready auth.
- E03 Device registry and capability model.
- E04 Event bus, telemetry, and audit.
- E05 Automation engine and safety policy.
- E06 Web console and global command centre.

### Phase 2 - Agentic Automation Core

Goal: natural-language intent becomes governed proposals, simulations, approvals, and safe execution.

Epics:

- E07 MCP orchestrator.
- E08 Automation Intent Partner.
- E09 Knowledge and Risk Agent.
- E10 Simulation lab.
- E11 Human approval and policy workflow.

### Phase 3 - Standard Home Automation On Steroids

Goal: deliver serious home automation modules with clean dashboards and management services.

Epics:

- E12 Lighting and scenes.
- E13 Climate and HVAC.
- E14 Security and access.
- E15 Water management.
- E16 Energy, solar, battery, and EV.
- E17 Occupancy, presence, and environmental sensing.

### Phase 4 - Modular Feature Marketplace

Goal: users can request modules, agents plan them, the system builds/deploys them, and dashboards appear.

Epics:

- E18 Module manifest and feature flag framework.
- E19 Module builder and IaC fragment system.
- E20 Module marketplace dashboard.
- E21 Module certification and test harness.

### Phase 5 - Connectivity Expansion

Goal: plug in real device ecosystems and keep the core clean.

Epics:

- E22 MQTT and ESPHome adapter.
- E23 Matter and Thread adapter.
- E24 Zigbee adapter.
- E25 Z-Wave adapter.
- E26 BLE, RF, IR, and wired protocol adapters.
- E27 Vendor cloud adapter framework.

### Phase 6 - Semantic Narrowband SD-WAN

Goal: create the differentiating remote-control architecture.

Epics:

- E28 Narrowband SD-WAN control plane.
- E29 LoRaWAN command and telemetry path.
- E30 Remote edge gateway runtime.
- E31 NB-IoT and LTE-M bridge.
- E32 Emergency/outage mode.
- E33 Narrowband dashboard and simulator.

### Phase 7 - Azure Production Platform

Goal: make the local stack deployable and operable on Azure.

Epics:

- E34 Azure Container Apps IaC.
- E35 Azure observability and operations.
- E36 Secrets, managed identity, and key management.
- E37 CI/CD and release promotion.
- E38 Multi-tenant controls.

### Phase 8 - Productization And Advanced Intelligence

Goal: turn the platform into a commercial-grade product.

Epics:

- E39 Advanced analytics and predictive maintenance.
- E40 Home operations copilot.
- E41 Customer/installer onboarding.
- E42 Marketplace packaging and licensing.
- E43 Enterprise and estate management.
- E44 Compliance, assurance, and export packs.

## Epic Details

## E00 - Product Blueprint And Build Governance

Objective:

Create the canonical product blueprint, decision rules, module principles, and build constraints.

Deliverables:

- Product blueprint.
- Epic roadmap.
- Architecture decision records.
- Safety principles.
- Agent governance principles.
- Source reference list.

Acceptance:

- Every future implementation epic references this blueprint.
- DIIaC reference remains read-only.
- Safety and approval rules are explicit.

## E01 - Repository, Local Runtime, And Engineering Baseline

Objective:

Create a clean, Docker-first repository with microservice folders, local scripts, conventions, and quality gates.

Deliverables:

- Root README.
- `docker-compose.yml`.
- `.env.example`.
- Service folder structure.
- Shared schemas folder.
- Local development scripts.
- Basic lint/test setup.
- Architecture docs folder.

Acceptance:

- `docker compose up` starts the baseline stack.
- All services expose health endpoints.
- One command runs tests.
- No DIIaC files are modified.

## E02 - Identity And Entra-Ready Auth

Objective:

Integrate authentication and authorization with Microsoft Entra ID while keeping local development possible.

Deliverables:

- MSAL React SPA configuration.
- API JWT validation.
- Tenant config for `vendorlogic.io`.
- Role and group mapping.
- Local dev auth fallback.
- Identity dashboard.

Acceptance:

- API rejects missing/invalid tokens when auth is enabled.
- API validates issuer, audience, expiry, and JWKS signature.
- UI can display signed-in user and roles.
- Local dev can run without secrets by using explicit dev mode.

## E03 - Device Registry And Capability Model

Objective:

Represent every physical, virtual, and simulated device through a normalized capability model.

Deliverables:

- Device schema.
- Capability schema.
- Site and zone model.
- Adapter binding model.
- Digital twin state model.
- Registry API.
- Device dashboard.

Acceptance:

- Devices can be created, listed, updated, and disabled.
- Capabilities can be queried independently of protocol.
- Simulated devices can publish state.
- UI shows site, zone, device, health, and last-seen status.

## E04 - Event Bus, Telemetry, And Audit

Objective:

Create the event backbone for device state, commands, telemetry, and audit evidence.

Deliverables:

- MQTT or NATS local bus.
- Event naming convention.
- Telemetry ingestion service.
- Append-only audit service.
- Time-series persistence.
- Activity dashboard.

Acceptance:

- Device state events flow into telemetry storage.
- Commands and acknowledgements are auditable.
- UI shows recent events.
- Event payloads are schema validated.

## E05 - Automation Engine And Safety Policy

Objective:

Execute rules, scenes, schedules, and conditional automations with safety enforcement.

Deliverables:

- Rule model.
- Scene model.
- Trigger evaluator.
- Condition evaluator.
- Command planner.
- Safety policy service.
- Manual override support.

Acceptance:

- A simulated sensor can trigger a simulated actuator.
- Policy can block unsafe commands.
- High-risk commands require approval unless emergency policy allows.
- Every execution writes audit entries.

## E06 - Web Console And Global Command Centre

Objective:

Build the first serious operational UI.

Deliverables:

- React/Vite console.
- App shell.
- Global command centre.
- Devices view.
- Automations view.
- Connectivity view.
- Identity/policy view.
- Audit view.

Acceptance:

- Console runs locally in Docker.
- UI consumes real backend APIs.
- Status cards, tables, and action queues are usable on desktop.
- No marketing landing page is used as the primary screen.

## E07 - MCP Orchestrator

Objective:

Provide the agent tool registry and permissioned execution framework.

Deliverables:

- Tool manifest schema.
- Agent session model.
- Tool execution API.
- Tool permission model.
- Tool call audit log.
- Initial tools for registry, policy, simulation, and automation planning.

Acceptance:

- Agents can call registered tools only.
- Tool calls are auditable.
- High-risk tools require explicit permission.
- Modules can register tools through manifests.

## E08 - Automation Intent Partner

Objective:

Turn human requests into proposed automations, commands, scenes, or module plans.

Deliverables:

- Intent session API.
- Deterministic starter parser.
- Proposal model.
- Risk labels.
- Confidence labels.
- UI proposal cards.

Acceptance:

- A human can ask for a home automation outcome.
- AIP returns structured proposals.
- AIP never executes directly.
- User can accept, modify, or reject proposals.

## E09 - Knowledge And Risk Agent

Objective:

Ground and critique AIP proposals before execution or build.

Deliverables:

- KRA source registry.
- Proposal critique model.
- Grounding pointer model.
- Conflict detection.
- Missing context detection.
- KRA indicators in UI.

Acceptance:

- KRA marks proposals as ok, needs review, or conflict.
- UI shows grounding and critique.
- KRA cannot execute device commands.
- KRA findings affect approval requirements.

## E10 - Simulation Lab

Objective:

Validate automations, modules, and narrowband scenarios before physical execution.

Deliverables:

- Simulated devices.
- Simulated links.
- Scenario runner.
- Failure injection.
- Simulation report.
- Simulation dashboard.

Acceptance:

- Leak/shutoff scenario can be simulated.
- Broadband outage can be simulated.
- LoRaWAN-like delay and payload constraints can be simulated.
- Simulation results are attached to approvals.

## E11 - Human Approval And Policy Workflow

Objective:

Make high-risk automation governable.

Deliverables:

- Approval queue.
- Approval policy rules.
- Risk classification.
- Emergency policy exception model.
- Approval dashboard.
- Audit exports.

Acceptance:

- High-risk proposals pause for approval.
- Approved proposals execute through the command queue.
- Rejected proposals do not execute.
- Approval records show human, time, proposal, critique, and policy result.

## E12 - Lighting And Scenes

Status: complete in E12 foundation slice.

Objective:

Deliver the first standard home automation module.

Deliverables:

- Light capability implementation.
- Scene builder.
- Schedule support.
- Manual controls.
- Lighting dashboard.

Acceptance:

- Simulated lights can be grouped and controlled.
- Scenes can be created and triggered.
- AIP can propose a lighting scene.
- Lighting scene preview and apply are exposed through MCP tools, API endpoints, and the web console.

## E13 - Climate And HVAC

Status: complete in E13 foundation slice.

Objective:

Manage comfort, setpoints, schedules, and energy-aware HVAC controls.

Deliverables:

- Thermostat capability.
- Climate zone model.
- Schedule model.
- Comfort/eco policies.
- Climate dashboard.

Acceptance:

- Simulated climate zones can be controlled.
- Policies prevent unsafe setpoints.
- AIP can propose a comfort schedule.
- Climate profile preview and setpoint apply are exposed through MCP tools, API endpoints, and the web console.

## E14 - Security And Access

Objective:

Control locks, alarms, gates, and access state safely.

Deliverables:

- Lock capability.
- Alarm capability.
- Gate/door capability.
- Access approval policies.
- Security dashboard.

Acceptance:

- Security commands require correct role and policy. Complete in E14 foundation.
- Remote unlock is treated as high risk. Complete in E14 foundation.
- Audit trail is complete. Complete in E14 foundation.
- Security profile preview and remote unlock/open guards are exposed through MCP tools, API endpoints, and the web console.

## E15 - Water Management

Objective:

Detect leaks, manage valves, and support emergency shutoff.

Deliverables:

- Leak sensor capability.
- Water valve capability.
- Flow meter capability.
- Emergency shutoff policy.
- Water dashboard.

Acceptance:

- Leak event can close a valve in simulation. Complete in E15 foundation.
- Manual override exists. Complete in E15 foundation.
- Narrowband fallback can carry emergency acknowledgement. Complete in E15 foundation.
- Water profile preview, LoRaWAN shutoff evidence, safe reopen guard, and intent matching are exposed through MCP tools, API endpoints, and the web console.

## E16 - Energy, Solar, Battery, And EV

Objective:

Manage energy assets as first-class home automation components.

Deliverables:

- Meter capability.
- Solar inverter capability.
- Battery capability.
- EV charger capability.
- Energy dashboard.

Acceptance:

- Energy telemetry is visible. Complete in E16 foundation.
- AIP can propose load shifting. Complete in E16 foundation.
- Policy can prevent unsafe battery/charger actions. Complete in E16 foundation.
- Solar surplus EV assist, battery reserve guard, tariff load shift, outage critical-load guard, MCP energy tools, API endpoints, and the web console Energy workspace are complete in E16 foundation.

## E17 - Occupancy, Presence, And Environmental Sensing

Objective:

Use sensor context to improve automation.

Deliverables:

- Occupancy capability.
- Presence model.
- Air quality capability.
- Temperature/humidity sensors.
- Sensor dashboard.

Acceptance:

- Automations can use occupancy conditions. Complete in E17 foundation.
- Environmental telemetry appears in dashboard. Complete in E17 foundation.
- Privacy policy is visible for presence signals. Complete in E17 foundation.
- Room-aware comfort, away-presence context, air-quality response, strict privacy hold, MCP sensing tools, API endpoints, and the web console Sensing workspace are complete in E17 foundation.

## E18 - Module Manifest And Feature Flag Framework

Objective:

Make every product capability installable and governable as a module.

Deliverables:

- Module manifest schema.
- Dependency model.
- Feature flag service.
- Module state machine.
- Module registry API.

Acceptance:

- A disabled module is hidden and inactive. Foundation complete through manifest states, runtime-surface flags, and readiness status.
- Enabling a module registers routes, services, policies, and dashboards. Foundation complete as manifest evidence and preview-only activation plans; mutation moves to E19/E21.
- Dependencies are checked before enablement. Complete in E18 foundation via resolved dependency statuses and blocked/buildable/approval-required readiness.
- Human intent can select a module flag and produce a governed build preview. Complete in E18 foundation for MQTT/ESPHome, LoRaWAN, and marketplace requests.

## E19 - Module Builder And IaC Fragment System

Objective:

Allow human-triggered feature requests to produce buildable service and IaC plans.

Deliverables:

- Module builder agent.
- Compose fragment model.
- Azure Bicep fragment model.
- Migration hook model.
- Build plan report.

Acceptance:

- AIP can propose a module enablement plan. Foundation complete through intent-to-build preview for MQTT, LoRaWAN, and Azure narrowband promotion.
- KRA can critique the plan. Foundation evidence is now exposed as approval gates, manifest flags, verification commands, and audit-bound build preview events.
- Approved plan can update local composition files. Deferred to post-certification mutation; E19 foundation is proposal-only and does not mutate files.
- Tests run before module is marked enabled. Foundation complete as required verification commands attached to every build plan.

## E20 - Module Marketplace Dashboard

Objective:

Expose available, installed, requested, and failing modules clearly.

Deliverables:

- Marketplace UI.
- Module detail page.
- Enable/disable controls.
- Build status.
- Test status.
- Dependency view.

Acceptance:

- User can request a module from UI or natural language. Foundation complete through marketplace request preview and intent-to-request preview.
- Module state changes are visible. Foundation complete through installed, available, requested, approval-required, queue-ready, and needs-manifest listing states.
- Marketplace collections show module bundles for starter home, connectivity, and narrowband strategy. Complete in E20 foundation.
- Request previews link manifest flags and build plans without mutating runtime state. Complete in E20 foundation.
- Failed module builds show actionable errors.

## E21 - Module Certification And Test Harness

Objective:

Prevent low-quality modules from entering the platform.

Deliverables:

- Module test contract.
- Policy tests.
- Simulation tests.
- Security checks.
- Compatibility checks.
- Certification report.

Acceptance:

- Module cannot be enabled without required tests. Foundation complete through preview-only certification profiles, required evidence, pass/fail/approval states, and non-mutating enablement readiness.
- Safety policies are tested. Foundation complete through security, approval, simulation, payload-budget, audit, Docker, API, and browser-smoke suite definitions.
- Dashboard shows certification status. Complete in E21 foundation through the Module Certification / Test Harness web panel and Command Centre certification actions.

## E22 - MQTT And ESPHome Adapter

Objective:

Support the first practical real-world integration path.

Deliverables:

- MQTT discovery.
- Topic mapping.
- State subscription.
- Command publish.
- ESPHome-compatible mapping.
- Adapter dashboard.

Acceptance:

- MQTT devices can publish state. Foundation complete through deterministic state samples, mapped state topics, and registry-backed topic projections.
- Commands can be sent through MQTT. Foundation complete through simulated publish previews, command payload normalization, topic allowlisting, and audit-bound command events.
- Capabilities map into the device registry. Complete in E22 foundation for existing MQTT valve, flow meter, and garden light registry devices with ESPHome discovery profiles.

## E23 - Matter And Thread Adapter

Objective:

Support modern smart-home interoperability.

Deliverables:

- Matter controller integration plan.
- Thread border router integration.
- Commissioning workflow.
- Capability mapping.
- Health telemetry.

Acceptance:

- Matter devices can be represented in the registry. Foundation complete through Matter device bindings that enrich existing registry devices with node ids, endpoints, clusters, and fabric status.
- Thread network health is visible. Foundation complete through Thread network, border-router, dataset, RSSI, and health sample projections in the API and web console.
- Adapter remains replaceable. Complete in E23 foundation through package-driven contracts, preview-only commissioning/command execution, and no hard dependency on a concrete Matter SDK runtime.

## E24 - Zigbee Adapter

Objective:

Support common low-power smart home sensors and switches.

Deliverables:

- Coordinator integration.
- Device pairing.
- Capability mapping.
- Signal/battery telemetry.
- Adapter dashboard.

Acceptance:

- Zigbee-like simulated devices map to capabilities. Foundation complete through registry-backed Zigbee mesh bindings, route health, reporting profiles, permit-join previews, and simulated command frames.
- Real coordinator integration path is documented and modular. Foundation complete through a package-driven coordinator contract that can be replaced by Zigbee2MQTT, deCONZ, Silicon Labs, or vendor-specific runtime workers.

## E25 - Z-Wave Adapter

Objective:

Support sub-GHz home automation devices.

Deliverables:

- Controller integration.
- Device inclusion/exclusion model.
- Capability mapping.
- Health and signal metadata.

Acceptance:

- Z-Wave devices can be modeled. Foundation complete through registry-backed secure node bindings, controller health, signal supervision, lifecycle profiles, and simulated Z-Wave command frames.
- Locks and sensors follow high-risk policy rules. Foundation complete through S2 Access Control requirements, approval-gated lock/inclusion/exclusion operations, and low-risk status query separation.

## E26 - BLE, RF, IR, And Wired Protocol Adapters

Objective:

Support non-IP and legacy devices through bridge modules.

Deliverables:

- BLE gateway adapter.
- RF bridge adapter.
- IR blaster adapter.
- Modbus adapter.
- BACnet adapter.
- KNX adapter.
- GPIO/relay adapter.

Acceptance:

- Each adapter registers capabilities through the same model.
- Unsafe relay actions require policy.
- Legacy devices are labeled by trust level.

## E27 - Vendor Cloud Adapter Framework

Objective:

Integrate vendor cloud APIs without contaminating the core model.

Deliverables:

- Cloud adapter SDK.
- OAuth/API key secret model.
- Rate limit handling.
- Cloud availability status.
- Vendor connector dashboard.

Acceptance:

- Cloud devices appear as normal capabilities.
- Cloud outage does not break local automations.
- Secrets are not stored in plaintext.

## E28 - Narrowband SD-WAN Control Plane

Objective:

Create the semantic SD-WAN brain.

Deliverables:

- Link inventory.
- Link scoring.
- Traffic class model.
- Command route planner.
- Command expiry and dedupe.
- Ack tracking.
- Narrowband policy rules.

Acceptance:

- Controller selects broadband when available.
- Controller selects narrowband for approved P0/P1 constrained messages when broadband is unavailable.
- P4 bulk traffic is blocked from narrowband.

## E29 - LoRaWAN Command And Telemetry Path

Objective:

Implement LoRaWAN as a compact command and telemetry carrier.

Deliverables:

- LoRaWAN adapter interface.
- Network server integration abstraction.
- Compact command encoder.
- Telemetry decoder.
- Downlink queue.
- Uplink ack model.

Acceptance:

- Simulated LoRaWAN path enforces payload limits and delay.
- Emergency command can be encoded compactly.
- Ack returns to command queue.

## E30 - Remote Edge Gateway Runtime

Objective:

Create the remote executor for outbuildings, cottages, farms, and detached assets.

Deliverables:

- Edge runtime.
- Local policy cache.
- Command verifier.
- Replay protection.
- Store-and-forward telemetry.
- Offline automation support.

Acceptance:

- Edge can execute approved local rules without cloud.
- Edge rejects expired or unsigned commands.
- Edge sends heartbeat and compressed telemetry.

## E31 - NB-IoT And LTE-M Bridge

Objective:

Support cellular IoT as a managed narrowband/low-power path.

Deliverables:

- Cellular link model.
- Provider abstraction.
- Command transport interface.
- SIM/device inventory.
- Cost and quota metadata.

Acceptance:

- Controller can select cellular IoT path.
- Quotas/cost can influence routing.
- Bridge shares command object model with LoRaWAN path.

## E32 - Emergency And Outage Mode

Objective:

Keep critical controls working during broadband/cloud outage.

Deliverables:

- Outage detector.
- Emergency policy pack.
- Local-only execution mode.
- Narrowband fallback rules.
- Operator notifications.

Acceptance:

- Simulated broadband outage does not stop emergency water shutoff.
- UI shows outage mode.
- Commands remain auditable after reconnection.

## E33 - Narrowband Dashboard And Simulator

Objective:

Make the new architecture visible and testable.

Deliverables:

- Narrowband dashboard.
- Remote site map/list.
- Link status.
- Command queue.
- Ack timeline.
- Payload size inspector.
- Failure simulator.

Acceptance:

- User can see why a path was chosen.
- User can inspect pending and expired commands.
- Simulation demonstrates LoRaWAN fallback.

## E34 - Azure Container Apps IaC

Objective:

Deploy the microservice platform to Azure using repeatable infrastructure as code.

Deliverables:

- Bicep or Terraform baseline.
- Container Apps environment.
- Container Registry.
- Managed identity.
- Key Vault.
- Storage/database resources.
- Log Analytics.
- Internal/external ingress model.

Acceptance:

- Infrastructure can be provisioned from clean environment.
- Services can be deployed as separate container apps.
- Public ingress is limited to intended entry points.

## E35 - Azure Observability And Operations

Objective:

Make cloud operations visible and supportable.

Deliverables:

- Application Insights.
- Structured logging.
- Metrics.
- Alerts.
- Health endpoints.
- Operations runbooks.

Acceptance:

- Each service emits health, logs, and metrics.
- Dashboard shows cloud service health.
- Alerts cover failed commands, adapter outages, auth failures, and narrowband queue buildup.

## E36 - Secrets, Managed Identity, And Key Management

Objective:

Secure credentials, signing keys, and service identities.

Deliverables:

- Key Vault integration.
- Managed identity access.
- Signing key model.
- Secret rotation docs.
- Local dev secret handling.

Acceptance:

- No production secret is required in source.
- Services use managed identity in Azure.
- Command signing key access is restricted.

## E37 - CI/CD And Release Promotion

Objective:

Automate test, build, scan, publish, and deploy.

Deliverables:

- CI pipeline.
- Docker image builds.
- Security scan.
- IaC validation.
- Local-to-Azure promotion path.
- Release manifests.

Acceptance:

- Pull request validates code and IaC.
- Images publish to registry.
- Releases can be promoted by environment.

## E38 - Multi-Tenant Controls

Objective:

Support multiple homes/sites/customers safely.

Deliverables:

- Tenant isolation model.
- Site isolation.
- Per-tenant module enablement.
- Per-tenant role maps.
- Tenant audit views.

Acceptance:

- A user cannot access another tenant's devices.
- Module state is tenant scoped.
- Audit entries are tenant scoped.

## E39 - Advanced Analytics And Predictive Maintenance

Objective:

Use telemetry to predict issues and recommend action.

Deliverables:

- Anomaly detection.
- Device reliability scoring.
- Battery prediction.
- Sensor drift detection.
- Maintenance recommendations.

Acceptance:

- System can flag abnormal telemetry.
- Recommendations are proposed, not auto-executed.
- KRA grounds recommendation confidence.

## E40 - Home Operations Copilot

Objective:

Provide a conversational operations assistant across the platform.

Deliverables:

- Cross-dashboard assistant.
- "What changed?" answers.
- Incident summaries.
- Automation explanations.
- Guided troubleshooting.

Acceptance:

- Assistant can explain device/automation state.
- Assistant can propose actions through AIP only.
- Assistant cites relevant audit and telemetry.

## E41 - Customer And Installer Onboarding

Objective:

Make deployment practical for homes, estates, and professional installers.

Deliverables:

- Site setup wizard.
- Device onboarding flows.
- Installer role.
- Commissioning checklist.
- Handover report.

Acceptance:

- New site can be configured from UI.
- Installer can onboard devices without admin-level rights.
- Handover export summarizes configuration.

## E42 - Marketplace Packaging And Licensing

Objective:

Turn modules into product packages.

Deliverables:

- Module tiers.
- Licensing model.
- Trial/paid feature flags.
- Marketplace metadata.
- Usage metering.

Acceptance:

- Module availability can depend on license.
- Tenant can see enabled and available packages.
- Licensing does not affect safety-critical local operation unexpectedly.

## E43 - Enterprise And Estate Management

Objective:

Support multiple properties, outbuildings, remote sites, and managed estates.

Deliverables:

- Estate view.
- Cross-site policy.
- Remote site heartbeat.
- Fleet/device inventory.
- Site comparison.

Acceptance:

- Operator can manage multiple sites.
- Remote site health is visible.
- Policies can be inherited with site overrides.

## E44 - Compliance, Assurance, And Export Packs

Objective:

Produce trust artifacts for enterprise, insurance, installers, and regulated environments.

Deliverables:

- Audit export.
- Safety policy export.
- Device inventory export.
- Incident report.
- Automation change report.
- Identity access report.

Acceptance:

- Reports can be generated from audit data.
- Reports include time, user, action, policy, device, and result.
- Exports avoid leaking secrets.

## Suggested Build Order

1. E00 Product blueprint and build governance.
2. E01 Repository and Docker baseline.
3. E03 Device registry and capability model.
4. E04 Event bus, telemetry, and audit.
5. E05 Automation engine and safety policy.
6. E06 Web console and command centre.
7. E02 Identity and Entra-ready auth.
8. E07 MCP orchestrator.
9. E08 AIP.
10. E09 KRA.
11. E10 Simulation lab.
12. E11 Approval workflow.
13. E18 Module manifest and feature flags.
14. E20 Module marketplace dashboard.
15. E15 Water management as first module.
16. E28 Narrowband SD-WAN control plane.
17. E29 LoRaWAN command and telemetry simulator.
18. E33 Narrowband dashboard and simulator.
19. E22 MQTT and ESPHome adapter.
20. E34 Azure Container Apps IaC.

This order proves the full product loop early: human intent, agent proposal, KRA critique, approval, simulation, execution, audit, dashboard, module enablement, and narrowband fallback.
