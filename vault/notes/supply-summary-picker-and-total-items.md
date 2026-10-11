---
title: "Supply Summary: readable invoice picker and a Total Items figure"
type: note
status: current
created: 2026-10-11
updated: 2026-10-11
tags: [supply-summary, reports, picker, pagination, guest, css]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[reports-page-by-offset]]", "[[theme-is-one-file-of-tokens]]", "[[ui-parity-run-2026-10-11]]"]
---

# Supply Summary: readable invoice picker and a Total Items figure

**2026-10-11**, at the owner's request. Supply Summary (`/reports/supplysummary`) summarises a
**selected set of sale invoices** into products (quantity, amount, total).

## The problem

The picker (`.picker-list` / `.picker-row`) had **no CSS at all**, so its `<label>`s rendered inline —
every invoice in the chosen range on one wrapped line of checkboxes. And the result gave only product
quantity/amount, not the total number of units across the selected invoices.

## Changes

- **Readable picker** — `app.css` now styles `.picker-list` as a scrollable, responsive multi-column
  grid (`repeat(auto-fill, minmax(17rem, 1fr))`, `max-height: 22rem`) of `.picker-row` lines showing
  `#number · date · party`. Tokens only ([[theme-is-one-file-of-tokens]]).
- **Picker header** states the count in range, how many are selected, and the instruction to submit.
- **Total Items** — a new total (the sum of the report's per-product `units`) shown beside Total
  Amount. It is the `ints.units` group: a plain `CAST(SUM(units) AS INTEGER)` over the SAME statement
  the rows come from, so it cannot describe a different set (see [[reports-page-by-offset]]).
- **Pagination** — the products table pages by `LIMIT/OFFSET` (`page`, `Show all`), the same pager as
  every other report.

## Not done

The picker still offers the invoices capped at 1000 per range (`LIMIT 1000`). It lists them readably
now, but a range wider than 1000 invoices silently offers only the newest 1000 — a follow-up if the
operator needs the whole range.
