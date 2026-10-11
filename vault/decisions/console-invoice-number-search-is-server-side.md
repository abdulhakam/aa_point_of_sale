---
title: "The console invoice-number picker searches on the server as you type"
type: decision
status: accepted
created: 2026-10-11
updated: 2026-10-11
tags: [invoices, console, picker, search, decision, guest]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[console-invoice-picker-listed-only-newest-200]]", "[[why-some-selects-are-not-comboboxes]]", "[[reference-lists-come-from-indexeddb]]"]
---

# The console invoice-number picker searches on the server as you type

**Decided 2026-10-11**, fixing [[console-invoice-picker-listed-only-newest-200]].

## Context

The console's **INVOICE #** picker must let the operator reach *any* invoice of the type, not just the
newest ones. Type 1 (sale) is 12,000+ rows and the console re-renders on every line write.

## Decision

Keep the server-rendered **newest 200** as the initial list, and add a **debounced server-side number
search** the picker calls as the operator types digits:

- endpoint `GET /data/invoices/search?type=N&q=<digits>` (≤ 50 matches, substring of the number,
  newest first) — `routes/data/invoices/search/route.ts`;
- client `public/js/invoice-remote.js`, opt-in via `data-invoice-remote` on the select, replaces the
  options and fires `refdb:select` so `autocomplete.js` refreshes its open list;
- the console picker opts in (`views/invoices/console.html`).

## Why not the alternatives

- **Inline all of the type** (the `/print` route's approach): ~0.7 MB on every console render, and
  the console re-renders on each line write. Rejected.
- **Reuse the client invoice cache** (`invoicedb.js` + `/data/invoices`): measured **2.08 MB / 4.4 s**
  for the full table (`public/js/invoicedb.js`), and that cache is keyed on the whole-table data
  version, not per type. Rejected for the console. It stays the right choice for the **payment**
  picker, which loads once.

## Consequences

- The picker is complete without a large payload or a per-render cost; the no-JS/mouse path still
  works with the newest 200.
- The search is a **substring** match on the invoice number, so a middle fragment finds the invoice.
- `refdb:select` remains the one mechanism by which any picker's options are refreshed, so this adds
  no new coordination with `autocomplete.js` — it reuses the event already used by `invoicedb.js`.
