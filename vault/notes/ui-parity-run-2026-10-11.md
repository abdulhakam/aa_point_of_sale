---
title: "Visual parity run, 2026-10-11 (guest vs known legacy captures)"
type: note
status: current
created: 2026-10-11
updated: 2026-10-11
tags: [ui, parity, guest, legacy, capture, print, verification]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[ui-parity-run-2026-10-10]]", "[[ui-parity-discrepancies-2026-10-08]]", "[[invoice-print-total-column-before-discounts]]", "[[parity-reinstates-the-legacy-look-with-defect-fixes]]", "[[payments-relation-filters-matched-nothing]]", "[[theme-is-one-file-of-tokens]]", "[[build-and-run]]"]
---

# Visual parity run, 2026-10-11 (guest vs known legacy captures)

Re-ran the visual parity test at the operator's request. The guest depot was rebuilt from the legacy
PocketBase database and served fresh; the legacy arm was **not** started, and the comparison used the
stored legacy captures from the 2026-10-10 run (`vault/attachments/ui-parity-run-2026-10-10/legacy`,
28 screens) — the operator's instruction: "You already know what the legacy system looks like."

## Method (reproducible)

1. Servers down; guest depot data backed up (`traildepot/data` → `data.pre-parity-<ts>`) and cleared.
2. `trailbase\import.bat` — re-initialises the depot (default admin `admin@localhost` /
   `administrator-0ne`) and imports the legacy DB `legacyforparity/backend/pb_data/data.db` with the
   direct file-to-file TUI. **Result: 11/11 collections, 0 failures, 7 m 37 s.**
3. `runtime\` and `migrations\` synced into `traildepot\`, server started:
   `trail --depot=traildepot run --address=127.0.0.1:4000 --runtime-root-fs=traildepot\runtime`.
4. `node trailbase/tools/ui-capture.mjs --system guest --out vault/attachments/ui-parity-run-2026-10-11`
   — 28 screens, none gated.
5. Legacy reference copied into `…/ui-parity-run-2026-10-11/legacy`;
   `node trailbase/tools/ui-parity-report.mjs --capture vault/attachments/ui-parity-run-2026-10-11`.

## Result: 28/28 screens differ, no new regression

Every screen still differs, exactly as on 2026-10-10, and the differences are the **same accepted
carve-outs** — the run is a confirmation, not a new set of findings:

- **Rail:** guest has 12 segments (adds `payments`, `inventory`, `print`, `p`, `plugins`, an
  `0 rows in memory` dev button, `logout`); legacy has 7 and carries the withdrawn `orders`.
- **Link colour / table chrome:** guest content links `rgb(73,80,87)` (raw anchors too), legacy
  `rgb(0,0,238)`; guest `<th>` uppercase + bordered, legacy often not.
- **Data window:** guest report pages show 1,000-row windows vs the legacy screen's own page
  (`reports-payments` 1008 vs 10, `reports-itemsales` 1003 vs 5, etc.) — the render cap, not a defect.
- **Dev control:** `idle · not loaded` shown on guest screens only.

Actionable residue was the **same four** as 2026-10-10 — **all four fixed later the same day**
(2026-10-11), verified against the live guest and `guest-smoke` 116/116:

1. **Item drill-down links** (`reports-difference`, `reports-stockreport`) — **fixed.** The `name`
   column is now `"link": "item"`; `partials/table.html` renders it as
   `/reports/itemsales?item=<id>`. Verified: 235 item links on each screen (was 0).
2. **Cash-memo payments filters/columns** (`cashmemo-payments`) — **fixed.** `/payments` now carries the
   legacy columns `Date · Type · Invoice · Original invoices · Area · Section · Party · Booker · Amount ·
   Actions` and the `Select Section/Area/Booker` filters (`app/lib/payments.js` joins party→area→section
   and the invoice's booker, and the return-reference original invoice). Verified live. This also found
   and fixed a real defect: the relation filters (party) compared a BLOB to base64 text and matched
   nothing ([[payments-relation-filters-matched-nothing]]).
3. **Report filter label text** — **mostly an extractor artefact** (the label wraps its `<select>`, so
   the harness reads the option text too). The one real part — the shared select labels — is fixed: the
   presets now read `Select Party/Booker/Area/Section/Item` (the report screens' legacy wording); the
   ledgers keep that prefix, a minor divergence from their bare legacy label.
4. **`reset`/`clear`** — **fixed.** `reports/report.html` renders a clear link when a manifest sets
   `resetLabel`: `RESET` on payments/salesreport/dailysale/outstanding/paymentsbycompany, `CLEAR` on the
   party/booker/area ledgers, and no button on itemsales/profit/the modal-filter reports, matching the
   legacy. Verified live.

Also fixed from this run's follow-ups: **`/payments` no longer stops at 300 rows** — it windows at 300
with a "Show all" link (the legacy lists the whole set); verified `show=all` returns all 20,010 rows.

Candidates not actioned: `management-parties` `party type` filter; cash-memo expenses column set;
`management-bookers` option-dump labels (extractor artefact).

Related: the CSS moved to a single token file, [[theme-is-one-file-of-tokens]].


## Invoice print sheet — fix verified live

The print column-order fix ([[invoice-print-total-column-before-discounts]]) was checked against the
running guest: invoice **#2** (line discounts) renders the line header as
`… PRICES | DISCOUNTS | TOTAL`, i.e. **DISCOUNTS before TOTAL**, matching the legacy chunk. Body rows
emit `total` last.

## Data-count discrepancy worth noting

The legacy DB imported 2026-10-11 holds **12,791 invoices / 34,393 transactions / 32,782 payments**
(same as the 2026-10-10 control-panel import). Several vault documents still cite the older
**8,927 / 23,413 / 26,526** figures from the 2026-09-29 depot; those numbers are stale for the current
legacy database and should be read as historical.

## Related

- [[invoice-print-total-column-before-discounts]] — the print fix this run verified.
- [[ui-parity-run-2026-10-10]] — the previous run; the legacy reference this one reused.
