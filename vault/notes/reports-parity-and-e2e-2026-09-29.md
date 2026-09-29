---
title: Reports parity and end-to-end benchmarks against v1 (2026-09-29)
type: note
status: active
created: 2026-09-29
system: new
tags: [parity, reports, benchmarks, migration, guest, legacy, v1, trailbase]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-vs-legacy-report-performance]]", "[[guest-frontend-feature-parity-gaps]]", "[[pos-0029-rebuild-v1-import-on-guest]]", "[[guest-depot-created-is-import-time]]", "[[tb-0014-point-company-fields-at-companies]]", "[[guest-parity-differential-not-reproducible]]"]
---

# Reports parity and end-to-end benchmarks against v1 (2026-09-29)

Every v1 comparison in this note was run against the same production-sized dataset, with the report
date range set to **1 Jan 2024 → today** for both systems, as the owner specified.

## Migration — driven through the actual UI

`trailbase/traildepot/data` was deleted, the server restarted, and the import was then run **through
the browser UI** at `/plugins/import-from-v1/` (not the headless wrapper), to exercise the real path:

**60,245 / 60,245 records, 0 failures.** Per collection, `read == created`: sections 10, categories 15
(mirrored into 15 companies), areas 59, parties 942 (13 links), order_bookers 4 (5 links), items 207,
expenses 88, invoices 8,927, invoices_return_reference 54, transactions 23,413, payments 26,526. The
8,927 `invoice_maker` references are dropped as before (PocketBase `_user` ids have no TrailBase
counterpart). This is identical to the headless path — see [[clean-slate-benchmark-cycle]].

## Data parity — exact

Compared straight in SQL between `traildepot/data/main.db` and `backend/p_data/data.db`, per table and
per money/quantity column:

| table | rows (guest) | rows (v1) | money & quantity sums |
|---|---|---|---|
| invoices | 8,927 | 8,927 | **all match** |
| transactions | 23,413 | 23,413 | **all match** |
| payments | 26,526 | 26,526 | **all match** |
| expenses | 88 | 88 | **all match** |
| items | 207 | 207 | **all match** |
| sections / areas / categories | 10 / 59 / 15 | same | **all match** |
| parties / order_bookers | 942 / 4 | same | **all match** |
| invoices_return_reference | 54 | 54 | **all match** |

Payments by type agree to the cent: recieving 25,913 rows / **25,907,041.11**; sending 559 /
**22,657,296.66**; return 54 / 0.00. Business dates migrated correctly — `invoices.dated` and
`payments.payment_date` have identical min/max on both sides.

**Structural differences that are by design, not drift:**

- `parties.company` and `order_bookers.company` exist only in v1; the guest models them as the
  `party_companies` / `order_booker_companies` link tables ([[tb-0014-point-company-fields-at-companies]]).
- `items.barcode` and `items.display_id` exist only in the guest.
- `companies`, `party_companies`, `order_booker_companies` have no v1 table at all.

**Still true:** the guest's `created` is the import timestamp (2026-09-28), not the business date
([[guest-depot-created-is-import-time]]). This does not affect the comparison here, because the
requested range contains both the business dates and the import timestamp, so both systems return
their full dataset. It *would* bite on any narrower range.

## End-to-end benchmarks

### Guest (server-rendered, range 1-Jan-2024 → today)

| report | cold | warm | status |
|---|---|---|---|
| difference | 1,854 ms | 66 ms | ok |
| outstanding | 162 ms | 32 ms | ok |
| productsale | 289 ms | 24 ms | ok |
| ledgers/party | 173 ms | 48 ms | ok |
| ledgers/area | 487 ms | 36 ms | ok |
| stockreport | 5,166 ms | 82 ms | ok |
| payments | 2,025 ms | 97 ms | ok |
| dailysale | 3,249 ms | 79 ms | ok |
| ledgers/general | 10,394 ms | 65 ms | ok |
| salesreport | 5,523 ms | 114 ms | ok |
| paymentsbycompany | 18,820 ms | 94 ms | ok (cold, just inside) |
| ledgers/booker | 53 ms | 76 ms | ok |
| **itemsales** | **20,013 ms → 500** | 16,208 ms | cold hits the deadline |
| **profit** | 9 ms → 500 | 13,957 ms | cold hits the deadline |

`itemsales` and `profit` still exceed the ~20 s guest deadline on the cold path, exactly as
[[report-performance-baseline]] records. This is the Tier 2 materialised-table problem, unchanged.

### v1 (client-rendered, measured in-browser)

| report | end-to-end | rows |
|---|---|---|
| difference | **1,103 ms** | 209 |
| stockreport | **1,253 ms** | 209 |

On the two reports that load without touching a date input, the comparison is like-for-like —
**same 209 rows both sides**:

| report | v1 | guest warm | speed-up |
|---|---|---|---|
| difference | 1,103 ms | 66 ms | **~17×** |
| stockreport | 1,253 ms | 82 ms | **~15×** |

These match the previously recorded 24–29× closely enough given the earlier numbers included a cold
first paint ([[guest-vs-legacy-report-performance]]).

### v1 heavy reports — not captured this session

v1 pages PocketBase **500 rows per request, sequentially**, so its heavy reports need ~44–53 chained
requests. The 2026-09-27 measurement recorded profit as **not completing inside 30 s**; nothing has
changed that. I could not produce fresh full-range numbers because the v1 date inputs are Mantine
`DateInput`s whose React state does not accept programmatic values in this harness — synthetic
`input` events and real keystrokes both left the page in a permanent `Loading...` state, and the MCP
call timeout is shorter than the ~60–85 s a full-range load takes. **The v1 heavy-report e2e numbers
are therefore still the 2026-09-27 ones, not re-measured.** The guest numbers above are fresh.

## Not comparable

- **`outstanding`, `productsale`, `dailysale` have no v1 route.** Verified by inspecting
  `frontend/src/app/app/reports/`: there are 15 route folders and none of these three exists. They are
  guest-only screens. This contradicts `vault/references/route-map.md` and
  `vault/systems/frontend.md`, which list them as legacy routes — **both need correcting**.
- Report-level *totals* were not diffed between the two UIs. v1 computes them in React from its
  PocketBase views, and the capture above is per-row counts plus the data-level sums, not the
  rendered total lines. A rendered-totals differential still needs a working v1 capture path.

## Related

- [[guest-frontend-feature-parity-gaps]] — the remaining functional gaps between the two systems.
- [[guest-vs-legacy-report-performance]] — the prior measurement this extends.
