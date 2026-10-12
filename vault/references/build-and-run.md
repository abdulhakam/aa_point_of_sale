---
title: Build and run
type: reference
status: active
system: both
created: 2026-09-26
updated: 2026-10-05
tags: [pos, build, run, windows, bat, scripts]
related_to: ["[[environment]]", "[[backend]]", "[[cutover-is-guest-only]]", "[[route-snapshot-was-snapshotting-redirects]]"]
---

# Build and run

How the system that runs is started, and what it needs first. Everything is Windows; the `.BAT`
files are the supported entry points.

> **Rebuilt 2026-10-03.** This document had lost every newline in its body — the whole thing was one
> 8,629-character line. It has been re-split into blocks and re-wrapped. See
> [[three-reference-docs-lost-their-line-structure]].
>
> **Corrected at the same time:**
>
> - **The legacy half below is historical, not runnable.** `backend/` and `frontend/` were deleted
>   from git on 2026-09-29 (`c167d311`). The three `backend\*.BAT` scripts each `cd ../frontend` and
>   run `npm`, so **all three are dead**; and there is no `npm` project to run them in. The scripts
>   are kept because they document what the legacy pair did. See [[cutover-is-guest-only]].
> - **There is one system to start, not two.** The "start order" below is really "start TrailBase".
> - **The smoke count is no longer hard-coded here.** It used to read "The current figure is 76/76",
>   which was already wrong when written. See [[smoke-count-is-not-a-hard-coded-number]].

## How a report is served (manifest-first, since 2026-10-03)

There is **no report registry in JavaScript**. Each report page's `meta.json` declares everything the
report is, next to the page it renders:

```json
"compute": { "report": "paymentsbycompany" },
"spool": {
  "sql":    "payments_by_company.sql",     // under app/reports/sql/reports/
  "binds":  { "agg": "difference" },        // report CONSTANTS the statement binds but no caller sends
  "row":    ["id", "date", "type", ...],    // SELECT order — a contract the host asserts on width
  "totals": { "cents": { ... }, "derived": { ... } }
}
```

`app/lib/spoolreports.js` is a **loader**: it walks `app/pages/**/meta.json` through the host `fs`
global, builds the registry once, caches it, and then does what it always did — read the `.sql` file the
manifest names, bind the statement's own parameters, hand the spool key to the renderer. `names()` and
`totalsSpec()` are async because the registry is built on first use.

What this removed: the hand-written `REPORTS` table (14 entries of `sql`, `cols` and totals rules) and
four shared SQL fragments — `PAY`, `SALES`, `BYCOMPANY`, `ITEMSALES` — which existed because three
reports share `payments.sql` *and* its totals buckets. Those buckets now live in each manifest.

Two consequences worth knowing before editing anything:

- **The `.sql` file's SELECT order and `spool.row` are a contract.** `db::query` returns positional
  vectors with no column metadata, so a forgotten or reordered column is a loud error, never a
  mislabelled cell. `tools/sync-manifests.mjs` regenerates `spool.row` from the statement.
- **`binds` is not a user filter.** `salesOnly` (`salesreport`, "unpaid recieving/return only") and `agg`
  (`stockreport` vs `difference`, which share one statement) describe the *report*. Omitting one leaves
  the statement unrestricted, so only the row count changes — which reads as a data defect rather than a
  missing bind.

## Start order

```text
1. trailbase\RUN.BAT     TrailBase :4000  — serves the record APIs *and* the whole app
```

That is the entire start order. ⚠️ The legacy entry points that used to be listed here
(`backend\DEV.BAT`, `backend\RUN NEXTJS.BAT`, `backend\RUN SERVE.BAT`) are dead — they shell into a
`frontend/` that no longer exists.

The guest app has no separate process and **no separate port**: it is a component of the single
TrailBase server, served from `:4000` ([[runtime-js-guest-platform]]). Port table:
[[environment]].

## One launcher: `aa.bat`

Every step below is also reachable through a single menu at the repository root, so you do not
have to remember which `.bat` holds which task:

```bat
aa            rem interactive menu
aa run        rem trailbase\RUN.BAT
aa build      rem trailbase\build.bat
aa panel      rem trailbase\controlpanel\run.bat
aa import     rem trailbase\import.bat (WIPES business tables)
aa cleardb    rem trailbase\clear_db.bat
aa devreset   rem trailbase\devreset.bat
aa dist       rem trailbase\dist.bat
```

`aa.bat` only dispatches to the scripts documented below; they still call each other
(`devreset.bat` → `clear_db.bat`, `RUN.BAT` → `clear_db.bat`/`build.bat`) and remain the source
of truth for what each step does.

## TrailBase — the system that runs

### `trailbase\RUN.BAT`

```bat
if not defined DEPOT set "DEPOT=traildepot"
if not defined ADDRESS set "ADDRESS=127.0.0.1:4000"
set "ADMIN_USER=admin@localhost"
set "ADMIN_PASSWORD=administrator-0ne"
```

What it does:

1. **First run only** (when `%DEPOT%\data` does not exist): calls
   `trail user change-password %ADMIN_USER% %ADMIN_PASSWORD%`. That command initialises the depot
   from `config.textproto` + `migrations/`, creates the admin user **and** sets the fixed password —
   all before a server starts, so nothing races initialisation. If it fails it prints a warning with
   the manual command instead of dying.
2. **Syncs `runtime\` and `migrations\` into `%DEPOT%` on every start**, with `/MIR`. This is
   unconditional and deliberate: `RUN.BAT` used to sync only when the depot was *created*, so an edit
   to `runtime\` was silently not served and you got the page from whenever the depot was last
   built. `%DEPOT%\runtime` is what `--runtime-root-fs` points at, so this copy is the live app.
3. Starts the server with `start "" trail "--depot=%DEPOT%" run --address=%ADDRESS%`.
4. Polls `netstat -a -n -p tcp | findstr %ADDRESS% | findstr LISTENING` up to 30 times (~30 s), then
   opens `http://%ADDRESS%/_/admin/`. If nothing is listening it prints a warning telling you to
   check the TrailBase console — rather than opening a tab that cannot be reached.

Environment overrides, each quoted so no trailing space is kept:

```bat
set "DEPOT=C:\some\depot" && RUN.BAT
set "ADDRESS=127.0.0.1:4001" && RUN.BAT
```

⚠️ **Delete `traildepot\data\` before a re-scaffold** if you previously ran an older version of this
scaffold. Refinery silently *skips* a migration whose checksum changed, so a stale depot keeps the
old schema. See [[trailbase-stale-depot-skips-migration]].

⚠️ **`RUN.BAT` must not be used on a prepared depot that has lost its `config.textproto`.** Its
first branch calls `clear_db.bat`, which **wipes `traildepot\data\`** — the 60,245 imported
production records.

### Guest-WASM platform (the frontend)

The depot is assembled from the checked-in sources and the built component by two `.bat` files, then
served by TrailBase itself ([[runtime-js-guest-platform]]):

```powershell
# 1. reset traildepot/ from the checked-in sources (WIPES THE DATABASE)
trailbase\clear_db.bat
# 2. build the Rust host (Rust + wasm32-wasip2 + QuickJS via rquickjs + minijinja), copy it in
trailbase\build.bat            # -> traildepot/wasm/tb-ah-run-js.wasm
# 3. start the server
trailbase\RUN.BAT              # trail --depot=traildepot run --runtime-root-fs=traildepot/runtime
```

- `--runtime-root-fs=traildepot/runtime` is **load-bearing**: it is the WASI sandbox root, so the
  app's `app/` and `ahscripts/` live under it. It points at the **generated copy**, not at
  `trailbase/runtime/` — which is why `RUN.BAT` syncs on every start. Keeping it a subdirectory (not
  the depot root) keeps the depot's `data/` and `secrets/` out of the guest sandbox
  ([[trailbase-guest-wasm-runtime-defaults]]).
- `trailbase/` is the source of truth: `config.textproto`, `metadata.textproto`, `migrations/`,
  `tb-ah-*/` = the compiled Rust crates, `runtime/` = the editable app, `tools/` = the harnesses.
  `traildepot/` is generated from it.
- Do **not** pass `--aot`: it doubles the size and is 2.3× slower to cold-load
  ([[trailbase-guest-aot-startup-cost]]).
- The Phase-0 spike guest is **gone**: `guests/` was deleted on 2026-09-28, so the port `4001` depot
  no longer exists ([[runtime-js-guest-platform]]).
- Ports, depot paths and the harness list are in [[environment]].

### Deploying an app change to the production depot (the safe path)

`clear_db.bat` wipes `trailbase\traildepot\data` — the 60,245 imported production records — so it is
**not** the way to push an edit. Sync the source across and restart:

```powershell
robocopy trailbase\runtime    trailbase\traildepot\runtime    /MIR /NFL /NDL /NJH /NJS /NP
robocopy trailbase\migrations trailbase\traildepot\migrations /MIR /NFL /NDL /NJH /NJS /NP
trail --depot=traildepot run --address=127.0.0.1:4000 --runtime-threads=4 --runtime-root-fs=traildepot\runtime
```

- **The restart is required for anything under `app/lib/`.** Modules are loaded once per QuickJS
  context and cached on `globalThis.__AA_MODS__`, so a new export only appears after a restart —
  otherwise the screen fails with `not a function` / `cannot read property … of undefined`. Edits to
  `app/views/*.html`, `app/public/**` and to `ahscripts/routes/_app/route.ts` hot-reload.
- Sync `migrations/` too. On 2026-09-29 the depot was found **missing** `config.textproto` and
  missing one migration file, and the server refused to start at all — the repair and the diagnosis
  are in [[production-depot-could-not-be-started]].

### Loading v1 data directly (file-to-file)

Stop the server, then run the standalone TUI importer — it writes `traildepot\data\main.db` itself,
so `created`/`updated` are preserved from the PocketBase source and `invoice_maker` is attributed
to a chosen `_user`:

```powershell
node trailbase\tools\import-v1-tui.mjs --wipe --dest trailbase\traildepot\data\main.db --source legacyforparity\backend\pb_data\data.db
```

For a from-scratch reload, `trailbase\devreset.bat` does `clear_db.bat` **plus** re-places the
prebuilt guest-wasm into `traildepot\wasm\` (from `target\wasm32-wasip2\release\`, falling back to
the components already in the depot), so no `cargo build` is needed; `trailbase\import.bat` then
runs the importer with `--user admin@localhost --wipe --yes` and initialises `data\main.db` first if
it is missing. Order: `devreset.bat` → `import.bat` → `RUN.BAT`.

`--dry-run` first if unsure; `--yes` skips the setup screen; `--plain` prints plain lines. The tool
takes a write lock on `main.db`, so a running server is the only source of `SQLITE_BUSY`
([[v1-direct-import-tool]]).

### Verify

All the harnesses live in `trailbase/tools/`. The Node-comparative ones (`guest-parity.mjs`,
`perf-compare.mjs`) were deleted with `frontend-ssr`; the parity results they produced are recorded in
[[guest-app-host-port]] and can no longer be reproduced
([[guest-parity-differential-not-reproducible]]).

| Command | Checks | Needs a running server? |
|---|---|---|
| `node trailbase/tools/guest-smoke.mjs` | boots its own depot on `:4322`, seeds the smoke dataset, asserts every screen, the write paths and the create-from-the-invoice flow. **91 checks** | **no** |
| `node trailbase/tools/route-snapshot.mjs` | status + content fingerprint for **49** routes — the refactoring gate for [[tb-0030-retire-the-route-ts-dispatcher]] | yes — `--base`, `--email`, `--password` |
| `node trailbase/tools/route-coverage.mjs` | **every** method+path branch — **77**, GET and POST — probed for reachability against `route-inventory.json`. Cleans up its own fixtures; a cleanup failure fails the run | yes — `BASE`, `EMAIL`, `PASSWORD` |
| `node trailbase/tools/write-paths-check.mjs` | a conditional write, an unconditional write and a delete, each **read back after** — `route-snapshot` issues GETs only, so this is the only gate that can see a helper whose whole job is to run *after* a mutation | yes — `BASE`, `EMAIL`, `PASSWORD` |
| `node trailbase/tools/jobs-check.mjs` | durable queue, idempotency, worker fan-out, poller (`POLLER_TEST=1`) | yes — `GUEST_BASE`, default `http://127.0.0.1:4003` |
| `node trailbase/tools/management-check.mjs` | management create/update/delete | yes — same default |
| `node trailbase/tools/invoice-check.mjs` | context + ETag, idempotent create/lines, lease, complete | yes — same default |
| `node trailbase/tools/verify-spool-report.mjs` | the ported report SQL vs `compute/`, on 6 data-derived filter cases — **the gate for the spool path** ([[spooling-report-rows-through-kv]]) | no (`DEPOT_DB`, read-only) |
| `node trailbase/tools/verify-prelude.mjs` | the shared SQL prelude vs `compute/views.js` — run it before trusting any report statement | no (`DEPOT_DB`, read-only) |
| `node trailbase/tools/verify-spool-reports.mjs` | **all 14 spooled reports** vs `compute/reports.js`: row count, display fields, money columns, order, the SQL totals statement, **every declared bind** (72), page-column keys, and one-sided columns | no (`DEPOT_DB`, read-only) |
| `node trailbase/tools/check-report-pages.mjs` | the **live** report pages and page payloads, and the two against each other — the only check that sees a filter bound on one path and not the other | yes (`:4000`) |
| `node trailbase/tools/sample-filter-ids.mjs` | real party/booker ids + the import date, for driving report filters from a check — never hand-type a 16-byte BLOB id | no (`DEPOT_DB`, read-only) |
| `node trailbase/tools/check-money-text.mjs` | every money **TEXT** keeps 2dp incl. trailing zeroes — the parity gate compares numbers, so this catches a text field that lost its `.00` | no (`DEPOT_DB`, read-only) |
| `node trailbase/tools/check-money-text-in-guest.mjs` | the same, evaluated **in the guest**, plus which SQL functions it has — node:sqlite and the guest disagree | yes (`:4000`) |
| `node trailbase/tools/regen-round2.mjs` | regenerate every `round2` from the verified CAST-only template (the guest SQLite has **no** `floor()`) | writes `.sql` |
| `node trailbase/tools/sync-manifests.mjs` | derive each report's column manifest from its statement's final SELECT | writes `spoolreports.js` |
| `node trailbase/tools/report-bench.mjs` | time the reports through the spooled path | yes |
| `node trailbase/tools/db-digest.mjs` | **whole-database digest**: per-table row counts and money/quantity sums, legacy `pb_data` against the depot — **added 2026-10-04**. Money is compared at whole paisas *per value*, which is the only comparison the two schemas' 2 dp rule makes meaningful | no (reads both `data.db` files read-only) |
| `node trailbase/tools/report-sweep.mjs` | **whole-database report sweep**, both systems, one date range: `--guest` times each report page and its `/p/<slug>/data`; `--legacy` replays each compiled bundle's `fullList` calls page by page. `--repeat N` for the best of N | yes — `--guest-base`, `--pb-base` |
| `node trailbase/tools/report-sql-time.mjs` | the same composed statements run **directly against SQLite**, so a report that 500s at the 20 s deadline can still be measured. `--repeat` matters: a cold run on a fresh import is 2–3× the warm cost | no (`DEPOT_DB`, read-only) |
| `node trailbase/tools/report-sql-provenance.mjs` | **proves the report path is SQLite.** Fetches each page's `/data` and runs the same statement against `main.db`, comparing row for row, in order, every column — 10 of 14 pages byte-identical. Exits non-zero on a real difference | no — needs the guest up **and** read access to `main.db` |
| `node trailbase/tools/feature-parity.mjs` | every screen the legacy bundle can serve, against the guest's routes. Has **no `MISSING` verdict** on purpose — the apps name the same screen differently, so an unmatched screen is `candidate`/`unmapped` for a human to decide | no — reads the bundle and the dispatcher, makes no requests |
| `node trailbase/tools/hotkey-check.mjs` | **drives the keyboard layer with real keystrokes** in headless Chrome over CDP, and asserts the three rules it promises — on `/dashboard`, `/invoices`, `/management/parties`, a report, a report hub and a ledger with no table. **62 checks.** Needs Chrome; pass `--chrome <path>` if it is not in the default place | yes |
| `node trailbase/tools/print-queue-check.mjs` | **drives the print queue in real headless Chrome over CDP**: the picker's live preview, add-to-queue (dedupe by invoice number), the rail, "Print Invoices" → `/print/queue?ids=…` with one A5 sheet per invoice, remove and clear. **14 checks** ([[print-queue-parity-fix-2026-10-08]]). Needs a running, seeded server and Chrome | yes |
| `node trailbase/tools/grid-preview-check.mjs` | the invoice grid's live preview: a line edit moves the line and the total, an invoice Discount % moves every line, a Discount Rs moves only the total, and **the browser's total equals the server's** (by loading once with scripting disabled). 14 checks | yes |
| `node trailbase/tools/autocomplete-check.mjs` | the searchable combobox, driven with **real keystrokes**: typing narrows, Enter picks, and — the assertion that matters — **the form still posts the id the server expects**, and a pick still fires the `change` the invoice grid depends on. Also the create row, the panel it opens, and that a CLOSED panel is inert (disabled, so an abandoned create cannot submit). 39 checks, submits nothing | yes |
| 
ode trailbase/tools/client-cost.mjs` | **per-keystroke cost on the real database** — the table filter, the `<select>` filter, the grid recalculation and the row cursor. A measurement rather than a pass/fail, and re-runnable to compare against [[minimise-client-side-calculation]] | yes |
| `node trailbase/tools/ui-capture.mjs --system guest\|legacy\|both` | **captures BOTH apps at 1600×900** with one neutral, class-free extractor, into `vault/attachments/ui-capture/<system>/`, writing a `.png` and a `.structure.json` per screen. The legacy arm needs `--legacy-user` and `--legacy-password`; they are **not defaulted and not recorded in this repository**. `--only <substring>` narrows it | yes |
| `node trailbase/tools/ui-parity-report.mjs` | diffs the two capture directories screen by screen — tiles, headings, buttons, table headers, form labels, inputs, and the computed metrics that decide whether two screens look alike. Always exits 0: a difference is a **candidate**, not a verdict | no |

⚠️ `ui-capture.mjs` writes PNGs into `vault/attachments/ui-capture/`, which is **committed**. Re-running
it overwrites them, so a diff of that directory is the visual-parity history. It captures the legacy app
**live**, given its login — the legacy credentials are held by the operator, not written here, because
`vault/credentials/` is **not** covered by `.gitignore` and this repository has a GitHub remote.

⚠️ Two waits in that tool were wrong before they were right, and both failed by producing a *confident*
answer rather than an error: a "page has loaded" wait on `innerText.length > 200` (true within a second of
a client-rendered app starting, so six screens compared against an empty table), and a login wait on
`!pathname.includes("login")` when the legacy login path is **`/auth`** — true on the login page itself,
so one run captured twenty-eight screens as an anonymous visitor. It now waits on in-flight requests,
records `_settled` per capture, and re-verifies the session after a navigation. See
[[ui-parity-discrepancies-2026-10-05]] Part 2.

⚠️ `report-sql-provenance.mjs` needs the **depot's** `main.db`, so stop the server first or accept that
the read-only connection sees committed data only. It is the one tool here that must not be run against a
`p_data` stub — see below.

⚠️ **Never run `--guest` and `--legacy` sweeps at the same time.** The legacy arm saturates the machine
for about an hour, and a contended guest run inflated its own statements by 4× (`salesreport` 4.6 s →
150 s) on 2026-10-04 — enough to make every number in the note wrong. See
[[report-cost-on-a-whole-database]].

⚠️ **The legacy oracle is `legacyforparity/backend/pb_data/`, not `p_data/`.** The working-tree
`p_data/data.db` is a 745,472-byte stub with every business table empty, so any comparison naming it
is against nothing and **cannot fail**. The full data is in `pb_data` and in the git blob
`c167d311^:backend/p_data/data.db`. See [[fresh-import-and-whole-database-digest-2026-10-04]].

⚠️ **The legacy app's URLs are prefixed `/app`** — `/app/reports/payments`, not `/reports/payments`.
The latter is a confident 404.
| `pwsh -File trailbase/tools/run-spool-sweep.ps1` | spooled vs rows-through-`sqlite.all` in the real guest, **byte-identity asserted**; needs a server on `:4000` | yes |
| `node trailbase/tools/diff-spool-html.mjs` | the first byte where two arms differ, with context; needs a server | yes |
| `pwsh -File trailbase/tools/run-spool-bench.ps1` | the same A/B for a single report | yes |

⚠️ **Do not trust a harness that reports success — read what it asserted.**
`route-snapshot.mjs` reported "45 routes, 0 erroring" for months while snapshotting login redirects
because it omitted `redirect: 'manual'` on the login call. See
[[route-snapshot-was-snapshotting-redirects]] and
[[smoke-count-is-not-a-hard-coded-number]].

⚠️ **`route-snapshot.mjs` cannot currently be pointed at the development depot.** Its default
password is the `RUN.BAT` development default, and the production depot's admin password is not that
value (a login returns `400`). Point it at a throw-away depot, or supply `--password`. Details and a
working invocation in [[route-snapshot-was-snapshotting-redirects]].

### Other useful CLI commands

| Command | Purpose |
|---|---|
| `trail --depot=./traildepot run` | plain start (no credential bootstrap, no bind override) |
| `trail --depot=./traildepot schema items` | export a record API's JSON schema |
| `trail --depot=./traildepot schema invoices` | `invoices.type` is `{"type":["null","integer"]}` |
| `trail --depot=./traildepot user change-password …` | set a password without running the server |

Installing the binary, once: `iwr https://trailbase.io/install.ps1 | iex` (Windows) or
`curl -sSL https://trailbase.io/install.sh | bash` (Unix).

The Node `frontend-ssr` process that used to sit here was removed on 2026-09-27
([[guest-ui-is-a-direct-shift-of-legacy]]); its `RUN.BAT`, `.env` and `npm run smoke` no longer
exist.

## Prerequisites

| System | Needs |
|---|---|
| `trailbase` | the `trail` binary on `PATH` (`iwr https://trailbase.io/install.ps1 \| iex`) |
| `trailbase/tb-ah-*` (guest crates) | Rust with the `wasm32-wasip2` target; `trailbase\build.bat`; Node for the tools. The host's own documentation is `trailbase/tb-ah-run-js/README.md` — ⚠️ **not** `host/README.md`, which does not exist. The crates share one `Cargo.lock` and one `target/` at `trailbase/target/`; there is no per-crate `target/` |
| ~~`backend`~~ | ⚠️ **cannot be built** — no source. The `pocketbase.exe` binary survives at `legacyforparity/backend/` and can still be *run* for parity comparison |
| ~~`frontend`~~ | ⚠️ **cannot be built** — the source was deleted; only the compiled bundle at `legacyforparity/standalone/` survives |

## Data directories (do not commit)

| Path | Status |
|---|---|
| `legacyforparity/` | ⚠️ **git-ignored, untracked, and the only copy in existence** — the parity oracle and the legacy databases. See [[cutover-is-guest-only]] |
| `legacyforparity/backend/p_data/` | ⚠️ was **tracked in git history** (`c167d311^`) and is **not** purged — see [[pocketbase-data-dirs-in-git]] |
| `legacyforparity/backend/pb_data/` | untracked; `data.db` ≈ 18 MB, the larger of the two legacy databases |
| `trailbase/traildepot/data`, `backups`, `uploads`, `secrets`, `wasm` | git-ignored by `trailbase/.gitignore` |
| `trailbase/target/`, `trailbase/.tbdemo-guest/` | build output and the smoke test's throw-away depot; git-ignored |
| ~~`frontend/.env.local`, `.next/`, `out/`~~ | ⚠️ **no longer ignored** — the root `.gitignore` rules for `/frontend/...` were replaced by `/legacyforparity/` on 2026-09-29. Nothing under `frontend/` exists, so this is inert, but a restored tree would be untracked-and-unignored |

## Credentials

⚠️ **`vault/credentials/` is currently empty** — it has no documents, and the logins it was meant to
hold are therefore not recorded anywhere in this vault. The only credential this document states is
the TrailBase **development** default set by `RUN.BAT` on first run
(`admin@localhost` / `administrator-0ne`), which is documented as such and is **not** the production
depot's password. See [[environment]] § *Credentials*.

## Related

- [[environment]] — ports, env vars and credentials in one table.
- [[trailbase]] — what the server actually exposes once it is up.
- [[runtime-js-guest-platform]] — the frontend being started.
- [[cutover-is-guest-only]] — why the legacy entries above are historical rather than live.