---
title: New-system report timings after a production import (2026-09-28)
type: note
status: active
created: 2026-09-28
tags: [performance, reports, benchmark, guest, migration, import, timings]
related_to: ["[[guest-vs-legacy-report-performance]]", "[[guest-vs-node-performance]]", "[[runtime-js-guest-platform]]", "[[build-and-run]]", "[[reports-and-ledgers]]", "[[guest-depot-created-is-import-time]]"]
---

# New-system report timings after a production import (2026-09-28)

A clean end-to-end run of the new system only: rebuild the depot from source, migrate the live
production PocketBase into it, refresh, then time every report. Single machine
(`127.0.0.1`), warm OS caches, HTTP timing against the guest (server-rendered, so the response time
is the whole cost the user waits for).

## The run

1. **Rebuild** with the new scripts: `trailbase/clear_db.bat` (wiped the depot and re-copied
   `src/` → `traildepot/`) then `trailbase/build.bat` (`cargo build --target wasm32-wasip2
   --release`, **1.06 s** incremental; component copied to `traildepot/wasm/runtime_js.wasm`).
2. **Fresh depot + admin**: `trail --depot=traildepot user change-password admin@localhost …`,
   then `trail … run --runtime-root-fs=traildepot/runtime` on `127.0.0.1:4000`.
3. **Migrate** through the `import-from-v1` plugin (`:8090` → `:4000`):
   **60,245 records, 0 errors**, ~**4,100 rec/s**, ~15 s. Per collection: sections 10, categories 15
   (+15 mirrored into companies), areas 59, parties 942 (+13 links), order_bookers 4 (+5 links),
   items 207, expenses 88, invoices 8,927, invoices_return_reference 54, transactions 23,413,
   payments 26,526. `invoice_maker` dropped on 8,927 invoices (reported, expected —
   [[import-from-v1-drops-invoice-maker]]). Row counts match the production source exactly.
4. **Refresh**: `POST /reports/refresh?full=1` → **11,601 ms** (17 fingerprints, 5 reports cached).
5. **Time every report**: a cold first hit each (views not yet built), then the warm median of 3.

## Timings

| report | rows | cold first hit (ms) | warm median (ms) | payload (KB) |
|---|---|---|---|---|
| payments | 26,526 | 3,873 | 2,755 | 6,368 |
| itemsales | 21,815 | 14,964 | 4,369 | 7,702 |
| salesreport | 8,648 | 1,299 | 1,104 | 2,085 |
| paymentsbycompany | 32,561 | 19,648 | 3,987 | 8,734 |
| stockreport | 207 | 3,191 | 46 | 47 |
| profit | 21,815 | 14,571 | 4,276 | 8,307 |
| difference | 207 | 62 | 53 | 35 |
| outstanding | 602 | 596 | 78 | 117 |
| productsale | 205 | 241 | 44 | 35 |
| dailysale | 8,606 | 943 | 593 | 1,348 |
| ledgers/general | 26,613 | 14,403 | 2,786 | 6,010 |
| ledgers/area | 6 | 150 | 34 | 11 |
| ledgers/booker | 11,141 | 5,447 | 1,068 | 1,654 |
| ledgers/party | 32 | 120 | 114 | 73 |

**Refresh: 11,601 ms** (one-off, pre-builds the fingerprint snapshot + cached reports).

## What the numbers say

- **Cold view build is the cost.** The four big reports pay 14–20 s on first access
  (itemsales 15.0 s, paymentsbycompany 19.6 s, profit 14.6 s, ledgers/general 14.4 s); after that
  they are 2.8–4.4 s warm. Small/aggregated reports are cheap entirely (difference 53 ms,
  stockreport 46 ms, productsale 44 ms).
- **The refresh is the fix for a cold system.** Immediately after the import the app's fingerprint
  snapshot is empty (built at startup, before the data landed), so a first access can return
  "no data" until a refresh — hence the refresh step. After the refresh the heavy reports are warm.
- **The 60 s poller shows as spikes.** One of the three warm samples on each big report is
  14–18 s (e.g. paymentsbycompany 3,987 median but an 18,124 ms sample) — the incremental/full
  refresh rebuilding a view on the request path
  ([[guest-report-performance-options]], [[guest-fingerprint-refresh]]).
- Range used: `2020-01-01 … 2030-12-31`. The import does not carry the source `created`, so the
  migrated rows carry the import timestamp ([[guest-depot-created-is-import-time]]); a wide range
  returns the full dataset on both sides.

## Related

- [[guest-vs-legacy-report-performance]] — the legacy comparison (legacy pages at ~1.0–1.6 s per
  500 rows, so the same reports are far slower there).
- [[guest-vs-node-performance]] — the earlier guest baseline.
