# Build Status

Date: 2026-05-10

This file tracks completed delivery slices so the local and remote repository stay in sync.

## Completed

### E01 - Repository, Local Runtime, And Engineering Baseline

Status: complete and pushed to `origin/main`.

Commit: `c1a5857 Initialize EdgeCommand Control Fabric scaffold`

Delivered:

- Docker-first workspace.
- API gateway service.
- React/Vite web console.
- Shared module catalogue with 57 module surfaces.
- Local Docker Compose stack.
- Azure Container Apps IaC skeleton.
- Blueprint, design canvas, and epic roadmap.

Verification:

- `npm test`
- `npm run build`
- `npm run health`
- Docker Compose health.
- Browser render verification.

### E03 - Device Registry And Capability Model

Status: complete; pending commit/push in the current delivery slice.

Delivered:

- File-backed seed registry for sites, zones, capability definitions, and devices.
- API endpoints for devices, sites, and capabilities.
- Dashboard device coverage wired into module surfaces.
- Registry summary in the command centre.
- Tests for registry loading, filtering, and hero scenario devices.

Verification:

- `npm test`
- `npm run build`
- `npm run health`
- Docker Compose health.
- API verification for `/api/devices` and `/api/devices?capability=water_valve`.
- Browser render verification for Water Management device coverage.

## In Progress

### E04 - Event Bus, Telemetry, And Audit

Status: next planned build slice.
