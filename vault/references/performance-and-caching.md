---
title: Performance and caching
type: reference
status: active
system: both
created: 2026-09-26
tags: [pos, performance, caching, indexes, snapshots]
related_to: ["[[frontend]]", "[[runtime-js-guest-platform]]", "[[backend]]"]
---

# Performance and caching

Performance is the stated reason for this rewrite, not a side effect of it. This note collects
what each layer does about it, on both sides.

## The problem, in the code's own words

`frontend/src/app/providers.tsx` (POS-0009):

> was `staleTime: 1000 / 2` (0.5 s) with `refetchOnMount: true`, so every navigation re-fetched
> **9k–26k row report views**.

`frontend/src/app/api/useAPI.ts` echoes it — "navigating back to a page does not re-fetch a
9k-26k row view" — and adds POS-0011 for pagination: use `listPage` instead of `getFullList`
for invoices/transactions/payments.

So there were two compounding causes: **whole-view fetches** and a **0.5-second cache window**
that made every navigation re-fetch them.

## Legacy side (production)

### Query cache — `providers.tsx` + `useAPI.ts`

```ts
queries: {
  staleTime: 60 * 1000,            // was 1000 / 2
  gcTime: 10 * 60 * 1000,
  refetchOnReconnect: true,
  refetchOnWindowFocus: false,
  refetchOnMount: true,
}
```

- 60 s of freshness for transactional/report data; reference data gets 5 min via
  `REFERENCE_STALE_TIME` and `referenceQueryOptions` in `useAPI.ts`, applied to
  `REFERENCE_COLLECTIONS` = `areas`, `sections`, `categories`, `items`, `parties`,
  `order_bookers`, `users`.
- `refetchOnMount` stays `true` **deliberately**: mutations call a bare
  `queryClient.invalidateQueries()`, which only refreshes *active* queries, so
  `refetchOnMount: false` would leave invalidated-but-inactive queries stale forever — screens
  showing pre-write data. Fresh data inside `staleTime` is served from cache instantly, so
  navigation stays fast anyway.
- `refetchOnWindowFocus: false` removes the focus-refetch storm.
- Pagination: `crud.listPage` wraps `getList(page, perPage, …)` for transactional collections,
  replacing `getFullList`.

### APPLY-gated filters — POS-0026

`useAppliedFilters(initial)` holds the filter values a query actually reads, so editing several
inputs (area → section → booker) collapses to **one** request when APPLY is pressed instead of
one per keystroke. The guest frontend keeps the same behaviour as a server-rendered APPLY/RESET
form.

### Server-side aggregation in SQL — three migrations

| Migration | What it buys |
|---|---|
| `1789890189_add_performance_indexes` | indexes for the access paths the reports take |
| `1789890300_ledger_party_window_function` | rewrites the Party Ledger as a window function instead of a self-join |
| `1789890310_payments_summary_view` | pre-aggregates payment totals — a filtered report reads **dozens of summary rows instead of tens of thousands of raw ones** |

`payments_summary` is the clearest case: the client used to fetch every matching `payments_view`
row and `SUM` them in `PaymentsView.tsx`'s `calculator()`. Now rows are grouped by day +
filter dimensions and the client sums eight columns over the groups. Its eight columns are
documented in [[backend]], and the client must filter on `day` (and the dimension columns)
rather than the raw `created` timestamp.

The view's comment also records a hard constraint that shaped the design: **every column in a
PocketBase view must be a single function call**, which is why `total_sending`,
`total_recieving` and `total` are derived in JS rather than in SQL.

## New side (experimental)

### Incremental warm snapshot — `runtime-js/site/app/lib/reports.js`

A snapshot of the 17 base tables **and** their derived views is held in memory and refreshed
incrementally, spending CPU only on what changed:

| Step | Cost |
|---|---|
| **probe** | one query per table: `` `${COUNT(*)}:${MAX(updated)}` `` → a `count:newest updated` fingerprint |
| **fetch** | only tables whose fingerprint moved, each read whole from the depot's SQLite |
| **process** | only the views those tables feed (`viewsAffectedBy`) |
| **render** | only the reports reading a rebuilt view, pre-rendered for their default filters |

Mechanisms that make it work:

- Every table carries `updated` (trigger-maintained) and ids are time-sortable UUIDv7, so any
  insert, delete or in-place update moves either the count or the newest `updated`. The probe
  therefore catches all three change kinds with one cheap query per table.
- Link tables (`party_companies`, `order_booker_companies`) have no `updated` column, so they fall
  back to a count-only fingerprint — still catches inserts and deletes, just not in-place updates
  ([[guest-fingerprint-refresh]]).
- `viewsAffectedBy(tables)` keeps a write to one table from rebuilding all 14 views;
  `buildSelectedViews(base, previous, dirty)` is the incremental builder.
- **Report results are cached in the depot KV store**, keyed by a per-process nonce and snapshot
  version ([[guest-report-result-cache]]).
- A management write calls `invalidate(tables)`, which marks only those tables and triggers the
  job immediately, so the next request already sees the write — no waiting for the timer.
- Aggregation runs **in-process in the guest host** — the guest has no `worker_threads` fan-out
  ([[runtime-js-guest-platform]]), so the same pure functions run on the request; views are rebuilt
  lazily on the request that reads them.
- `ensureFresh` retries at most 3 times, so a stream of writes cannot spin the loop.

### Pages ship results, not views

The declarative page host (`/p/<slug>/data`) returns `{version, slug, filters, result, meta}`
plus *only* the tables needed to populate select filters. It does **not** ship the derived views
for the browser to reduce — the browser renders a finished result and does no report
computation. That is a deliberate inversion of the legacy model, where the client fetched a view
and computed the totals.

Response hygiene on that endpoint:

- `etag: W/"v<PAYLOAD_REVISION>-<snapshotVersion>-<filters>"` with `cache-control: private,
  no-cache` → a repeated read of an unchanged snapshot is a `304`. `PAYLOAD_REVISION` (currently
  `3`) is bumped when the payload shape changes, so stale caches invalidate.
- `vary: accept-encoding` and gzip via `gzipSync` when the client accepts it.
- A 1 MB body cap on `urlencoded`, and `/static` served with `maxAge: 0` so runtime edits are
  picked up (an unchanged file costs a 304, so the revalidation is cheap).

### One implementation, two runtimes

`runtime-js/site/app/compute/` is served at `/compute/*` (behind auth) as the *same file bytes* the
guest dispatcher loads, so the browser runtime can run the identical report code in a worker. There
is no second implementation to keep in sync, and no drift between what the server computed and what
the client would compute.

## Where the two approaches differ

| Concern | Legacy | New |
|---|---|---|
| Where aggregates are computed | SQL views in PocketBase; client sums the rest | JavaScript, shared between the guest host and the browser |
| How much data crosses the wire | whole views (9k–26k rows) | a finished result + small reference tables |
| Freshness | 60 s `staleTime`, plus SQL views updated on read | warm snapshot, invalidated on write, rebuilt lazily on the request that reads it |
| Change detection | none (re-fetch by cache policy) | per-table fingerprint (count + newest `updated`) |
| Computed where | browser main thread | in-process in the guest host, or a browser worker |
| Manual refresh | none | `/reports/refresh` button, `?full=1` for a full re-read |
| Aggregation cost per read | paid per request in SQLite | paid once per change, in memory |

## Open performance items

- `tb-0015-integer-cents-for-money` — `REAL` money forces `printf("%.2f")`-style rounding
  everywhere; integer cents are both more correct and faster.
- `tb-0013-rework-report-screens-without-views` — the legacy screens that read dropped views
  still need reworking; until then they cannot be pointed at TrailBase.
- `tb-0012-wire-nextjs-frontend-to-trailbase` — the legacy client's `getFullList` callers should
  move to `listPage` before any cutover, on either backend.
- **`CACHE_TTL_SECONDS`** in the removed Node frontend's `.env` (`frontend-ssr`, removed 2026-09-27)
  was read by nothing, so it tuned nothing; the guest has no such setting ([[environment]]).

## Related

- [[reports-and-ledgers]] — the arithmetic these mechanisms carry.
- [[frontend]] — `providers.tsx`, `useAPI.ts` and the client-side caching in context.
- [[runtime-js-guest-platform]] — the report service and page host in context.
- [[backend]] — the indexes and summary view migrations.
