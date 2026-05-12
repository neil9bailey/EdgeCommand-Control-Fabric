# Z-Wave Adapter

E25 foundation package for governed Z-Wave support in EdgeCommand Control Fabric.

This package is deterministic and preview-only. It models controller health, secure inclusion and exclusion, node bindings, command class metadata, high-risk lock command policy, signal supervision, intent recipes, and recent run evidence without touching a physical Z-Wave controller.

Runtime integration targets:

- Local Docker Desktop API gateway.
- Future Z-Wave JS, OpenZWave-compatible, or vendor controller workers.
- Azure Container Apps deployment with S2 keys and controller credentials sourced through Key Vault.
