# Product And Module Design Canvas

Date: 2026-05-10

Use this canvas for the overall platform and for every future module request. It turns a human idea into a buildable feature plan that agents, engineers, and automation can all understand.

## Platform Canvas

### Product Name

EdgeCommand Control Fabric

### Product Category

Governed, agentic, modular control fabric for residential, commercial, industrial, enterprise, utilities, and critical infrastructure operations with local-first control, Azure-hosted operations, and semantic narrowband SD-WAN.

### Primary Users

- Residential owner/operator.
- Commercial, industrial, and estate operator.
- Utility and critical infrastructure operations team.
- Professional installer.
- Estate manager.
- Security operator.
- Energy manager.
- Remote site maintainer.
- Developer/integrator.

### Primary Jobs To Be Done

- Control any supported device through one consistent capability model.
- Automate homes, buildings, estates, and remote assets from human intent.
- Keep critical controls working during broadband/cloud failure.
- Add new solution modules without rebuilding the whole product.
- Safely integrate IP and non-IP devices.
- Give operators clean dashboards for each domain.
- Make agent decisions visible, grounded, and auditable.

### Product Promise

Say what you want the environment to do, let agents propose a safe plan, validate it with knowledge and simulation, then deploy it as a governed automation module.

### Differentiated Capabilities

- AIP/KRA cooperative intelligence adapted for physical automation.
- Semantic Narrowband SD-WAN for LoRaWAN-class constrained control.
- Feature modules that include service, UI, policy, tests, IaC, and agent tools.
- Simulation-before-actuation safety workflow.
- Enterprise-grade audit and identity controls for residential, commercial, industrial, utility, and IoT automation.
- Local-first execution with Azure operations.

### Core Risks

- Physical safety risk from actuators.
- Security risk from locks, gates, cameras, alarms, and remote commands.
- Identity misconfiguration.
- Vendor cloud instability.
- Radio/link unreliability.
- Over-automation without human understanding.
- LLM hallucination if agent outputs are not constrained.

### Safety Controls

- AIP proposes only.
- KRA critiques only.
- Policy service gates commands.
- High-risk actions require approval.
- Simulation attaches evidence before approval.
- Edge gateway verifies signature, TTL, and replay protection.
- Audit ledger records every proposal, decision, command, and acknowledgement.

### First Hero Scenario

> If the utility room leaks, shut the main water valve, alert me, and prove the emergency path still works if broadband is down.

This scenario touches device registry, water module, automation engine, AIP, KRA, policy, approval, simulation, narrowband fallback, dashboard, and audit.

## Module Canvas Template

### Module Identity

- Module ID:
- Name:
- Category:
- Business value:
- Target users:
- Default state: disabled / enabled:

### Human Intent Examples

- "..."
- "..."
- "..."

### Capabilities Required

- Sensors:
- Actuators:
- Virtual devices:
- External APIs:
- Remote gateways:

### Services Required

- API service:
- Background worker:
- Adapter:
- Dashboard:
- Agent tools:
- Simulation scenarios:

### Policies Required

- Safety policies:
- Approval policies:
- Emergency exceptions:
- Identity roles:
- Remote command restrictions:

### Data Required

- Entities:
- Events:
- Time-series:
- Audit records:
- Secrets:

### Dashboards Required

- Overview:
- Device/control panel:
- Health:
- Agent proposals:
- Audit:

### Connectivity Required

- LAN/IP:
- Matter/Thread:
- Zigbee:
- Z-Wave:
- MQTT:
- Wired:
- Cloud:
- LoRaWAN:
- NB-IoT/LTE-M:

### Narrowband Suitability

- Can send over narrowband:
- Must not send over narrowband:
- Payload budget:
- Required acknowledgement:
- TTL:
- Priority class:

### Simulation Scenarios

- Normal operation:
- Device offline:
- Broadband outage:
- Narrowband degraded:
- Manual override:
- Policy block:
- Emergency path:

### Acceptance Criteria

- Functional:
- Safety:
- Security:
- Observability:
- UX:
- Local Docker:
- Azure/IaC:

## Filled Example: Water Management

### Module Identity

- Module ID: `water-management`
- Name: Water Management
- Category: Safety
- Business value: prevent water damage and provide remote emergency shutoff.
- Target users: homeowner, estate manager, installer, security operator.
- Default state: disabled until configured.

### Human Intent Examples

- "If a leak is detected, close the main valve and notify me."
- "Show me water usage by site."
- "Keep the remote cottage protected even if broadband drops."

### Capabilities Required

- Leak sensor.
- Water valve.
- Flow meter.
- Occupancy/presence optional.
- Remote gateway optional.

### Services Required

- `water-service`.
- `water-dashboard`.
- `water-safety-agent`.
- Adapter bindings for leak sensors and valve actuators.
- Simulation scenarios for leak, stuck valve, offline sensor, and narrowband fallback.

### Policies Required

- Emergency shutoff may execute locally when leak confidence is high.
- Remote reopen requires human approval.
- Valve close must be idempotent.
- Manual physical override must be represented in state.

### Narrowband Suitability

- Can send: leak alert, close valve, valve closed ack, heartbeat.
- Must not send: rich logs, firmware, continuous flow telemetry.
- Priority: `P0_EMERGENCY` for leak shutoff.
- TTL: short, typically minutes.
- Ack: required.

### Acceptance Criteria

- Simulated leak closes simulated valve.
- KRA critiques missing valve or missing remote gateway.
- AIP proposal shows rollback/manual override path.
- Narrowband simulator carries emergency ack during broadband outage.
- Dashboard shows leak event, command, ack, and audit trail.
