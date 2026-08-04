# 0001 – SPA Monolith vs Micro‑Frontends

**Status**: Accepted
**Created**: 2026‑08‑04
**Context**
- The TPV application started as a single‑page application (SPA) using Next.js.
- Business wants to scale development across multiple teams and potentially host parts of the UI in separate repositories.

**Decision**
- We will keep the current architecture as a **monolithic SPA** for now.
- Rationale:
  1. Simpler CI/CD pipeline – a single build artifact.
  2. Lower operational overhead (no need for runtime orchestration of multiple front‑ends).
  3. The codebase is still relatively small; micro‑frontends would add unnecessary complexity.
- Future micro‑frontend adoption can be considered if the codebase exceeds ~200 k LOC or multiple independent teams need isolated deployment pipelines.

**Consequences**
- All UI code lives under `app/` and `components/`.
- Feature toggles should be used to isolate large new sections.
- Documentation and testing must ensure that new modules do not unintentionally increase bundle size.
