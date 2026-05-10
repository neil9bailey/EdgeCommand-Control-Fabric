# Event Ledger

Seed event data for the EdgeCommand Control Fabric event bus, telemetry, command, policy, agent, and audit foundation.

This package is intentionally file-backed for the local Docker Desktop build. The API contract is shaped so it can later move behind Azure Event Grid, MQTT, Kafka, Cosmos DB, Log Analytics, or OpenTelemetry without changing the web console.

## Streams

- `telemetry`: device and link observations.
- `command`: planned, pending, acknowledged, or blocked command lifecycle events.
- `agent`: AIP/KRA intent and proposal events.
- `policy`: safety, risk, and routing policy decisions.
- `audit`: durable safety, approval, and route records.
- `module`: feature/module lifecycle events.

## Design Notes

- `trafficClass` maps the event to the Semantic Narrowband SD-WAN priority model.
- `auditRequired` marks records that must be durable and explainable before physical actuation.
- `payload` remains flexible so each feature module can add its own structured evidence.
