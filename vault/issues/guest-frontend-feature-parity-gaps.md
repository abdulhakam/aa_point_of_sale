---
title: The guest frontend is not yet a replacement for the legacy UI — the parity gaps
type: issue
status: open
severity: high
created: 2026-09-27
tags: [guest, wasm, parity, gaps, cutover, risk, ui]
related_to: ["[[runtime-js-guest-platform]]", "[[frontend]]", "[[guest-ui-is-a-direct-shift-of-legacy]]", "[[tb-0023-direct-shift-legacy-ui-to-guest]]", "[[pos-0028-decide-cutover-plan]]"]
---

# The guest frontend is not yet a replacement for the legacy UI — the parity gaps

## Summary

The guest frontend ([[runtime-js-guest-platform]]) covers login, dashboard, reports and
management over the TrailBase depot. It does **not** cover the screens that make money, and its
existing screens are not yet visually identical to the legacy Next.js app ([[frontend]]) that
staff use. Until both are closed, the legacy stack stays live
([[keep-legacy-stack-in-production]]) and cannot be retired.

The target is a **direct shift** of the legacy UI — same screens, same look
([[guest-ui-is-a-direct-shift-of-legacy]]) — with the legacy UI captured as the reference
([[legacy-ui-reference-captures]]).

## Gaps, by category

### 1. Transactional screens not built on the guest

Carried over from the removed Node `frontend-ssr` (they were out of scope there by request) and
designed in [[invoice-entry-freshness-and-writes]]; only the first invoice-entry slice exists
([[tb-0021-invoices-cashmemos-printing]]).

| Missing screen | Legacy route |
|---|---|
| Invoice entry — purchase, sale, return, difference | `/app/invoices/{purchase,sale,return,difference}` |
| Orders | `/app/invoices/orders` |
| Invoice printing + print queue | `/app/invoices/print`, `/printinvoice`, `/printinvoice/queue` |
| Standalone invoice view | `/views/invoice` |
| Cash-memo payment vouchers | `/app/cashmemo/cash_payment_vouchers` |
| Cash-memo receive vouchers | `/app/cashmemo/cash_recieve_vouchers` |
| DA entry | `/app/cashmemo/da_entry` |
| Expenses | `/app/cashmemo/expenses` |
| Cash-memo payments | `/app/cashmemo/payments` |

The tables exist on the TrailBase side (`invoices`, `transactions`, `payments`, `expenses`,
`invoices_return_reference`), and `enable_record_transactions: true` exists so an invoice plus
its transactions can be written atomically. This is unbuilt UI, not a missing backend.

### 2. UI is not yet the legacy look

The guest's dashboard, report, ledger and management screens render their own layout. The
direct-shift decision requires them restyled to match the captured legacy UI exactly. This is
the bulk of [[tb-0023-direct-shift-legacy-ui-to-guest]] and is not a functional gap.

### 3. Deliberately omitted, with a stated reason

- **`/reports/payments/areawise`** — in the legacy app it is a copy of the Unified Payments
  Report that no tile links to; it is left out rather than duplicated.
- **`reports/stockreport/itemTransactionsReport`** — legacy-only screen with no new-side
  equivalent.

### 4. Behaviour differences that are not gaps but must be decided

- **The General Ledger's opening-balance inputs are not persisted** in either app — per-request
  form values in legacy, and no storage on the new side either.
- **Report filters are APPLY-gated** on the new side as a server-rendered form; the legacy app
  reaches the same behaviour through `useAppliedFilters` (POS-0026), so this is parity.
- **Two business identities.** Legacy prints `SAMPLE TRADERS` + address + phone; the new side has
  only `APP_NAME`. A cutover without this resolved loses the printout header
  ([[environment]]).

### 5. Screens that exist in one app and not the other

- The new side has **Companies** management; the legacy app has no such screen even though the
  `companies` collection exists ([[tb-0014-point-company-fields-at-companies]]).
- The new side has the **`/p` page index** and the **plugin hub**; the legacy app has neither.

## Why this is an issue and not a task list

Because the response differs by category: category 1 is work, category 2 is the design mandate,
category 3 is a decision already made, category 4 needs a ruling, and category 5 is drift that
either converges or is accepted. Collapsing them into one task would hide that.

The single decision that resolves most of it is [[pos-0028-decide-cutover-plan]]: whether the
legacy Next.js UI is repointed at TrailBase rather than retired, or replaced screen-for-screen
by the guest.

## Evidence

- `trailbase/src/runtime/app/pages/` — the declarative pages, none of which is an invoice or cash-memo
  screen.
- `trailbase/src/runtime/app/lib/report-pages.js` — the report page definitions.
- [[route-map]] — the side-by-side table, including the ❌ rows.
- `trailbase/src/config.textproto` — `enable_record_transactions: true`, confirming the backend can
  accept an invoice plus its transactions atomically.

## Related

- [[guest-ui-is-a-direct-shift-of-legacy]] — the look-and-behaviour mandate.
- [[tb-0023-direct-shift-legacy-ui-to-guest]] — the parity work item.
- [[tb-0021-invoices-cashmemos-printing]] — the transactional screens and their design.
- [[legacy-ui-reference-captures]] — the captured legacy UI reference.
