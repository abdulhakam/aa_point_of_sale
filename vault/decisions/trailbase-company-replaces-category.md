---
type: Decision
status: Accepted
created: 2026-09-25
updated: 2026-09-25
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Backend — TrailBase Server]]"
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[Reports & Ledgers]]"
  - "[[Glossary]]"
affects:
  - "[[TrailBase Backend]]"
  - "[[Frontend — TrailBase Server-Rendered App]]"
tags:
  - trailbase
  - schema
  - reports
  - domain
---

# Decision — Company replaces category in the TrailBase model

## Status

Accepted (2026-09-25), stated by the owner. Not yet implemented — see
[[TB-0006 Give items a company and use it in reports]].

## Context

In the PocketBase system `categories` *was* the company dimension. `items.category` was labelled
"Company" in the UI, and it fed every report field named `company`: `transactions_report.company`,
`items_report.category`, `items_difference_report.category`, and therefore the payments-by-company
split. [[Glossary]] even defined Company and Category as the same collection, and [[Data Model]]
describes the same equivalence.

The TrailBase redesign split the two concepts into separate tables: `categories` (a grouping of items)
and `companies` (real companies, linked to parties through `party_companies` and to order bookers
through `order_booker_companies`). The client built in
[[TB-0004 Build the server-rendered TrailBase frontend]] kept sourcing "company" from `items.category`,
because that is what the preserved SQL does, and flagged the ambiguity as an assumption to re-check.

## Decision

`items.category` and `companies` are **two different things**.

- `items.category` is **no longer used**, but is **kept for later use** — the table, the column and the
  record API stay as they are.
- Everything the old system used `category` for — i.e. the item's company, in the UI and in every
  report field named `company` — is now handled by **`company`**.

## Consequences

- `categories` is **vestigial for now**: do not build new behaviour on it, and do not delete it.
- Anything that groups or filters by an item's company must read the company, not the category:
  Stock Report, Difference Report, Item Sales Report, Profit Report, and the Payments By Company split.
- The frontend's item screen must present **Company**, not Category. Today it still shows a category
  select labelled "Company", which is now misleading.
- The glossary's "Company and category are the same collection" holds for the PocketBase model only;
  see the caveat added there.
- **Open mechanical gap:** `items` has no link to `companies`. The decision says the item's company is
  what reports should use, but nothing currently connects an item to one. Until that link exists the
  client continues to read `items.category`. [[TB-0006 Give items a company and use it in reports]]
  covers the gap and the options.

## Alternatives considered

- **Keep using `categories` as the company dimension.** Rejected by the owner: the two are different
  things and `category` is reserved for a later purpose.
- **Relabel `items.category` as "Company" and change nothing else.** Rejected: `category` is the
  vestigial column, so the label would keep pointing at the wrong field.
- **Derive a line's company from the invoice's party or booker** (`party_companies` /
  `order_booker_companies`) instead of giving items one. Possible without a schema change, but a party
  or booker can hold several companies, so it cannot drive a single "Company" column unambiguously.

## Evidence

The owner's clarification, 2026-09-25, verbatim:

> in this new trailbase based system the `items.category` and the `companies` are two different things
> the category is no longer used but is kept for later use whereas everything on the backend the
> `category` was being used for will be handled by the `company`

Supporting context from this knowledgebase:

- The old mapping is documented in [[Reports & Ledgers]] (`company` = the item's `category`) and
  [[Data Model]] (`categories` doubles as "company" everywhere in reports).
- The new schema keeps them separate — see [[Backend — TrailBase Server]] and `trailbase/README.md`.

## Revisit when

- `categories`' later purpose is defined, or
- [[TB-0006 Give items a company and use it in reports]] lands and the reports read the item's company.
