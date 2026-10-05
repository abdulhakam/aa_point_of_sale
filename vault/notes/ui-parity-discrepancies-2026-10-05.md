---
title: UI parity discrepancies against the legacy bundle, 2026-10-05
type: note
status: active
created: 2026-10-05
updated: 2026-10-05
tags: [ui, parity, legacy, guest, screenshots, css, discrepancy]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[tb-0023-direct-shift-legacy-ui-to-guest]]", "[[party-and-booker-ledgers-render-empty-and-say-nothing]]", "[[legacy-ui-reference-captures]]", "[[guest-ui-is-a-direct-shift-of-legacy]]", "[[guest-frontend-feature-parity-gaps]]", "[[screen-parity-against-the-legacy-bundle-2026-10-04]]", "[[guest-ui-is-a-direct-shift-of-legacy]]", "[[settle-structural-claims-with-the-owning-artifact]]"]
---

# UI parity discrepancies against the legacy bundle, 2026-10-05

The direct-shift mandate is [[guest-ui-is-a-direct-shift-of-legacy]]: the guest must look like the legacy
app. This note is the first **measured** pass over that, screen by screen, against the 41 captures in
[[legacy-ui-reference-captures]].

**Method.** New `trailbase/tools/guest-capture.mjs` drives the guest in headless Chrome at **1600×900** —
the reference viewport, because a screenshot at a different size produces differences that belong to the
viewport — and writes, per screen, a `.png` plus a `.structure.json` (headings, tile labels, button
texts, table headers, form labels, rail items, computed metrics). 32 screens captured into
`vault/attachments/guest-ui/`. Structure beside pixels matters: a screenshot says *it looks different*,
the structure says *which label, which column, which control*.

⚠️ **The comparison is against the captures, not against the running legacy app.** The legacy app is up
on `:3000` and every screen answers **"Please log in to continue"** — it gates on a PocketBase session
and no legacy credential is recorded anywhere (`vault/credentials/` is empty). A live side-by-side on the
same data would be better evidence and needs that password. This is the one gap in the method.

## Part 2 — the LIVE comparison, 2026-10-05 (later the same day)

The operator supplied the legacy login, so the gap above is closed: `ui-capture.mjs --system both`
now drives **the running legacy app** and the guest at the same viewport with the same extractor.
**The 2026-09-27 captures were validated against it and are faithful** — the live legacy dashboard is
pixel-identical to `02-dashboard.png` — so the ten fixes above stand.

Four tools' worth of change came out of making a two-app comparison honest, and each was a bug that
produced a **confident wrong answer** rather than an obvious failure:

| bug | what it made the report claim |
|---|---|
| the extractor asked for the **guest's class names** (`.header-brand`, `.tile`), which cannot match Mantine's | every field "absent" on the legacy side. Replaced with a neutral tag/role extractor |
| the only-guest / only-legacy labels were **swapped** | every difference read backwards |
| wait was `document.body.innerText.length > 200` — true within a second of a client-rendered app starting | **"legacy 0 headers, guest 7"** on six screens, which is not a finding. Now waits on in-flight requests, and records `_settled` |
| login wait was `!pathname.includes("login")` — and the legacy login path is **`/auth`** | true *on the login page itself*, so one run captured 28 screens as an anonymous visitor and every one came back "Please log in to continue". Now waits on the gate text and re-verifies after a navigation |

### What the live comparison found that the captures could not

**1. The legacy report filter is a MODAL, not only an inline row.** Live captures of the Stock Report
and Difference Report show a centred **"Filter Data"** dialog — `h2 filter data`, an `OK` button, the
report name as its trigger — opened from the top-left glyph. The 2026-09-27 Profit capture shows an
inline row, so legacy has **both**: an inline row and a modal behind the glyph. The guest has the inline
row and a printer glyph that prints. **Open question, not a defect: does the legacy glyph open a filter
dialog, and does printing live behind it at all?**

**2. Legacy report tables have no `<th>` at all** — the header row is `<td>` cells. The guest's
`<th>` + `text-transform: uppercase` reaches the same *look* by a different mechanism, so the two now
match visually while differing in what a screen reader is told. Worth knowing; not worth changing back.

**3. Some legacy reports print RAW column names, and the guest does not.**

| | legacy (live) | guest |
|---|---|---|
| Stock Report | `COMPANY  NAME  CP  QTY  BOX_SIZE_QTY  STOCK_AMOUNT` | `Company  Name  CP  Qty  Carton Size  Stock Amount  Total Stock` |
| Difference Report | `COMPANY … BOX_SIZE_QTY …` | `Company  Name  Carton Size  Qty …` |

The legacy shows `snake_case` column names and abbreviates; the guest renames them. Under a *direct
shift* mandate that is a deviation — **in the guest's favour**. Recorded rather than reverted, because
nobody should type `box_size_qty` on a shop floor, and the legacy's own Profit Report *does* use friendly
labels (`DATE, TYPE, BOOKER, INVOICE, PARTY…`). **The ruling needed: friendly labels everywhere, or
byte-faithful labels everywhere.**

**4. Guest links are pure black; legacy's are grey.** `rgb(0,0,0)` against `rgb(73, 80, 87)` — on
**every screen with a link**. The guest's `--blue-6` tile labels are right; its body links are not. This
is the cheapest remaining fix and it is systematic.

**5. The management hubs have no headings at all in legacy.** `management-parties`: guest
`h1 parties | h2 new party | h2 all parties (943)`, legacy **none**. Confirms item A below from the
other direction — and note the legacy's parties screen carries buttons labelled
`name | type | area | section | phone | address`, which is its filter row rendered as controls.

**6. `Actions` vs `Row actions`.** The legacy truncates its column header ("Row acti…" in the capture,
`row actions` live). One-word difference; trivial.

**7. Two legacy screens are not evidence.** `reports-outstanding` never settled inside its 7-minute
budget (`_settled: false`), and the ledgers that need a counterparty are empty on **both** sides — which
is the same defect the guest has
([[party-and-booker-ledgers-render-empty-and-say-nothing]]), so it is not a parity difference.

### Correction to Part 1, item I

Part 1 said the legacy rail shows five icons. The live capture shows **six** — there is a logout icon at
the foot of the rail, below the gear. So the guest's rail carries **three** extra items (Pages, Plugins,
the background-refresh dot), not four, and legacy already ends with Logout where the guest ends with it
too.

## Part 1 — the capture-based comparison (superseded in part by the live run above)


## Fixed in this pass

| # | discrepancy | legacy | was | now |
|---|---|---|---|---|
| 1 | **Hub tile layout** — every hub screen | 5 per row, 110px gaps | flex, 16px gap, **8 per row** | 5-column grid, `space-between` |
| 2 | **Dashboard tiles** | Reports, Invoices, Cash Memo, Management | Invoices, Payments, Inventory, Reports, Management — **Cash Memo missing**, Reports 4th | legacy four first in legacy order, additions after |
| 3 | **Report table headers** | `DATE`, `TYPE`, `BOOKER` | `Date`, `Type`, `Booker` | uppercase, scoped to `.report` |
| 4 | **Report page order** | filters, then title | title, then filters | filters, then title |
| 5 | **The period** | `From: 11-Apr-2026  To: 28-Sep-2026`, right of the title | a meta line under the filters reading `Date From: … Rows: 1000` | on the title line, legacy format |
| 6 | **Report buttons** | `APPLY` + a printer glyph above the filters | `APPLY`, `RESET`, `PRINT` | `APPLY` + the glyph |
| 7 | **Injected select search** | none (searches inside the control) | a full-width box **above** every select | compact, beside its select, in a `.field-row` |
| 8 | **Date filters** | both on one row | one per row | both on one row |
| 9 | **Invoice number** | `S 8606` | **`1.0`, `2.0`** on Profit and Item Sales | `1`, `2` |
| 10 | **Column labels** | `INVOICE`, filter `Invoice` | `Inv #` / `Invoice #` in 7 manifests | `Invoice` |

Two of these were not cosmetic.

**#9 printed a float.** `transactions.sql` — read by the Profit and Item Sales reports — selected
`tr.invoiceNo` raw, and `invoiceNo` is a REAL, so the cells read `1.0`, `2.0`, `3840.0`. The reports
reading `payments.sql` and `payments_by_company.sql` already normalised it with a `CASE` that renders an
integer-valued number as integer TEXT; `transactions.sql` was simply never given the same treatment. It
now uses that identical expression, copied rather than reinvented. `verify-spool-reports` 14/14 after.

**#5 involved a template that was reading a variable nobody set.** The frame passed to a report page has
**no `meta`** — so the old `partials/report_meta.html` line was rendering `appliedLabels`, and its
`{% if meta.from %}` never fired. The period had therefore *never* been shown. It is now built from
`filters.from`/`filters.to` through a new `app/lib/dates.js::legacyDate`, which spells the month out
rather than calling `toLocaleDateString`, whose output changes with the host's ICU data and locale — a
date that reshapes itself per machine is not a date a shop can read a printout of.

## Still discrepant — reported, not changed

These are recorded rather than fixed because each is a design decision with a real trade-off, not a
styling slip, and the vault wants them ruled on rather than silently absorbed.

### A. Management screens are structurally different, not just styled differently

The guest's `/management/parties` is an `h1`, a `← Manage` link, a **"New Party" create form** (Name,
Type, Phone, Address, Area, Companies) with a Create button, then a Search box, then an
**"All Parties (943)"** badge, then the table — every part inside its own bordered card.

The legacy screen is a **compact filter row** (Party Type, Search, a blue filter button) and then the
table. No heading, no create form, no count badge, and no card around anything but the table.

**This is the largest remaining difference and it is not only visual**: legacy creates a party somewhere
else, so the guest's page does a job the legacy page did not. Recommend moving the create form off the
list page; needs a ruling.

### B. Management tables lack sort indicators and the view action

| | legacy | guest |
|---|---|---|
| headers | `Name ↑`, `Type ⇅`, `Area ⇅`… — sort arrows, one column marked | plain text, no affordance |
| actions | `Row acti…` with **three** icons: green eye, blue pencil, red trash | `Actions` with **two**: pencil, trash |

The green eye is a **view** action and the guest has no equivalent on a list row. The missing sort
arrows matter more than they look: legacy tables are sortable and guest tables are not.

### C. Management tables sit in bordered cards; legacy's do not

Legacy's page is borderless except for the table's own grid. The guest wraps each region in a `.card`,
so there are three nested boxes where legacy has none.

### D. Report date inputs

Legacy shows `April 11, 2026` — a Mantine `DateInput`, no visible picker glyph. The guest shows a native
`<input type="date">` rendering `01/01/2024` **with the browser's calendar button**, so the control's
appearance is the browser's rather than the app's.

### E. The select search box has no legacy counterpart

A native `<select>` cannot search inside itself the way Mantine's `Select` does, so the guest needs an
affordance the legacy did not. It is now compact and beside its select rather than stacked above it, but
it is still an extra control per filter on every report screen. The alternative is a custom combobox,
which is real client JavaScript and runs against [[runtime-js-minimal-file-authoring-contract]].

### F. The invoice column is not a link and carries no type letter

Legacy: `S 8606` — the invoice **type** letter prefixed, the number a blue link to the invoice. Guest: a
bare `1`. The number is now right; the letter and the link are not implemented. The link is the more
useful half — it is the fastest route from a report to the document.

### G. The Cash Memo tile icon is the wrong glyph

Legacy's dashboard Cash Memo tile is a **filled blue € circle**. The guest uses a Tabler card outline in
the same blue. `icons.html` has no € glyph.

### H. The dashboard keeps an `Overview` counters card

Legacy has no counters. The vault records this as kept because `guest-smoke` asserts the `Overview`
heading — which is a **test asserting a divergence**, and worth revisiting on its own terms.

### I. The rail carries four extra items

Legacy's rail shows five icons. The guest's shows those five plus **Pages**, **Plugins**, the
background-refresh dot and **Logout** in the footer. Pages and Plugins are new-side-only surfaces;
Logout and the refresh dot have no legacy equivalent on the rail.

## What matched without any change

Worth recording, because the port did most of its work on 2026-09-27 and this pass found the remainder
rather than a rewrite:

- header: `SAMPLE TRADERS` left, clock over date right, same format;
- the 80px icon rail and the active chip;
- the grey-0 page ground, white tiles, blue tile labels;
- the **reports hub exactly** — same eleven tiles, same order, same per-tile icon colours, same 5/5/1 wrap;
- report tables: full black grid, tight rows, right-aligned numerics, `0 ctns 12 units` quantity text;
- management tables: title-case headers (as opposed to the reports' caps), same column set;
- the `Manage` pattern, the icon set, and the login paper.

## Gates

| gate | result |
|---|---|
| `tools/guest-smoke.mjs` | **passed in full** |
| `tools/verify-spool-reports.mjs` | **14 passed, 0 failed** after the `transactions.sql` change |
| `tools/route-snapshot.mjs` | **49 routes, 0 erroring** |
| `tools/guest-capture.mjs` | 32 screens, all rendering |

## Definition of done, restated

`tb-0023` is done when every route has a guest equivalent matching the captures **or is explicitly and
recordedly dropped**. Items A–I above are the remainder. A is the one that needs a decision rather than
work; B's missing sort arrows and F's missing invoice link are the two that cost an operator real time.

## Related

- [[legacy-ui-reference-captures]] — the reference, and the reason this is a comparison and not a
  description.
- [[guest-ui-is-a-direct-shift-of-legacy]] — the rule that says compare what renders.
- [[guest-frontend-feature-parity-gaps]] — the behavioural half; this note is the visual half.
- [[screen-parity-against-the-legacy-bundle-2026-10-04]] — which screens exist on each side, as opposed to how they look.