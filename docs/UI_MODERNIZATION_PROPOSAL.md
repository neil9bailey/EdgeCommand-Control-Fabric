# UI Modernization Proposal

## Why Change

The current console has outgrown a single-page dashboard. Every completed epic adds another dense panel, which makes the system powerful but visually noisy. The next UI slice should pause module expansion and introduce a page-based information architecture.

## Proposed Structure

- Overview: posture, key metrics, intent entry, urgent activity.
- Home Operations: lighting, climate, security, water, energy, sensing.
- Connectivity Fabric: MQTT, Matter/Thread, Zigbee, Z-Wave, future BLE/RF/IR, vendor cloud.
- Agents And Intent: AIP proposals, KRA critiques, MCP tool sessions.
- Approvals: all high-risk human decisions and evidence.
- Events And Logs: audit events, runtime messages, telemetry, command traces.
- Build Centre: marketplace, manifest, module builder, certification, IaC.

## Design Direction

- Palette: electric blue, cyan accents, white work surfaces, black navigation.
- Typography: modern Windows-native stack using Aptos Display / Segoe UI Variable.
- Layout: focused pages, sticky left navigation, compact metrics, dedicated right-side activity stream.
- Text handling: fixed table layout, wrapped cells, button labels constrained, no overflowing pills.
- Events and logs: removed from general panels and placed into dedicated activity/log sections.

## Mockup

Open [edgecommand-modern-ui.html](mockups/edgecommand-modern-ui.html) in a browser to review the proposed structure and style.

## Suggested Implementation Epic

E26A - UI Information Architecture And Modern Shell, before adding more modules.

Acceptance:

- Replace one-page dashboard with route/page-based shell.
- Add persistent app navigation and command/intent entry.
- Move logs, events, messages, and audit traces into dedicated pages/sections.
- Keep existing API calls and panels, but mount them only inside their correct page.
- Apply modern EdgeCommand theme with electric blue, white, black, clean alignment, and robust text wrapping.
