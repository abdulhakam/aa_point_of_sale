---
title: frontend-ssr is not yet a replacement — the parity gaps
type: issue
status: open
severity: high
created: 2026-09-26
tags: [frontend-ssr, parity, gaps, cutover, risk]
related_to: ["[[frontend]]", "[[pos-0028-decide-cutover-plan]]"]
---

# frontend-ssr is not yet a replacement — the parity gaps

## Summary

[[frontend-ssr]] covers dashboard, reports and management. It does **not** cover the screens that
make money. Until the gaps below are closed (or deliberately dropped), the new pair cannot replace
the product and the legacy Next.js app ([[frontend]]) cannot be retired.

## Gaps, by category

### 1. Out of scope by request

These are deliberate, recorded in `frontend-ssr/README.md` under *Known gaps*: "Invoices, cash
memo, expenses and printing are **out of scope** by request — TrailBase still exposes them, this UI
just does not edit them."

| Missing screen | Legacy route | Notes |
|---|---|---|
| Invoice entry — purchase, sale, return, difference | `/app/invoices/{purchase,sale,return,difference}` | the core workflow |
| Orders | `/app/invoices/orders` | |
| Invoice printing + print queue | `/app/invoices/print`, `/printinvoice`, `/printinvoice/queue` | |
| Standalone invoice view | `/views/invoice` | |
| Cash-memo payment vouchers | `/app/cashmemo/cash_payment_vouchers` | |
| Cash-memo receive vouchers | `/app/cashmemo/cash_recieve_vouchers` | |
| DA entry | `/app/cashmemo/da_entry` | |
| Expenses | `/app/cashmemo/expenses` | |
| Cash-memo payments | `/app/cashmemo/payments` | |

Note the tables exist on the TrailBase side (`invoices`, `transactions`, `payments`, `expenses`,
`invoices_return_reference`), and `enable_record_transactions: true` exists specifically so an
invoice plus its transactions can be written atomically. So this is *unbuilt UI*, not a missing
backend.

### 2. Deliberately omitted, with a stated reason

- **`/reports/payments/areawise`** — "In the old frontend it is a copy of the Unified Payments
  Report that no tile links to; it is left out rather than duplicated."

### 3. Behaviour differences that are not gaps but must be decided

- **The General Ledger's opening-balance inputs are not persisted.** They are per-request form
  values, "exactly as the old screen behaved". So neither implementation stores them, but the SSR
  one has no place to put them either.
- **Report filters are APPLY-gated** in the SSR app as a server-rendered form. The legacy app
  reaches the same behaviour through `useAppliedFilters` (POS-0026), so this is parity — but the
  legacy app's *other* pages may still fetch per keystroke.
- **Two business identities.** The legacy app prints `SAMPLE TRADERS` + address + phone; the SSR app
  has only `APP_NAME` = `AA Point of Sale` and no variables for address or phone. Printing is out of
  scope, but a cutover without this resolved loses the printout header ([[environment]]).

### 4. Operational gaps

- No SSR equivalent of `frontend/`'s `build:standalone` bundle script.
- No Storybook equivalent, so the component workshop is legacy-only.
- No equivalent of `run smoke` for the legacy app, so the legacy side has no test suite to prove a
  change is safe — `npm run smoke` exists only in `frontend-ssr` (55 assertions).

### 5. Screens that exist in one app and not the other

- SSR has **Companies** management (`/management/companies`); the legacy app has no such screen,
  even though the `companies` collection exists. See
  [[tb-0014-point-company-fields-at-companies]].
- SSR has the **`/p` page index** and the **plugin hub**; the legacy app has neither.
- Legacy has `reports/stockreport/itemTransactionsReport`; SSR does not.

## Why this is an issue and not a task list

Because the response differs by category: category 1 is work, category 2 is a decision already
made, category 3 needs a ruling, category 4 needs a tooling decision, and category 5 is drift that
either converges or is accepted. Collapsing them into one task would hide that.

The single decision that resolves most of it is [[pos-0028-decide-cutover-plan]]: if the legacy
Next.js UI is repointed at TrailBase rather than retired, category 1 stops being a gap entirely,
and only the data layer needs changing ([[tb-0012-wire-nextjs-frontend-to-trailbase]]).

## Evidence

- `frontend-ssr/README.md` § *What is implemented* and § *Known gaps*.
- `route-map` ([[route-map]]) — the full side-by-side table, including the ❌ rows.
- `frontend-ssr/pages/` — 14 pages, none of which is an invoice or cash-memo screen.
- `frontend/package.json` — `build:standalone` and the Storybook scripts, for which SSR has no
  equivalent.
- `traildepot/config.textproto` — `enable_record_transactions: true`, confirming the backend can
  already accept an invoice + its transactions atomically.
