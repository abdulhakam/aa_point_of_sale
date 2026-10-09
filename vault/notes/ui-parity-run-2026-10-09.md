---
title: "UI + frontend feature parity run, 2026-10-09 (live both-systems)"
type: note
status: active
created: 2026-10-09
updated: 2026-10-09
system: both
tags: [parity, ui, features, legacy, guest, browser, evidence]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[parity-test-2026-10-09]]", "[[ui-parity-discrepancies-2026-10-08]]", "[[ui-parity-restyle-progress-2026-10-08]]", "[[guest-frontend-feature-parity-gaps]]", "[[route-map]]", "[[feature-parity-harness-tail-mismatch]]", "[[legacy-ui-reference-captures]]"]
---

# UI + frontend feature parity run, 2026-10-09 (live both-systems)

A requested UI + frontend **feature** parity test, run live against the pair that was up:
guest TrailBase at `127.0.0.1:4000`, legacy Next.js at `127.0.0.1:3000`, PocketBase at
`127.0.0.1:8090`. Both arms were captured; the legacy login used the operator-supplied
`user` / `admin` account (the account recorded in [[parity-test-2026-10-09]]). No screen came
back gated.

Two halves, because "parity" is two questions:

1. **Reachable screens** — does the guest offer every screen the legacy app can reach?
   `trailbase/tools/feature-parity.mjs` (static read of the frozen bundle vs the guest route table).
2. **What the screen does** — for the screens both have, do the controls, columns and filters
   match? `trailbase/tools/ui-capture.mjs --system both` + `ui-parity-report.mjs` (live browser).

Fresh captures: `vault/attachments/ui-parity-run-2026-10-09/` (28 guest + 28 legacy PNGs and
`.structure.json`, plus `parity.json`). Local evidence, not committed, matching repo convention.

## 1. Reachable-screen parity (feature-parity.mjs)

The tool found **44 legacy screens** in `legacyforparity/standalone/.next/server/app` and
**111 guest routes** (folder tree under `runtime/ahscripts/routes` plus the declared page slugs).
Verdict: **7 renamed-matched, 32 candidate, 5 unmapped** — and the tool correctly refuses to
call an unmatched screen `MISSING`, because the two apps rename the same screen in places.

- **Matched by name:** `/app/dashboard`→`/dashboard`, `/app/reports`→`/reports`,
  `/app/reports/ledgers`→`/reports/ledgers`, `/app/management`→`/management`,
  `/app/invoices`→`/invoices`, `/app/cashmemo`→`/cashmemo`, `/app/cashmemo/expenses`→`/cashmemo/expenses`.
- **Candidate** (guest serves the same capability under a different path): all report tiles under
  `/p/reports/*`; the invoice, voucher, DA, payment and item screens under `/invoices`, `/cashmemo/*`,
  `/payments`, `/invoice`, `/inventory`.
- **Unmapped:** `/`, `/auth`, `/app/reports/stockreport` (guest's stock page folder is `stock`,
  served by the dynamic `/reports/{key}` route — see the stock-report note below),
  `/app/reports/stockreport/itemTransactionsReport` (dropped), and
  `/app/reports/transactions/unified` (guest `/reports/itemsales`, no shared path segment).

The **live capture adjudicates the candidates**: every money screen the legacy app has answers on
the guest. The genuine reachable-screen divergences are the already-decided ones — **Orders**
(withdrawn, [[no-draft-invoices-published-on-save]]), **areawise** (omitted), **itemTransactionsReport**
(dropped) — plus **return/difference invoice entry**, which the guest now has ([[route-map]]).

⚠️ **The tool had a defect that made every legacy screen read as unmatched; it is fixed.**
`tail()` stripped the `/app` prefix (and its trailing slash) from a legacy route but left the guest's
leading slash, so `/app/dashboard` normalised to `dashboard` while `/dashboard` normalised to
`/dashboard`; they never matched and `exact`/`renamed` could not fire at all (all 44 screens fell
through to `candidate`). Corrected in `tools/feature-parity.mjs`; recorded in
[[feature-parity-harness-tail-mismatch]].

## 2. Live structural parity (ui-capture + ui-parity-report)

**28 screens compared, 28 with at least one difference** — the same headline as
[[ui-parity-discrepancies-2026-10-08]]. Almost all differences fall into the **accepted carve-outs**
and the **data-window** effect, not the actionable list. Grouping the fresh diff:

### 2a. Already fixed — the guest now matches legacy on these (corrections to the 10-09 note)

- **Management column sets now identical.** `management-items` `tableHeaders` is now
  `Company, Name, Cost price, Sale price, Qty, Carton Size, Row actions` — exactly the legacy set,
  Qty included. `management-bookers` = `Name, Phone, Company, Created, Row actions`, and
  `management-parties` = `Name, Type, Area, Section, Phone, Address, Row actions` — both identical to
  legacy. The "Created column missing / items-below-legacy column set" item was true in
  [[ui-parity-discrepancies-2026-10-08]] but was fixed by the 10-08 restyle
  ([[ui-parity-restyle-progress-2026-10-08]] third + fourth increments). It is no longer a gap.
- **The Company filter exists on the guest** for `reports-difference`, `reports-stockreport`,
  `reports-itemsales`, `reports-profit` and `reports-paymentsbycompany` (each guest capture shows a
  `Company All …` label beside the other filters). [[parity-test-2026-10-09]] recorded "the guest has
  none of these"; that is **wrong** and is corrected in place there.
- **Dashboard is the legacy four tiles** and the **invoices hub is the legacy five tiles** (with the
  list behind `/invoices/all`), both since the 10-08 increments; the fresh diff no longer treats
  them as structural row differences.

### 2b. Accepted carve-outs (not defects, per [[parity-is-functional-not-visual]])

- **Rail**: legacy is `dashboard · reports · orders · invoices · cashmemo · management · (logout icon)`;
  the guest adds a foot menu (`payments · inventory · print · p · plugins`) and a labelled refresh
  button + logout. Orders is the only legacy-only destination and is the ruled accepted divergence.
- **Report tables**: legacy report tables have **no `<th>`** (`thCount 0`) and no `text-transform`; the
  guest has real uppercase `<th>` cells. Intentional
  ([[parity-reinstates-the-legacy-look-with-defect-fixes]]).
- **Anchor colour**: legacy sets no global anchor rule (raw anchors are the UA blue `rgb(0,0,238)`);
  the guest sets a global gray-7. Known.
- **Data window**: legacy report screens default to a small window (3–10 rows), the guest caps at a
  1000-row window, so `rowCount` differs on almost every report — a filter-default difference, not a
  rendering one.
- **Guest-only additions**: the `Supply summary` tile/screen, the `Find in this report` search row,
  `Show all` on report screens, and the `OK`-button "Filter Data" modal on stock/difference that the
  legacy also has (legacy's modal button also reads the report name).

### 2c. Still open — real feature gaps (the parity work remaining)

- **Item drill-down links (difference, stockreport).** Legacy renders each item name as a link into
  that item's transactions (16 anchors captured on each screen); the guest renders plain text
  (0 anchors). Confirmed unchanged.
- **Cash-memo payments filters and columns.** Legacy offers
  `Date From, Date To, Select Section, Select Area, Select Booker, Select Party, Select Payment Type,
  Company, Invoice` and columns `… Original invoices, Area, Section, Party, Booker, Amount`; the guest
  screen has `Type, From, To, Party, DA only, Open entries only` and columns
  `Date, Type, Invoice, Party / Paid to, Description, Amount`. The **Invoice, Original invoices, Area,
  Section and Booker** controls/columns are missing on the guest.
- **Report filter labels.** The guest's autocomplete `<label>` carries the whole option list
  (`Party All G/M SUPER MART …`) where legacy reads `Select Party`; and the guest uses `From`/`To`
  where legacy reads `Date From`/`Date To` on the cash-memo screens.
- **Reset / Clear.** Legacy offers `Reset` on payments/salesreport/dailysale/outstanding/
  paymentsbycompany and `Clear` on the party/booker/area ledgers; the guest is Apply-first and lacks
  the per-panel reset/clear on most of those screens.

## Verdict

- **Reachable-screen parity: essentially complete for the money screens**, with the decided
  divergences (Orders, areawise, itemTransactionsReport) plus the now-built return/difference entry.
- **Fine UI parity: still 28/28 screens differ**, but the actionable residue is now **four** items
  (item drill-down links, cash-memo payments filters/columns, report filter label text, reset/clear) —
  the two items the 10-09 note listed as new gaps were already closed and are corrected above.
- The static harness defect is fixed, so the feature-parity table is now meaningful rather than
  all-`candidate`.

## Reproduce

```pwsh
# static reachable-screen parity (no server needed)
node trailbase/tools/feature-parity.mjs --json "$env:TEMP\feature-parity.json"

# live both-systems capture + discrepancy report (legacy credentials operator-supplied)
node trailbase/tools/ui-capture.mjs --system both --legacy-user user --legacy-password admin `
  --out vault/attachments/ui-parity-run-2026-10-09
node trailbase/tools/ui-parity-report.mjs --capture vault/attachments/ui-parity-run-2026-10-09 `
  --json vault/attachments/ui-parity-run-2026-10-09/parity.json
```

## Related

- [[parity-test-2026-10-09]] — the same day's five-arm run; its §UI parity item list is corrected here.
- [[ui-parity-discrepancies-2026-10-08]] — the previous running discrepancy ledger.
- [[ui-parity-restyle-progress-2026-10-08]] — what shipped before this run.
- [[guest-frontend-feature-parity-gaps]] — the functional gaps ledger.
- [[feature-parity-harness-tail-mismatch]] — the tool defect found and fixed by this run.
- [[route-map]] — the route inventory this run re-checks.
