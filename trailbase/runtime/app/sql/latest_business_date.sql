-- latest_business_date: the newest date anyone actually TYPED, per date source, so a report can
-- open on a window that contains its own data instead of on the wall clock's current month.
--
-- WHY IT IS A .sql FILE AND NOT A CONSTANT. The default was `monthStart()` / `today()`, which is
-- `new Date()` inside the guest: on 2026-10-02 every report opened on 2026-10-01 → 2026-10-02. The
-- page therefore showed only the imported rows that carry no date of their own and fall back to
-- their insert timestamp — which is exactly the class of row that hides the defect. A hard-coded
-- month would be the same bug with a different number in it; the window has to come from the data.
--
-- WHY IT DELIBERATELY IGNORES `created`. Both columns have an insert-time fallback in the report
-- layer — `transaction_view.dated` is `COALESCE(NULLIF(i.dated,''), i.created)` and
-- `payments_base.payment_date` is `COALESCE(NULLIF(p.payment_date,''), NULLIF(it.dated,''),
-- p.created)` (prelude.sql). Taking `MAX()` over those resolved expressions returns the IMPORT date
-- for the 8,648 dateless payments and 21 dateless invoices, which reproduces the original defect in
-- a single number. So this probes the RAW columns and requires a non-empty one: only a date a person
-- entered can set the default. A row whose date is unknown stays unknown — it must not choose the
-- month for every other row.
--
-- WHY TWO COLUMNS AND NOT ONE. Measured on this depot: the newest ENTERED payment date is
-- 2026-04-11, while three invoices carry 2026-10-02 (typed today, through the new system). So a
-- single `MAX()` over both answers 2026-10-02, which is right for an invoice-based report and
-- empty for a payment-based one — the exact "page looks populated but answers the wrong question"
-- failure. The two sources are reported separately and the page's manifest names which one its own
-- filter reads, which is knowable there and only there (`pv.payment_date` for payments/ledgers,
-- `tr.dated` for transactions, `iv.dated` for dailysale).
--
-- Values are operator-entered `<input type="date">` (`YYYY-MM-DD`) or an ISO timestamp, and both
-- sort correctly as TEXT against a date prefix. `.slice(0, 10)` in the loader covers a full
-- timestamp. A source with no entered date at all yields NULL, which the loader turns into "".

SELECT
  (SELECT MAX(i.dated)
     FROM invoices i
    WHERE COALESCE(TRIM(i.dated), '') <> '') AS latest_invoice,
  (SELECT MAX(p.payment_date)
     FROM payments p
    WHERE COALESCE(TRIM(p.payment_date), '') <> '') AS latest_payment;