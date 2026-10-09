---
title: The guest frontend is not yet a replacement for the legacy UI — the parity gaps
type: issue
status: resolved
severity: high
created: 2026-09-27
tags: [guest, wasm, parity, gaps, cutover, risk, ui]
related_to: ["[[runtime-js-guest-platform]]", "[[frontend]]", "[[guest-ui-is-a-direct-shift-of-legacy]]", "[[tb-0023-guest-feature-parity]]", "[[pos-0028-decide-cutover-plan]]", "[[tb-0028-guest-transactional-screens-and-mobile]]", "[[mobile-layout-is-additive-to-the-legacy-look]]", "[[heavy-report-blocks-runtime-threads]]"]
---


# The guest frontend is not yet a replacement for the legacy UI — the parity gaps

> **This note's categories are re-read under the current mandate.**
> [[parity-is-functional-not-visual]] withdrew the visual direct-shift on 2026-10-05, which changes what
> two of these categories mean:
>
> - **Category 4 — visually different.** These are **no longer gaps.** They were written under a rule
>   that has been withdrawn; the differences are accepted. The triage is in [[tb-0023-guest-feature-parity]].
> - **Category 5 — new-side-only screens.** Unchanged in substance: these are capabilities the guest has
>   and legacy did not, and the mandate now explicitly permits keeping them.
> - **Categories 1–3 — missing screens and capabilities.** Still the substance of the work, and now
>   measured against a **capability inventory** rather than a screenshot.
>
> The 2026-10-01 re-verification below stands: every screen listed as missing now answers 200.

## RE-VERIFIED 2026-10-01: the listed gaps are built

Every screen this note listed as missing now answers 200 on the running server:

| was missing | now |
|---|---|
| Invoice entry - purchase, sale, return, difference | `/invoices`, `/invoices/new` 200 |
| Standalone invoice view | `/invoices/<id>` 200 |
| Cash-memo payment and receive vouchers | `/cashmemo/vouchers` 200 |
| DA entry | `/cashmemo/da` 200 |
| Expenses | `/cashmemo/expenses` 200 |
| Cash-memo payments | `/payments`, `/payments/new` 200 |
| Invoice printing + print queue | `/print`, `/print/queue` 200 |

Two paths in the list were wrong rather than missing: `/invoices/entry` never existed (the route is
`/invoices/new`), and `/app/cashmemo/payments` is served as `/payments`.

The list is **stale** and this note is closed against it. A fresh browser sweep of all 58 routes found
no dead links and no missing screen ([[browser-page-and-filter-sweep-2026-10-01]]). Note that "the
screen exists" is not "the screen matches the legacy UI" - the remaining work is
[[tb-0023-guest-feature-parity]].

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

Four defects inside that surface were verified on 2026-09-29 and are recorded with evidence:

- **`createInvoice` writes no `payments` placeholder.** Legacy creates a `payments` row with
  `amount: 0, paid: false` per invoice and `payments_view` substitutes the invoice's `final_total`
  for it, so **every outstanding and DA figure is wrong until this is built**. There is no
  `INSERT INTO "payments"` anywhere in the guest runtime.
- **`payments` has no `deleted` column.** The legacy Payments screen has a delete button, so on the
  new side a payment delete is a **hard delete** that erases it from running balances and the ledger.
  Needs a decision before cash memo. Schema verified directly against `traildepot`.
- **`dated` is blank on 21 of 8,927 invoices** in the guest where legacy had a value; those fall back
  to `created`, which is the import timestamp, so the date field would read 2026 for a 2024 invoice.
- **`invoices_return_reference` is never written**, and legacy's `payments_view.original_invoices`
  relies on the placeholder's id *being* the payment id. With `uuid_v7` ids that equality cannot
  hold, so returns need a real relation rather than a port.

See [[invoice-document-parity-2026-09-29]] for the invoice-document prototype, which reproduces
legacy money exactly and covers the `final_total` rounding quirk.

### 2. UI is not yet the legacy look

The guest's dashboard, report, ledger and management screens render their own layout. The
direct-shift decision requires them restyled to match the captured legacy UI exactly. This is
the bulk of [[tb-0023-guest-feature-parity]] and is not a functional gap.

### 3. Deliberately omitted, with a stated reason

- **`/reports/payments/areawise`** — in the legacy app it is a copy of the Unified Payments
  Report that no tile links to; it is left out rather than duplicated.
- **`reports/stockreport/itemTransactionsReport`** — legacy-only screen with no new-side
  equivalent.

### 3a. Verified 2026-09-29 — three "legacy" reports that do not exist in v1

`outstanding`, `productsale` and `dailysale` were being carried as reports that exist in **both**
systems. They do not: inspecting `frontend/src/app/app/reports/` finds **15 route folders, none of
which is any of the three**. They are **guest-only screens**, so they cannot regress against v1 —
there is nothing to match. `vault/references/route-map.md` and `vault/systems/frontend.md` listed
them as legacy routes and have been corrected. Recorded in
[[reports-parity-and-e2e-2026-09-29]].

This cuts the other way too, and is worth stating plainly: the guest has three report screens v1
never had, so "parity" here is not a one-to-one screen count.

### 3b. Verified 2026-09-29 — the APPLY-gate parity claim is wrong

This note recorded the guest's server-rendered APPLY/RESET form as **parity** with the legacy
`useAppliedFilters` (POS-0026). On the checked-out revision `frontend/src/app/api/useAPI.ts` is 77
lines and **exports no `useAppliedFilters`**, no `listPage`, no `hydrateRefs`, and no
`REFERENCE_STALE_TIME`; `providers.tsx` sets one global `staleTime` of 500 ms, and the report pages
read `form.values` **live**. The legacy app therefore re-queries as filters change, while the guest
waits for APPLY. That is a **behaviour difference to decide**, not parity. Corrected in
`vault/systems/frontend.md`.

### 4. Behaviour differences that are not gaps but must be decided

- **The General Ledger's opening-balance inputs are not persisted** in either app — per-request
  form values in legacy, and no storage on the new side either.
- **Report filters are APPLY-gated** on the new side as a server-rendered form; the legacy app
  reaches the same behaviour through `useAppliedFilters` (POS-0026), so this is parity.
  — **CORRECTED 2026-09-29: this is not parity.** `useAppliedFilters` does not exist in the
  checked-out `useAPI.ts`; see §3b. Re-decide.
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

- `trailbase/runtime/app/pages/` — the declarative pages, none of which is an invoice or cash-memo
  screen.
- `trailbase/runtime/app/lib/report-pages.js` — the report page definitions.
- [[route-map]] — the side-by-side table, including the ❌ rows.
- `trailbase/config.textproto` — `enable_record_transactions: true`, confirming the backend can
  accept an invoice plus its transactions atomically.

## Related

- [[guest-ui-is-a-direct-shift-of-legacy]] — the look-and-behaviour mandate.
- [[tb-0023-guest-feature-parity]] — the parity work item.
- [[tb-0021-invoices-cashmemos-printing]] — the transactional screens and their design.
- [[legacy-ui-reference-captures]] — the captured legacy UI reference.
