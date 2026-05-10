# KRA Engine

This package seeds the E09 Knowledge And Risk Agent.

It defines deterministic local rule packs and evidence sources for critique-only evaluation:

- AIP execution boundary.
- Physical safety grounding.
- Narrowband command safety.
- Module certification boundary.
- Existing automation overlap review.
- Grounding completeness.

The KRA engine critiques, grounds, and blocks unsafe proposal semantics. It does not execute device commands, enable modules, mutate Docker, or change Azure infrastructure.
