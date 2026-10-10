---
title: "UI parity run, 2026-10-10 — 1:1 against the live legacy bundle"
type: note
status: active
created: 2026-10-10
system: both
tags: [parity, ui, legacy, guest, browser, evidence]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[ui-parity-run-2026-10-09]]", "[[ui-parity-discrepancies-2026-10-08]]", "[[ui-parity-restyle-progress-2026-10-08]]", "[[guest-frontend-feature-parity-gaps]]", "[[tb-0023-guest-feature-parity]]", "[[legacy-ui-reference-captures]]", "[[route-map]]"]
---

# UI parity run, 2026-10-10 — 1:1 against the live legacy bundle

A fresh 1:1 structural comparison against the pair that was up: guest TrailBase at
`127.0.0.1:4000`, legacy Next.js at `127.0.0.1:3000`, PocketBase at `127.0.0.1:8090`. Legacy login
used the operator-supplied `user` / `admin` account recorded in [[parity-test-2026-10-09]].

## How it was produced

```pwsh
node trailbase/tools/ui-capture.mjs --system both --legacy-user user --legacy-password admin `
  --out vault/attachments/ui-parity-run-2026-10-10
node trailbase/tools/ui-parity-report.mjs `
  --capture vault/attachments/ui-parity-run-2026-10-10 `
  --json    vault/attachments/ui-parity-run-2026-10-10/parity.json
```

**28 screens × 2 = 56 captures** at 1600×900; raw machine diff in `parity.json`, PNGs and
`.structure.json` beside it (local evidence, not committed, matching repo convention).

⚠️ **Operational note — the legacy settle budget blocked a single-shot run.** `ui-capture.mjs`
waits up to **420 s per legacy screen** for network quiet (`settle`, `budgetMs`), and the legacy
general ledger never settles, so `--system both` ran past a 7-minute shell timeout mid-legacy-arm.
The full capture was assembled by re-running the legacy arm in bounded groups (`--only management`,
`--only cashmemo`, `--only invoices`, `--only ledgers-general`) into the same output directory, then
comparing. A future run should either bound `settle` per screen or capture in groups from the start.

⚠️ **The legacy `login` capture is not a login page.** The legacy arm logs in before visiting
screens, so navigating to `/auth` while authenticated redirects to the app — the legacy "login"
capture shows the signed-in tiles, not the auth form. The `login` row in the diff is therefore a
session artefact, not a UI finding.

## Verdict

**28 screens compared, 28 with at least one difference** — the same headline as
[[ui-parity-run-2026-10-09]]. The differences are dominated by **accepted carve-outs** and by two
**extractor artefacts**; the actionable residue is the **same four items** as 2026-10-09, with two
further candidates this run makes visible.

### Accepted carve-outs (not defects)

- **Rail (`nav`, every screen).** Guest `dashboard · reports · invoices · cashmemo · management` +
  a foot menu (`payments · inventory · print · p · plugins`) + a labelled refresh button and Logout;
  legacy `dashboard · reports · orders · invoices · cashmemo · management` + an unlabelled logout
  button. **`orders` is the only legacy-only destination and is a ruled accepted divergence**
  ([[no-draft-invoices-published-on-save]]); the foot-menu extras are accepted
  ([[ui-parity-discrepancies-2026-10-08]] §1, §2b).
- **Anchor colour.** Guest sets a global gray-7 `rgb(73,80,87)`; legacy sets no global anchor rule, so
  raw anchors are the UA blue `rgb(0,0,238)`. Known ([[ui-parity-discrepancies-2026-10-08]] §5).
- **Report tables.** `thCount` is 0 on legacy report screens and the guest renders real uppercase
  `<th>` cells with a black grid; intentional, the defect-fix carve-out
  ([[parity-reinstates-the-legacy-look-with-defect-fixes]]).
- **Heading levels.** Guest uses `h1`; legacy `h2`/`h3` (e.g. `profit report`, `all transactions
  report`, `company sale and payment report`). Same words, different level.
- **Guest-only additions.** `supply summary` tile/screen (reports hub, guest 12 / legacy 11),
  `settings` link (management hub, guest 7 / legacy 6), the `Find in this report` search row on every
  report, `Load 1000 more` / `Show all`, the `idle · not loaded` job-indicator button, and the
  invoice `S <no>` links on `itemsales`/`profit`. All previously ruled additions.
- **Data-window differences.** Guest caps report rows (1,000; 300 on the payment pickers) while legacy
  defaults to a small/cold window (`profit` guest 1001 vs legacy 3; `ledger general` 1003 vs 4;
  `outstanding` 603 vs 607), so `rowCount` differs on almost every report. A filter-default
  difference, not a rendering one ([[report-default-window-comes-from-the-data]]).

### Extractor artefacts (not findings)

- **Option-dump labels.** The guest autocomplete `<label>` carries the whole option list
  (`party all g/m super mart asif siddique g …`, `booker all attique …`) where legacy reads
  `select party` / `select booker`. The *label text* difference is real and already on the list
  (below); the reported length is the harness reading the first 40 characters of a `<label>` that
  wraps its control ([[ui-parity-run-2026-10-09]] §2b).
- **Legacy tile duplication and input counts.** Legacy hub tiles are counted twice
  (`reports · reports · invoices · invoices …`) — the Mantine tile nests a clickable inside the tile
  anchor; and legacy `inputs` reads `1` (`text:text`) on screens that visibly have many filters,
  because Mantine's Select/DatePicker do not present as the plain `input`/`select` the extractor
  counts. Both are measurement noise, not UI differences.

## Actionable residue (the work that remains)

The **same four** as [[ui-parity-run-2026-10-09]] §2c, reconfirmed, plus **two candidates**:

1. **Item drill-down links (`reports-difference`, `reports-stockreport`).** Legacy renders each item
   name as a link into that item's transactions (16 anchors captured on each screen); the guest
   renders plain text (0 anchors). Spec:
   ```
   legacy only: chilli garlic 22gm | tomato ketchup 22gm | quice red 800ml | spaghetti 450gm bp | …
   ```
2. **Cash-memo payments filters and columns (`cashmemo-payments`).** Legacy has the controls/columns
   `invoice · original invoices · area · section · party · booker`; the guest's screen has
   `type · from · to · party · da only · open entries only` and columns
   `date · type · invoice · party / paid to · description · amount`. The **Original invoices, Area,
   Section and Booker** controls/columns are missing on the guest.
3. **Report filter label text.** Guest `from`/`to` where legacy reads `date from`/`date to` (cash-memo
   screens), and the option-dump label vs `select <field>` noted above.
4. **Reset / Clear.** Legacy offers `reset` on payments / salesreport / dailysale / outstanding /
   paymentsbycompany and `clear` on the party / booker / area ledgers; the guest is Apply-first and
   lacks the per-panel reset/clear on most of those screens.
5. *(candidate)* **Party-list `party type` filter (`management-parties`).** Legacy has a
   `party type` filter beside `search`; the guest list has only `search` — reconfirms
   [[ui-parity-discrepancies-2026-10-08]] §4.
6. *(candidate)* **Cash-memo expenses column set (`cashmemo-expenses`).** Legacy columns
   `description · amount · date · row actions`; guest columns `date · name · note · amount ·
   actions` — the `name`/`note` split and column order differ.

## Related

- [[ui-parity-run-2026-10-09]] — the previous run; this confirms its residue.
- [[ui-parity-discrepancies-2026-10-08]] — the running discrepancy ledger.
- [[guest-frontend-feature-parity-gaps]] — the functional gaps ledger.
- [[tb-0023-guest-feature-parity]] — the owning work item.
- [[legacy-ui-reference-captures]] — the legacy UI reference.
