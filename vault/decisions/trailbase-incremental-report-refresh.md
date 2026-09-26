---
title: Refresh reports incrementally from a warm snapshot
type: decision
status: accepted
decided_on: 2026-09-25
created: 2026-09-26
tags: [frontend-ssr, performance, caching, snapshot, workers]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[performance-and-caching]]", "[[frontend-ssr]]"]
---

# Refresh reports incrementally from a warm snapshot

## Context

With no SQL views on the TrailBase side ([[trailbase-drop-sql-views]]), every report read has to
derive its rows from base tables. Doing that per request would move the cost from SQLite into
Node, and reading 17 tables on every report request would be worse than the legacy behaviour it
replaces.

Inflating the cache window was the legacy answer (POS-0009 raised `staleTime` from 0.5 s to 60 s)
but that only exchanges staleness for speed: the numbers can be a minute old, and any write is
invisible until the window expires.

## Decision

Hold an in-memory snapshot of the 17 base tables **and** their derived views, and keep it fresh
with a four-step job that only does work for what actually changed:

| Step | What it does | Cost when nothing changed |
|---|---|---|
| **probe** | one request per table: `limit=1&order=-updated&count=true` → `{count, newest updated}` | 17 tiny requests |
| **fetch** | re-read only tables whose fingerprint moved, each read whole via `listAll` | nothing |
| **process** | rebuild only the views those tables feed (`viewsAffectedBy`) | nothing |
| **render** | pre-render only the reports reading a rebuilt view, for their default filters | nothing |

The job runs on a timer (`REFRESH_INTERVAL_SECONDS`, default 60), on demand
(`POST /reports/refresh`, optionally `?full=1`), and immediately after a write
(`invalidate(tables)`), and its state is exposed at `GET /reports/status` and as the green
indicator in the top bar.

Aggregation itself runs on a `worker_threads` pool sized to `WORKER_THREADS` or CPUs − 1,
falling back to in-process computation if the pool cannot start.

## Why it works

- **Every table has `updated`,** maintained by a per-table `AFTER UPDATE` trigger, and ids are
  time-sortable UUIDv7 — so any insert (count changes), delete (count changes) or in-place update
  (newest `updated` changes) moves the fingerprint. One cheap request per table is therefore
  sufficient to decide whether the table needs reading at all.
- If the server rejects `order=-updated`, the probe degrades to count-only: still catches inserts
  and deletes, just not in-place updates.
- `viewsAffectedBy(tables)` keeps a one-table write from rebuilding all 14 views, and
  `buildSelectedViews(base, previous, dirty)` is the incremental builder.
- Report results are additionally cached per `(report, filters)`, `MAX_CACHED_REPORTS = 200`,
  oldest-first eviction.
- `invalidate(tables)` marks only the written tables **and fires the job immediately**, so the
  next request already sees the write rather than waiting up to a full interval. A `version`
  counter guards the race where a write lands mid-refresh: `dirty` stays set unless the commit
  saw the current version, and `ensureFresh` retries at most 3 times so a stream of writes cannot
  spin.

## Consequences

**Accepted**

- Reading a report is a memory lookup plus, at most, one cached computation — no database work on
  the request path.
- Freshness is bounded by the interval *or* by the write that caused the change, whichever comes
  first — strictly better than a fixed stale window.
- `worker_threads` keeps a slow report off the event loop; a failure there logs a warning and
  falls back to in-process computation rather than failing the request.
- The system is observable: `/reports/status` reports `phase`, `changed`, `rebuiltViews`,
  `rebuiltReports`, `durationMs`, `ready`, `build`, `tables`, `rows` and `cachedReports`, and
  `/healthz` reports the pool. The green indicator is also the manual refresh control, so it
  works without JavaScript.

**Given up**

- **Memory.** The snapshot holds every row of every table, plus every derived view. Fine at this
  data size; the thing to watch as the POS grows.
- **The first read is cold.** If no request has happened yet there is no token to read with, which
  is why `server.js` has a middleware calling `reports.rememberToken(req.token)` on every request
  — "the refresh job runs between requests, so it needs a token to read with".
- **Eventual consistency is inherent.** A direct database write (outside the API) is invisible
  until the timer fires or someone presses the refresh button. The prior vault recorded this as
  `issues/report-cache-lag-after-client-side-import.md`, and the `invalidate(tables)` call plus
  the manual control are the answer — see [[previous-vault-recovery]].
- **Complexity.** Four files (`data.js`, `index.js`, `pool.js`, `worker.js`) and roughly 16 KB of
  code exist to make report reads cheap, where the legacy app simply fetched a view.

## Evidence

- `frontend-ssr/src/lib/reports/data.js` — `TABLES` (the 17), `probeTables`, `signatureOfRows`,
  `signatureChanged`, `newestUpdated`, and the comment explaining why `{count, newest updated}`
  catches all three change kinds.
- `frontend-ssr/src/lib/reports/index.js` — the doc comment stating the four steps verbatim;
  `MAX_CACHED_REPORTS = 200`, `cacheKey`, `version`/`dirty` race guard, `ensureFresh`'s 3-attempt
  bound, `invalidate(tables)`, `start`/`stop`, and the `status()` shape.
- `frontend-ssr/src/lib/reports/worker.js` — the `report` / `views` / `ping` modes.
- `frontend-ssr/src/server.js` — `reports.rememberToken(req.token)`, the `warm` list built from
  `REPORT_PAGES`, `reports.start()`, and graceful shutdown via `reports.close()`.
- `frontend-ssr/src/routes/reports.js` — `GET /reports/status` and `POST /reports/refresh`
  including the `?full=1` path and the no-JS redirect fallback.
