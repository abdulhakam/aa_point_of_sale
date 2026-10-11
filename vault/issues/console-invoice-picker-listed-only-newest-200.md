---
title: "The console invoice-# picker only listed the newest 200 invoices"
type: issue
status: fixed
severity: major
created: 2026-10-11
updated: 2026-10-11
tags: [invoices, console, picker, combobox, search, guest]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[console-invoice-number-search-is-server-side]]", "[[why-some-selects-are-not-comboboxes]]", "[[ui-parity-run-2026-10-11]]"]
---

# The console invoice-# picker only listed the newest 200 invoices

**Status:** fixed 2026-10-11. Reported by the operator: "the invoice# searchable select is still not
loading more of the options to select when I start typing the invoice number I want to select."

## Symptom

On `/invoices/new?type=N` (the keyboard console), the **INVOICE #** picker could not find an invoice
by number if it was not among the type's most recent 200. Typing a number filtered only the loaded
options, so an older invoice never appeared and could not be selected.

## Cause

`app/lib/invoices.js` `consoleView` built the picker from `listInvoices(db, { type }, { limit: 200 })`
— a **server-side 200-row cap**, with no further loading. The combobox (`autocomplete.js`) filters its
option array, but that array held only those 200.

## Why the obvious fixes were rejected

- **Render the whole type inline** (what `/print`'s route does): type 1 has **12,395** invoices, and
  the console **re-renders on every line write**, so a ~0.7 MB option list per render is not
  affordable here.
- **Populate from the full client invoice cache** (`invoicedb.js` `/data/invoices`): measured
  **2,080,059 bytes / 4.4 s** for the whole depot, on a surface that re-renders constantly, and the
  cache is keyed for the whole table (not per type).

## Fix

A server-side number search the picker calls as the operator types — see
[[console-invoice-number-search-is-server-side]]:

- `routes/data/invoices/search/route.ts` — `GET /data/invoices/search?type=N&q=<digits>`, up to 50
  matches of that type whose number contains the digits, newest first.
- `public/js/invoice-remote.js` — for a select with `data-invoice-remote`, debounced (180 ms) fetch,
  rebuild the options, fire `refdb:select` so the combobox re-reads and refreshes its open list.
- `views/invoices/console.html` — the picker carries
  `data-invoice-remote="/data/invoices/search?type={{ type }}"`.

**Hardened 2026-10-11 (code review).** `invoice-remote.js` now bumps its request sequence when the
box is cleared, so a search already in flight cannot overwrite the restored list with stale matches.

## Evidence

On a depot of 12,791 invoices (rebuilt from the legacy DB 2026-10-11). Searching `q=3000` returned
the one matching invoice; typing `3000` into the live console picker replaced its options with the
match, and the probe invoice was present and selectable.
