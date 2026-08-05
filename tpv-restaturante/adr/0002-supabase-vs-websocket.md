# 0002 – Supabase vs Custom WebSocket

**Status**: Accepted
**Created**: 2026‑08‑04

### Context
- The application requires real‑time updates for floor state, orders, and inventory.
- Options considered:
  1. **Supabase Realtime** – managed WebSocket layer, built‑in auth via JWT, automatic reconnection, scaling handled by Supabase.
  2. **Custom WebSocket server** – full control, but requires provisioning, scaling, authentication, and keep‑alive handling.
- Non‑functional requirements: low latency (< 200 ms), secure connections, minimal operational overhead, easy CI/CD integration.

### Decision
- **Supabase Realtime** is adopted.
- Rationale:
  1. **Security** – Supabase validates JWT tokens automatically, reducing the risk of header spoofing.
  2. **Developer productivity** – SDK provides `supabase.from(...).on('INSERT', ...)` abstractions, eliminating boiler‑plate socket handling.
  3. **Scalability** – Supabase handles horizontal scaling and connection limits out‑of‑the‑box.
  4. **Cost** – Managed service cost is lower than provisioning a dedicated WebSocket server for our current traffic.
- The custom WebSocket approach is retained as a fallback in the `infra/` docs should we need to self‑host in the future.

### Consequences
- All real‑time subscriptions now use the Supabase client (`supabase-js`).
- Backend must issue JWTs with the `sub` claim matching the tenant and include them in the Supabase auth flow.
- CI includes a step that runs `npm run attw` to verify the Supabase types are exported from `@tpv/core`.
- Documentation updated in `docs/realtime.md` to reflect the Supabase integration.
