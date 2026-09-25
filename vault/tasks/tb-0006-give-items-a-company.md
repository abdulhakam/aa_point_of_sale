---
type: Task
status: Backlog
ticket: TB-0006
priority: P2
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Backend — TrailBase Server]]"
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[Reports & Ledgers]]"
implements:
  - "[[Decision — Company replaces category in the TrailBase model]]"
created: 2026-09-25
updated: 2026-09-25
tags:
  - trailbase
  - schema
  - reports
  - frontend
---

# TB-0006 Give items a company and use it in reports

## Goal

An item's company comes from `company`, so the UI and every report field named "company" show the
company rather than the vestigial category.

## Done when

- `items` carries a company (a foreign key to `companies`), added by a **new** migration file — never by
  editing the applied one, which a populated depot skips.
- The record API exposes it and the frontend's item screen presents **Company** instead of Category.
- Stock Report, Difference Report, Item Sales Report, Profit Report and the Payments By Company split
  all read the item's company.
- `categories` and `items.category` are left in place and unused.
- Report output for a seeded depot is verified against hand-computed expectations, as in TB-0004.

## Context

[[Decision — Company replaces category in the TrailBase model]] says the old `category` role is taken
over by `company`, and that `categories` stays for later use. The client currently reads
`items.category` for the item's company because that is what the preserved PocketBase SQL does; the
decision makes that wrong.

The gap is mechanical: **nothing links an item to a company.** `companies` is reachable from `parties`
(`party_companies`) and `order_bookers` (`order_booker_companies`), but `items` only has `category`.
So the decision cannot be implemented without choosing how an item gets its company.

**Held pending that choice** — the options are laid out below; the recommendation is (a).

## Options

| | Approach | Trade-off |
|---|---|---|
| a | Add `items.company` (FK → `companies`), mirroring the old `items.category` | One-column migration; item screen gets a Company select; reports read it directly. Recommended — it is the faithful replacement for `category`. |
| b | Derive the line's company from the invoice's party or booker | No schema change, but a party/booker can hold several companies, so a single "Company" column is ambiguous. |
| c | Drop the company dimension from the item-level reports | Smallest change, but loses a report axis the old system had. |

## Work log

Not started. Recorded so the decision has an executable follow-on rather than an open question.

## Verification

To be written when the task starts. It must at minimum reproduce TB-0004's numeric checks with the
company sourced from the new link, and confirm a new migration applies to a depot that already has
`data/` (a *new* migration file applies; a *changed* one is skipped — see
[[Issue — A stale TrailBase depot silently keeps an old schema]]).

## Related

- [[Decision — Company replaces category in the TrailBase model]]
- [[Reports & Ledgers]] — the old formulas being reproduced.
- [[Frontend — TrailBase Server-Rendered App]] — the client that must change.
