# Matter And Thread Adapter

This package models the Matter controller and Thread border-router foundation for EdgeCommand Control Fabric.

The E23 slice is deterministic and local:

- Matter fabric metadata and controller status.
- Registry-backed Matter device bindings.
- Thread border-router health and mesh dataset status.
- Commissioning workflow previews.
- Matter command previews for mapped devices.
- Certification-aware readiness for later runtime enablement.

No real device commissioning or fabric mutation is performed in this foundation slice.
