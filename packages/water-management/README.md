# Water Management

E15 promotes Water Management from the hero catalogue surface into a manifest-backed feature module.

This package defines deterministic local data for Docker Desktop development:

- Home and remote cottage water zones.
- Leak sensors, flow meters, valves, and gateway bindings.
- Emergency shutoff, manual override, dry-state-before-reopen, remote reopen approval, and narrowband policies.
- Shutoff and reopen profiles for governed command planning.
- Intent recipes for AIP-driven leak response and safe reopen planning.

The package is read by the API gateway through `waterManagement.mjs`. E15 does not command real water hardware; apply operations return simulated command plans for emergency close actions while preserving approval boundaries for remote reopen and physical actuation.
