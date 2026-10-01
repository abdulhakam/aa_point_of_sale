---
title: Six report defects the empty-filter parity gate could not see
type: issue
status: fixed
severity: high
created: 2026-10-01
updated: 2026-10-01
tags: [reports, sql, filters, parity, sqlite]
related_to: ["[[spooling-report-rows-through-kv]]", "[[spool-blob-bind-decoder-rejected-unpadded-base64]]", "[[legacy-sql-views-differ-from-js-views]]", "[[report-sql-filters-on-text-enums-returns-nothing]]", "[[report-routes-ignore-date-defaults]]", "[[money-is-2dp-everywhere]]"]
---

# Six report defects the empty-filter parity gate could not see

## Why they hid

`verify-spool-reports.mjs` compared every report's rows and totals against `compute/reports.js` with
**empty filters**, and it reduced the SQL rows to totals **in JavaScript**. Both choices are blind to
whole classes of defect:

- a filter that is dead, or bound to the wrong column, changes nothing when no filter is supplied;
- a column that exists on one side only is outside the shared-column comparison by construction;
- totals reduced from SQL rows in JS test JS arithmetic, not the SQL totals statement that ships.

All six below were found while wiring the live pages to the spool, and every one of them produced
**correct row counts and correct money**.

| # | Defect | Effect | Fix |
|---|---|---|---|
| 1 | `payments.sql`, `transactions.sql`, `payments_by_company.sql` bound the `invoice` filter as one `blob:` value, but the predicate is `id = :invoice OR CAST(invoiceNo AS TEXT) = :invoice` — a BLOB **or** a number | Both halves dead: the blob form cannot match a number, the text form cannot match a BLOB | Split into `:invoiceId` (blob) and `:invoiceNo` (number) |
| 2 | `CAST(invoiceNo AS TEXT)` yields `"3840.0"` (the column is REAL); the JS renders `String(3840)` = `"3840"` | The number half could not match even after the split | `CAST(invoiceNo AS REAL) = CAST(:invoiceNo AS REAL)` |
| 3 | `dailysale.sql` filtered `dated` in a `WHERE`, where SQLite resolves the bare name to the underlying `invoice_view.dated` column, not the `COALESCE(NULLIF(dated,''), created)` alias | 19 extra rows on any out-of-range date filter — the invoices with an empty `dated`, where `'' <= '…'` is true and the JS falls back to `created` | Spell the `COALESCE` out in the `WHERE` |
| 4 | `outstanding.sql`'s `party_booker` selected `MIN(id)`, which is a **payment** id, and compared it against the `booker` filter | The booker filter matched nothing, ever | Keep `MIN(id)` but select the **bare** `booker` beside it: SQLite's documented rule puts bare columns in an aggregate with `min()`/`max()` on that row |
| 5 | `ledger_general.sql` projected `transaction_type`/`account_type`; the page's column keys are `transactionType`/`accountType` | The Type and Account columns rendered **blank**, with correct row count and money | Alias to the JS field names |
| 6 | `spoolRows` appended `LIMIT n` after the statement's terminating `;` | Every capped report was a 500 (`near "LIMIT"`); only `?all=1` worked | Strip the `;` first |

A seventh was a mistake of mine, caught before commit: a correlated `WHERE pbp.id = (SELECT MIN(id) …)`
for #4 was correct but re-ran the whole payments chain per row — **20 s**. The bare-column form is
milliseconds.

## What now catches them

- **A bind gate** in `verify-spool-reports.mjs`: 72 parameters, each proved to reach its statement (a
  value matching nothing returns 0 rows) and to narrow it where a real id exists.
- **A page-column gate**: every `REPORT_PAGES` column key and every `t.<key>` a totals strip reads must
  exist in that report's manifest.
- **A one-sided column report**: columns only one side has are listed, because a misnamed field hides
  there by construction (#5 was exactly that).
- **A live two-surface check**, `tools/check-report-pages.mjs`: the report page and the declarative
  page that computes the same report must return the same row count and the same totals for the same
  filters — the only check that sees a filter bound on one path and not the other.
- **Totals are compared against the SQL statement**, not a JS reduction of SQL rows, so the thing under
  test is the thing that ships.

## The lesson

Row parity with empty filters is a statement about SQL. It is not a statement about **filters**, and
a filter is most of what a report does. Any gate for this system has to exercise a filter, and the
bind is where a filter is most likely to be wrong.
