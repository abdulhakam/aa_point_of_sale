---
title: Reports filter on created (insert time) instead of the business date
type: issue
status: resolved
follow_up: the 8,648 dateless payments now fall back to their INVOICE's date (decided 2026-10-02)
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

## Follow-up, 2026-10-02: import work is out of scope, and this repo cannot answer the question

The owner ruled: **do not modify the v1 import** — the v1 server is unavailable. That closes the
question this note raised, in a way worth recording rather than losing.

**The question cannot be answered from this repository.** There is no `backend/`, no `frontend/` and
no .db file anywhere under the workspace root — only `trailbase/`, `guests/` and `vault/`. So
neither the legacy source code nor its data is here, and "did v1 store a payment date, or did the
import drop it?" is not answerable from what is checked out. A test import is possible; a comparison
against a real source is not.

**The blanks are historical and cannot recur.** `app/lib/payments.js`:197 inserts payment_date
from the form, so every payment created in the new system carries the operator's date. The 8,648
empties are imported history only.

**So the remaining lever is the fallback, which is SQL and not import code.**
Until this was fixed, `payments_base.payment_date` was
`CASE WHEN p.payment_date = '' THEN p.created ELSE p.payment_date END` — it fell back to the insert
time, which for imported rows is the import date. The replacement is the three-step chain below.
Measured, for the 8,648 unpaid sale/return payments:

| Fallback | Where the money lands |
|---|---|
| today (created) | **one day** — every row at 2026-10-01 |
| the invoice's date | **29 months**, Feb 2024 → Apr 2026, with 19 rows still undated |

The ledger's real trading range is Feb 2024 → Apr 2026, so "1 Jan 2026 to today" — the window this
session's verification used — covers only the last quarter of it.

## Follow-up, 2026-10-02: a dateless payment falls back to its INVOICE's date

**Decided by the owner, and it is right for a shop.** The reason a payment is dateless is that it
was recorded against an invoice from an earlier day — "there could be some sales that may need to be
added to previous days sometimes". So the invoice's date is the better guess, and falling straight to
created was never a neutral default: it put every unpaid sale payment in the ledger on the single
import date.

payments_base.payment_date is now a three-step chain, and compute/views.js carries the **same**
one so the ledgers and the reports cannot disagree:

```sql
COALESCE(NULLIF(p.payment_date, ''), NULLIF(it.dated, ''), p.created)
```

1. the payment's own date — what every new entry carries (payments.js:197);
2. the invoice's date — the case above;
3. the row's insert time — last resort, so a payment with neither date still lands somewhere.
   ('' compares less than every date, so an empty value would drop the row from *every* window.)

dated had to be threaded through invoice_chain and invoice_totals to reach payments_base; it
did not previously exist there. Step 2 is only equivalent to the JS if `it.dated` is the invoice's
EFFECTIVE date, so `invoice_chain` resolves it with `COALESCE(NULLIF(dated, ''), created)` — the
same expression `invoiceView.dated` gets in views.js:98. Passing the raw column through instead sent
24 of 26,526 payments to `p.created` rather than their invoice's date; that was the one failing
check before this correction, and it is why the parity harness, not the two smoke suites, is the
gate that covers this rule.

**Verified.** The 8,648 now spread across the 29 months they belong to, and the app reproduces the
SQL measurement row for row:

| month | payments | profit | itemsales | salesreport |
|---|---|---|---|---|
| 2024-02 | 18 | 26 | 26 | **7** |
| 2024-09 | 954 | 492 | 492 | **222** |
| 2025-06 | 1229 | 865 | 865 | **364** |
| 2025-12 | 1599 | 1440 | 1440 | **494** |
| 2026-02 | 928 | 1311 | 1311 | **484** |
| 2026-04 | 333 | 595 | 595 | **205** |

The salesreport column matches the distribution measured directly in SQL before the change, which is
why it is quoted here rather than a total. `verify-prelude.mjs` **PASS** — the prelude matches
`compute/views.js` on all of payments_view (0/26,526 mismatched on `payment_date`, `amount`,
`credit`, `debit`), invoice_totals.final_total and transactions_report; `verify-spool-reports.mjs`
14/14 with 72 binds; guest-smoke.mjs **78/78**; all 23 dropdown pages 200 with every select
populated; every report and ledger still 200.

Note that `verify-prelude.mjs` is **not** run by `RUN.BAT`, `build.bat` or `clear_db.bat`, so it is
a manual gate. The two smoke suites above never noticed this defect, because neither compares the
SQL against the JS.
