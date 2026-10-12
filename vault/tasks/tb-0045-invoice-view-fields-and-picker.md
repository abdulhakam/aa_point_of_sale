---
title: "tb-0045 invoice-view fields and picker"
type: task
status: done
priority: medium
created: 2026-10-12
updated: 2026-10-12
tags: [invoices, console, picker, css, guest, done]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[invoice-view-ih-field-controls-unstyled]]", "[[console-invoice-picker-was-native-for-short-types]]", "[[why-some-selects-are-not-comboboxes]]", "[[tb-0041-console-invoice-number-search]]"]
---

# tb-0045 invoice-view fields and picker

**Done and verified 2026-10-12.** Owner-reported: fix the input-field styles in the invoice views, and
make the invoice-number dropdowns show the full list and load properly when a number is typed.

## Work

- [x] `public/css/app.css` — the `.ih-field` controls (invoice entry bar + console) get the same base
      styling as `.field`, on desktop and `≤768px`. [[invoice-view-ih-field-controls-unstyled]].
- [x] `routes/invoices/new/page.html.jinja` — the console picker adds `data-force-combo` (always a
      combobox, so the remote search attaches for every type) and `data-ac-limit="200"`.
- [x] `public/js/autocomplete.js` — honor `data-ac-limit` so a control can render its whole
      server-rendered list when opened.
- [x] `public/js/invoice-remote.js` — normalise the box to the matched digits before the combobox
      re-reads (kills a "No match" when a non-digit was typed), and build the server's option label.
- [x] `routes/data/invoices/search/route.ts` — return `dated` + `totalText` so a searched option reads
      exactly like a resting one.

## Evidence

Headless Chrome against the production depot, plus `trailbase/tools/invoice-view-check.mjs` (all
checks pass) and `trailbase/tools/template-check.mjs` (OK). Measurements and per-type table in
[[console-invoice-picker-was-native-for-short-types]].

## Not done

The search is a substring `LIKE` (non-sargable, debounced) — carried over, recorded in
[[tb-0041-console-invoice-number-search]].
