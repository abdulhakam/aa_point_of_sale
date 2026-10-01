---
title: Spooling report rows through KV (the spool path)
type: system
status: active
created: 2026-09-30
updated: 2026-09-30
tags: [reports, sql, wasm, quickjs, spool, kv, performance]
locator: trailbase/tb-ah-run-js/src/spool.rs
belongs_to: "[[runtime-js-guest-platform]]"
related_to: ["[[all-14-reports-run-in-sqlite-rows-reach-the-renderer-by-kv-handle-never-quickjs]]", "[[report-rows-are-spooled-not-parsed]]", "[[runtime-js-single-host]]", "[[guest-app-host-port]]", "[[tb-0022-move-reports-to-sql]]", "[[deterministic-sort-and-sql-reads-in-guest]]", "[[money-is-2dp-everywhere]]", "[[legacy-sql-views-differ-from-js-views]]",
  "[[guest-smoke-report-total-checks-fail-on-pristine-checkout]]"]
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
rows into the minijinja context **in Rust**, renders, and releases every spool it loaded.

## Layout

| path | what |
|---|---|
| `app/reports/sql/prelude.sql` | the shared view chain, verified against `compute/views.js` |
| `app/reports/sql/reports/*.sql` | one finished display projection per report |
| `app/reports/sql/views/*.sql` | **preserved legacy, NOT on this path** |
| `app/lib/spoolreports.js` | the registry: report → `.sql` + column manifest |

`lib/spoolreports.js` composes `prelude + report` and the report file opens with `, name AS (` when it
adds CTEs, or is a bare `SELECT` when it does not. A file contributing only a `SELECT` must **not** be
given the comma, and vice versa — both wrong shapes fail with the same `near "SELECT"`.

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
- **A CTE must not share a name with one of its own output columns**, or it shadows the column inside
  its own `WHERE` and every filter matches every row.
- **Compute a correlated value ONCE per row, in a CTE.** See the `ledgers/party` note below — this is
  not a style preference, it was a 20 s timeout.

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

`CAST` and `NULLIF` report as missing in the probe, but that is a **probe artefact**: they are SQL
syntax and keywords, not functions — `SELECT cast(1)` needs an `AS` target and `NULLIF` needs three
arguments. Both are used freely throughout the ported SQL.

`SQLITE_ENABLE_MATH_FUNCTIONS` is not compiled into TrailBase's bundled SQLite, which is why every
`round2` site is the CAST-only form.

**`printf('%.2f', x)` keeps trailing zeroes and matches JS `toFixed(2)`** on whole numbers, halves,
negatives and zero — verified in the guest on real ledger values, not on toy numbers. `printf('%!.2f', x)`
is the no-trailing-zeroes variant (`3.5`) and must **not** be used for money. `format('%.2f', x)`
behaves identically to `printf` here.

## Verifying

```powershell
node trailbase/tools/verify-prelude.mjs          # the shared chain vs compute/views.js, 14 checks
node trailbase/tools/verify-spool-reports.mjs   # all 14 reports vs compute/reports.js
node trailbase/tools/check-money-text.mjs        # every money TEXT keeps 2dp (trailing zeroes)
node trailbase/tools/check-money-text-in-guest.mjs   # the same, evaluated IN the guest
node trailbase/tools/regen-round2.mjs           # regenerate every round2 from the verified template
node trailbase/tools/sync-manifests.mjs         # derive column manifests from the SQL
pwsh -File trailbase/tools/run-spool-sweep.ps1  # both arms in the real guest, byte-identity asserted
node trailbase/tools/diff-spool-html.mjs        # first byte that differs, with context
```

`verify-spool-reports.mjs` compares row count, display fields as a multiset, the money columns
field-by-field, row order separately, and each report's totals reduced the way **that** report reduces
them. The registry is PARSED from `spoolreports.js`, not duplicated, and the key pattern must accept a
slash — report keys are path-shaped (`"ledgers/booker"`), and a pattern that stops at `ledgers/`
silently drops those entries and reports them as "not ported".

Filter cases are derived from the live data. A hard-coded date window matching nothing yields two empty
results that "agree" — a pass that proves nothing.

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

- All **14** reports ported; `verify-spool-reports.mjs` reports 14/14. `guest-smoke.mjs` is **68/76**,
  and that is not caused by the port — the same 8 fail on a pristine `HEAD` checkout, see
  [[guest-smoke-report-total-checks-fail-on-pristine-checkout]].
- `ledgers/party` renders in the guest, after the balance was moved out of the projection into
  `party_balanced`. Written inline it appeared four times per row and hit TrailBase's 20 s request
  timeout — over 100× slower than the JS it replaces.
- The spooled path is exercised by the bench, **not** wired into the live report pages yet.

## Related

- [[all-14-reports-run-in-sqlite-rows-reach-the-renderer-by-kv-handle-never-quickjs]] — the decision
  and the measurements.
- [[runtime-js-guest-platform]] — the host this runs in.
- [[guest-smoke-report-total-checks-fail-on-pristine-checkout]] — the 8 pre-existing smoke failures.
- [[tb-0022-move-reports-to-sql]] — the parent task.