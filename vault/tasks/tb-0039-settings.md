---
title: "Per-browser settings store and the all-invoices payment picker"
type: task
status: doing
priority: medium
created: 2026-10-09
updated: 2026-10-09
tags: [guest, ui, settings, payments, localStorage]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[browser-settings-are-client-side]]", "[[why-some-selects-are-not-comboboxes]]", "[[print-queue-no-cross-context-sync]]"]
---

# Per-browser settings store and the all-invoices payment picker

Decision: [[browser-settings-are-client-side]].

## Done (2026-10-09)

- [x] `app/public/js/settings.js` — the `localStorage` store (`aa-settings`), `DEFAULTS`,
      `__AA_SETTINGS__.get/set/all/reset/apply`, `aa-settings:change`, and Settings-form hydration.
- [x] `/settings` route folder + `views/settings/index.html.jinja` — the Settings screen; the management hub
      links to it. Nothing is stored server-side.
- [x] `invoices.pickerInvoices(db)` — every non-deleted invoice, paging past `listInvoices`'s 1,000 cap.
- [x] `payments.newView` + `payments/new.html.jinja` — the invoice select lists **all** invoices
      (`data-invoice-picker`), each paid option `data-paid="1"`.
- [x] `settings.apply` trims paid options when `invoicePickerScope === "open"`; `app.js` applies it on
      `htmx:afterSwap` before re-enhancing.
- [x] Preview preference `invoicePickerScope` default `"all"`.
- [x] Browser-verified: `/settings` saves `{"invoicePickerScope":"open"}`; `/payments/new` shows 8,931
      options by default and 1,839 (0 paid) under `open`; typing filters the combobox. No console errors.
- [x] Gates green: `guest-smoke` 116/116, `route-snapshot` 50/0, `autocomplete-check` 39/39,
      `refdb-check` 12/12, `hotkey-check` 62/62, `grid-preview-check` 14/14, `print-queue-check` 14/14.

## Follow-ups (not done)

- [x] **The payment picker's ~0.9 MB inline list** — fixed 2026-10-09 with the client invoice cache:
      `GET /data/invoices` + `public/js/invoicedb.js` (IndexedDB `aa-pos-invoices`, lazy, version-keyed),
      and the payment form renders only a 200-invoice fallback. `/payments/new` 925 KB → **91 KB**; the
      full list is populated from the cache (second load `data-invoicedb-source="cache"`) and the scope
      setting trims it. See [[reference-lists-come-from-indexeddb]] (`invoices` slice).
- [ ] **The report "Invoice" filter is still a text box** (`page-presets.json` `type:"text"`); making it
      a searchable select is a separate change that must agree with `payments.sql`.
- [ ] More preferences as they come (only `invoicePickerScope` exists); consider a Reset button (the
      store exposes `reset()` but the screen shows no button).

## Related

- [[browser-settings-are-client-side]] — the decision.
- [[why-some-selects-are-not-comboboxes]] — the select thresholds this builds on.
