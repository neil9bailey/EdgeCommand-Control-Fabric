# Approval Workflow

This package seeds the E11 Human Approval And Policy Workflow.

It defines deterministic local policy rules and approval lifecycle states for high-risk automation:

- Human approval before physical actuation.
- Simulation evidence before approval.
- KRA critique before approval.
- Separate signed command queue after approval.
- Rejection and change-request outcomes that keep commands blocked.
- Emergency policy exception metadata for later governed runtime expansion.

The workflow records approval decisions and command-queue readiness. It does not actuate devices or mutate infrastructure.
