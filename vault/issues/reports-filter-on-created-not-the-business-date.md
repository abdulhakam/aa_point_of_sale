---
title: Reports filter on created (insert time) instead of the business date
type: issue
status: resolved
severity: critical
created: 2026-10-02
updated: 2026-10-02
resolved_on: 2026-10-02
tags: [reports, dates, filters, money, sql, ledger, defect, production]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-smoke-report-total-checks-fail-on-pristine-checkout]]", "[[money-is-2dp-everywhere]]", "[[report-routes-ignore-date-defaults]]", "[[payments-report-totals-computed-from-display-rows]]", "[[reports-and-ledgers]]", "[[import-from-v1-drops-invoice-maker]]", "[[no-draft-invoices-published-on-save]]", "[[paymentsbycompany-performance-2026-10-02]]"]
---

# Reports filter on `created` (insert time) instead of the business date

**Every date-filtered report answered the wrong question.** Found 2026-10-02 while diagnosing the
smoke suite's persistent money failures. Fixed the same day.

## The finding

Nine of the ten report/ledger statements filtered on `created` — the row's **insert** timestamp —
instead of the business date. On the imported ledger every row's `created` is the import timestamp
(`2026-10-01 17:57`), so:

| Request | Answer |
|---|---|
| bare GET, no dates | 8,648 rows |
| `from=2026-01-01&to=2026-10-02` (includes the import date) | 8,648 rows |
| `from=2026-01-01&to=2026-09-30` (does not) | **0 rows** |

"Sales for September" returned nothing, not because there were no sales, but because every sale was
*typed into the database* on 1 October.

## Why it survived for so long, including a day of my own verification

**Every window anyone used happened to include the import date.** The depot's business dates are
Jan–Apr 2026 and its import timestamp is 2026-10-01, so any window ending on or after 2 October —
including the user's own "1 Jan 2026 till now" — included it. I used that same window for hours of
verification today and it agreed with every expectation, which is exactly why it hid.

The only windows that exposed it were the ones nobody had tried: September, February, "up to
yesterday".

## Why the port got it wrong — and it was faithful

`reports.js` and the SQL both say, in provenance comments, that v1's `inDateRange` ran on `created`.
**In v1 `created` carried the business date.** In TrailBase it is when the row was written. The port
copied the column name and lost the meaning, and the SQL carried a comment saying so without anyone
asking what the column held in *this* database.

## The fix

The predicate moves to the business date in nine statements, and two columns are threaded through the
prelude so there is something correct to filter on:

- `payments.sql`, `ledger_area`, `ledger_booker`, `ledger_party` → `pv.payment_date`
  (`payments_base.payment_date` is already the fallback `COALESCE`d payment date).
- `transactions.sql` (profit) → `tr.dated`, which required adding `dated` to
  `transactions_report`, which was projecting `created` and **dropping the business date entirely**.
- `productsale.sql` → `tv.dated`, which required adding it to `transaction_view`.
- The displayed `date` column in `payments.sql` and `transactions.sql` was `substr(created, 1, 10)` —
  so the reports even *printed* the import date as the transaction date.

Already correct, and left alone: `dailysale` (`COALESCE(NULLIF(iv.dated,''), iv.created)`),
`payments_by_company` (the `dated` alias), and `ledger_general` — whose `created` is deliberately the
payment's `payment_date`, documented in `ledger_journal`.

## The gate caught a bug in the fix

First attempt added the raw `i.dated` to `transaction_view`. `verify-spool-reports.mjs` failed three
binds: *"a value matching nothing still returned 25 of 21,815 rows"*.

**21 invoices in the imported ledger carry an empty `dated`**, and `''` compares less than every
date, so those invoices leaked into *every* window, including windows from before the shop existed.
The fix is the same expression `invoice_view` already used —
`COALESCE(NULLIF(i.dated, ''), i.created)` — which is what `dailysale` had been doing correctly all
along. After it: **14 passed, 0 failed, 72 binds verified.**

This is the clearest argument for keeping that gate through the manifest refactor: it is not
parity, it checks the current system against itself, and it caught a regression introduced minutes
earlier that every status code said was fine.

## What it explains

The smoke suite's seven long-standing money failures — profit 91.00, item sales 731.00 / 591.00,
payments payable 800.00 / receivable 150.00 — were **not stale expectations and not arithmetic
errors**. Every pinned figure was correct; the reports could not produce them because a date-filtered
report returned nothing. After the fix: **78/78, every check passing**
([[guest-smoke-report-total-checks-fail-on-pristine-checkout]] is therefore closed).

## Still open: a data gap the code cannot fix

`salesreport` still returns 0 rows for a window excluding the import date, and that is now honest
rather than broken. **8,648 of 26,526 payments carry no `payment_date` at all** — and they are
exactly the unpaid sale/return payments the sales report is about:

| type | paid | rows | no `payment_date` |
|---|---|---|---|
| 0 purchase | 0 | 266 | 266 |
| 0 purchase | 1 | 293 | 83 |
| 1 sale | 0 | 8,594 | **8,594** |
| 1 sale | 1 | 17,319 | 1,319 |
| 2 return | 0 | 54 | 54 |

So they fall back to `created` = the import date, and no code change can place them in the month
they belong to. This is an **import defect** — the v1 payment date is not coming across — and it
belongs with [[import-from-v1-drops-invoice-maker]]. Until it is fixed, the sales report only
answers questions whose window includes 1 October 2026.

## Related

- [[payments-report-totals-computed-from-display-rows]] — the filter set these predicates are part of.
- [[reports-and-ledgers]] — the report inventory.
- [[no-draft-invoices-published-on-save]] — the other defect found in this session's sweep, and the
  reason the reports were empty at all when this one was first measured.
