---
title: The KV store is a handoff and a stamp, not a report or invoice cache
type: note
status: active
created: 2026-10-06
tags: [trailbase, kv, cache, reports, performance, precomputation]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-cost-on-a-whole-database]]", "[[spooling-report-rows-through-kv]]", "[[fingerprint-memo-is-per-thread-so-a-read-after-a-write-can-be-stale]]", "[[component-split-and-sql-materialised-tables]]", "[[heavy-report-blocks-runtime-threads]]"]
---

# The KV store is a handoff and a stamp, not a report or invoice cache

Asked directly on 2026-10-06: *are we still using the KV cache tables for storing the JSON data of
reports or invoices?* **No.** There is no persistent report-result cache and no invoice cache in the KV
store. What KV holds today, and nothing else:

| Use | Where | Life |
|---|---|---|
| **Spool handoff** — report rows written in Rust, read back into the render | `spool.rs` (`spool:` keys; `route-kit.kvTakeJSONL` reads and deletes) | created and deleted within one request |
| **Cross-thread data stamp** — `aa:data-stamp`, so a read on another runtime thread re-probes the fingerprint after a write | `app/lib/reports.js` (`KV_STAMP_KEY`) | one small string, overwritten on each write |
| **Render A/B bench** | `app/lib/render-client.js` | a bench artifact, not the app path |

**The report-JSON cache is gone.** It was `reports.js` caching under `rpt:` — the "376-line snapshot
service" removed on 2026-10-03 (tb-0032 step 3); `reports.js` is now only the fingerprint/refresh
service, and `spool.rs`'s comment still mentioning `rpt:` is stale. The two caches the system actually
keeps are both **SQLite**, not KV:

- **the rendered-page cache** (`pagecache` table), keyed on the data fingerprint AND the code revision,
  so it is fresh by construction — [[rendered-page-cache]];
- **`inv_doc`** (one materialised invoice document per invoice, trigger-maintained) — SQLite, Tier 2,
  not KV — [[invoice-document-write-through-and-rebuild]].

## Why this matters for the proposed morning / 15-minute regeneration

A proposal was made to (a) recreate all reports every morning via an init script and (b) run a
15-minute job that finds changed rows and regenerates only the affected reports' KV. It has **no cache
to regenerate** — the premise is out of date. And building such a cache would **reverse a recorded
decision**: `reports.no_precomputation` requires that report computation **not** be precomputed or
timer-refreshed, because a timer makes data stale by construction. A morning rebuild is up to 24 h
stale; a 15-minute job up to 15 minutes.

The system already gets the freshness that proposal was reaching for, without a timer: the reports are
**SQL over base tables** (~0.05–1.2 s, [[report-cost-on-a-whole-database]]), and the rendered-page cache
is invalidated by the **fingerprint** the moment a write commits — so a page can never be older than the
last change. If the goal is instead "never compute on the request path", the bounded, non-staling way is
the existing **job queue** warming the rendered-page cache on the fingerprint-change event (not on a
clock), which is [[guest-report-performance-options]] option 4 and keeps every read fresh.
