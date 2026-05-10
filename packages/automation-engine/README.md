# Automation Engine

Deterministic local rule and safety-policy seed data for E05.

The package models:

- Rules that match device telemetry, schedule events, or future agent events.
- Conditions against the current device registry state.
- Command plans for physical devices and notifications.
- Policy decisions that can allow, hold, or block physical actuation.
- Approval requirements for high-risk P0/P1 operations.

This is intentionally file-backed for Docker Desktop. The API contract is shaped so the implementation can later move to durable rule storage, a workflow engine, and append-only command/audit persistence.
