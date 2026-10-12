---
title: "Why some selects are not searchable comboboxes (and the reported cases)"
type: note
status: current
created: 2026-10-09
updated: 2026-10-12
tags: [guest, ui, autocomplete, filters, reports, frontend]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[features-as-native-web-components]]", "[[runtime-js-guest-platform]]", "[[print-queue-no-cross-context-sync]]"]
---

# Why some selects are not searchable comboboxes (and the reported cases)

A report that "the invoice/dropdown isn't a searchable select". Investigated 2026-10-09. The
`autocomplete.js` component is working; the cases below differ, and none is a defect in it.

## The rules the component follows

`app/public/js/autocomplete.js` turns a `select[data-searchable]` into a combobox, with two deliberate
limits:

- **`MIN_OPTIONS = 12`** — a select with fewer than 12 real options is left a **native select** ("a
  combobox that filters four bookers is theatre"). Blank options are dropped before counting. A
  control can override this with **`data-force-combo`** where its keyboard codes need the text box.
- **`MAX_RENDERED = 50`** — the open list renders at most 50 rows until you type; typing filters the
  **whole** option list, not just the rendered 50. A control can raise its own cap with
  **`data-ac-limit="N"`**.

A select must also actually be a `select[data-searchable]`. A field declared as text is a text box.

**Update 2026-10-12.** The console invoice-# picker *was* a real defect at the `MIN_OPTIONS` boundary:
it renders one type's newest rows, so type 3 ("difference", 2 invoices) fell below 12 and stayed a
native select — and the server-side number search (`invoice-remote.js`) drives the combobox's
`.ac-input`, so typing did nothing. It now opts into `data-force-combo` (always a combobox) and
`data-ac-limit="200"`; see [[console-invoice-picker-was-native-for-short-types]]. The rule above still
holds for the smaller reference selects (four bookers stays native).

## The reported cases (verified live 2026-10-09)

| control | what it is | why |
|---|---|---|
| `/reports/payments` **Party** ("Unified Payments Report") | `select[data-searchable]`, **combobox** (944 options, `data-ac-ready=1`) | it *is* searchable |
| `/print` **Invoice No** | `select[data-searchable]`, combobox when the type has ≥12 invoices (type 0 → 267) | below 12 it is native; and the list is **one invoice type only** (`WHERE type = ?`) |
| `/reports/payments` **Invoice** filter | `<input type="text">` | declared `{ "name": "invoice", "type": "text" }` in `manifests/page-presets.json` — there is no dropdown |
| `/payments/new` **Invoice** | `select[data-searchable]`, combobox (**all** invoices now) | **fixed 2026-10-09**: lists every invoice; the per-browser setting `invoicePickerScope` trims to open-only ([[browser-settings-are-client-side]]) |

So the "searchable select" is not the common cause. Where a control is not a combobox it is because it
is declared as text, or has fewer than 12 options by design, or is scoped (one invoice type / open
invoices only), or truncated.

## If a change is wanted

- Make the report **Invoice** filter a select: change its `page-presets.json` entry to
  `{ "type": "select", "source": "<an invoices option source>" }` and ensure that source is populated
  by `reportPages.filterOptions`. This changes matching (a selected id vs a text `LIKE`), so the
  report's `payments.sql` must agree.
- A picker across **all** invoices (not one type / not only open) needs a dedicated option source and a
  cap decision; `MAX_RENDERED` already keeps the DOM small, so a large source is fine.

## Related

- [[features-as-native-web-components]] — the component contract.
- [[print-queue-no-cross-context-sync]] — the other half of the same report, which *was* a defect.
