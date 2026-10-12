---
title: "The console invoice-# picker was a native select for short types"
type: issue
status: fixed
severity: major
created: 2026-10-12
updated: 2026-10-12
tags: [invoices, console, picker, combobox, search, guest]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[console-invoice-picker-listed-only-newest-200]]", "[[console-invoice-number-search-is-server-side]]", "[[why-some-selects-are-not-comboboxes]]", "[[invoice-view-ih-field-controls-unstyled]]", "[[tb-0045-invoice-view-fields-and-picker]]"]
---

# The console invoice-# picker was a native select for short types

**Status:** fixed 2026-10-12. Reported by the operator: "make it so the dropdowns for invoice numbers
show the full list. It is still not loading the invoice list properly when I enter the invoice
numbers."

## Symptom

On `/invoices/new?type=N`, typing an invoice number into the **INVOICE #** picker sometimes filtered
nothing and never reached an older invoice.

## Cause

`autocomplete.js` only builds a combobox when a select has **≥ `MIN_OPTIONS` (12)** options, unless
it opts in with `data-force-combo`. The picker renders that type's newest rows (a 200 cap), so a type
with fewer than 12 invoices stayed a **native `<select>`** — and `invoice-remote.js`, which drives the
server-side number search through the combobox's visible `.ac-input`, never found one. Typing did
nothing.

On the production depot the picker measured:

| type | invoices | server-rendered options | combobox built? |
|---|---|---|---|
| 0 purchase | 332 | 201 | yes |
| 1 sale | 12,395 | 201 | yes |
| 2 return | 62 | 63 | yes |
| **3 difference** | **2** | **3** | **no — native select** |

A second, narrower defect in the same script: the endpoint matches on the **digits** in the box, but
`autocomplete.js` filters the replacement options on the box's **raw text**. Typing `#3000` (the
label's own prefix) left the server's match in the list while the combobox rendered "No match".

## Fix

- `routes/invoices/new/page.html.jinja` — the picker adds `data-force-combo` (always a combobox) and
  `data-ac-limit="200"`.
- `public/js/autocomplete.js` — a control may raise its rendered cap with `data-ac-limit`; the picker
  now opens onto its whole server-rendered list instead of the first 50.
- `public/js/invoice-remote.js` — normalises the box to the matched digits before telling the
  combobox to re-read, so the two needles cannot disagree; and builds the same option label the
  server does.
- `routes/data/invoices/search/route.ts` — returns `dated` + `totalText` so a searched option reads
  `#no · party · date · total`, identical to a resting one. The total is computed in a **second,
  bounded query** over only the ≤50 matched ids (`WHERE "invoice" IN (unhex(?),…)`, driven by
  `idx_transactions_invoice`) rather than by joining an aggregate of the whole `transactions` table
  into the first query — the unbounded form measured **37–48 ms** per call against **~13 ms** for the
  bounded one (vs ~6–10 ms for the invoices-only scan). The line-sum and header-total SQL are now
  single exported fragments in `lib/invoices.js` (`LINE_TOTAL_SUM_SQL`, `HEADER_TOTAL_SQL`) used by
  the list, the console picker and this route, so the figure cannot drift between them.

## Evidence

Headless Chrome against the production depot (12,791 invoices):

- `?type=3` now reports `hasAc: true`; typing `2` lists both difference invoices
  (`#20240501 …`, `#20260804 …`).
- `?type=1` typing `3000` → `#3000 · AMEEN G/S · 2025-03-11 · 1245.00`; typing `#6000` also resolves
  (box normalised to `6000`) instead of showing "No match".
- Opening the picker with no query renders **200** rows (was 50).

## Not done

The search still matches a **substring** (`CAST(invoiceNo AS TEXT) LIKE '%digits%'`), which is
non-sargable — a scan of the type per keystroke, debounced. **Resolved 2026-10-12** with
`idx_invoices_type_invoiceno` on `("type", "invoiceNo")`: it makes the plain `LIKE` order-provided and
early-terminating (`%3%` 10 ms → 0.35 ms) without dropping substring matching. See
[[tb-0041-console-invoice-number-search]].
