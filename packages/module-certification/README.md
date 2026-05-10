# Module Certification And Test Harness

The certification harness is the governed quality gate between marketplace requests, build plans, and future module enablement.

This foundation slice is deterministic and preview-only:

- It reads certification profiles from `module-certification.json`.
- It links marketplace requests, manifest flags, and builder plans.
- It evaluates required evidence, test suites, policy gates, and approval requirements.
- It exposes dashboard and preview APIs.
- It does not mutate Docker Compose, Azure IaC, feature flags, or runtime state.

The first certification targets are MQTT/ESPHome, LoRaWAN adapter support, and Azure promotion for the Narrowband SD-WAN control plane.
