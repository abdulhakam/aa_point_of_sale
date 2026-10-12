---
title: The report page definitions are duplicated in JS and JSON, and the two copies already disagree
type: issue
status: resolved
severity: high
created: 2026-10-01
updated: 2026-10-01
resolved: 2026-10-01
tags: [reports, filters, manifest, duplication, money]
related_to: ["[[report-routes-ignore-date-defaults]]", "[[payment-type-select-never-comes-back-selected]]", "[[spooling-report-rows-through-kv]]", "[[runtime-js-minimal-file-authoring-contract]]", "[[money-is-2dp-everywhere]]"]
---

# The report page definitions are duplicated in JS and JSON, and the two copies already disagree

## The defect

Every one of the 14 reports is defined **twice**:

- `app/lib/report-pages.js` → `REPORT_PAGES`, which `/reports/<key>` serves
- `app/pages/<group>/<name>/meta.json`, which `/p/<slug>` serves

Two entries already render **different things for the same report** on the same depot and the same
date range. Measured 2026-10-01 on `127.0.0.1:4000`, `from=2020-01-01&to=2030-12-31`.

### 1. `payments` — the wrong total key, 3,901,620.23 apart

| | key shown | value |
|---|---|---|
| `/reports/payments` (`REPORT_PAGES`) | `t.total` | **10,852,251.43** |
| `/p/reports/payments` (`meta.json`) | `totalSending` | **6,950,631.20** |

**CORRECTION, 2026-10-01: this note first recorded `meta.json` as the wrong copy. That is
backwards.** The user set the rule that money is computed in SQL and judged on what is *right*, not
on matching the JS. Judged that way, `meta.json` is right and `REPORT_PAGES` is wrong — and the
arithmetic settles it without reference to any legacy implementation:

The payments totals are two parallel groups, and each group's last row is the net of the three rows
above it. The sales group proves the rule:

```text
Recivable Amount = Sales Amount - Recieved Amount - Returns
                 = recieving     - recieved       - recievingReturns
                 = totalRecieving          (spoolreports.js:180)
```

The purchase group must follow the same rule:

```text
Payable Amount  = Purchase Amount - Paid Amount - Returns
                = sending         - sent        - sendingReturns
                = totalSending            (spoolreports.js:181)
```

And on the live figures:

```text
Purchase Amount   29,607,927.86
Paid Amount       22,657,296.66
Returns                    0.00
A - B - C         6,950,631.20   <- totalSending, what meta.json shows
```

`REPORT_PAGES` shows `t.total`, which is `invoiceTotal - totalPaid` — a **different quantity** that
has nothing to do with the three rows printed directly above it. A user adding up the purchase
group gets 6,950,631.20 and sees 10,852,251.43 underneath. So `/reports`, the route the report
tiles actually link to, shows a total that does not belong to its own group. **That is the money
bug; `meta.json` is the correct side.**

### 2. `itemsales` / `stock` — the company filter is dead on `/p`

`REPORT_PAGES` declares `"companies"`. `meta.json` declares `"categories"`. Asking the live
`/p` endpoint which tables it returns settles it:

```text
tables in the /p payload: areas, categories, items, order_bookers, parties, sections
companies rows:  ABSENT
categories rows: 0
```

`categories` is an empty table, so the `/p` company filter offers **zero options** — a dead control.
`/reports/itemsales` offers 16. So again `meta.json` is wrong and `REPORT_PAGES` is right.

## The pattern

Both divergences point the same way: **`meta.json` is the copy that drifted.** It was hand-written
later, and the two mistakes in it are both in the *values* (which total key, which source table),
never in the structure. The two copies are not peers — `REPORT_PAGES` is the correct one and the
manifest needs fixing from it.

This does not weaken the case for a single definition. It strengthens it: the manifest is the
*intended* destination, it just needs its values repaired before it can become authoritative.

## Why it is high severity

This is the failure mode that produced
[[six-report-defects-the-empty-filter-parity-gate-could-not-see]] and
[[report-routes-ignore-date-defaults]] — and it is worse than both. A single definition that is
wrong shows up in one place. Two definitions that drift show up as a **report that disagrees with
itself depending on the URL**, which no parity gate compares, because the gate checks SQL against
the JS reference and never looks at the manifest.

## Root cause

There is no single page-definition format. `REPORT_PAGES` can express things JSON cannot — 14
`totals: (t) => [...]` **functions**, including grouped totals (`paymentsTotalsGroups`) and a
composed string (`` `${t.invoice} / ${t.paid} / ${t.balance}` ``). So the format was duplicated
rather than unified.

## The fix this points at

Make the manifest authoritative and delete `REPORT_PAGES`, **after repairing the manifest's two
drifted values from `REPORT_PAGES`** (payments `totalSending`, and `source: companies` on
`itemsales`/`stock`). That requires the manifest format to express what the JS could:

- `totals.groups[]` — grouped totals tables (payments, salesreport, ledgers)
- `view` — the general ledger's template override
- `openings` — the general ledger's three opening-balance inputs
- `requires[]` — already in `meta.json`, used by the two party/booker ledgers
- one spelling of the select `source` tables

The `outstanding` ledger's three-figure total (`` `${t.invoice} / ${t.paid} / ${t.balance}` ``) is
the one value that is a *function* rather than a key, so it needs an explicit form — a
`{"value": ["invoice", "/", "paid", "/", "balance"]}` join, so the manifest stays inert data.

Then `/reports/*` and `/p/*` read the same file, the drift cannot recur, and
[[report-routes-ignore-date-defaults]] closes as a side effect because `filtersFor` already
honours manifest defaults while `parseFilters` does not.

## A note on how this was found

Not by a gate. By reading the two definitions side by side while planning a merge, and then asking
the live pages for the two numbers. No existing check would have caught it.

## Status

**Resolved 2026-10-01** by [[one-manifest-is-the-page-definition]]. `REPORT_PAGES` is deleted; the
manifest is the only definition and both hosts read it. Both measured divergences are corrected and
verified on the running app:

```text
/reports/payments   Payable Amount = 6,950,631.20  == Purchase 29,607,927.86 - Paid 22,657,296.66 - Returns 0.00
/reports/itemsales  company select: 16 options       (was 0 on /p, sourced from the empty `categories` table)
```

`tools/verify-pages.ps1` asserts both, so a regression here fails a check rather than shipping.

**Direction note, 2026-10-01:** the user set the standing rule that money is computed in SQL and
judged on what is right, not on matching a JS reference. Under that rule `REPORT_PAGES` was the
*correct* copy and `meta.json` the one to repair — the opposite of what this note first concluded, and
the correction is recorded above rather than hidden. The duplication was still the defect; only the
direction of the drift was wrong.

## Evidence

- `trailbase/runtime/ahscripts/lib/report-pages.js:115-118` — `paymentsTotalsGroups` reads `t.total`.
- `trailbase/runtime/ahscripts/lib/spoolreports.js:180-182` — the three derived keys, and the group rule.
- `trailbase/runtime/ahscripts/pages/reports/payments/meta.json` — the last total is keyed
  `"totalSending"`.
- The live fetches above, 2026-10-01: `/reports` 10,852,251.43 vs `/p` 6,950,631.20, and
  `categories` returning 0 rows where `companies` returns 16.
- `trailbase/tools/paisa-probe.mjs` — the companion money probe written during the same session.
