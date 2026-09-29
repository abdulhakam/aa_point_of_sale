---
title: Browser-driven benchmark 2026-09-29 — production system vs the new system on real data
type: note
status: active
created: 2026-09-29
system: new
tags: [benchmark, performance, browser, reports, parity, production]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-performance-baseline]]", "[[new-system-report-timings]]", "[[guest-vs-legacy-report-performance]]", "[[reports-parity-and-e2e-2026-09-29]]", "[[trailbase-guest-cpu-js-limits]]", "[[guest-depot-created-is-import-time]]", "[[frontend]]", "[[report-logic-stays-runtime-file-based]]", "[[reports-and-ledgers]]"]
---

# Browser-driven benchmark 2026-09-29 — production system vs the new system on real data

Both systems driven through a real browser, on the full production dataset
(60,245 records: 8,927 invoices, 23,413 transactions, 26,526 payments, 88 expenses).

## Tooling caveat

`chrome-devtools-mcp` was **not connected** in this session. The browser work was done with the
Playwright browser tools instead, which drive a real Chromium with full navigation timing, paint
timing, network visibility and DOM access. The measurements are equivalent; the substitution is
recorded so a reader knows which harness produced the numbers.

## What was run, through the browser

| step | how | result |
|---|---|---|
| server start | `trail run` on `127.0.0.1:4000` | ready |
| runtime sync | `runtime/` → `traildepot/runtime/` (`robocopy /MIR`) | enum-fixed SQL in place |
| login | `/login` in-browser, `admin@localhost` | ok |
| **import** | `/plugins/import-from-v1/`, **dry run** | **60,245 / 60,245 read, 0 failed** |
| refresh | `POST /reports/refresh` in-page | **42 ms** (no-op: nothing changed) |
| full refresh | `POST /reports/refresh?full=1` in-page | **11,900 ms**, `hydrated: true` |

The dry run reproduced every per-collection count exactly and reported
`companies: not present on the source server, skipped` — the mirror collection 404s, which is
handled. **A destructive clear-and-reimport was not run**: the destination already holds the
verified dataset and the source is unchanged, so rebuilding it identically would add no
information to the comparison.

## The methodological trap, and why the range matters

The first pass, with **no date range**, showed almost everything under 300 ms — and that was
misleading. The guest's `created` is the **import timestamp**, not the business date
([[guest-depot-created-is-import-time]]), so a default recent window excludes nearly all rows. The
row counts in the HTML are the tell.

Re-run over the real business range **`?from=2024-01-01&to=2026-09-29`** is the honest measurement,
and it is a completely different picture.

## New system — all 14 reports, full range, in-browser

Cold = first access after `?full=1`; warm = immediate repeat.

| report | cold ms | warm ms | rows | |
|---|---|---|---|---|
| payments | 1,894 | 1,396 | 26,526 | |
| **itemsales** | **17,119** | 872 | 21,815 | 86% of budget cold |
| salesreport | 1,177 | 547 | 8,648 | |
| **paymentsbycompany** | **20,014 → 500** | **20,055 → 500** | — | **fails both passes** |
| stockreport | 85 | 143 | — | |
| **profit** | **20,075 → 500** | **20,030 → 500** | — | **fails both passes** |
| difference | 98 | 55 | — | |
| **outstanding** | **156** | **75** | **602** | |
| productsale | 828 | 79 | — | |
| dailysale | 2,640 | 54 | 8,606 | |
| ledgers/area | 1,935 | 110 | — | |
| **ledgers/general** | **20,345 → 500** | **11,839** | 26,613 | |
| ledgers/booker | 431 | 132 | — | |
| ledgers/party | 355 | 79 | — | |

**3 of 14 hard-fail on the 20 s deadline** (`paymentsbycompany`, `profit`, `ledgers/general`), and
`itemsales` survives at 17.1 s cold. This confirms the cliff list in
[[trailbase-guest-cpu-js-limits]] with full-range data through a browser.

**`outstanding` is 75–156 ms for 602 parties** — the first cash-memo number — and it is not one of
the slow ones.

Real navigations, new system (server `responseEnd` / first-contentful-paint):

| page | responseEnd | FCP | rows | KB |
|---|---|---|---|---|
| `/reports/outstanding` | 152 ms | 432 ms | 604 | 117 |
| `/reports/profit` | 195 ms | 1,096 ms | 1,002 | 467 |
| `/reports/paymentsbycompany` | 120 ms | 680 ms | 1,005 | 339 |

Render is capped near 1,000 rows, so payload stays bounded even where the computation is unbounded.

## Production system (`backend/` + `frontend/`, `:3000` + `:8090`)

Real browser navigations, first visit, **its own default date range**.

| report | ms | rows rendered |
|---|---|---|
| Unified Payments | 2,617 | 10 |
| Item Sales (unified) | 1,197 | 5 |
| Sales Report | 3,031 | 6 |
| Payments By Company | 6,996 | 6 |
| Stock Report | 1,452 | 209 |
| Profit Report | 1,128 | 3 |
| Difference Report | 1,813 | 209 |
| **Outstanding Payments** | **> 25,258, never renders** | **0** |
| Product Sale Report | 879 | 3 |
| Daily Sale Report | 1,406 | 3 |

**These are not row-for-row comparable with the new system**, because the default ranges differ:
the production app filters on business date and shows 3–10 rows for a recent window, while the new
system's full-range pass shows 8,648–26,526. A like-for-like would need the same range set on both.

Two findings that are not about speed:

- **`/app/reports/outstanding` never completes.** It returns 200 and stays on `Loading...` with no
  table, checked again after 30 s. The route and the nav link both exist.
- **Every page logs React hydration errors** — minified `#418` (×5) and `#423`. These are production
  defects in the shipped build, present on all report screens.

## Correcting an earlier claim

`route-map.md` and this session's earlier commit recorded `outstanding`, `productsale` and
`dailysale` as having **no legacy route**. That is wrong, and the browser shows why: the routes
exist, the nav renders links to all three, and the pages return 200. `outstanding` is the exception
in behaviour — it hangs — but `productsale` and `dailysale` render normally (879 ms / 1,406 ms).
The original claim came from counting route **folders** under `frontend/src/app/app/reports/`
without opening them. Corrected in [[route-map]].

## What this means for the invoice and cash-memo work

- The invoice screens do not depend on any of the three failing reports. `outstanding` is fast, and
  the invoice read path is a single primary-key document read (0.0 ms measured in
  [[invoice-document-parity-2026-09-29]]).
- `paymentsbycompany` and `profit` failing is a **report** problem, and the report SQL is now
  correct and verified ([[report-enum-translation-2026-09-29]]), so the materialised-table work in
  [[component-split-and-sql-materialised-tables]] is the fix that is ready to apply.
- Any benchmark run without a date range will flatter the new system, because its `created` is the
  import time. Always assert on row counts alongside timings.

## Related

- [[report-performance-baseline]] — the server-side baseline these numbers sit against.
- [[new-system-report-timings]] — the earlier 2026-09-27 timings.
- [[frontend]] — the system benchmarked on `:3000`.
