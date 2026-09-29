---
title: Refresh reports incrementally from a warm snapshot
type: decision
status: accepted
decided_on: 2026-09-25
created: 2026-09-26
tags: [guest, performance, caching, snapshot]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[performance-and-caching]]", "[[runtime-js-guest-platform]]"]
---

# Refresh reports incrementally from a warm snapshot

## Context

With no SQL views on the TrailBase side ([[trailbase-drop-sql-views]]), every report read has to
derive its rows from base tables. Doing that per request would move the cost from SQLite into
the guest's JS, and reading 17 tables on every report request would be worse than the legacy
behaviour it replaces.

Inflating the cache window was the legacy answer (POS-0009 raised `staleTime` from 0.5 s to 60 s)
but that only exchanges staleness for speed: the numbers can be a minute old, and any write is
invisible until the window expires.

## Decision

Hold an in-memory snapshot of the 17 base tables **and** their derived views, and keep it fresh
with a fingerprint job that only does work for what actually changed:

| Step | What it does | Cost when nothing changed |
|---|---|---|
| **probe** | one probe per table: `COUNT(*)` + `MAX(updated)` → `{count, newest updated}` | 17 tiny queries |
| **fetch** | re-read only tables whose fingerprint moved, each read whole via `readTables` | nothing |
| **process** | rebuild only the views those tables feed (`viewsAffectedBy`) | nothing |
| **cache** | report results are cached per `(report, filters)` lazily as they are requested | nothing |

The job runs on demand (`POST /reports/refresh`, optionally `?full=1`) and immediately after a
write (`invalidate()` drops the snapshot so the next read rebuilds it); its state is exposed at
`GET /reports/status`.

Aggregation runs in-process in the guest component; there is no `worker_threads` fan-out. The
former Node frontend (`frontend-ssr`, removed 2026-09-27) ran it on a pool sized to
`WORKER_THREADS` or CPUs − 1, falling back to in-process computation if the pool could not start.

## Why it works

- **Every table has `updated`,** maintained by a per-table `AFTER UPDATE` trigger, and ids are
  time-sortable UUIDv7 — so any insert (count changes), delete (count changes) or in-place update
  (newest `updated` changes) moves the fingerprint. One cheap probe per table is therefore
  sufficient to decide whether the table needs reading at all.
- Link tables have no `updated` column, so their probe degrades to count-only: still catches
  inserts and deletes, just not in-place updates.
- `viewsAffectedBy(tables)` keeps a one-table write from rebuilding all 14 views, and
  `buildSelectedViews(base, previous, dirty)` is the incremental builder.
- Report results are additionally cached per `(report, filters)` in the KV store, keyed by a
  per-process nonce and the snapshot `version` so a restart or an invalidate cannot serve a stale
  entry.
- `invalidate()` drops the snapshot and bumps the `version`, so the next request rebuilds and no
  cached report result keyed to the old version can be served. Writes call it directly, so the
  next request already sees the write rather than waiting for a refresh.

## Consequences

**Accepted**

- Reading a report is a memory lookup plus, at most, one cached computation — no database work on
  the request path.
- Freshness is bounded by the interval *or* by the write that caused the change, whichever comes
  first — strictly better than a fixed stale window.
- Report work runs in-process in the guest, bounded by the guest's per-call deadline rather than
  a worker pool; the former Node frontend used `worker_threads` to keep a slow report off the
  event loop and fell back to in-process computation rather than failing the request.
- The system is observable: `/reports/status` reports `ready`, `build`, `phase`, `tables`,
  `views`, `rows`, `cachedReports` and the last refresh, and `/healthz` reports the same status.
  The refresh control works without JavaScript.

**Given up**

- **Memory.** The snapshot holds every row of every table, plus every derived view. Fine at this
  data size; the thing to watch as the POS grows.
- **The first read is cold.** In the former Node frontend (`frontend-ssr`, removed 2026-09-27) no
  request meant no token, so its `server.js` had a middleware calling
  `reports.rememberToken(req.token)` on every request — "the refresh job runs between requests, so
  it needs a token to read with". The guest reads the depot SQLite directly and needs no token.
- **Eventual consistency is inherent.** A direct database write (outside the API) is invisible
  until someone presses the refresh button (or the snapshot is otherwise invalidated). The prior
  vault recorded this as
  `issues/report-cache-lag-after-client-side-import.md`, and the `invalidate(tables)` call plus
  the manual control are the answer — see [[previous-vault-recovery]].
- **Complexity.** In the former Node frontend this was four files (`data.js`, `index.js`,
  `pool.js`, `worker.js`) and roughly 16 KB of code; the guest folds it into `data.js` and
  `reports.js`, where the legacy app simply fetched a view.

## Evidence

- `trailbase/runtime/app/lib/data.js` — `TABLES` (the 17) and `readTable`/`readTables`.
- `trailbase/runtime/app/lib/reports.js` — the warm-snapshot service: `probeFingerprints` (the
  `count:newest updated` fingerprint and the comment explaining why it catches all three change
  kinds), `getViews`/`refresh`/`invalidate`, `cacheKey` keyed by nonce + `version`, the
  `viewsAffectedBy`-driven incremental rebuild, and the `status()` shape. Report work runs
  in-process here, so there is no counterpart to the Node frontend's `worker.js`.
- `trailbase/runtime/ahscripts/routes/_app/route.ts` — `GET /reports/status` and
  `POST /reports/refresh` including the `?full=1` path and the no-JS redirect fallback, the
  `A.service.invalidate()` calls after writes, and `/healthz` reporting the status;
  `trailbase/runtime/app/lib/report-pages.js` is the report/ledger page registry.
- The former Node frontend's `frontend-ssr/src/server.js` (removed 2026-09-27,
  [[guest-app-host-port]]) — `reports.rememberToken(req.token)`, the `warm` list built from
  `REPORT_PAGES`, `reports.start()`, and graceful shutdown via `reports.close()`.
