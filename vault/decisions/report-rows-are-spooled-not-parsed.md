---
title: Report rows are spooled to KV, not materialised in QuickJS
type: decision
status: accepted
decided_on: 2026-09-30
created: 2026-09-30
tags: [reports, sql, wasm, quickjs, spool, performance, kv]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-rows-are-spooled-not-parsed]]", "[[tb-0022-move-reports-to-sql]]", "[[report-logic-stays-runtime-file-based]]", "[[guest-report-performance-options]]", "[[component-split-and-sql-materialised-tables]]", "[[trailbase-guest-cpu-js-limits]]", "[[money-is-2dp-everywhere]]"]
---

# Report rows are spooled to KV, not materialised in QuickJS

A report's SQL runs in SQLite, its rows are serialised to JSONL **in Rust** and written to the KV
store, and the **renderer** reads them back by key. The result rows never exist in QuickJS. The
caller holds a string key and a small counter object, and nothing else.

```text
JS    compose SQL -> sqlite.spool(name, sql, cols, params)
Rust  query() -> Vec<Vec<Value>> -> JSONL -> KV          (tb-ah-run-js/src/spool.rs)
JS    <- { key, rows, bytes, queryMs, writeMs }          (a small object, never rows)
Rust  render.spooled: KV key -> JSONL -> minijinja ctx   (tb-ah-run-js/src/render.rs)
```

## Why

`sqlite.all` had no choice: `trailbase_wasm::db::query` returns `Vec<Vec<Value>>` with no column
metadata, so the host serialised the whole result to a JSON string, QuickJS re-parsed it, and the
app looped over it in an interpreter that manages ~1e6 ops/s ([[trailbase-guest-cpu-js-limits]]).
On report-sized data that transport, not SQL, was the cost.

The handle model was already proven in isolation — `tb-ah-query-tbdb` writes a spool file under a
KV key and answers with `{ path, rows, bytes, queryMs }` — but it was **never wired into the main
host**: `grep spool tb-ah-run-js/src` returned nothing, and the app's own `kv` use is result and
HTML *caching* (`reports.js:378,393`, `render-client.js:79`), not row handoff. This decision wires
it into the serving path.

## Measured, on the real guest (`/bench/spool`, 26,099 rows)

| | median | 
|---|---|
| rows through QuickJS (`sqlite.all`) | 2,891 ms |
| spooled (KV handle) | 2,120 ms |

**26.7 % faster, and the rendered HTML is byte-identical** — asserted every run by
`tools/run-spool-bench.ps1`. Both arms run the same SQL and the same template, so the difference is
transport only.

The gain is modest *for this report* because it renders 4.3 MB of HTML and the shared `minijinja`
cost dominates both arms. The saving is on acquisition (1,967–2,389 ms → 838–1,471 ms query plus
192–394 ms write). A report that reads many rows and renders few should show a far larger ratio.

## Rules this imposes

- **Column manifests are a contract, not a discovery.** `query` returns no column names, so
  `app/lib/spoolreports.js` states the SELECT order per report. The host **asserts every row's
  width** and fails loudly on a mismatch — a drifted manifest must never silently shift a money
  column.
- **Ids are BLOBs and must be bound as BLOBs.** JS only ever holds an id as base64url, and the
  guest's every other call site binds `Value::Text`, which compares TEXT against BLOB and matches
  nothing — it reads as "the filter returns no rows", not as a type error. `spool::bind_param`
  therefore decodes a `blob:`-prefixed parameter to `Value::Blob`. Bare strings are unchanged.
- **Never `unhex(hex('..'))` for a BLOB read.** `hex()` on a hex *string* returns the hex of its
  ASCII bytes, so it rebuilds the bytes of the text and matches nothing. That idiom is correct for
  BLOB *writes* and wrong for reads; `x'..'` round-trips.
- **Spools are released by the host** after the render, error or not, so an error page cannot leak
  26k rows into the KV store. Keys are namespaced `spool:` so they cannot collide with app caches.
- **A report is a `.sql` file plus a manifest**, keeping the no-build property
  ([[report-logic-stays-runtime-file-based]]).

## Scope

Proven on **one** report, `ledgers/booker`, chosen because it is the cleanest full report (no
aggregation order ambiguity, no array-valued column). The mechanism is generic; the remaining
reports are ports, and each one is bounded by what SQL can express:

- `paymentsView.company` is an **array** in JS and a scalar in SQL. Nothing reads it today, which is
  why the hybrid attempt failed earlier on *other* columns
  ([[legacy-sql-views-differ-from-js-views]]), but a report that needs it must move to
  `json_group_array` — and JSON1 availability in the guest's SQLite is **unverified**.
- `compareText` is a per-character JS comparator; SQL can only approximate it.
- `ledger/general`'s `account_type` is number-for-payments and string-for-expenses, and is compared
  against `"recieving"`. SQLite's cross-type ordering makes that comparison **always false** today;
  giving the column TEXT affinity would flip the output. A live hazard, not a hypothetical one.
- `ledger/party` computes its running balance over **all** payments and *then* date-filters, so the
  window function must sit in a CTE **before** the range filter or the balance changes.

## Related

- [[report-rows-are-spooled-not-parsed]] — the implementation and how to verify it.
- [[tb-0022-move-reports-to-sql]] — the parent task.
- [[component-split-and-sql-materialised-tables]] — the option this implements.
