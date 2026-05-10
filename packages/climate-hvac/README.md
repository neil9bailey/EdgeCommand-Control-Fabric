# Climate And HVAC

E13 promotes Climate And HVAC from a mocked catalogue entry into a manifest-backed feature module.

This package defines deterministic local data for Docker Desktop development:

- Climate zones and thermostat/sensor bindings.
- Comfort, eco, away, and frost schedules.
- Safe setpoint, humidity, manual override, and energy reserve policies.
- Intent recipes for AIP-driven comfort planning.
- Simulated setpoint command plans and audit events.

The package is read by the API gateway through `climateHvac.mjs`. E13 does not command real HVAC hardware; apply operations return simulated command plans and audit events while preserving the adapter/physical command boundary.
