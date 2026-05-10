# Security And Access

E14 promotes Security And Access from a mocked catalogue entry into a manifest-backed feature module.

This package defines deterministic local data for Docker Desktop development:

- Locks, alarm panels, door contacts, gates, and remote access points.
- Arm, night secure, away, gate check, and guarded disarm profiles.
- Security-role, remote unlock/open, door-state, and audit policies.
- Intent recipes for AIP-driven security planning.
- Simulated secure command plans and strict approval boundaries for unlock/open actions.

The package is read by the API gateway through `securityAccess.mjs`. E14 does not command real security hardware; apply operations return simulated command plans for safe actions while preserving the approval and physical-command boundary for remote unlock and gate-open commands.
