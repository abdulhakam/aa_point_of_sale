---
title: "TB-0028 Guest invoice / payment / inventory screens and a mobile layout"
type: task
status: done
priority: high
created: 2026-09-29
updated: 2026-09-29
tags: [invoices, payments, inventory, mobile, responsive, guest, demo, ui]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[tb-0021-invoices-cashmemos-printing]]", "[[guest-frontend-feature-parity-gaps]]", "[[mobile-layout-is-additive-to-the-legacy-look]]", "[[guest-ui-is-a-direct-shift-of-legacy]]", "[[tb-0023-direct-shift-legacy-ui-to-guest]]", "[[money-is-2dp-everywhere]]", "[[invoice-entry-freshness-and-writes]]", "[[dispatcher-transpiled-per-request]]", "[[manifest-driven-routing-and-data-dag]]"]
---

# TB-0028 Guest invoice / payment / inventory screens and a mobile layout

A demonstration build: the guest becomes a usable **invoice / inventory / payments / reports**
system that also works on a phone. Printing is explicitly out of scope for this pass.

This is a slice of [[tb-0021-invoices-cashmemos-printing]] (invoice entry, without printing or
cash memo) plus the new mobile rules in [[mobile-layout-is-additive-to-the-legacy-look]]. It does
not complete either parent task.

## Scope as agreed (2026-09-29)

| Area | In scope | Out of scope |
| --- | --- | --- |
| Invoices | list; entry for **sale** and **purchase**; header, lines, complete | return, difference, printing |
| Payments | payment against an invoice; **standalone DA** with no invoice | expenses, vouchers/returns |
| Inventory | item list with **live stock**, in-place item edit, new item | stock-adjustment invoices (difference type) |
| Reports | existing 10 + 4, made usable on a phone | new report arithmetic |
| Layout | every existing page, `max-width: 768px` rules | any change above 768px |

## Why

The guest had a first invoice-entry *API* slice but **no invoice, payment or stock screen at
all**, and its whole layout was the legacy 80px icon rail plus dense 12px report tables — unusable
on a phone. Nothing could be demonstrated end to end.

## Done

- [x] **Vault first** — this note, `status: done`, before the first code edit.
- [x] **Safe deploy path found** — and the depot made startable at all, after three separate
      defects in the generated copy: [[production-depot-could-not-be-started]].
- [x] **`app/lib/inventory.js`** — stock rows over the existing `itemsReport` view (the same view
      the stock report uses, so the two cannot disagree), search, and the in-place pricing/carton
      edit, money at 2 dp.
- [x] **`/inventory`** — item list with live stock, search, per-item edit, new item.
- [x] **`app/lib/invoices.js`** — the invoice list (type / date range / party / unpaid), the detail
      read (header + lines + totals + payments), and whole-set totals. The header arithmetic is
      `buildInvoiceView`'s formula verbatim, including the per-line percent discounts.
- [x] **`/invoices` and `/invoices/{id}`** — list, and a full entry screen for sale and purchase:
      party, booker, dated, description, discounts, add/delete lines, complete/reopen. Form posts,
      so the screen works with JavaScript disabled; the existing JSON API (`/invoice/*`) is
      unchanged and is still what the writes go through.
- [x] **`app/lib/payments.js` + `/payments`** — list with date/type/party/DA filters, a new-payment
      form that is either linked to an invoice or a standalone DA, and delete.
- [x] **Mobile layer in `app.css`** — bottom navigation bar, stacked filters, full-width form
      fields and 44px touch targets, card-style tables driven by `data-label`, sticky header, and
      the power-user nav group moved into the header. All inside `@media screen and (max-width:
      768px)`, so nothing above the breakpoint changed. See
      [[mobile-layout-is-additive-to-the-legacy-look]].
- [x] **`data-label` on every data cell** — `partials/table.html`, `management/list.html` and the
      new screens. A cardified table without it shows numbers with no headings.
- [x] **Nav / dashboard** — Invoices, Payments and Inventory added to the rail and the dashboard
      tiles.
- [x] **Verified against the loaded production depot** — see below.

## Verification actually performed

| Check | Result |
| --- | --- |
| Every new route over HTTP | 200 |
| Invoice total on a real invoice (3816) | 180 900.00, matching an independent SQL run of the legacy formula, line sum 180 934.99 over 36 lines |
| Payments totals | recieving **25 907 041.11**, sending **22 657 296.66** — the figures the vault already records for the imported depot |
| Create invoice → header → line → complete → two payments | balance 376.50 → 0.00 |
| Line idempotency (same `opKey` posted twice) | one line, not two |
| Line delete | removed, total recomputed |
| Standalone DA + delete | created, listed as `DA`, deleted |
| Guest smoke suite | **76/76** (was failing before this task — see below) |
| Mobile, 390×844, real browser | dashboard, invoice list, invoice entry, report cards, management list all checked visually; no horizontal overflow (`scrollWidth` 375 < 390) |
| Desktop, 1440×900 | unchanged layout, new screens correct |

The demo rows created by the test run were deleted afterwards; the depot is back to
8,935 invoices / 23,421 transactions / 26,526 payments (the +8/+8 over the import baseline are
the previous session's `invoice-check.mjs` drafts, not this task's).

## Two pre-existing failures this task ran into

1. **`trailbase/tools/guest-smoke.mjs` had been failing since the categories→companies migration.**
   It seeded `/api/records/v1/categories` (405 — the record API is gone) and asserted the
   `/management/categories` page. Fixed: the item company is now a `companies` row (two extra ones,
   so the pinned company groupings are unchanged), and the suite covers the new screens. The vault's
   "71/71" figure was stale.
2. **Four reports still fail cold at the 20 s deadline** (`profit`, `itemsales`,
   `paymentsbycompany`, `ledgers/general`), and while one is running the *other* requests fail in
   ~200 ms because the four runtime threads are saturated. Now measured and written up as
   [[heavy-report-blocks-runtime-threads]]. Filtered by two days, all four render in about a second.

## Deliberately not done

- Printing (invoice documents exist as materialised JSON but have no print template — later).
- Cash memo, vouchers, expenses, return and difference invoices.
- Line deletion is a **hard** delete (`invoicing.deleteLine` deletes the `transactions` row), so a
  line can be removed from a completed invoice and the reports change. Soft delete is the right
  answer; it is a change to `invoicing.js`, so it is left for [[tb-0021-invoices-cashmemos-printing]].
- The manifest-driven router. The new routes go into `route.ts`, which is now the known scaling
  bottleneck and is retired by [[manifest-driven-routing-and-data-dag]] — but that swap is gated on
  rebuilding the parity oracle, and this pass is a demonstration, not the refactor
  ([[dispatcher-transpiled-per-request]]).

## Notes

- `route.ts` is now ~1,350 lines. Every new transactional screen lands there first and has to be
  moved again when the crawler replaces it.
- A *library* change needs a process restart, not just a sync — see
  [[production-depot-could-not-be-started]]. A template or CSS change does not.
