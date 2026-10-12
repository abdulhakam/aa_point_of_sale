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

## Not done

The endpoint matches by substring (`CAST(invoiceNo AS TEXT) LIKE '%digits%'`), which is non-sargable —
a full scan of the type per keystroke (~12k rows, debounced). An indexed numeric prefix range would
serve prefix search cheaply if middle-fragment matching is dropped (review suggestion, not applied).
