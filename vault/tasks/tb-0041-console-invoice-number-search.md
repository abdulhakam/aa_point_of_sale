---
title: "tb-0041 console invoice-number search"
type: task
status: done
priority: medium
created: 2026-10-11
updated: 2026-10-11
tags: [invoices, console, picker, search, guest, done]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[console-invoice-number-search-is-server-side]]", "[[console-invoice-picker-listed-only-newest-200]]", "[[tb-0040-invoice-console-keyboard-surface]]", "[[why-some-selects-are-not-comboboxes]]"]
---

# tb-0041 console invoice-number search

**Done and verified 2026-10-11.** The keyboard console's **INVOICE #** picker can now reach *any*
invoice of the type, not just the newest 200.

## Work

- [x] `runtime/ahscripts/routes/data/invoices/search/route.ts` — `GET /data/invoices/search?type=N&q=<digits>`,
      up to 50 matches of that type whose number contains the digits, newest first (digits sanitised;
      empty query returns none).
- [x] `runtime/app/public/js/invoice-remote.js` — for a select with `data-invoice-remote`, debounced
      (180 ms) fetch, rebuild the options, fire `refdb:select` so `autocomplete.js` re-reads and
      refreshes; restores the server-rendered list when the box is cleared (bumping its request token
      so an in-flight response cannot overwrite it).
- [x] `runtime/app/views/invoices/console.html.jinja` — the picker carries
      `data-invoice-remote="/data/invoices/search?type={{ type }}"`; the server still renders the
      newest 200 as the initial/no-JS list (`invoices.js` `consoleView`).
- [x] Loaded in `views/layout.html.jinja` after `autocomplete.js` / `invoicedb.js`.

## Evidence

Depot rebuilt from the legacy DB (12,791 invoices; type 1 = 12,395). `?type=1&q=3000` returned the
one matching invoice; a headless load of `/invoices/new?type=1`, typing `3000`, replaced the picker's
options with the match and the probe invoice was present and selectable. Reason and rejected
alternatives: [[console-invoice-number-search-is-server-side]].

## Not done → resolved 2026-10-12

The endpoint matched by substring (`CAST(invoiceNo AS TEXT) LIKE '%digits%'`), which was non-sargable:
the plan was `idx_invoices_type` (type only) plus a `TEMP B-TREE` for the `ORDER BY invoiceNo DESC`,
i.e. a scan+sort of the type per keystroke.

**Resolved with an index, not a prefix range.** Migration
`U1790800000__invoice_number_index.sql` adds `idx_invoices_type_invoiceno` on `("type", "invoiceNo")`.
With `type` fixed on the leading column the index rows are already in `invoiceNo` order, so the
existing `LIKE` is served from the index with **no temp sort** and **early termination** at the 50-row
`LIMIT`. Measured on a copy of the production `main.db`: `%3%` **10 ms → 0.35 ms**; a rare `%12345%`
stays ~2.7 ms (index rows, not the wide table). A numeric `BETWEEN` prefix range was prototyped and
rejected: it is a little faster on rare queries but **drops middle-fragment matching** (typing `0000`
would no longer find `10000`), which this decision deliberately keeps. Endpoint wall time (`type=1`,
warm) is unchanged at ~10 ms — HTTP plus the bounded totals query now dominate, not the scan.
