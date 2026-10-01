-- Round AMOUNT columns to whole paisas; leave per-unit rates alone.
--
-- Companion to `U1790300100__round_money_to_2dp.sql`, which implements the same owner rule
-- (vault/decisions/money-is-2dp-everywhere.md) but ran against EMPTY tables, so it rounded nothing.
-- The v1 importer then wrote money through `Number(v)` with no rounding and reintroduced the residue.
-- Its write path is now fixed (`app/plugins/import-from-v1/index.html`, the `money()` coercer); this
-- cleans up what that import already left behind.
--
-- SCOPE: amounts only. The 2026-10-01 measurement behind this decision
-- (tools/audit-money-columns.mjs, vault/tasks/tb-0015-integer-cents-for-money.md) found the drift is
-- almost entirely in the per-unit columns — 28% of `transactions.cost_price`, 37% of
-- `items.cost_price`, 11% of `transactions.price`, including repeating values like 85.4166 that have
-- no exact decimal form — while the amount columns were clean to within three rows in 35,000.
--
-- Rounding the per-unit columns was measured, on a copy, and REJECTED: it moved 9,247 rows and 13 of
-- 14 report totals, including +1,031,224.20 on `outstanding.invoice`, -537.35 on reported profit, and
-- it added 7 parties to `outstanding` — that report selects parties whose balance rounds to at least
-- 1, so a per-unit price rounding changes which parties are IN the report. A unit price is a rate, not
-- an amount: its precision is real and is consumed by the multiplication, which the prelude rounds
-- per line.
--
-- NOT touched, deliberately:
--   * `items.cost_price`, `items.sale_price`, `transactions.cost_price`, `transactions.price` — rates,
--     finer than a paisa on purpose.
--   * `invoices.discount_1`, `discount_2`, `transactions.discount_1`, `discount_2` — percentages, also
--     rates. One `discount_1` is 1.75555 and stays that way; it is a rate the operator can enter, and
--     rounding it is a display choice, not a correctness fix.
--   * `qty`, `scheme`, `box_size_qty` — quantities. Fractional cartons are real (16.735, 0.075).
--   * `invoiceNo` — an identifier, never fractional. It stays REAL for PocketBase compatibility; every
--     value is already integral, so there is no drift to fix and a REAL->INTEGER change would mean
--     rebuilding a record-API table on live data for no accuracy gain.
--
-- Idempotent: each statement touches only rows that actually differ, so re-running is a no-op.
-- Half-up, the same rule as `format.js` round2, `prelude.sql`, and the report totals' `toCents`.

UPDATE "payments"
   SET "amount" = CAST(ROUND("amount" * 100) AS INTEGER) / 100.0
 WHERE "amount" IS NOT NULL
   AND ABS(("amount" * 100) - CAST(ROUND("amount" * 100) AS INTEGER)) > 1e-6;

UPDATE "expenses"
   SET "amount" = CAST(ROUND("amount" * 100) AS INTEGER) / 100.0
 WHERE "amount" IS NOT NULL
   AND ABS(("amount" * 100) - CAST(ROUND("amount" * 100) AS INTEGER)) > 1e-6;

UPDATE "invoices"
   SET "discount_rs" = CAST(ROUND("discount_rs" * 100) AS INTEGER) / 100.0
 WHERE "discount_rs" IS NOT NULL
   AND ABS(("discount_rs" * 100) - CAST(ROUND("discount_rs" * 100) AS INTEGER)) > 1e-6;

UPDATE "transactions"
   SET "discount_rs" = CAST(ROUND("discount_rs" * 100) AS INTEGER) / 100.0
 WHERE "discount_rs" IS NOT NULL
   AND ABS(("discount_rs" * 100) - CAST(ROUND("discount_rs" * 100) AS INTEGER)) > 1e-6;
