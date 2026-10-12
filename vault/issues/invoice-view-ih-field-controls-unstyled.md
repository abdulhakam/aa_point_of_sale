---
title: "The invoice bar's `.ih-field` controls were unstyled"
type: issue
status: fixed
severity: minor
created: 2026-10-12
updated: 2026-10-12
tags: [invoices, css, ui, guest]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[console-invoice-picker-was-native-for-short-types]]", "[[tb-0045-invoice-view-fields-and-picker]]"]
---

# The invoice bar's `.ih-field` controls were unstyled

**Status:** fixed 2026-10-12. Reported by the operator: "fix the styles of some of the input fields …
invoice views."

## Symptom

On the invoice entry screen (`/invoices/<id>`) and the console (`/invoices/new?type=N`), the plain
**text and number** controls in the header/bar — `INVOICE NO:`, `USER:`, `Original Invoice`,
`Description`, `Discount %`, `Discount 2 %`, `Discount Rs` — rendered as browser-default boxes
(21px tall, `2px inset` border, square corners, 2px padding) while the `<aa-date-input>` fields and
the searchable comboboxes on the same row were styled (36px, 1px solid, 8px radius, 12px padding).
The fields visibly did not belong to one another.

## Cause

The invoice bar is authored with `.ih-field`, but `app.css` styled only `.field input` / `.field
select`. `.ih-field` had layout rules (`.invoice-head .ih-field { display:flex … }`) and a
`min-width`, but **no base control styling**, so its native `input`/`select` inherited the user
agent's default appearance.

Measured in headless Chrome (`getComputedStyle`) on `/invoices/AaExBsgId…` before the fix: the
`.ih-field` text inputs read `height: 21px; border: 2px inset; border-radius: 0px; padding: 2px`,
against `aa-date-input .aa-date-text` and `.ac-input` at `36px / 1px solid / 8px / 12px`.

## Fix

`app.css` now applies the `.field` control styling to `.ih-field` as well (base, focus, and the
`≤768px` mobile rule). After the fix every `.ih-field` control measures `36px / 1px solid / 8px /
12px`, matching the date and combobox fields. No markup changed, so the no-JavaScript path is
unaffected.

## Evidence

- Before/after `getComputedStyle` sweep of `.invoice-head input, .invoice-head select,
  .console-pick input, .console-pick select` on the running guest against the production depot.
- `app.css` base rule now reads `.field input, .field select, .ih-field input, .ih-field select`.
