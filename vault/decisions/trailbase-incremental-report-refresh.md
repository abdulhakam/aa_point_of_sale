---
type: Decision
status: Accepted
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[Issue — Report cache lag after a client-side import]]"
  - "[[Decision — Drop SQL views; aggregate reports client-side]]"
affects:
  - "[[Frontend — TrailBase Server-Rendered App]]"
created: 2026-09-25T00:00:00.000Z
updated: 2026-09-25T00:00:00.000Z
tags:
  - trailbase
  - frontend
  - reporting
  - performance
  - caching
---

# Decision — Refresh the report snapshot incrementally from table fingerprints

## Status

Accepted (2026-09-25). Implemented in `frontend-ssr/src/lib/reports/index.js`.

## Context

The first report service read **all 17 base tables (~60,245 rows)** once, built **every** derived view from
them, and cached the result for `CACHE_TTL_SECONDS` (60 s). Three problems:

1. **Steady-state load.** Every 60 s, with no data change at all, the server re-read ~60k rows (~1,000
   rows/s sustained) and rebuilt all 14 views.
2. **Main-thread cost.** `buildViews()` ran synchronously inside the request that triggered the refresh,
   so it stalled the event loop — and therefore every other request — for its duration.
3. **No per-request isolation.** The unlucky request that arrived after the TTL expired paid the whole
   read + build before it could render.

The owner's framing: **reading TrailBase is cheap; the CPU is the cost.** Stale-while-revalidate was
proposed and explicitly dropped, because network latency was never the bottleneck.

## Decision

Keep the snapshot in the Node process, but refresh it **incrementally** from a change fingerprint:

1. **Probe.** One cheap request per table for `{row count, newest updated}` (`limit=1&count=true&order=-updated`).
   `updated` is maintained by a per-table `AFTER UPDATE` trigger, so any insert, delete or in-place update
   moves one of the two numbers.
2. **Fetch.** Only the tables whose fingerprint moved, each read whole.
3. **Process.** Rebuild only the views those tables feed — `VIEW_DEPS` in `compute/views.js` plus
   `viewsAffectedBy()`.
4. **Render.** Re-render (in the worker pool) only the reports that read a rebuilt view, and publish the new
   snapshot **before** doing so, so a request arriving mid-render reads fresh views instead of waiting.

A management write calls `invalidate(tables)` with the exact tables it touched, which marks just those and
runs the same job immediately. A `REFRESH_INTERVAL_SECONDS` tick (default 60 s) is the safety net for
out-of-band writes. The probe falls back to count-only if `order=-updated` is ever rejected.

## Consequences

- **A quiet tick costs nothing but 17 cheap requests** — no fetch, no rebuild, no re-render. The steady-state
  cost that motivated the decision is gone.
- **Change detection is cheap but not perfect:** an in-place edit and an insert within the same millisecond
  would be missed. Verified that in-place updates *are* detected (renaming an older row moves the newest
  `updated`).
- **The derived views stay in the server**, which is why they are cheap per request — and why moving them to
  the browser loses that advantage (see
  [[Issue — Declarative pages ship whole views and are slower than server rendering]]).
- The job needs a token to read with, so it reuses the most recent request's session token; without one it is
  skipped and the on-demand path still works.
- The 4-colour indicator in the top bar (`idle` / `fetch` / `process` / `render`) is driven by the job's phase
  via `GET /reports/status`.

## Alternatives considered

- **Blanket TTL re-read** (status quo) — rejected: ~60k rows/min of steady load for data that rarely changes.
- **Stale-while-revalidate** — proposed, then **rejected by the owner**: reading TrailBase is not the
  bottleneck, so hiding the read hides nothing that matters.
- **A change feed / timestamp filter** — not available: TrailBase's filters support only `$eq` here, so
  `updated > lastSeen` cannot be expressed; the fingerprint probe is the substitute.
- **Rebuild everything on any change** — rejected: the view graph is known, so the affected subset can be
  computed exactly.

## Evidence

- Focused harness (18/18): an out-of-band section insert was detected by the probe alone; only `counts` and
  `refs` were rebuilt and the heavy views were untouched; a quiet tick did not rebuild but still checked; a
  management write invalidated its own table and rebuilt immediately.
- 7/7: `order=-updated` is honoured, and an in-place update with an **unchanged** row count is detected.
- `npm run smoke` 55/55 before and after, so the refactor is behaviour-preserving.

## Revisit when

- The data volume makes a count-only probe expensive (a huge table), or write rates grow enough that the
  interval is too coarse — a change feed or a server-side revision counter would then be justified.

## Related

- [[Issue — Declarative pages ship whole views and are slower than server rendering]]
- [[Issue — Report cache lag after a client-side import]]
- [[Decision — Drop SQL views; aggregate reports client-side]]
- [[Frontend — TrailBase Server-Rendered App]]
