---
title: The party and booker ledgers render an empty table and say nothing
type: issue
status: open
created: 2026-10-04
updated: 2026-10-04
tags: [guest, ledger, usability, defaults, report-default-window, empty-state]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-cost-on-a-whole-database]]", "[[report-default-window-comes-from-the-data]]", "[[guest-frontend-feature-parity-gaps]]", "[[tb-0023-direct-shift-legacy-ui-to-guest]]", "[[report-render-row-cap]]"]
---

# The party and booker ledgers render an empty table and say nothing

Opening `/reports/ledgers/party` or `/reports/ledgers/booker` shows an empty table. There is no
"select a party" message, no empty-state text, and — for the party ledger — 70 KB of HTML around
nothing. The data is there: the page's own data endpoint answers **26,525 rows** for the same request.

## What happens

`from=2024-01-01&to=2026-10-04`, whole database, 2026-10-04:

| request | rows rendered | bytes | ms |
|---|---|---|---|
| `/reports/ledgers/party` | **0** | 70,454 | 250 |
| `/reports/ledgers/party?from=2024-01-01&to=2026-10-04` | **0** | 70,454 | 188 |
| `/reports/ledgers/booker?from=2024-01-01&to=2026-10-04` | **0** | 7,684 | 152 |
| `/reports/ledgers/party?party=<busiest>&from=2024-01-01&to=2026-10-04` | **1,002** | 378,841 | 5,805 |
| `/reports/ledgers/booker?booker=<busiest>&from=2024-01-01&to=2026-10-04` | **1,004** | 265,237 | 1,478 |
| `/p/ledgers/party/data?from=2024-01-01&to=2026-10-04` | **26,525 rows** | 8,762,978 | 7,200 |

1,002 and 1,004 are the 1,000-row render cap plus header rows ([[report-render-row-cap]]), so with a
counterparty selected both ledgers are working normally. **The behaviour is: the party and booker
ledgers are per-counterparty, and with no counterparty chosen they render nothing at all.**

The Area and General ledgers have no such requirement — `/reports/ledgers/area` renders 223 rows and
`/reports/ledgers/general` 116 with no filters. So within one section of the app, two ledgers need a
selection and two do not, and nothing on the page says which is which.

## The default date window disagrees between the ledgers

The same run, reading the `from`/`to` inputs each page renders:

| page | default window |
|---|---|
| `/reports/ledgers/party` | **2026-04-01 → 2026-04-11** |
| `/reports/ledgers/booker` | **2026-04-01 → 2026-04-11** |
| `/reports/ledgers/area` | 2026-04-01 → 2026-04-11 |
| `/reports/ledgers/general` | **2026-10-01 → 2026-10-04** |

⚠️ **The party and booker windows end 2026-04-11, which is the last day in the legacy data** — the
snapshot the whole workspace was frozen at. The general ledger's window ends **today**. So three
ledgers default to the end of the dataset and one defaults to the current date. On a database that
keeps receiving invoices that divergence grows: the party ledger will silently show nothing newer,
which is precisely the "a filter upstream silently removed every row" failure
[[ledger-party-correlated-balance-was-the-whole-cost]]'s sibling has already been caught by once.

The rule that was supposed to settle this is [[report-default-window-comes-from-the-data]] — the window
comes from the data, which on this dataset ends 2026-04-11. **The general ledger is the one that
disagrees**, not the other three.

## What is not established

- **Whether the legacy app behaved the same way.** The compiled bundle for `reports/ledgers/party`
  fetches `ledger_party` whole and filters in JavaScript, so it probably showed every party at once
  rather than requiring a selection — but "probably", from a bundle read, is not a measurement. The
  check is one browser page: open `/app/reports/ledgers/party` on the frozen bundle and count the rows
  before selecting anything.
- **Whether an empty table is the intended empty state.** It may be deliberate, with the selection
  control living somewhere the fingerprint does not reach (`route-snapshot.mjs` counts `<tr>` and
  `<input>`, and the party ledger does report `fields=3`).

## Why it is filed

Because it is the failure mode that reads as "the report has no data". The vault already has this
recorded once — [[guest-frontend-feature-parity-gaps]] — for the dashboard tiles being 0 for a day
because a filter upstream removed every row. An empty ledger and an empty dashboard are the same
symptom, and a user cannot tell them apart.

## Related

- [[report-cost-on-a-whole-database]] — the sweep that surfaced it, and the caveat it adds to those
  numbers.
- [[report-default-window-comes-from-the-data]] — the rule the general ledger is breaking.