# Simulation Lab

This package seeds the E10 Simulation Lab.

It defines deterministic local simulation scenarios for:

- Leak and water shutoff dry-runs.
- Broadband outage and LoRaWAN emergency routing.
- LoRaWAN delay, payload, TTL, and acknowledgement constraints.
- Manual override and offline sensor failure injection.
- Energy reserve policy holds.

The lab runs against cloned device and link state. It never mutates live device registry state, executes physical commands, enables modules, or changes infrastructure.
