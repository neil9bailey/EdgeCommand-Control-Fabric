# Lighting And Scenes

E12 promotes Lighting And Scenes from a mocked catalogue entry into a manifest-backed feature module.

This package defines local deterministic scene data for Docker Desktop development:

- Fixture bindings to normalized device-registry devices.
- Lighting zones and grouped controls.
- Scene profiles for task, evening, night path, and away presence modes.
- Schedule metadata and intent recipes for AIP/MCP planning.
- Manual override, occupancy, and audit policies.

The package is read by the API gateway through `lightingScenes.mjs`. It does not command real devices in E12; apply operations return simulated command plans and audit events while preserving the later physical-command boundary.
