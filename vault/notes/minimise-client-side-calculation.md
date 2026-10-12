---
title: Minimising client-side calculation, and the two wrong numbers it uncovered
type: note
status: active
created: 2026-10-05
updated: 2026-10-05
tags: [guest, client-js, latency, performance, invoice-grid, money, verification, cdp]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[client-side-live-recalculation]]", "[[report-numbers-come-from-sqlite]]", "[[money-is-2dp-everywhere]]", "[[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]]", "[[guest-writes-via-sql]]", "[[runtime-js-guest-platform]]", "[[route-snapshot-was-snapshotting-redirects]]", "[[settle-structural-claims-with-the-owning-artifact]]", "[[invoice-entry-freshness-and-writes]]", "[[tb-0023-guest-feature-parity]]"]
---

# Minimising client-side calculation, and the two wrong numbers it uncovered

Asked: make as few calculations as possible happen in JavaScript, because they add latency.

**Keystroke cost is down 5×** — the worst per-keystroke handler went from **6.7 ms to 1.4 ms** on the
imported whole database. And measuring it first found that **two of the numbers the invoice grid was
showing were wrong**, one of them a silent rewrite of stored prices on save.

The order matters and is the whole lesson: **I measured before changing anything, and the measurement
turned out to be more valuable than the optimisation.**

## What the browser was spending time on

New harness `trailbase/tools/client-cost.mjs`: headless Chrome over CDP, timing `performance.now()`
around a real `input` event on the migrated database (8,927 invoices, 942 parties) and on the heaviest
invoice in it.

| per keystroke | scale | before | after | |
|---|---|---|---|---|
| management table filter | 943 rows | **6.70 ms** | **1.40 ms** | 4.8× |
| table filter, empty needle | 943 rows | 5.00 ms | 1.30 ms | 3.8× |
| `<select>` filter | 208 options | 3.30 ms | **0.80 ms** | 4.1× |
| invoice grid recalculation | 37 lines | 3.10 ms | **0.40 ms** | 7.8× |
| keyboard row-cursor label | 943 rows | 0.10 ms | 0.20 ms | — |

Worst single keystroke: **6.70 ms → 1.40 ms**.

### The table filter was 1,886 string allocations per keypress

```js
dataRows.forEach(function (row) {
  row.hidden = row.textContent.toLowerCase().indexOf(needle) === -1;
});
```

`row.textContent` builds a string of the row's entire text and `.toLowerCase()` builds another, **per
row, per keystroke** — 943 rows, so 1,886 allocations to recompute a haystack that cannot change while
the operator is typing. Now each row's lowercase text is built **once**, at init. Two smaller wins came
with it: an unchanged needle returns immediately, and `row.hidden` is only written when the state
actually changes, because writing it 943 times invalidates layout 943 times.

The `<select>` filter had the identical shape over `option.text.toLowerCase()` and got the identical fix.

### The grid recomputed every row for one keystroke

`lineOf(row)` did **seven `querySelector` calls per row**, and `recalc()` called it for every row on
every `input` event in every row — then rewrote all 37 amount cells and all 37 quantity labels. So one
keystroke in one cell cost **259 DOM queries and 74 text writes**, for 36 rows whose inputs had not
changed.

Now: each row's inputs and read-only outputs are looked up **once** into a cache, and a keystroke
recomputes **that row** and re-sums the cached per-row nets — a loop over numbers, no DOM queries. The
total is still O(rows), and it has to be, because the total depends on every line.

Three entry points, because the three inputs have different blast radii:

| changed | what must be recomputed |
|---|---|
| a **line** cell | that line, then the totals |
| an invoice-level **Discount % / Discount 2 %** | every line — these are in every line's net, so this is the one case where O(rows) is genuinely required |
| an invoice-level **Discount Rs** | the total only. It is applied once at the end of the header chain, so it moves no line. Recomputing 37 rows because a flat amount changed is the same mistake one level up |

## The two wrong numbers

Both were found by reading the code *next to* the measurement, and both are now covered by
`tools/grid-preview-check.mjs` (**14 checks, all passing**).

### 1. The invoice total was never updated at all

`app.js` looked for the total with `grid.querySelector("[data-sum]")` — but `[data-sum]` is at
`grid.html.jinja:64`, **above** the `<form data-grid>` at line 73. The query returned `null`, so the total was
never written. Measured on invoice `AaEHwKG8…`, 37 lines:

```text
qty 72 -> 999   line amount 8,249.76 -> 114,465.42   invoice total 180,900.00 -> 180,900.00
```

**A recalculated line beside a frozen invoice total.** For an accounting screen that is the worst
possible shape: the number an operator would check is the one that is stale. It also contradicted
[[client-side-live-recalculation]], which promises the preview agrees with the ledger.

### 2. The invoice-level discounts did nothing

`recalc()` read the invoice-level discounts from `grid.getAttribute("data-d1")` / `data-d2` — attributes
rendered **once, at page load** — and passed `discount_rs` to `invoiceTotals` as a **hardcoded `0`**. The
header's Discount %, Discount 2 % and Discount Rs fields therefore had no effect on the preview at all.
Verified: header Discount % `0 → 25` and Discount Rs `34.99 → 500`, and no row amount moved.

The fix reads the header form's inputs (`form[action$="/header"]`, because the header and the rows use
the **same** input names, so `input[name="discount_1"]` alone is ambiguous).

### 3. And the cross-check then found a third: the editable price was rounded

With the total live and the discounts wired, the preview's total **disagreed with the server's by 7.39**
— and the cross-check refused to pass. That is the check doing its job, so I settled which side was
wrong from the stored rows rather than by preference:

```text
stored lines recomputed from transactions : lineSum 180,934.99  -> with invoice Rs  180,900.00
server read view rendered                                180,900.00   <- correct
browser preview computed                                180,892.61   <- wrong by 7.39
```

Every grid row satisfied the formula, so the arithmetic was fine — the **inputs** differed. The stored
prices are `114.583333` and `58.3333` (a price of 1375/12), and `invoices.js` rendered the **editable
price input** with `money(r.price)`, i.e. `114.58`. Two defects in one line:

1. **saving the form rewrote the stored price** — 114.583333 became 114.58 — so touching an invoice
   silently changed the ledger;
2. the preview recomputed from the rounded value while the server used the stored one.

`money()` is right for a display column and wrong for an input. `priceText` is now `String(r.price)`, so
the input carries what is stored. **After this the preview and the server agree to the paisa**, which is
what the cross-check asserts.

⚠️ Legacy prices are not all 2 dp, which makes this a **live data hazard, not a cosmetic one**:
[[money-is-2dp-everywhere]] governs what the app *writes*, and the imported legacy prices were never
normalised. Every place a stored money value is put into an editable input needs the stored value, not a
`money()` rendering of it.

## What is still calculated in JavaScript, and why

**One thing: the invoice-entry grid's live preview.** It exists so the operator sees a total as they
type, with no round trip, and it is deliberately duplicated between `app/lib/invoice-lifecycle.js` (server)
and `app/public/js/app.js` (browser) — see [[client-side-live-recalculation]]. It is now 0.40 ms per
keystroke on the heaviest invoice.

Everything else the browser computes has been removed or reduced:

| what | where it computes now |
|---|---|
| every report's figures, filters, ordering and totals | SQLite — proven row for row in [[report-numbers-come-from-sqlite]] |
| table and select filtering | SQLite delivers the rows; the browser only hides rows it already has, against a prebuilt haystack |
| the keyboard palette and help | built from the DOM's own links; no calculation |
| the row-cursor label | read once per press, 0.2 ms |

## New gates

| tool | what it asserts |
|---|---|
| `trailbase/tools/client-cost.mjs` | per-keystroke cost on the real database. A measurement, not a pass/fail — but it is what found the three defects, and it is re-runnable |
| `trailbase/tools/grid-preview-check.mjs` | the grid preview: a line edit moves the line and the total; an invoice Discount % moves every line by the right factor; a Discount Rs moves the total by exactly its change and no line; **and the browser's total equals the server's**, by loading once with scripting disabled to capture the server's own number |

Neither writes: keys are typed and never submitted. That discipline is deliberate —
`hotkey-check.mjs` had to neutralise a click precisely because the obvious way to test `alt+1` would have
created a row in a database just reconciled against production
([[route-snapshot-was-snapshotting-redirects]]).

## Gates re-run

| gate | result |
|---|---|
| `tools/grid-preview-check.mjs` | **14 passed, 0 failed** |
| `tools/hotkey-check.mjs` | **34 passed, 0 failed** |
| `tools/guest-smoke.mjs` | **passed in full** |
| `tools/route-snapshot.mjs` | **49 routes, 0 erroring** |
| `tools/db-digest.mjs` | 60,245 → 60,246, only the seeded `Difference` party — **no contamination** |
| `tools/report-sql-provenance.mjs` | unchanged |

`tools/report-sql-time.mjs` and `tools/report-sweep.mjs` were **not** re-run: they measure SQL, which
this work does not touch, and re-running them would have burned an hour of wall clock for numbers already
recorded in [[report-cost-on-a-whole-database]].

## One behaviour change that is not an optimisation

The table filter's empty-state row. It used to be hidden whenever the table had any data rows at all, so
a search matching nothing showed an empty table with no message — while its own comment said it "stands in
for a table that has no data, never for a search that matched nothing". It now appears when a search
matches nothing, which is what the comment always claimed. Recorded because a comment and its code
disagreeing is a finding in its own right
([[three-reference-docs-lost-their-line-structure]]).

## What is still open

- **`cost_price` and the row discounts have the same exposure as `price`.** I fixed `priceText` because
  the cross-check caught it there; `cost_price` is rendered from the same helper family and needs the same
  audit before anyone edits a cost on a legacy-priced invoice.
- **Stored prices are still unrounded.** The app writes 2 dp, so new lines are fine; imported legacy lines
  are not. Normalising them is a data migration and a decision, not a client change.
- **The empty-promise case.** `?` help and the palette are rebuilt from the DOM on each open. At 0.2 ms
  that is not worth optimising, and caching them would make the help lie after a filter changed the page.

## Related

- [[client-side-live-recalculation]] — the decision this work implements and the one that needed its
  missing check written.
- [[report-numbers-come-from-sqlite]] — the other half of the answer: the reports already compute in SQL.
- [[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]] — the same method, the same lesson.