---
title: "1:1 parity test against the legacy bundle, 2026-10-09"
type: note
status: active
created: 2026-10-09
updated: 2026-10-09
system: new
tags: [parity, reports, print, ui, responsive, migration, guest, legacy, trailbase]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[reports-parity-and-e2e-2026-09-29]]", "[[ui-parity-discrepancies-2026-10-08]]", "[[invoice-document-parity-2026-09-29]]", "[[guest-frontend-feature-parity-gaps]]"]
---

# 1:1 parity test against the legacy bundle (2026-10-09)

Fresh differential run requested by the owner. All five arms — data, reports (April 2026 window),
fine UI parity, print parity (multipage), and responsiveness — executed against the live pair:
guest at `127.0.0.1:4000`, legacy Next.js at `127.0.0.1:3000`, PocketBase at `127.0.0.1:8090`.

## Access fix (needed to run the legacy arm at all)

The legacy PocketBase admin is `admin@admin.com` with an unknown password. An additive admin
`parity@local.test` was created on the legacy depot via `pocketbase.exe admin create` (one `_admins`
row; touches no business data; delete after cutover). The stored dev credential
`administrator@erp.local` authenticates only a dev copy, not this production depot.

**Harness defect found and fixed:** `tools/report-parity.mjs` seeded the legacy browser with a bare
token string, but the legacy app reads the PocketBase js-sdk auth store — a JSON envelope
`{token, model}`. The bare token left every legacy capture on the "Please log in to continue" wall;
the 2026-10-06 capture directory is empty because of exactly this. Fixed in the harness (it now
accepts and normalises the envelope).

## Data parity — exact, with three legitimate guest-side additions

Compared straight in SQL between copies of `traildepot/data/main.db` and
`legacyforparity/backend/pb_data/data.db`:

| table | guest rows | legacy rows | money sums |
|---|---|---|---|
| payments | 26,526 | 26,526 | sorted-amount multisets **identical**; raw-sum "differences" ≤ 1 paisa are float-summation artefacts, not data |
| expenses | 88 | 88 | match |
| items | 207 | 207 | cost/sale price sums match |
| order_bookers / sections / areas | 4 / 10 / 59 | same | match |
| invoices | 8,930 | 8,927 | guest has 3 extra |
| transactions | 23,414 | 23,413 | guest has 1 extra |
| parties | 943 | 942 | guest has 1 extra |

The extras are **post-cutover entries made on the new system**, not migration drift: invoices
8607–8609 (dated 2026-10-08) with their transaction, and one party named "Difference" created
2026-09-29. If "Difference" was a test artefact it should be reviewed and deleted by the operator.

## Reports parity, April 2026 window — captured, but not comparable as-is

`tools/report-parity.mjs --from 2026-04-01 --to 2026-04-30` completed (14 guest + 14 legacy + print
captures in `vault/attachments/report-parity-2026-10-09-april`). Guest rows are the April window; the
legacy arm is NOT — **`report-parity.mjs` hardcodes the legacy lower bound to `January 1, 2001`**
(`LEGACY_LEGACYFROM`) and ignores `--from`, so the legacy captures are the full ledger (e.g. payments
26,536 legacy vs 341 guest, itemsales 21,820 vs 598). The row counts therefore differ by the filter,
not the arithmetic, and this run does not evidence report calculation parity.

Guest side measured: all 14 screens render in ~3 s warm; ledgers/party and ledgers/booker correctly
show 0 rows without a party/booker filter. A valid April-window comparison needs the harness to type
the real `--from` (and an upper bound) into the legacy Mantine `DateInput`; that is a harness change,
not a report defect. The earlier `2001` lower bound was chosen so the legacy arm saw all data.

## Print parity — fixed 2026-10-09 (owner supplied a guest/legacy pair of the same invoice)

The owner placed a printed copy of the same invoice from each system in
`legacyforparity/zprintsforparity/` (`guestpurchaseinvoice.pdf`, `legacypurchaseinvoice.pdf` — purchase
invoice 229). The guest paper did not match the legacy paper. Fixed in the guest sheet
(`runtime/app/views/partials/invoice-sheet.html.jinja`, `runtime/app/lib/invoice-sheet.js`,
`runtime/app/lib/dates.js`, `runtime/app/public/css/app.css`):

1. **Invoice Time was read from the wrong field in the wrong zone.** Legacy prints the invoice's
   `created` in the shop's local time (PKT, UTC+5): `3:48:33 PM`. The guest printed `dated`'s UTC time
   raw (`10:48:25 AM`). Fixed: `dates.js` now shifts `created` by +05:00 (`shopParts`/`shopNow`) and the
   sheet sources `created`. Verified across all 8,927 shared invoices that the guest's `created` is
   byte-identical to v1's, so `created` is the correct source (this also **corrects** the earlier
   "import overwrites created" claim — that is false on this depot).
2. **`+` prefix removed.** The title is `<TYPE> INVOICE`, not `+ <TYPE> INVOICE`.
3. **Header/footer bands added.** The centred business block with `PRINT TIME:` and the
   `Checked By / Delivered By` band are now rendered (print-only), matching legacy.
4. **Layout restructured** to the legacy order — centred header band, then the title, the
   Party/Address/Booker/Remarks block beside the boxed Invoice #/Date/Time block, an `<hr>`, the line
   grid, then the totals in a bordered box (legacy labels `TOTAL AMOUNT` / `DISCOUNT 1` / `DISCOUNT 2`
   / `DISCOUNT cash` / `PAYABLE AMOUNT`). The earlier claim that legacy omits the address/phone was a
   misread — legacy prints them and so does the guest now.

Post-review fixes (same day): the new sheet CSS is scoped to `[data-invoice-doc]` (only the invoice
macro carries it) rather than `.invoice-doc`, because the cash-memo voucher is also
`article.invoice-doc[data-voucher]` and was being restyled; and the Due-Date fallback uses `doc.dated
|| doc.created` rather than `??`, since 21 documents carry an empty-string `dated` that `??` does not
fall back over (3 invoices lost a due date legacy prints).

Reproduced with `node "$env:TEMP\kilo\cmpprint.mjs"` (guest `/invoices/<id>/view?print=1&paper=a5`
vs legacy `/app/invoices/print?invoiceId=…`) and rendered with pymupdf. Purchase invoice 229 now
matches the legacy paper; sale invoice 8603 paginates to the same 2 A5 pages with identical money.

**Remaining multipage difference (known):** legacy repeats the business header band and the
Check-Band at the top/bottom of EVERY page. The guest repeats the line-table column header on every
page (browser `thead` repetition) but prints the header/footer bands once. The legacy uses
`position: fixed` bands; in this deployment's print engine a fixed band lands over the page-2 content
(the engine treats `fixed` as content-relative here), so a fixed band was rejected in favour of a
non-overlapping in-flow band. Getting exact band repetition needs the `thead`/`tfoot` technique with
the title/parties moved into the table, which changes the on-screen document; deferred pending a
decision rather than shipped overlapping.

Artifacts: `vault/attachments/print-parity-2026-10-09/print-8603-{guest,legacy}.png` and
`…/{guest,legacy}-8603-a5.pdf`, reproduced with `trailbase/tools/print-parity-pdf.mjs`.

## UI parity — 28 screens, fresh capture

Fresh both-systems capture (`vault/attachments/ui-capture-2026-10-09`, local evidence, not committed),
compared with `tools/ui-parity-report.mjs`. The `orders` nav segment appears as legacy-only on every
screen — that is the accepted divergence (rail parity, 2026-10-08), not a new gap.

Legacy-only functionality worth adding (cheap, not ugly):

- **Reset / Clear buttons** — legacy has Reset on payments, salesreport, dailysale, outstanding,
  paymentsbycompany filters, and Clear on ledgers/party, ledgers/booker, ledgers/area. The guest
  only has Apply. A single reset affordance per filter panel is a small, invisible addition.
- **Company filter** — legacy has a company select on difference, stockreport, itemsales, profit
  and paymentsbycompany. ~~The guest has none of these.~~ **CORRECTED 2026-10-09 by
  [[ui-parity-run-2026-10-09]]: this is wrong.** The guest has a `Company` filter on all five of those
  screens; the fresh both-systems capture (same day, same code) shows the guest label
  `Company All SOFI TRADERS …` on difference, stockreport, itemsales, profit and paymentsbycompany.
  The claim was carried from the 2026-10-08 ledger without re-checking the fresh capture.
- **Cash Memo payments filters** — legacy offers type / invoice / original invoices / area /
  section / party / booker filter buttons there; the guest screen has few.
- **Item drill-down links** — on difference and stockreport, legacy item names are links into the
  item's transactions. The guest renders them plain. A link styled like plain text (underline on
  hover) would not make the screen uglier.

Noise / not gaps: `delight/golden/gorey` "labels" on management-bookers are booker names, legacy
login-screen tiles are the auth page, `inputs: text:text` is the Mantine search box.

## Responsiveness — verified at 390×844 and 768×1024

Checked in emulated mobile Chrome: login, dashboard, invoices hub, invoice entry (`/invoices/new?type=sale`),
and the payments report (341 rows). Verdict: **the guest is responsive**.

- No page-level horizontal scroll anywhere tested (`scrollWidth == 390`).
- Dashboard/invoice tiles reflow to a 2-column grid; bottom nav replaces the side rail.
- Wide report tables scroll **inside their own `.report` wrapper** (`overflow-x: auto`, wrapper
  366 px, table 604 px) — the page itself never overflows.
- Minor: the login card sits below a large empty gap instead of being vertically centred;
  the report filter date inputs are half-width while the selects are full-width (cosmetic).

## Related

- [[reports-parity-and-e2e-2026-09-29]] — the previous full-range parity + benchmark note.
- [[ui-parity-run-2026-10-09]] — the focused UI + feature parity run that re-checks and corrects
  this note's UI item list.
- [[ui-parity-discrepancies-2026-10-08]] — the running UI discrepancy ledger this extends.
- [[guest-frontend-feature-parity-gaps]] — functional gaps ledger.
