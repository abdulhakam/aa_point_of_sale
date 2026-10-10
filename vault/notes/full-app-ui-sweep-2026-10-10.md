---
title: "Full-app UI sweep (Chrome DevTools) — coverage and defects, 2026-10-10"
type: note
status: active
created: 2026-10-10
tags: [guest, ui, testing, chrome-devtools, sweep, evidence]
related_to: ["[[guest-invoice-total-dropped-line-discounts]]", "[[plain-entity-form-submit-cancelled]]", "[[management-select-duplicate-blank-option]]", "[[invoice-console-build-2026-10-10]]", "[[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]]"]
---

# Full-app UI sweep (Chrome DevTools) — coverage and defects, 2026-10-10

Drove the whole guest app in a real Chrome session against a throw-away depot (seeded with sections,
areas, companies, customers/supplier, a booker, two items, one invoice per type, payments and an
expense), clicking through create / read / update / delete / navigate. Three real defects were found and
fixed — one of them a serious accounting error no HTTP gate saw.

## Defects found and fixed

1. **`readInvoice` dropped per-line discounts from the invoice total** (critical). Grid/console showed
   797.50 where the list and document showed 731.00. See
   [[guest-invoice-total-dropped-line-discounts]].
2. **Plain `<aa-entity-form>` submit buttons were cancelled on click** (high) — the Inventory
   CREATE/SAVE buttons did nothing. See [[plain-entity-form-submit-cancelled]].
3. **Management relation/enum selects showed a duplicate blank option** (low). See
   [[management-select-duplicate-blank-option]].

## Coverage (all clean)

- **Route sweep**: every GET returned 200 with no error markers (dashboard; invoices hub/all/new×4/id/
  grid/view/view?source=live; payments + new; cashmemo hub/vouchers/da/expenses; management hub + all
  entities; inventory; print + print/queue; plugins; settings; reports hub + all 15; invoice context).
- **Interactive**: invoice console NEW walk + fragment create (sale), difference create (no party),
  line entry + prefill + `999` → payment dialog, `000` → advanced search, `up`-to-edit → PATCH,
  action dialog, `?source=live` sheet, soft delete; payments create/delete/filter; expenses
  create/delete; management sections create→edit→delete, party create (relations+enum), item create
  (decimal rates); inventory item create; print-queue add/remove; report filter apply (Item=Cola).
- **Console**: no errors or warnings across the session.

## Not examined closely

- Cash-memo **DA entry** and **CRV/CPV voucher** create (lists render; the create forms were not driven).
- The keyboard `j`/`k` row cursor on the reports/invoice tables, and the `?` help overlay.
- Wide-form and print pixel parity (separate from [[invoice-print-sheet-legacy-metrics]]).
