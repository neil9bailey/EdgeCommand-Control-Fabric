# MCP Orchestrator

This package seeds the EdgeCommand MCP-style agent tool registry.

It defines:

- Permissioned agent tools.
- Agent ownership.
- Role and scope boundaries.
- Explicit approval gates for high-risk tools.
- Seed sessions and tool-call audit records.

The orchestrator is deliberately local and deterministic for now. It does not execute external tools or mutate devices. The API gateway uses this package to prove the governance model before real MCP servers, module tools, and external agents are added.

Core rule: an agent can only request a registered tool, the caller must hold every required scope, and high-risk tools pause until explicit human permission is attached.
