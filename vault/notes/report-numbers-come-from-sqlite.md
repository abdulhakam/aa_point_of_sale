---
title: The guest computes every report number, filter and sort in SQLite
type: note
status: active
created: 2026-10-04
updated: 2026-10-04
tags: [guest, reports, sql, provenance, verification, sqlite, float]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[reports-and-ledgers]]", "[[report-cost-on-a-whole-database]]", "[[fresh-import-and-whole-database-digest-2026-10-04]]", "[[guest-report-500-not-always-the-deadline]]", "[[tb-0024-flatten-new-system-layout]]", "[[ledger-party-correlated-balance-was-the-whole-cost]]", "[[money-is-2dp-everywhere]]", "[[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]]", "[[route-snapshot-was-snapshotting-redirects]]"]
---

# The guest computes every report number, filter and sort in SQLite

Asked: *confirm the guest is doing all calculations, filters and sorting on SQLite, because the numbers
appear to be of JS.* The suspicion is reasonable — the report path does run JavaScript, and it has run
JavaScript that computed money. So this is settled by measurement, not by reading the SQL.

**Answer: yes — every number, filter and sort in a published report comes out of SQLite. The only
differences are in the last bits of three float columns, and there is no JavaScript arithmetic, sorting
or filtering anywhere in a report's results.** One caveat stated up front, because it is real and
because "no JavaScript arithmetic" would otherwise be a false claim about the app: the **invoice-entry
grid** does recalculate in the browser, in integer paisa, for the live preview before saving. It is not
a report, and the table below cannot see it.

## The check

New harness: `trailbase/tools/report-sql-provenance.mjs`. For each of the 14 spooled pages it fetches
`/p/<slug>/data` from the guest, runs **the same composed statement** directly against
`trailbase/traildepot/data/main.db` in `node:sqlite`, and compares the two **row for row, in order,
every column value**.

That is deliberately much stronger than a totals check. A totals comparison passes even when the sort
happened in JS and a column was rounded in JS, as long as the sum lands the same. Full-row equality in
position cannot: if JavaScript had sorted, filtered or summed anything, at least one row would sit in a
different position with a different value.

```text
slug                        rows  cols   diff  verdict
ledgers/area                 909    10      6  identical (15-digit transport)
ledgers/booker             26525    11      0  byte-identical
ledgers/general            26613    15      0  byte-identical
ledgers/party              26525    14      0  byte-identical
reports/dailysale           8606    10      0  byte-identical
reports/difference            207    12      0  byte-identical
reports/itemsales          21815    23      0  byte-identical
reports/outstanding           602    15     10  identical (15-digit transport)
reports/payments           26525    15      0  byte-identical
reports/paymentsbycompany  32978    15      0  byte-identical
reports/productsale           205     8     13  REAL DIFFERENCE
reports/profit             21815    23      0  byte-identical
reports/salesreport          8648    15      0  byte-identical
reports/stock                 207    12      1  identical (15-digit transport)

10 page(s) byte-identical, 3 identical but for 15-significant-digit transport, 1 with a real difference
largest difference anywhere: 2.328e-10 absolute, 1.840e-16 relative  (one paisa is 1e-2)
```

**Zero cells differ in row count, row order, column set, or any text value.** Ten of fourteen pages are
byte-identical to SQLite. The other four differ in 30 cells out of about 620,000 compared.

## The three residual differences, and why none of them is JavaScript

### 1. Fifteen significant digits (29 cells)

`ledgers/area.credit_raw`, `debit_raw`; `outstanding.paid_total`, `paid_raw`, `invoice_total`,
`invoice_raw`; `stock.qty`. For example:

```text
sqlite: 47014.979999999996     guest: 47014.98
```

**15 significant digits is SQLite's own REAL→TEXT format** (`%!.15g`), and
`Number((47014.979999999996).toPrecision(15)) === 47014.98`, exactly. So the guest is carrying the
value SQLite itself would print. The loss is in the host's value transport — the vendored
`trailbase_wasm::db::query` → `spool.rs::row_to_json` → `serde_json` path — not in guest code.
`api.rs::value_to_json` uses `serde_json::Number::from_f64`, which is exact, so the rounding is upstream
of this repository's own conversion code and lives in the dependency.

Largest: **7.28e-12 absolute**.

### 2. One float sum (1 cell)

`reports/productsale.amount`, row 10: `sqlite=262047.58709998502` against
`guest=262047.58709998504`, a difference of **2.91e-11**.

`productsale.sql:26` computes it as `SUM(total)`. Floating-point addition is **not associative**, and
the guest runs SQLite inside TrailBase while this harness runs Node's bundled SQLite — two different
builds, free to sum the same rows in a different order. That is the whole explanation, and it is worth
stating that this is *not* a JS sum: eleven other `productsale.amount` cells in the same column differ
only by the 15-digit transport above, and the same column is byte-identical on the other six pages.

### 3. The `id` codec (every row, normalised before comparison)

`id` is a 16-byte BLOB in SQLite and a padded base64url string on the wire, because `routeKit`
hex↔base64s every id crossing the boundary (`tools/id-codec-check.mjs`). The harness normalises the
codec and the `=` padding — and **only** that. An identity translation, not a calculation.

## Why none of this can reach a printed figure

Every money column a report *prints* is a `printf('%.2f', round2(x))` **string produced by SQLite**, and
**every such column matched exactly on every row of every page** — including the pages with float
differences. The 30 differing cells are all `_raw` / `_total` / `qty` intermediates:

| column | largest difference | one paisa is |
|---|---|---|
| `credit_raw`, `debit_raw`, `paid_raw`, `invoice_raw` | 7.28e-12 | 1e-2 |
| `paid_total`, `invoice_total` | 7.28e-12 | 1e-2 |
| `amount` (`SUM`) | 2.91e-11 | 1e-2 |
| `qty` | 3.55e-15 | 1e-2 |

Worst case anywhere: **2.33e-10 absolute, 1.84e-16 relative — eight orders of magnitude below one
paisa**, and the money rule rounds at 2 dp long before display.

## The negative half: there is no JS left that could do it

A row-for-row match proves the published values came from SQLite. It does not prove no JS *exists*, so
that was checked separately:

- **There is no JavaScript report engine.** `app/compute/reports.js` and `app/compute/views.js` are
  gone — `spoolreports.js:8` says the retired engine "no longer exists in the tree", and
  `app/compute/views.js` moved to `trailbase/tools/_src/legacy-views.js` as a verification fixture.
  What remains under `trailbase/runtime/ahscripts/compute/` is **`format.js` and `ids.js` only**:
  `round2`, `money`, `num`, `dateOnly`, `qtyDisplay`, `monthStart`, `today`, `yearStart`,
  `compareText`, `relId`. **Formatting and id helpers — no sums, no sorts, no filters.**
- **No template arithmetic.** `grep` for `|sort`, `|sum`, `|round`, `|abs`, `|int`, `|float`, `|min`,
  `|max` across every `.jinja` under `app/pages` returns **nothing**. The templates read columns and
  print them.
- **Every `.sort()` / `.reduce()` in the runtime, and what it sorts.** Three sites in the report path,
  none of them report rows:
  - `lib/report-pages.js:33` sorts **select-field option labels** for a filter dropdown
    (`a.label.localeCompare(b.label)`);
  - `lib/spoolreports.js:508` sorts a **set of table names** for `/bench/report`;
  - `lib/spoolreports.js:708` sorts **report key names**.
- **Totals are a SQL statement, not a JS sum.** `spoolreports.js:401` builds a second statement —
  the same composed SQL with the report's `ORDER BY` stripped — whose aggregates are
  `SUM(CAST(x * 100 ± 0.5 AS INTEGER))`, i.e. **INTEGER paisas in SQLite**. The result is one row.

### One place JavaScript *does* calculate money — and it is not a report

`app/public/js/app.js` **recalculates the invoice-entry grid in the browser**, in integer paisa, so the
operator sees a total the instant a cell changes without a round trip:

```js
// app.js:213-225
// recalculated number the instant a cell changes, with no round trip, so the same formula runs in
// two places and they must agree to the paisa — otherwise the operator sees the number move when
// the row saves.
var PAISA = 100;
return Math.round((Number(v) + EPSILON) * PAISA) / PAISA;
```

This is deliberate and governed by
[[client-side-live-recalculation]]: the formula exists twice, and `guest-smoke.mjs` asserts the two
copies agree to the paisa on pinned fixtures. It affects **what the operator sees before saving**, not
what any report publishes — the report statements read the saved rows out of SQLite, which is what the
table above measures.

Stating this is the point of the section. "No JavaScript arithmetic" would be false of the app; "no
JavaScript arithmetic in a report's published numbers" is what the measurement shows, and the difference
between those two sentences is the whole answer.

## One test deliberately not run, and why

The obvious extra proof is to change a row in SQLite behind the app's back and watch the report total
move. It would prove liveness, but it writes test rows into a database that was **just verified against
the production oracle** with `db-digest.mjs` — and the previous depot turned out to carry exactly that:
**five rows the oracle does not have**, residue from harness runs whose cleanup did not complete
([[fresh-import-and-whole-database-digest-2026-10-04]]). The vault has the same lesson for the snapshot
harness in [[route-snapshot-was-snapshotting-redirects]]. The equality test leaves no room for a JS
computation and costs the database nothing, so it is the one to keep. If someone wants the liveness
proof, the app's own write path through `guest-smoke.mjs` is the safe way to get it.

## Re-running it

```sh
node trailbase/tools/report-sql-provenance.mjs --from 2024-01-01 --to 2026-10-04
```

Exits non-zero on a real difference, so it can be a gate. It needs the guest running **and** read access
to the depot's `main.db`, which is why it is a tool and not a route: see
[[tb-0024-flatten-new-system-layout]] on why a report-data endpoint must not exist. Note that a
**cold** first request can be answered from the rendered-page cache and a warm one from the fingerprint
memo, so the number that matters here is the *value*, not the latency — unlike
[[report-cost-on-a-whole-database]].

## Related

- [[reports-and-ledgers]] — where the arithmetic actually lives.
- [[report-cost-on-a-whole-database]] — the cost of that arithmetic, measured the same way.
- [[money-is-2dp-everywhere]] — the rule that keeps 2.3e-10 from ever being visible.
