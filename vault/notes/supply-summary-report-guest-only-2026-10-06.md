---
$schema: "./notes.schema.json"
title: "Supply Summary report (guest-only, 2026-10-06)"
type: note
status: active
created: 2026-10-06
tags: [reports, supply-summary, guest, sql, invoice-list]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[reports-and-ledgers]]", "[[report-rows-are-spooled-not-parsed]]", "[[report-render-row-cap]]", "[[all-14-reports-run-in-sqlite-rows-reach-the-renderer-by-kv-handle-never-quickjs]]", "[[parity-is-functional-not-visual]]"]
---

# Supply Summary report (guest-only, 2026-10-06)

A **new** report, guest-only (no legacy counterpart), at `/reports/supplysummary` and on the reports
hub as **Supply Summary**. Its input is a submitted **set of sale invoices**, not a filter: the screen
lists the sale invoices in a date range with checkboxes, the operator picks the ones to summarise and
submits, and the result is a table of **products only** — quantity and amount per product, and a total
amount. No invoice ever appears in the result.

## Why it is not a plain manifest report

Every other report is a `meta.json` whose `filters` are rendered by the shared `report.html`. Supply
Summary needs an **arbitrary list of invoices** as input, which the filter vocabulary cannot express:
`filtersFor` keeps only the first value of a multi-valued field (`report-render.js`), and the spool
bind layer binds a fixed scalar set (`spoolreports.js` `params`). So it is served by a **literal route
folder** — `ahscripts/routes/reports/supplysummary/route.ts`, which wins over `/reports/{key}` — with
its own template. The aggregation itself is still a spooled SQL report.

## How it works

- The route lists sale invoices (`type = 1`, not deleted) dated in the range, capped at 1,000, and
  offers them as `name="invoices" value="<hex id>"` checkboxes. The range defaults to the latest
  business month (`app/lib/dates.js`).
- On submit, the checked hex ids are joined into **one** delimited string `|HEX|HEX|` and passed as the
  new report parameter `invoices`. The statement matches with
  `instr(:invoices, '|' || hex(tv.invoice) || '|') > 0`, so a whole list binds as a single text value.
- `app/reports/sql/reports/supplysummary.sql` mirrors `productsale.sql`'s money path (raw
  `transaction_view` line `total`, `sg.units > 0`, the prelude's round-half-up then `printf`) but groups
  by item across the SELECTED invoices rather than by a date/booker/area filter. It also binds
  `:from`/`:to` — the pick-list date range — as a pre-filter, because the invoice-set match
  (`instr(:invoices, '|' || hex(tv.invoice) || '|')`) is a function of the column and not sargable; the
  range is what bounds the scan so the report does not meet the 20 s WASM deadline on the full ledger.
- `ctx.invoices` (no `invoices` selected) re-lists the range; `ctx.totals` (a selection present) renders
  the table and the total.

## The one core change

`app/lib/spoolreports.js` `params` gained `invoices: text(f.invoices)` — the bind for the delimited
list. It is additive: a report that does not declare `:invoices` is unaffected. `verify-spool-reports`
also gained an `IMPOSSIBLE.invoices` value (an all-zero hex id that matches nothing), which is how the
gate proves the bind reaches SQLite.

## Verification

- `node trailbase/tools/verify-spool-reports.mjs` — **15 passed, 0 failed** (13 totals exact, 26
  corroborated; the new report's bind proves it reaches the statement).
- `node trailbase/tools/guest-smoke.mjs` — **115/115**.
- Live, against the production depot: two sale invoices (#8606 line total 540.00, #8605 line total
  2520.00) summarise to 8 product rows and a **Total Amount of 3060.00** — the exact sum of the two
  invoices' line totals, with no invoice in the output.

## Deliberately not done

It is a guest-only feature; there is no legacy screen to match, so it is not in the report
parity harness (`report-parity.mjs`). The per-row money is the raw line total (productsale's path), so
it does not apply the invoice-level discount chain — the same choice the Product Sale Report makes.
