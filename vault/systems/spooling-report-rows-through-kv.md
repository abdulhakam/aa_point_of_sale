---
title: Spooling report rows through KV (the spool path)
type: system
status: active
created: 2026-09-30
updated: 2026-10-01
tags: [reports, sql, wasm, quickjs, spool, kv, performance]
locator: trailbase/tb-ah-run-js/src/spool.rs
belongs_to: "[[runtime-js-guest-platform]]"
related_to: ["[[all-14-reports-run-in-sqlite-rows-reach-the-renderer-by-kv-handle-never-quickjs]]", "[[report-rows-are-spooled-not-parsed]]", "[[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]]", "[[runtime-js-single-host]]", "[[guest-app-host-port]]", "[[tb-0022-move-reports-to-sql]]", "[[deterministic-sort-and-sql-reads-in-guest]]", "[[money-is-2dp-everywhere]]", "[[legacy-sql-views-differ-from-js-views]]", "[[guest-smoke-report-total-checks-fail-on-pristine-checkout]]", "[[spool-blob-bind-decoder-rejected-unpadded-base64]]", "[[six-report-defects-the-empty-filter-parity-gate-could-not-see]]", "[[trailbase-guest-error-string-opaque]]"]
---

# Spooling report rows through KV (the spool path)

How a report runs entirely in SQLite with its rows staying out of the QuickJS interpreter, and how to
verify it. The decision and its measurements are in
[[all-14-reports-run-in-sqlite-rows-reach-the-renderer-by-kv-handle-never-quickjs]]; this is the
mechanism and the rules that came out of porting all fourteen.

## The two bindings

Both live in the main host (`tb-ah-run-js`), not in the experimental query component.

**`sqlite.spool(name, sql, cols, params)`** → `{ key, rows, bytes, queryMs, writeMs }`
(`api/sqlite.rs` → `spool.rs`). Runs the statement, checks every row's width against `cols`, converts
each row to JSONL using that manifest, writes it to the KV store, and returns the handle. **JSONL,
not one JSON array**, so a large result never needs a second full-size buffer. Spools are released by
`render.spooled` after the render, error or not.

**`render.spooled(name, ctx, [{field, key}])`** → HTML (`render.rs`). Reads each key back, splices the
rows into the minijinja context **in Rust**, renders, and releases every spool it loaded. `field` takes
a **dotted path** (`result.rows`), creating the objects along the way.

**`render.json(ctx, [{field, key}])`** → a JSON string (`render.rs`). The same handoff, serialised. The
declarative pages answer with a JSON body whose `result.rows` is the whole report, so the envelope and
the key go to Rust and the finished JSON comes back as one string.

**`render.spooled` errors now THROW the message** (`api/sqlite.rs`) rather than collapsing into
`rquickjs::Error::Unknown`. `Unknown` reaches a route as `QuickJS library created a unknown error`,
which names neither the statement nor the reason, and a guest `eprintln!` goes nowhere —
request-handler logs are thread-local and only drained for init scripts. See
[[trailbase-guest-error-string-opaque]].

## Layout

| path | what |
|---|---|
| `app/reports/sql/prelude.sql` | the shared view chain, verified against `compute/views.js` |
| `app/reports/sql/reports/*.sql` | one finished display projection per report (11 files, 14 reports) |
| `app/reports/sql/views/*.sql` | **preserved legacy, NOT on this path** — deleted 2026-10-02 |
| `app/lib/spoolreports.js` | the registry: report → `.sql` + column manifest + totals spec |
| `app/lib/http.js` | `pageSpooled(req, shell, name, data, spools)` — the page shell, with rows spliced by the host |
| `app/lib/report-pages.js` | `filterOptions`, `openingRow(filters)` — the only two things a spooled report page still needs from JS |

`lib/spoolreports.js` composes `prelude + report` and the report file opens with `, name AS (` when it
adds CTEs, or is a bare `SELECT` when it does not. A file contributing only a `SELECT` must **not** be
given the comma, and vice versa — both wrong shapes fail with the same `near "SELECT"`.

## It is the LIVE path

Both report surfaces run the spool by default:

| surface | route | what the host does |
|---|---|---|
| report page | `GET /reports/<slug>` | `sqlite.spool` the rows (with `LIMIT`), `render.spooled` the page |
| page payload | `GET /p/<slug>/data` | `sqlite.spool` the rows, `render.json` the whole payload |

Each also runs one **totals statement** — see
[[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]] — which returns a single row of
formatted strings.

SUPERSEDED 2026-10-01: there is no longer any escape hatch. `compute/reports.js` and `useJs` are both
deleted, so a report is the SQL and nothing else — see [[one-manifest-is-the-page-definition]].
The page cache key is unchanged, and `/reports/refresh?full=1` now also drops the **composed-SQL cache**
(`spoolreports.invalidate()`), or an edited `.sql` file would keep serving the text composed when the
process first read it.

## Rules that came out of the port

- **Column manifests are derived from the SQL, not written by hand.** `tools/sync-manifests.mjs`
  derives each manifest from its statement's final SELECT and refuses `SELECT *`. Six statements
  carried an extra id/filter column (dailysale also selects `party_id`, `area_id`, `booker_id` for its
  own filters); every one passed in Node — `node:sqlite` has no width check — and was rejected by the
  guest. Two CRLF-driven silent failures cost more time than the port: `$` in JS matches before `\n`
  but not before `\r`, so every `$`-anchored match on these files failed and the tools reported
  "nothing to do".
- **Bind EVERY parameter the statement declares.** An unbound `:name` arrives as NULL, so
  `(:party = '' OR ...)` is never true and the report returns zero rows — which looks like a broken
  date filter. `spoolreports.js` discovers the parameters from the SQL and binds them in that order;
  report-constant ones (`salesOnly`, `agg`) come from the registry, not the caller's filters.
- **Ids are BLOBs; bind them as BLOBs.** JS only ever holds an id as base64url, and the guest's
  `blob:` prefix decodes it back. Never `unhex(hex('..'))` for a BLOB READ — `hex()` on a hex string
  returns the hex of its ASCII bytes, so it rebuilds the bytes of the text and matches nothing.
  **Both base64 spellings must be accepted**: an id LEAVING the host is padded (`value_to_json` emits
  `==`), an id ARRIVING from a query string is not, and the padded engine alone rejects the second
  with `Invalid padding` — which killed every id filter, invisibly. See
  [[spool-blob-bind-decoder-rejected-unpadded-base64]].
- **Never hand-type an id into a check.** 16 bytes of BLOB as base64url; a typo filters on a party
  that does not exist and reports "zero rows" as though the report were broken. Use
  `tools/sample-filter-ids.mjs`.
- **A `WHERE` cannot use a `SELECT` alias when the base table has a column of that name.** SQLite
  resolves the bare name to the COLUMN, so `dailysale`'s `dated` filter read `invoice_view.dated`
  instead of the `COALESCE(dated, created)` alias beside it. Spell the expression out.
- **One bind cannot serve two types.** `invoice` matches a BLOB id *or* a human number, so it needs
  `:invoiceId` and `:invoiceNo`. And the number half needs `CAST(... AS REAL) = CAST(... AS REAL)`:
  `CAST(invoiceNo AS TEXT)` is `"3840.0"` where the JS renders `"3840"`.
- **Alias to the JS field names, not to your own column names.** `partials/table.html.jinja` reads
  `row[column.key]`; projecting `transaction_type` where the page asks for `transactionType` renders a
  blank column with correct row count and correct money.
- **A CTE must not share a name with one of its own output columns**, or it shadows the column inside
  its own `WHERE` and every filter matches every row.
- **Compute a correlated value ONCE per row, in a CTE.** See the `ledgers/party` note below — this is
  not a style preference, it was a 20 s timeout.
- **Append `LIMIT` only after stripping the statement's `;`.** `…;\nLIMIT 100` is a syntax error, so
  only `?all=1` worked.
- **SQLite's bare-column rule is load-bearing.** In an aggregate query containing `min()`/`max()`, every
  bare column takes the value from the row that produced the extreme. `SELECT party, booker, MIN(id) …
  GROUP BY party` is therefore the booker of the min-id row, in one pass — where a correlated
  `WHERE id = (SELECT MIN(id) …)` is correct and 20 s.
- **The guest's SQLite has no window functions.** `COUNT(*) OVER ()` fails at PREPARE, so the page dies
  in 8 ms with no cause. Use a materialised CTE and a scalar subquery.

## What the GUEST's SQLite has, and what it does not

Measured with `/bench/sqlfn?fmt=1` against the running component — **not** from node:sqlite, which
answers a different question. The two engines disagree in both directions:

| | node:sqlite 3.53 | TrailBase guest |
|---|---|---|
| `floor` / `ceil` / `trunc` | present | **absent** |
| `iif` / `mod` | present | **absent** |
| `abs` / `sign` / `round` / `printf` | present | present |
| `format()` | present | present |
| JSON1 (`json_extract`, `json_group_array`) | present | present |
| window functions (`COUNT(*) OVER ()`) | present | **fails at prepare** |

`CAST` and `NULLIF` report as missing in the probe, but that is a **probe artefact**: they are SQL
syntax and keywords, not functions — `SELECT cast(1)` needs an `AS` target and `NULLIF` needs three
arguments. Both are used freely throughout the ported SQL.

The two engines also differ in **how a nested `WITH` is planned**: a CTE body of
`SELECT * FROM ( <statement that carries its own WITH> )` materialises in 0.2 s, while a bare
`WITH totals_src AS ( <that statement> )` re-evaluates the inner `WITH` per reference — 8.5 s, same
answer.

`SQLITE_ENABLE_MATH_FUNCTIONS` is not compiled into TrailBase's bundled SQLite, which is why every
`round2` site is the CAST-only form.

**`printf('%.2f', x)` keeps trailing zeroes and matches JS `toFixed(2)`** on whole numbers, halves,
negatives and zero — verified in the guest on real ledger values, not on toy numbers. `printf('%!.2f', x)`
is the no-trailing-zeroes variant (`3.5`) and must **not** be used for money. `format('%.2f', x)`
behaves identically to `printf` here.

## Verifying

```powershell
node trailbase/tools/verify-prelude.mjs          # the shared chain vs compute/views.js, 14 checks
node trailbase/tools/verify-spool-reports.mjs   # all 14 reports, self-consistency (no JS comparison)
node trailbase/tools/check-money-text.mjs        # every money TEXT keeps 2dp (trailing zeroes)
node trailbase/tools/check-money-text-in-guest.mjs   # the same, evaluated IN the guest
node trailbase/tools/regen-round2.mjs           # regenerate every round2 from the verified template
node trailbase/tools/sync-manifests.mjs         # derive column manifests from the SQL
node trailbase/tools/check-report-pages.mjs     # the LIVE pages, and the page payloads
pwsh -File trailbase/tools/run-spool-sweep.ps1  # both arms in the real guest, byte-identity asserted
node trailbase/tools/diff-spool-html.mjs        # first byte that differs, with context
```

`check-report-pages.mjs` needs a running server, so derive the ids first — the same command, twice:

```powershell
node trailbase/tools/sample-filter-ids.mjs | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item -Path "env:$k" -Value $v }
node trailbase/tools/check-report-pages.mjs
```

`verify-spool-reports.mjs` **imports the shipping loader** and injects only the guest's `fs` global,
so it runs the statements the host runs. It used to parse the registry out of `spoolreports.js` as
text, which broke the moment a report grew a nested `totals: {` block — the block looked like a new
entry and the gate died on `registry entry totals has no sql`.

It checks five things:

1. row count, display fields as a multiset, and the money columns field-by-field;
2. the **SQL totals statement**, against three absolute properties rather than against the JS: **exact**
   (the integer paisa sum of its rows, reduced independently), **sound** (a derived total satisfies its
   `{op, terms}` definition over the SQL's own other totals), **corroborated** (a second, independently
   written paisa construction produces the same integers). A difference from `compute/reports.js` is
   counted and printed, and is not a failure — the JS accumulates floats, so it is an approximation of
   the same quantity and nine of its totals drift by a paisa;
3. **every declared bind**, two ways: a value matching nothing must return 0 rows (proves the bind
   reaches the statement at all) and a real busy id must return strictly fewer rows but not none
   (proves it reaches the right *column*). 72 binds;
4. every `REPORT_PAGES` column key and every `t.<key>` a totals strip reads exists in that report's
   manifest;
5. a list of columns only one side has — advisory, because that is where a misnamed field hides.

Filter cases are derived from the live data. A hard-coded date window matching nothing yields two empty
results that "agree" — a pass that proves nothing.

A bind count that does not match the declared parameter count is an error, not a warning: the extra
bind is ignored, the parameter arrives NULL, and `printf('%.2f', NULL)` is `0.00` — which is how the
general ledger's openings read zero on every account.

## Running it

The server reads the **generated** copy under `traildepot/`, and the dispatcher caches transpiled
modules, so an app edit needs a sync and a restart:

```powershell
robocopy trailbase\runtime trailbase\traildepot\runtime /MIR /NFL /NDL /NJH /NJS /NP
robocopy trailbase\migrations trailbase\traildepot\migrations /MIR /NFL /NDL /NJH /NJS /NP
cargo build --offline --release --target wasm32-wasip2 -p tb_ah_run_js   # from trailbase\
Copy-Item target\wasm32-wasip2\release\tb_ah_run_js.wasm traildepot\wasm\tb-ah-run-js.wasm
trail --depot=traildepot run --address=127.0.0.1:4000 --runtime-threads=4 --runtime-root-fs=traildepot\runtime
```

Probes: `/bench/spool?arm=rows|spooled&report=<slug>` (`&format=html` returns the document),
`/bench/runreport?report=<slug>` (the JS reference), `/bench/sqlfn` (which SQL functions the guest
actually has — this is how the missing `floor()` was found).

## Current state

- All **14** reports ported, **and live on this path**. `verify-spool-reports.mjs` reports 14/14 with 72
  binds verified; `check-report-pages.mjs` reports every report page and every page payload rendering,
  with the two surfaces agreeing on row count and totals for identical filters.
- `guest-smoke.mjs` is **68/76**, and that is not caused by the port — the same 8 fail on a pristine
  `HEAD` checkout, see [[guest-smoke-report-total-checks-fail-on-pristine-checkout]].
- `ledgers/party` renders in the guest, after the balance was moved out of the projection into
  `party_balanced`. Written inline it appeared four times per row and hit TrailBase's 20 s request
  timeout — over 100× slower than the JS it replaces.
- Totals are **integer paisas**: the `tiers` layer converts every amount to whole paisas, the sums are
  integer sums, and the division by 100 happens once on the way out. A total is the exact sum of the
  rows behind it, not a float sum whose value depends on addition order. **Nine totals differ from the
  retired `compute/reports.js` reference by a paisa and the SQL is right in every case** — the standard
  is exactness, not agreement with an approximation. See
  [[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]].
- Two documented float-boundary differences remain on the per-row money check, both from ONE
  `ledgers/area` row whose raw group sum sits on an exact half-paisa
  ([[report-parity-flakes-on-float-arithmetic]]).

## Related

- [[all-14-reports-run-in-sqlite-rows-reach-the-renderer-by-kv-handle-never-quickjs]] — the decision
  and the measurements.
- [[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]] — how the totals are computed.
- [[spool-blob-bind-decoder-rejected-unpadded-base64]] — the shipped `blob:` decoder that killed every
  id filter.
- [[six-report-defects-the-empty-filter-parity-gate-could-not-see]] — six defects the old gate could not
  see, and the gates that do now.
- [[runtime-js-guest-platform]] — the host this runs in.
- [[guest-smoke-report-total-checks-fail-on-pristine-checkout]] — the 8 pre-existing smoke failures.
- [[tb-0022-move-reports-to-sql]] — the parent task.