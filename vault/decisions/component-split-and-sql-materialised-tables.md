---
title: Three generic artifacts — composed on the request path, separate off it — plus SQL-maintained report tables
type: decision
status: accepted
decided_on: 2026-09-28
created: 2026-09-28
tags: [trailbase, wasm, composition, sql, materialised-views, money, architecture]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[runtime-js-single-host]]", "[[manifest-driven-routing-and-data-dag]]", "[[money-is-2dp-everywhere]]", "[[guest-fingerprint-refresh]]", "[[report-render-row-cap]]", "[[trailbase-wasm-osl-3-0-licence]]", "[[guest-parity-differential-not-reproducible]]", "[[clean-slate-benchmark-cycle]]", "[[trailbase-loads-multiple-components-flat-router]]", "[[trailbase-guest-db-bridge-rejects-pragmas]]"]
---

# Three generic artifacts — composed on the request path, separate off it — plus SQL-maintained report tables

## Context

The single host is 7.17 MB and folded-in rendering grew it from a 5.88 MB upstream baseline
([[runtime-js-single-host]]). Three reports — `profit`, `itemsales`, `paymentsbycompany` — return
**500 at the ~20 s guest deadline** on the production-size depot, and the warm cost of a repeat is
still 16.9 s. The per-row arithmetic is QuickJS CPU at ~1e6 iterations/s, and rows are serialised
through QuickJS before minijinja can render them.

`app/compute/reports.js`, `app/compute/views.js`, `app/lib/reports.js` and the whole `mview`
hydrate path are the largest remaining body of runtime code, and the `mview` blobs are large enough
to be a cost in themselves (paymentsInvoicesReport 17.1 MB, transactionsReport 13.7 MB,
paymentsView 13.7 MB, transactionView 11.7 MB).

## Decision

### 1. Three generic artifacts, composed into one component on the request path

Three separately-authored, generically-testable artifacts replace the monolithic host crate:

- a **SQL engine** (acquisition, and the report aggregates of §2),
- a **JS runtime** (QuickJS — coordinator only: resolve the manifest, coerce params, order the DAG,
  dispatch steps, hand the result to the renderer; **no row arithmetic, no data conversion**),
- a **templating engine** (minijinja).

The packaging decision is **driven by measurement** and is deliberately asymmetric:

| Packaged as | Where | Why |
|---|---|---|
| **One composed component** (`wasm-tools compose`, shared linear memory) | the **request path** | The boundary is not free: a cross-component handoff costs **~1.4 s per 60k rows** and makes like-for-like acquisition **+71% slower across 14/14 reports**. Composition keeps the Rust-side work and deletes the handoff. |
| **Separate components** | work already **off the request path** — the import, the `jobs` reconcile loop, batch aggregation | Process isolation and independent deployability, where a hop per call is not on anyone's critical path. |

Separate components on the request path remain **possible** — TrailBase does load N components and
the URL-space and KV-handoff mechanics are proven
([[trailbase-loads-multiple-components-flat-router]]) — but they are **not selected**, because the
sweep in §Consequences prices the boundary at +71%.

StarlingMonkey was considered and **rejected**: the recorded A/B is 2777 ms (QuickJS) vs 3004 ms
(StarlingMonkey) on the same 3 M-iteration loop, i.e. slower, and both sit on wasmtime so the JIT
host is unchanged. There is also no "always hot" benefit to chase — the component is instantiated
at start and warm load is 0.2–0.37 s, so cold load is a per-start, not a per-request, cost.

### 2. Report results live in SQL-maintained materialised tables, in three tiers

| Tier | Content | Freshness |
|---|---|---|
| 1 | Base tables | Source of truth. Always fresh. |
| 2 | Materialised tables maintained by `AFTER INSERT/UPDATE/DELETE` triggers | **Always fresh by construction** — maintained in the same transaction as the write. This is not precomputation. |
| 3 | Render output and the KV result cache | Recomputable, may be stale. **The only tier a manual invalidation may touch.** |

This is what keeps `reports.no_precomputation` satisfied while still removing the CPU cliff: a
trigger-maintained table cannot disagree with its base table, whereas TTL-based or timer-based
refresh reintroduces exactly the staleness that constraint exists to forbid.

**Tier 2 is now realised, once, for invoices.** `inv_doc` holds one document per invoice,
maintained by 14 triggers in the same transaction as the write, rebuildable on demand via the
durable job queue. The design, the measurements, and the one-definition enforcement are in
[[invoice-document-write-through-and-rebuild]]; the harness that defends it is
[[invoice-doc-sync]]. Two things there are the general case rather than the invoice case and are
worth carrying to the next tier-2 table: a trigger body is a *copy* of the build statement
(SQLite cannot call one from a trigger), so the copies are machine-checked against the original
rather than trusted; and a rename on a denormalised field re-derives the affected documents
rather than patching the field, because a patch is a second copy of the document's field list.

- A frontend-triggered invalidation may refresh **Tier 3 only**. `service.invalidate()` dropping
  Tier 2 synchronously after every management write — today's behaviour — is retired.
- Refresh **priority** (get the required data first, let the rest catch up) applies to Tier 3 and is
  driven by a dependency graph.
- The dependency graph is **generated from the trigger definitions in the migrations**, never
  hand-maintained. A hand-written graph alongside the triggers is two sources of truth for one
  dependency, and the drift would be a money bug with no error message. Manifests reference
  materialised table *names* and declare only what triggers cannot know: the multi-step query chain
  within one report, and the render target.
- Cache behaviour is a **per-report manifest flag**, defaulting to the safe side. A rendered page
  carrying a cached result must stamp its version and an as-of time so staleness is visible rather
  than silent.

### 3. SQL owns money rounding, and the representation is integer cents

Money is rounded **once, in SQL**, and the SQL output feeds the template directly — removing the
double-rounding that produced the recorded cent-level drift (`3,337,165.56` legacy vs
`3,337,165.49` guest).

**The representation is `REAL` + `printf('%.2f', …)` for now, and integer cents is a later,
separate step.** Amendment (2026-09-28, owner): build this on **float parity with legacy first**,
and move to the exact representation only once the float path is verified and finalised. This
inverts the ordering argued below — cents is the more accurate and the faster option in the
abstract, but parity is worth more than exactness while the parity oracle is still being built, and
cents must not be conflated with the parity work it would invalidate.

So the sequencing is: SQL owns the rounding site now, using the same `printf("%.2f")` legacy used,
so the numbers are comparable line for line; once that is final and the differential is green, the
`INTEGER` cents migration (`tb-0015`) is applied as a distinct, separately-verified change.

**Scope limit, verified against the schema:** when the cents migration does happen, only money
columns become cents. `qty` and `box_size_qty` are `REAL` and legitimately fractional and must
stay fractional. Candidate money columns are `amount`, `net_amount`, `final_amount`, `discount_rs`,
`discount_1`, `discount_2`, `price`, `cost_price`, `sale_price`, `invoiceNo`, `scheme`. Before
migrating, the legacy database must be queried for any money value carrying more than 2 decimal
places, since the new depot is empty and cannot answer it.

This **resolves the open `tb-0015` question by way of this design, in two stages**: float parity
first, exact cents afterwards.

## Why not the alternatives

| Alternative | Why not |
|---|---|
| Keep QuickJS as the calculator, optimise it | The 500/20 s deadline is per guest call; no in-process optimisation escapes it. |
| `REAL` + `printf('%.2f', …)` in SQL | Cheapest to write and byte-matches legacy's `printf`, but not exact, and it pays a per-row format over ~60k rows. Retained as the parity check, not the representation. |
| TTL or timer-based refresh of materialised tables | Reintroduces the staleness `reports.no_precomputation` exists to prevent. |
| Hand-maintained dependency graph in YAML | Two sources of truth with the trigger definitions; drift is silent. |
| The materialised store in a **separate database** | **Cannot**: SQLite rejects qualified table names inside a trigger, so no trigger can write to an attached file at all, and cross-database atomicity is not guaranteed in WAL mode. The store lives in the same database as separate tables. [[materialised-store-cannot-be-a-separate-database]] |
| PoloDB as a WASM component for the materialised store | It **cannot**: v5.0.0 lists "Remove WASM support" and "Remove memory db" as breaking changes, and made RocksDB the mandatory backend via the non-optional `polodb-librocksdb-sys` C/C++ crate. RocksDB needs a filesystem, mmap and POSIX locking, so it does not build for `wasm32`. A second engine also cannot commit in the **same transaction** as the SQLite base write, which would demote the materialised store from tier 2 to a cache — the exact failure §2 exists to prevent. Its MongoDB-shaped document API is already available in SQLite via `STORED` generated columns ([[document-model-bench-2026-09-29]]). |
| Columnar row transport (JSON-free) | Already disproved: warm profit 4.00 → 4.32 s. The warm cost is the ~21.8k-row minijinja render, not JSON. |
| A direct JS→`serde_json` render bridge | Already disproved: payments cold 5,528 → 9,277 ms. |
| `sql` + `js` hybrid for `paymentsView` | Already disproved: parity fell to 9–12/14 and was flaky; reverted. |
| StarlingMonkey as the hot main runtime | Slower on the recorded benchmark, and there is no cold-load problem left to solve on the request path. |

## Consequences

### Measured — payload bench (one join, 10,000 rows)

Method: `trailbase/tools/run-bench.ps1`, five runs, each from a **depot deleted and re-imported from
scratch** (60,245 / 60,245, 0 failures), WAL checkpointed before measuring, interleaved reps,
byte-equality asserted every rep. See [[clean-slate-benchmark-cycle]].

| run | inline | component | paired overhead |
|---|---|---|---|
| 1 | 440 ms | 428 ms | −2.7% |
| 2 | 696 ms | 475 ms | −31.8% |
| 3 | 629 ms | 527 ms | −16.2% |
| 4 | 443 ms | 450 ms | +1.6% |
| 5 | 455 ms | 446 ms | −2.0% |
| **median paired** | — | — | **−2.7%** |

On this workload the two arms are indistinguishable, and the component's `acquire` is ~2× faster
and far tighter (109–133 ms against inline's 200–559 ms) while its `handoff` gives most of it back.
Byte-identical HTML every rep.

### Measured — all 14 reports: three arms, and this is the decisive result

The payload bench above is one join of 10,000 rows. Real reports acquire **33,601–60,186 rows across
7–15 base tables**, and at that scale the picture is different enough to reverse the conclusion. The
sweep therefore runs **three** arms, because two of them answer different questions:

| arm | what it does |
|---|---|
| `inline` | the app's own `readTable` — column lookup, select, **and per-row normalisation** (relation ids to url-safe base64, booleans to 0/1) |
| `raw` | the same columns and the same rows with **no normalisation** — i.e. the identical work the component does, **the fair comparison** |
| `component` | rows acquired by `tb-ah-query-tbdb.wasm` and handed over by KV key, then read back |

| report | rows | tables | inline | raw | component | **fair** | e2e |
|---|---|---|---|---|---|---|---|
| dailysale | 33,601 | 12 | 2,516 | 956 | 1,870 | **+95.6%** | −25.7% |
| difference | 33,601 | 12 | 2,277 | 966 | 1,923 | **+99.1%** | −15.5% |
| itemsales | 33,601 | 12 | 2,456 | 956 | 1,678 | **+75.5%** | −31.7% |
| ledgers/area | 60,186 | 15 | 4,261 | 1,870 | 2,872 | **+53.6%** | −32.6% |
| ledgers/booker | 60,186 | 15 | 4,231 | 1,811 | 2,993 | **+65.3%** | −29.3% |
| ledgers/general | 60,014 | 8 | 4,395 | 1,722 | 3,090 | **+79.4%** | −29.7% |
| ledgers/party | 60,186 | 15 | 4,481 | 1,686 | 2,888 | **+71.3%** | −35.6% |
| outstanding | 59,926 | 7 | 4,469 | 1,784 | 2,863 | **+60.5%** | −35.9% |
| payments | 60,186 | 15 | 4,168 | 2,111 | 2,901 | **+37.4%** | −30.4% |
| paymentsbycompany | 60,186 | 15 | 4,101 | 1,818 | 3,103 | **+70.7%** | −24.3% |
| productsale | 33,601 | 12 | 2,585 | 929 | 1,674 | **+80.2%** | −35.2% |
| profit | 33,601 | 12 | 2,468 | 1,025 | 1,637 | **+59.7%** | −33.7% |
| salesreport | 60,186 | 15 | 4,087 | 1,688 | 3,066 | **+81.6%** | −25.0% |
| stockreport | 33,601 | 12 | 2,651 | 981 | 1,669 | **+70.1%** | −37.0% |
| **median** | | | **4,231** | **1,722** | **2,888** | **+71.0%** | **−31.0%** |

Row counts equal in all 14. Times in ms, 3 reps, median. `fair` = component vs raw. `e2e` =
component vs inline.

**The decomposition is the finding.** Splitting the component's number into acquisition and handoff
and comparing against `raw`:

| | at 60,186 rows |
|---|---|
| `raw` in-process read (identical work) | 1,722–2,111 ms |
| component `acquire` (its own Rust query + serialise) | 1,499–1,671 ms |
| component `handoff` (HTTP hop + KV write + KV read + JSONL parse) | 1,325–1,490 ms |
| `inline` `readTable` (raw + QuickJS normalisation) | 4,087–4,481 ms |

So: the component's own Rust-side work is **as fast as the equivalent in-process read** — the
boundary is not slowing the query down. But the **handoff alone costs ~1.4 s per 60k rows**, and that
makes the component **+71% slower than a like-for-like in-process read, in 14 of 14 reports.**

### Verdict — this revises the decision

- **The component boundary is not free at report scale.** It costs **+71% (median) on the
  acquisition step**, ~1.4 s per 60k rows. The earlier "cost-neutral" reading was an artefact of the
  payload bench's 10,000-row single join, where the handoff is only ~120 ms; it does not survive real
  report row volumes.
- **The apparent −31% end-to-end win is not a win for the boundary.** It comes from `readTable`
  doing per-row normalisation in QuickJS, which the component simply does not do. The guest **still
  has to normalise** the data before the report calculators can use it, so that cost is deferred, not
  removed — and if it is added back to the component arm, the arm lands near the `raw` figure and the
  win disappears.
- **The real win is moving per-row work from QuickJS to Rust, and that needs no boundary at all.**
  `raw` (1,722 ms) versus `inline` (4,231 ms) is the ~2.4 s the same read costs when the per-row work
  runs in QuickJS. Doing that work in Rust **in-process** captures the whole gain with none of the
  1.4 s handoff.
- **Adopt the architecture, compose the packaging.** The three generic artifacts stay the goal
  ([[compiled-artifacts-are-generic-capabilities]]) and the URL-space/composition mechanics are
  proven ([[trailbase-loads-multiple-components-flat-router]]), but on the request path the hot-path
  handoff goes **in-process (one composed component)**, and separate components are reserved for work
  that is already off the request path — the import, the job reconcile loop, batch aggregation.
- **This is why the split also does not fix the ~20 s deadline**, which was never the boundary's job:
  the deadline is per-row *arithmetic*, and the fix for it remains the Tier 2 trigger-maintained
  materialised tables.

The `wasm-tools compose` variant was still not built, but the sweep above now gives the number it
would produce: composition removes the `handoff` term and keeps the Rust-side work, so its expected
result is the `raw` column — ~1.7 s against inline's ~4.2 s, a ~59% saving on acquisition, with no
boundary cost. That is the packaging this decision now selects.

### Correction — the earlier "cold" measurements were warm

An earlier revision of this note, and of [[clean-slate-benchmark-cycle]], reported a "cold-SQL"
repeat using `PRAGMA shrink_memory; PRAGMA cache_size = 1;` before each measured query, with a
−1.1% paired median. **Those pragmas never ran.** TrailBase's DB bridge rejects every PRAGMA —
"pragmas not supported" — through both `query` and `execute`, verified directly through
`/bench/pragma`; both call sites swallowed the error, so `cold=1` was a silent no-op and the numbers
labelled cold were warm. There is no way to flush SQLite's page cache from inside the guest; the only
genuine mechanism is a fresh process. The claim is withdrawn rather than reinterpreted.

None of this affects the report sweep above, which is a like-for-like comparison in a single cache
regime: both arms query the same database behind the same page cache, so cache state scales both and
cancels in the ratio.

## Evidence

- Cold timings on 60k rows: `profit` 500 @ 20 s warm 16,871 ms; `itemsales` wedged, warm
  17,341 ms; `paymentsbycompany` 500 @ 20 s both. Rendered-page cache took profit's repeat to
  1,500 ms; the 1,000-row cap did not help these three, because their cost is computation, not
  render.
- `notes/trailbase-guest-cpu-js-limits.md` — the ~1e6 iterations/s engine rate and the ~20 s
  deadline.
- `trailbase/tb-ah-run-js/Cargo.toml` — one crate, 7.17 MB build.
- `trailbase/migrations/main/U1790208000__create_base_tables.sql` — the `REAL` money columns and the
  fractional `qty`.

## Related

- [[manifest-driven-routing-and-data-dag]] — the manifest this is designed to be packaging-agnostic
  against; the same manifest drives both benchmarks.
- [[money-is-2dp-everywhere]] — the invariant this narrows to a single rounding site.
