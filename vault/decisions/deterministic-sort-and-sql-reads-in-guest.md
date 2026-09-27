---
title: Guest reads base tables by SQL ordered -id, and sorts with an engine-independent comparator
type: decision
status: accepted
decided_on: 2026-09-26
created: 2026-09-26
tags: [trailbase, wasm, rquickjs, data, reports, determinism]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-app-host-port]]", "[[runtime-js-single-host]]", "[[reports-and-ledgers]]", "[[trailbase-guest-wasm-runtime-defaults]]"]
---

# Guest reads base tables by SQL ordered `-id`, and sorts with an engine-independent comparator

## Context

The guest app-host reads the depot's SQLite directly rather than through TrailBase's record APIs
([[guest-app-host-port]]). The report/ledger calculators are order-sensitive: some sort, but many
do not, and floating-point accumulation follows input order. A first differential run against the
former Node app matched only 1/14 pages.

## Decision

1. **Read every base table with `ORDER BY "id" DESC`.** That is the record API's default order
   (uuid_v7 ids are time-sortable), so the guest presents the same row order the Node app saw.
   Without it, rows were in rowid order and totals drifted in the last cent.
2. **Never use `localeCompare` in shared compute.** `String.prototype.localeCompare` is ICU-backed
   in Node/V8 but not in QuickJS, so the same sort produced different orders on the two runtimes.
   `compute/format.js` exports `compareText(a, b)` — case-insensitive, then lowercase before
   uppercase — and every sort in `compute/views.js` and `compute/reports.js` uses it. The
   tie-break keys are computed only when the case-insensitive comparison ties, so the hot path is
   two `toLowerCase()` calls.
3. **Build only the views a request needs.** The guest service uses `viewClosure`/`tablesForViews`
   to build lazily and cache, instead of building all views per request.

## Consequences

**Accepted**

- Report and ledger output was **byte-identical** between the guest and the Node app on the same
  data (14/14 pages; see [[guest-app-host-port]]).
- Ordering is deterministic and identical across engines, which is what makes the differential
  test meaningful.
- Row order and sort order both change slightly relative to a collation-aware ordering: e.g.
  `800ml` now sorts before/after `800ML` by a fixed rule rather than ICU's. Ties across case are
  ordered lowercase-first, which matches ICU for the ASCII cases observed.

**Given up / to watch**

- SQLite reads are unordered only if a future read forgets the `ORDER BY`; the parity harness
  would catch a regression on the pages it covers.
- `compareText` is an approximation of ICU: non-ASCII and punctuation-heavy orderings will not
  match V8 exactly. It is deterministic, which is what matters for parity and caching.
- Any new shared `compute/` sort must use `compareText`, not `localeCompare` — this is the rule
  the guest depends on.

## Evidence

- The Node-vs-guest differential harness (`runtime-js/tools/guest-parity.mjs`, removed with the
  Node app) — 14/14 pages matched (totals exact, rows equal after stripping raw ids); see
  [[guest-app-host-port]].
- `runtime-js/site/app/lib/data.js` — `readTable` ordering;
  `runtime-js/site/app/compute/format.js` — `compareText`; `runtime-js/site/app/compute/views.js` —
  O(n log n) `buildLedgerParty`.
- [[guest-app-host-port]] — the measurements and the remaining gaps.

## Related

- [[runtime-js-single-host]] — the host this data path lives in.
- [[reports-and-ledgers]] — the arithmetic being reproduced.
