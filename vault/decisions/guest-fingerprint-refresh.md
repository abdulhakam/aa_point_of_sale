---
title: Guest data refresh is fingerprint-based and incremental
type: decision
status: accepted
decided_on: 2026-09-26
created: 2026-09-26
tags: [trailbase, wasm, rquickjs, data, cache, fingerprints, phase-5]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-app-host-port]]", "[[deterministic-sort-and-sql-reads-in-guest]]", "[[reports-and-ledgers]]"]
---

# Guest data refresh is fingerprint-based and incremental

## Context

The Node service keeps a warm snapshot and refreshes it off the request path: it probes each base
table's `{count, newest updated}`, re-reads only what changed, and rebuilds only the views affected
(`viewsAffectedBy`). The guest cannot do that per request — it is an interpreter with a 20 s call
deadline ([[trailbase-guest-cpu-js-limits]]) — so it builds lazily per view closure
([[guest-app-host-port]]). It still needs the same "refresh only what changed" behaviour.

## Decision

- **Fingerprint every base table** as `` `${COUNT(*)}:${MAX(updated)}` `` in one query. Link tables
  (`party_companies`, `order_booker_companies`) have no `updated` column, so they fall back to a
  **count-only** fingerprint; a row added or removed still changes it.
- **`refresh(db)`** probes all tables, diffs against the stored fingerprints, re-reads only the
  changed tables, and rebuilds only the **materialised** views that `viewsAffectedBy(changed)`
  names, using `buildSelectedViews` (dependency order).
- **After a `full` invalidate** (or on the first refresh) nothing is materialised, so the whole
  view set is built — matching the Node service's "refresh leaves the snapshot ready".
- **`GET /reports/status`** exposes `fingerprints`, `refreshedAt` and `lastRefresh:
  { changed, rebuilt }`, so a caller can see what a refresh actually did.

`/reports/refresh` (`?full=1` to invalidate first) drives it; a successful management write calls
`invalidate()` so the next read rebuilds.

## Consequences

**Accepted**

- Incremental refresh: a write to one table re-reads that table and rebuilds only the views that
  depend on it (verified: after creating a section, `lastRefresh.changed` includes `sections` and
  `rebuilt` includes `refs`).
- `lastRefresh` makes the behaviour observable rather than assumed.

**Given up / to watch**

- Fingerprints are `count:newest updated`. An update that does not change either (e.g. a row edited
  within the same `updated` millisecond, or a table without `updated` where a row is edited but not
  added/removed) will not be detected. The base schema maintains `updated` with `AFTER UPDATE`
  triggers, so edits do move it; the link-table count-only case is the known weakness.
- No background refresh job yet — refresh is on demand (the manual control) and on invalidation
  after writes.
- Views are rebuilt on the request that reads them (lazy), not eagerly off the request path.

## Evidence

- `trailbase/runtime/app/lib/reports.js` — `probeFingerprints`, `refresh`, `status`.
- The guest smoke (`trailbase/tools/guest-smoke.mjs`) asserts `lastRefresh.changed` includes
  `sections` and `lastRefresh.rebuilt` includes `refs` after a write: every check passes
  (**67/67** when this was written on 2026-09-27; the suite has grown since — see
  [[smoke-count-is-not-a-hard-coded-number]]).

## Related

- [[guest-app-host-port]] — the app host and its lazy view builds.
- [[deterministic-sort-and-sql-reads-in-guest]] — the adjacent read-path decision.
