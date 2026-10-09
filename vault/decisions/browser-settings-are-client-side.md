---
title: "Per-browser UI preferences live in localStorage (no backend), edited at /settings"
type: decision
status: accepted
decided_on: 2026-10-09
created: 2026-10-09
updated: 2026-10-09
tags: [guest, ui, settings, localStorage, preferences]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[features-as-native-web-components]]", "[[print-queue-parity-fix-2026-10-08]]", "[[why-some-selects-are-not-comboboxes]]", "[[tb-0039-settings]]"]
---

# Per-browser UI preferences live in localStorage (no backend), edited at /settings

## Context

The owner asked for a management settings menu to enable/disable behaviour, explicitly "no backend store
for such things", and named one preference: the payment invoice picker should list **all** invoices
(open or not). Some preferences are about how an operator likes to work, not about the data; storing
them on the server would make them follow the user everywhere and need a schema, an API and a
migration for what is really a local choice.

## Decision

**UI preferences are per-browser, stored in `localStorage` under `aa-settings`, and edited at
`/settings`.**

- `app/public/js/settings.js` owns the store: a `DEFAULTS` object (the one place a preference is
  declared), `__AA_SETTINGS__.get/set/all/reset/apply`, and an `aa-settings:change` event. It is
  loaded **before `autocomplete.js`** so a preference that trims a select is what the combobox is built
  from, and `app.js` re-applies it on `htmx:afterSwap` for the same reason.
- `/settings` (a route folder) renders the defaults; the script hydrates the form and saves on change.
  No data is read or written server-side. Without JavaScript the controls show the defaults and do
  nothing — the honest no-JS behaviour.
- The management hub links to it (`settings`).
- **First preference: `invoicePickerScope`** (`"all"` default, `"open"` alternative). The payment
  form's invoice select (`select[data-invoice-picker]`) lists every non-deleted invoice
  (`invoices.pickerInvoices`, which pages past `listInvoices`'s 1,000 cap); each paid option carries
  `data-paid="1"`, and `settings.apply` **removes** those options when the scope is `"open"` (removal,
  not hiding — the combobox reads the select's options, so a hidden option would still be offered).

## Consequences

- A preference cannot change what the **server** renders; it acts on the rendered DOM. That is why the
  server sends the full list and the client trims, rather than the reverse.
- **Cost of "all" — fixed the same day.** Listing every invoice inline was ~0.9 MB of HTML per
  `/payments/new`. It is now a small server fallback (open invoices, 200) plus the **client invoice
  cache** (`invoicedb.js` / `GET /data/invoices`, the slice deferred by
  [[reference-lists-come-from-indexeddb]]): `/payments/new` dropped to **91 KB**, the full list comes
  from IndexedDB after one fetch. The picker is populated client-side from the cache and the
  `invoicePickerScope` setting trims it (open/all) without a reload.

## Evidence (2026-10-09)

- `/settings`: the select hydrates to the stored value; changing it writes
  `{"invoicePickerScope":"open"}` to `localStorage` and shows "Saved".
- `/payments/new` default (`all`): the invoice combobox has **8,931** options (7,092 paid) and typing
  `SUPER` filters to matching invoices; with `open`, **1,839** options and **0** `data-paid="1"`.
- Gates: `guest-smoke` 116/116, `route-snapshot` 50/0, `autocomplete-check` 39/39, `refdb-check` 12/12,
  `hotkey-check` 62/62, `grid-preview-check` 14/14, `print-queue-check` 14/14.

## Related

- [[why-some-selects-are-not-comboboxes]] — the component thresholds this builds on.
- [[print-queue-parity-fix-2026-10-08]] — the other per-browser store (`localStorage`).
- [[tb-0039-settings]] — the work item.
