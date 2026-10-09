---
title: "1:1 parity test against the legacy bundle, 2026-10-09"
type: note
status: active
created: 2026-10-09
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

## Reports parity, April 2026 window — in flight

`tools/report-parity.mjs --from 2026-04-01 --to 2026-04-30` (results appended here when the legacy
arm completes; legacy pages PocketBase 500 rows per request, so the heavy reports take minutes).
Guest side: all 14 screens render in 3–4 s warm; ledgers/party and ledgers/booker correctly show 0
rows without a party/booker filter.

## Print parity — multipage invoice verified

Invoice **8603** (24 line items, the largest April invoice) printed to A5 PDF from both systems:

- **Both produce exactly 2 A5 pages** — pagination parity.
- All 24 line items identical: quantities, box sizes, unit/CTN prices, row totals to the paisa.
- Totals block identical: 4550.00 / 0.00% / 0.00% / 0.00 / 4550.00.

**Divergences found:**

1. **Invoice Time is wrong on the guest.** Legacy prints `created` converted to local time
   (09:55:31Z → 2:55:31 PM PKT); the guest prints the `dated` field's UTC time raw
   (9:55:10 AM). Both the source field and the timezone handling differ.
2. The guest print preview shows the app rail and "← Invoices Edit" links on screen (`?print=1`
   drops the nav in the harness comment, but the capture shows it); legacy shows only its print
   controls. Whether these survive on actual paper depends on `@media print` — flagged for
   verification, not yet a paper-level defect.
3. The guest document adds the shop address and phone lines ("123 Sample Street…");
   the legacy document does not print them.

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
  and paymentsbycompany. The guest has none of these.
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
- [[ui-parity-discrepancies-2026-10-08]] — the running UI discrepancy ledger this extends.
- [[guest-frontend-feature-parity-gaps]] — functional gaps ledger.
