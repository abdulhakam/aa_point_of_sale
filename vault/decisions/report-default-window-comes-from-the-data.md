---
title: A report's default date window comes from the data, per date source
type: decision
status: accepted
decided_on: 2026-10-02
created: 2026-10-02
tags: [pos, reports, dates, defaults, sql, manifest]
related_to: ["[[trailbase-migration]]", "[[reports-filter-on-created-not-the-business-date]]", "[[one-manifest-is-the-page-definition]]", "[[tb-0032-manifest-first-refactor]]"]
---

# A report's default date window comes from the data, per date source

Every report page defaulted its `from`/`to` to `monthStart()` / `today()`, which is `new Date()`
inside the guest. On 2026-10-02 that opened all eleven date-filtered pages on 2026-10-01 → 2026-10-02
while the newest business date in the ledger is 2026-04-11. The pages were not empty — they were
full of the imported payments that carry no date of their own and fall back to their insert
timestamp. **A wrong default that returns rows is worse than an empty one**, because it reads as
data. See [[reports-filter-on-created-not-the-business-date]] for the fallback that put those rows
there in the first place.

## The default is a probe, not a constant

`app/sql/latest_business_date.sql` returns the newest date anyone actually **typed**, and
`app/lib/dates.js` runs it, cached on the live data fingerprint. The window is the month that date
falls in: first day through that date. The upper bound is not `today` — there is nothing after it,
so `today` only widens the window with days that cannot match.

The probe deliberately reads the **raw** columns and requires a non-empty one. Both have an
insert-time fallback in the report layer (`transaction_view.dated` is
`COALESCE(NULLIF(i.dated,''), i.created)`, `payments_base.payment_date` is the three-step chain), so
`MAX()` over the *resolved* expressions returns the import date for the 8,648 dateless payments and
would reproduce the original defect as a single number. A row whose date is unknown stays unknown: it
must not choose the month for every other row.

## Why it is per source, and not one global "latest"

Measured on this depot, 2026-10-02:

| source | newest entered date |
|---|---|
| `payments.payment_date` | **2026-04-11** |
| `invoices.dated` | **2026-10-02** — three invoices, typed today through the new system |

One global maximum is therefore right for an invoice report and **empty** for a payment report: the
same defect in a new place. The page's manifest names which source its own filter reads, because that
is only knowable there — `pv.payment_date` for payments and every party/booker/area ledger,
`tr.dated` for the transaction reports, `iv.dated` for dailysale. A manifest says
`{"default": {"source": "payments"}}`, and `pages.js` resolves it to `""` (it is sync and has no
database), leaving `route.ts` to fill it from the probe.

Result: payments, salesreport, paymentsbycompany and the party/booker/area ledgers open on
2026-04-01 → 2026-04-11; profit, itemsales, productsale and dailysale on 2026-10-01 → 2026-10-02,
which is correct while those three invoices exist. Delete them and the invoice side moves to April on
its own, with no code change — which is the property that makes this right rather than lucky.

## The general ledger is the exception, deliberately

`ledger_general.sql` filters `j.created` — the journal row's **insert time**, not a business date.
A probe over either date column would answer a question that statement never asks, so
`ledgers/general` keeps the wall-clock default. `guest-smoke.mjs` caught this: asserting the seeded
expense row failed when the page moved to April. That `j.created` filter is its own defect, in the
same `created`-vs-business-date family, and needs its own evidence before it is changed.

## An empty window now says which window has data

`reports/report.html` renders, when `rowInfo.total == 0`, the period that was asked for **and a link
to the most recent period that has data**. The table alone cannot say this — it shows "no data", not
"no data in April, but March has some".

## What is deliberately NOT here

- No precomputation or cached month. `reports.no_precomputation` forbids it: the probe is run on
  demand and cached only on the fingerprint, which moves on any write.
- An explicit `?from=`/`?to=` always wins, and a filter with no `source` keeps its manifest default.
  An empty depot yields `{from: "", to: ""}` and falls back — "no data anywhere" must not become "no
  default at all".
- A probe failure logs `[dates] default period probe failed` and falls back. It does not 500 the
  report, and it is not silent, because the symptom of silence is the original defect returning.

## Verification

`guest-smoke.mjs` 78/78 · `verify-spool-reports.mjs` 14/14, 72 binds · `verify-prelude.mjs` PASS ·
all 11 date-filtered pages 200 with the windows above · `?from=&to=` override confirmed ·
`/reports/profit?from=2020-01-01&to=2020-01-31` renders the notice with a working link.