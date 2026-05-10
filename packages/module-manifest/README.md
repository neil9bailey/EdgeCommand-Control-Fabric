# Module Manifest And Feature Flags

E18 promotes the Module Marketplace from a catalogue surface into an operational manifest and feature flag framework.

This package is intentionally deterministic and file-backed for local Docker Desktop. It answers:

- Which modules are enabled, discoverable, buildable, blocked, or approval-gated.
- Which service, dashboard, IaC, policy, test, MCP, and documentation artifacts belong to a module.
- Which dependencies must be present before a human-triggered feature request can be built.
- Which feature flag controls a module in local Docker and future Azure Container Apps deployment.

The runtime API stays proposal-first. A flag preview can recommend enablement or build actions, but it does not mutate infrastructure or enable physical control without the later module builder, certification, and approval epics.
