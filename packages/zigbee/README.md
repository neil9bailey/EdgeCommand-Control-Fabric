# Zigbee Adapter

E24 foundation package for governed Zigbee mesh support in EdgeCommand Control Fabric.

This package is intentionally deterministic and preview-only. It models coordinator health, mesh routes, device endpoint bindings, reporting configuration, command profiles, policy gates, intent recipes, and recent run evidence without joining a real Zigbee network or mutating physical devices.

Runtime integration targets:

- Local Docker Desktop API gateway.
- Future Zigbee2MQTT, deCONZ, Silicon Labs, or vendor coordinator workers.
- Azure Container Apps deployment with coordinator secrets and network keys sourced through Key Vault.
