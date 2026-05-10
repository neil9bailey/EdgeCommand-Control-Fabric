# MQTT And ESPHome Adapter

This package models the first practical integration adapter for EdgeCommand Control Fabric.

The E22 foundation is deterministic and local:

- MQTT topic mappings for registry devices that already use the `mqtt` adapter.
- ESPHome-compatible discovery payloads.
- State subscription and command publish contracts.
- Simulated publish previews through the API gateway.
- Certification-aware readiness before future module enablement.

No physical broker publish is performed by this slice. The Docker Desktop Mosquitto broker is available for later runtime adapter work, while this package proves the contracts, dashboard, and safety boundaries first.
