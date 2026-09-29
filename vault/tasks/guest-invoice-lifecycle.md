---
title: TB-0029 Invoice lifecycle, spreadsheet grid, and the standalone invoice view
type: task
status: done
priority: high
created: 2026-09-29
updated: 2026-09-29
tags: [invoices, lifecycle, grid, returns, difference, concurrency, guest, pos]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[invoice-lifecycle-draft-open-append-only]]", "[[single-writer-per-invoice]]", "[[returns-are-negative-quantities]]", "[[verified-negative-quantity-stock-and-money]]", "[[client-side-live-recalculation]]", "[[tb-0021-invoices-cashmemos-printing]]", "[[tb-0028-guest-transactional-screens-and-mobile]]", "[[money-is-2dp-everywhere]]", "[[guest-writes-via-sql]]", "[[guest-db-bridge-text-params-only]]", "[[reports-and-ledgers]]", "[[tb-0027-materialised-invoice-documents]]", "[[invoice-entry-freshness-and-writes]]", "[[imported-completed-flag-carries-no-information]]", "[[single-writer-per-invoice]]", "[[sql-rounding-differs-from-js-round2]]"]
---

# TB-0029 Invoice lifecycle, spreadsheet grid, and the standalone invoice view

The working invoicing system: a spreadsheet-style line editor, a real invoice lifecycle, returns as
negative quantities, a Difference party, and a standalone printable invoice rendered from the
materialised document. Replaces the design in [[invoice-entry-freshness-and-writes]]; the whole of
[[tb-0021-invoices-cashmemos-printing]] except printing and the cash memo.

## Decided before the build (owner, 2026-09-29)

| Question | Answer | Recorded in |
| --- | --- | --- |
| Return and difference invoice types? | **No.** A return is a negative-quantity row on the same invoice; a difference is an invoice to a **Difference** party | [[returns-are-negative-quantities]] |
| Difference Report? | **Re-keyed on the party**, not `type = 3` | [[returns-are-negative-quantities]] |
| Single-writer unit? | **Per invoice.** One writer, every other user reads | [[single-writer-per-invoice]] |
| Lifecycle states? | **draft / open only.** Cancelling is another document, not a state | [[invoice-lifecycle-draft-open-append-only]] |
| Draft visibility? | **Readable by everyone, writable by the lease holder only** | [[invoice-lifecycle-draft-open-append-only]] |
| Grid saving? | **Live client-side recalculation.** IronCalc considered and **rejected** — the risk is formula equivalence, not evaluation | [[client-side-live-recalculation]] |
| Negative balance after a partial return? | Shown as **credit due**, never as an unpaid invoice | [[returns-are-negative-quantities]] |
| Orders? | **Not needed.** Dropped from scope | — |

## Scope

### Build

- [x] **Migration** — `invoices.status TEXT` (`draft`/`open`, trigger-enforced), every existing row
      `open`, the **Difference** party seeded. Three migrations, because the first backfill was wrong:
      [[imported-completed-flag-carries-no-information]].
- [x] **`app/lib/invoice-lifecycle.js`** — the transitions, the lease as the only write token, and
      the append-only line operations. Every line write carries an `opKey`; a "remove" on an open
      invoice is an append of a reversal, never a `DELETE`. The money chain lives here, once, and the
      grid's browser copy mirrors it.
- [x] **Reports get `status = 'open'`** — applied in `data.js`, the single place every base table is
      read, so all 14 report pages inherit it from one change.
- [x] **Spreadsheet grid** (`/invoices/{id}/grid`) — a `<table>` of lines: item is a
      server-resolved list, calculated cells are read-only, everything else is a typed cell, default
      qty 1. Live recalculation, no round trip; the server is authoritative. Read-only for a
      non-holder, with the owner's device named.
- [x] **Return is a negative row on the same invoice**, through the same grid.
- [x] **Standalone invoice view** (`/invoices/{id}/view`) — rendered from the materialised
      `inv_doc` document, so the printed document and the on-screen document are one artefact.
- [x] **Difference Report re-keyed on the party**, still reading the historical `type = 3` row.
- [x] **Entry types narrowed to purchase and sale**, and orders dropped from the plan.

### Verify

- [x] Lifecycle: a draft is in no report; `open` is in all of them; a second device is refused
- [x] Grid: add / modify / remove / return, live recalculation agrees with the server to the paisa
- [x] Append-only: an "open" invoice's rows are never edited or deleted, only added to
- [x] Standalone view renders from `inv_doc` and matches the live invoice
- [x] Difference party: a purchase to it reduces stock, a sale increases it, the report shows it
- [x] Guest smoke suite green, including the new screens

## What the build found

Three defects that the measurements found, not the code review:

1. **The `completed` backfill was wrong and would have emptied every report.** `completed` is 0 on
   8,923 of 8,935 imported invoices because the import never set it, so backfilling the lifecycle
   from it marked almost the whole ledger as drafts. Corrected in place, plus a repair migration for
   the depot that had already run the wrong one.
   [[imported-completed-flag-carries-no-information]]
2. **The two server rounding functions disagreed.** `invoicing.js` wrote money with `toFixed(2)` and
   `compute/views.js` read it with `round2()`, which differ on 353 of 200,000 measured
   `price * qty` products. Invisible until the grid showed a preview that disagreed with the saved
   row. `round2` is now the single server function, and it is the one that matches the legacy SQL.
3. **A doc comment containing a literal export form broke the module that held it.** The guest's ESM
   shim rewrites `export` text with regexes that do not skip comments, so `export {…}` inside a
   comment became an export named `…` — which V8 accepts as an identifier and QuickJS does not.
   [[esm-shim-rewrites-text-inside-comments]]

Also fixed in passing: a column added out of order in a positional row mapper, which silently
shifted every value in the invoice list; an edit to an open invoice that became a silent append; and
an invalid item id that surfaced as an opaque `QuickJS library created a unknown error` instead of a
400.

## Deliberately not done

- **Printing.** The standalone view is a rendered page; `window.print()` and the A5/A4 paper sizes
  and the `print_job` queue stay with [[tb-0021-invoices-cashmemos-printing]]. The view is built so
  that printing is a stylesheet and a queue, not a second renderer.
- **The cash memo** — vouchers, DA entry, expenses — unchanged, still [[tb-0021-invoices-cashmemos-printing]].
- **Contention across two real users** is still unverified in the check tool (unchanged by this task:
  it needs a second account).

## The measurements this rests on

- Negative quantity → correct stock: sale −5 → +5, purchase −5 → −5, **0 mismatches** across the
  adversarial set; 126 such transactions already exist in the imported data.
- Client vs server recalculation: the identical chain drifts **0/5000** multi-line invoices;
  omitting one `round2` drifts on **93%** of lines by up to 0.005. Hence integer paisa on the
  client and the server as the authority.
- **Lifecycle end to end, 21/21 over HTTP against the production depot**: a draft is absent from
  the list and from every report; commit flips it in; an open invoice's line is not edited in place;
  a negative row of −2 @ 4.00 cancels its +8.00 partner so the invoice total goes 38.00 → 30.00; the
  document renders; an overpayment shows as credit due.
- **Report totals are unchanged by the predicate.** `recieving 25,907,041.11` and
  `sending 22,657,296.66` are identical before and after. The invoice list moved by exactly −23.00,
  which is the aggregate of the 427 line-less drafts (header discounts with no lines) and was
  confirmed by an independent SQL run rather than assumed.
- Guest smoke suite **76/76**, with the harness declaring `status: "open"` on the invoices it
  expects in the books.

## Notes

- `invoices.status` is the single source of truth; `completed` is kept for the record API and the
  import, and is written in the **same `UPDATE`** so the two cannot drift.
- The ironcalc rejection is deliberate and measured, not a preference — see
  [[client-side-live-recalculation]] before revisiting it.
