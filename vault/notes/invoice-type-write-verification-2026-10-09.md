---
title: "Invoice-type write verification, 2026-10-09 — return (2) and difference (3)"
type: note
status: active
created: 2026-10-09
updated: 2026-10-09
tags: [guest, invoices, return, difference, verification, gate, evidence]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[invoice-hub-offers-four-types]]", "[[returns-are-negative-quantities]]", "[[tb-0023-guest-feature-parity]]", "[[api-contract-trailbase]]", "[[no-draft-invoices-published-on-save]]", "[[imported-completed-flag-carries-no-information]]"]
---

# Invoice-type write verification, 2026-10-09 — return (2) and difference (3)

Return and difference entry were rebuilt on 2026-10-08 ([[tb-0023-guest-feature-parity]]) and
reversed the earlier "purchase and sale only" ruling ([[returns-are-negative-quantities]] →
[[invoice-hub-offers-four-types]]), but **no gate exercised them**: `tools/invoice-check.mjs` only
ever created `type = 1` (sale), and `tools/write-paths-check.mjs` does not touch invoice types. This
run closes that hole.

## Method

Run against a **throw-away depot** — the tool mutates what it is pointed at, so never the production
depot. The depot was assembled from a **fresh, consistent TrailBase backup** of the running server's
data:

```pwsh
& trail --depot=traildepot backups trigger        # -> traildepot/backups/<ts>/{main,logs,session}.db
# copy config/metadata/migrations/runtime/secrets/wasm + the backup's main.db into a temp depot,
# then:
& trail --depot=<temp>/depot run --address=127.0.0.1:4003 --runtime-root-fs=<temp>/depot/runtime
$env:GUEST_BASE="http://127.0.0.1:4003"; node tools/invoice-check.mjs
```

`trail backups trigger` is the clean way to snapshot a **live** WAL SQLite depot; a plain file copy
of `main.db` while the server holds it open is not guaranteed consistent. (`VACUUM INTO` from
`node:sqlite` fails here — the depot registers a `jsonschema()` function that Node's SQLite does not
have.)

## Result — all checks pass, including 16 new ones

```
ok   return: context exposes next.return             200 {"purchase":268,"sale":8631,"return":59,"difference":5}
ok   return: number is the type's own next            59 vs 59
ok   return: header patch applies                     200 {"updated":1}
ok   return: line add                                 200 {"line":"…"}
ok   return: read-back type                           2
ok   return: qty stored verbatim (-4)                 -4
ok   return: price stored at 2dp                      500
ok   return: sequence advanced by one                 60 vs 60
ok   return: sale sequence untouched                  8631 vs 8631
ok   difference: context exposes next.difference      200 {…,"difference":5}
ok   difference: number is the type's own next        5 vs 5
ok   difference: line add                             200 {"line":"…"}
ok   difference: read-back type                       3
ok   difference: qty stored verbatim (4)              4
ok   difference: price stored at 2dp                  500
ok   difference: sequence advanced by one             6 vs 6
ok   difference: sale sequence untouched              8631 vs 8631
== invoice entry: all checks passed ==
```

Confirmed facts:

- Each type numbers in **its own** `count+1` sequence; creating a return/difference does not move
  the sale numbers.
- A **negative quantity is stored verbatim** (`qty = -4` round-trips as `-4`). This is the sign the
  report stock rule depends on (`prelude.sql` `stock_deltas`); a silent sign flip would corrupt
  stock and money and would pass a status-only check.
- A **difference invoice is created with no party** and still works — the entry screen hides the
  party field for type 3, and the Difference Report picks it up via `inv_type = 3`
  (`prelude.sql` `difference_deltas`), so there is no party-less blind spot.
- Line prices are stored at 2 dp ([[money-is-2dp-everywhere]]).

## Correction made to the gate

`tools/invoice-check.mjs` had **one red check even before this work**: it asserted
`GET /invoice/<id>` returned `completed = 1` after `POST /complete`. That has been false since the
draft lifecycle was withdrawn ([[no-draft-invoices-published-on-save]]): `completeInvoice` releases
the edit lease and writes no state, because `completed` is a legacy column the app never reads for
behaviour ([[imported-completed-flag-carries-no-information]]). The check now asserts what the
design guarantees — the endpoint answers and the invoice survives — and says why. The tool is green
again.

## Note on a wrong id

A relation written with a bad value (e.g. a party object instead of its id) surfaces as
`db.execute error: … FOREIGN KEY constraint failed` → `Route execution failed: QuickJS library
created a unknown error`, not a `400`. `appendLine` validates the item id and throws a `400`;
`patchHeader` does not, so a bad party id is an opaque error. This is the id/encoding asymmetry
[[api-contract-trailbase]] already warns about, seen from the write side; low severity, not fixed
here.

## What is still not covered

Report *reflection* is asserted structurally, not end to end: the prelude's return/difference stock
rules are covered by `tools/verify-spool-reports.mjs` on the historical ledger (54 returns, 1
difference), and the new type-3 path is included by construction, but no harness creates a
return/difference and then reads the Stock or Difference Report back. Worth adding if these screens
stay on the path to cutover.

## Related

- [[invoice-hub-offers-four-types]] — the decision the four types implement.
- [[returns-are-negative-quantities]] — the superseded ruling, and the mechanisms kept.
- [[tb-0023-guest-feature-parity]] — where the screens were built.
