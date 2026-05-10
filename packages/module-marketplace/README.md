# Module Marketplace Dashboard

E20 creates the operator marketplace surface for feature modules.

The marketplace composes the product catalog, module manifest feature flags, and module builder plans into one view:

- Installed modules with enabled runtime surfaces.
- Available modules that can be requested or built.
- Requested/preview modules waiting for approval or certification.
- Modules with queue-ready build packages.
- Uncovered catalog modules that still need a manifest flag.

This package remains deterministic and proposal-only. Marketplace requests can preview the next flag/build action, but they do not mutate feature flags, compose files, Azure resources, or runtime modules.
