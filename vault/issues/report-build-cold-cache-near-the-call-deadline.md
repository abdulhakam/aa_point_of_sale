---
title: "The cold report build is ~12 s, against a ~20 s guest call deadline"
type: issue
status: open
created: 2026-09-29
tags: [performance, reports, deadline, trailbase, guest]
belongs_to: "[[trailbase]]"
related_to: ["[[rendered-page-cache]]", "[[runtime-js-guest-platform]]", "[[tb-0022-move-reports-to-sql]]", "[[invoice-document-write-through-and-rebuild]]", "[[invoice-doc-sync]]", "[[tb-0021-invoices-cashmemos-printing]]"]
---

# The cold report build is ~12 s, against a ~20 s guest call deadline

## The measurement

`/invoice/context` fails with a 500 "component responded unexpectedly" after **20.7 s**, which is
the guest's WASM call deadline being hit, not an exception. The same endpoint on a warm report
cache answers in **0.3 s**.

Cold, on the loaded production depot:

| | |
|---|---|
| `/invoice/context?type=sale`, cold report cache | 12.1 s → 200 |
| `/dashboard` (warms `counts` only) | 2.1 s warm / ~19 s cold |
| `/invoice/context` after a `/dashboard` warm-up | **crossed the deadline, 500** |

That last row is the shape of the problem: the build does not fit in the budget once a *partial*
warm-up is counted, because the expensive part is `itemsReport` (23,421 rows) and that is the part
`/dashboard` does not need.

## It is NOT the materialised-document triggers

Checked directly, because it would have been the obvious suspect. Dropping all 14 `inv_doc*`
triggers from the live database and clearing `pagecache`, then restarting:

| | cold `/invoice/context` |
|---|---|
| 14 triggers present | 12.1 s |
| triggers dropped | 13.1 s |

The triggers add nothing measurable to a read-only report build, and they cannot: triggers fire on
writes, and the report build writes to `pagecache` and `mview`, not to `invoices`,
`transactions` or `payments`.

## Pre-existing, not a regression

Reproduced with `git checkout`'d `route.ts` and `queue.js` — the committed files, with the
`inv_doc` triggers still installed. The 500 predates [[tb-0027-materialised-invoice-documents]].

## Why it matters beyond the 500

`/invoice/context` is the invoice-entry screen's data source, and it needs `itemsReport` only to
list items. That is the read the materialised documents are meant to replace: a whole invoice
document is **0.03 ms**, and it carries item id, item name, price and cost price. Wiring the
invoice screen to `GET /invoice-doc/document` is what retires this, and it is the single highest
value next step in [[tb-0022-move-reports-to-sql]].

Until then the honest workaround is a warm report cache: hit `/dashboard` **and** `/reports` after
a restart, not just one of them.

## Related

- [[invoice-document-write-through-and-rebuild]] — the 0.03 ms side of this trade.
- [[rendered-page-cache]] — where the ~40 s cold figure in the vault came from.
