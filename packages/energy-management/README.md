# Energy Management

E16 promotes whole-home energy, solar, battery backup, and EV charging into a governed foundation module.

It currently provides:

- Home energy asset modelling for meter, solar inverter, battery, and EV charger.
- Tariff-aware and solar-surplus profiles.
- Battery reserve and outage critical-load policies.
- Simulated command plans only; no physical battery, inverter, or charger commands are executed.
- MCP-ready preview and load proposal boundaries.

The package is read by the API gateway through `energyManagement.mjs`. Energy optimizations may be previewed and simulated locally while high-risk load and battery actions remain policy-gated.
