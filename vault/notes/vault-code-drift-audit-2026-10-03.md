---
title: Vault/code drift audit, 2026-10-03
type: note
status: active
created: 2026-10-03
tags: [vault, audit, drift, paths, verification]
belongs_to: "[[vault-guide]]"
related_to: ["[[cutover-is-guest-only]]", "[[smoke-count-is-not-a-hard-coded-number]]", "[[three-reference-docs-lost-their-line-structure]]", "[[route-snapshot-was-snapshotting-redirects]]"]
---

# Vault/code drift audit, 2026-10-03

A mechanical pass over every filesystem path the vault cites, plus the claims that are cheap to
re-verify. Method and per-path results are recorded so the next pass can diff against them.

## Method

`tools`-free Node script over `vault/**/*.md`: every `` `…` `` span that starts with a known
repo root (`trailbase`, `frontend`, `backend`, `legacyforparity`, `guests`, `scripts`, `vault`,
`dltbl`, `standalone`, `host`, `full_database_schema`), excluding fenced code blocks, tested with
`existsSync`. **378 distinct citations across 194 documents: 191 resolve, 187 do not.**

⚠️ **187 is not 187 defects.** The matcher cannot tell a path from a Rust path, a glob, or a brace
expansion, so the raw number overstates the problem badly. What follows is the triaged list.

## Real defects found

### 1. `host/` does not exist — it is `trailbase/tb-ah-run-js/`

**31 citations** across the vault, plus **the plan this audit was written from**, which names
`host/src/lib.rs`, `host/src/api.rs`, `host/src/init.rs`, `host/src/runtime.rs`, `host/src/render.rs`
and `host/README.md`. The real paths are `trailbase/tb-ah-run-js/src/lib.rs` etc., and the host's
README is `trailbase/tb-ah-run-js/README.md`. The crate was renamed and split into three
(`tb-ah-run-js`, `tb-ah-render-jinja`, `tb-ah-query-tbdb`) by
`components-are-named-tb-ah`, which is why the old name persisted — **including in the plan.**

`components-are-named-tb-ah.md:67` records that a `.gitignore` rule counted whitespace as part of a
pattern, so `host/target/` matched nothing. That is a **second, independent** reason the old name is
confusing here.

### 2. `trailbase/tb-ah-run-js/target/` does not exist

`trailbase/target/` exists; `trailbase/tb-ah-run-js/target/` does not. The three `tb-ah-*` crates are
one cargo **workspace**, so they share one `Cargo.lock` and one `target/`. **3 vault citations are
wrong**, including the one I wrote into `references/environment.md` earlier today.

### 3. `app/reports/sql/views/` is now `app/reports/sql/reports/`

**13 citations** use the old `views/` directory name. The files are at
`trailbase/runtime/app/reports/sql/reports/*.sql`.

### 4. `compute/reports.js` is gone; `compute/views.js` is **not** dead

**44 citations** reference `app/compute/reports.js`. That file no longer exists — it was retired when
reports moved to SQL. `git show 04cd42b:trailbase/runtime/app/compute/reports.js` still recovers it,
which is why the citations have survived: they read as historical pointers and are not wrong as such,
but any that describe it as the *current* engine are.

⚠️ **The more important finding is the one that is not a path error.** `compute/views.js` is often
described as dead code awaiting deletion. It is not:

| Importer | What it takes |
|---|---|
| `lib/pages.js` | `viewClosure` |
| `lib/reports.js` | `buildView`, `viewClosure`, `tablesForViews`, `viewsAffectedBy`, `VIEW_ORDER` |
| `tools/verify-prelude.mjs` | six builders |
| `tools/verify-spool-reports.mjs` | six builders |

So deleting it is a **refactor with a prerequisite** — `viewClosure` has to move into the SQL layer
first, or four modules break and both report gates stop running. Any task that lists "delete
`compute/views.js`" as a single step is wrong about the order.

### 5. `app/.eslintignore` does not exist

The plan's *Risks* section states this file is "confirmed present on disk". It is not:
`trailbase/runtime/app/.eslintignore` returns false, and there is no dotfile at all under
`trailbase/runtime/app/`. Any plan step that moves it is a no-op.

### 6. `verify-spool-reports.mjs` could never run to completion

**Found and fixed.** Line 94 was `const PAGES_DIR = "runtime/app/pages"` — a bare relative path
resolving against `process.cwd()`, while every sibling path in the file uses `join(repo, …)`. The
documented invocation (`node trailbase/tools/verify-spool-reports.mjs` from the repo root) walked all
14 reports, printed 14 green lines, and then died on the first page lookup with a raw `ENOENT`.

Worse than a plain failure: **a gate that goes green and then throws trains you to ignore it.** Every
row said `ok`, the summary was one line away, and the crash looked like noise. It only worked if you
happened to `cd trailbase` first. Fixed to `join(repo, …)` with an explicit existence check.

Gate now runs to completion:

```text
14 passed, 0 failed, 0 not ported
totals compared against the column they print: 13
binds verified: 72 (each proved to reach its statement, and to narrow it where a real id exists)
  totals: 15 proven the exact paisa sum of their rows, 26 corroborated by a second construction
```

### 7. `references/reports-and-ledgers.md` documents an engine that no longer exists

Its opening says the arithmetic "is reimplemented in JavaScript in `app/compute/views.js` and
`app/compute/reports.js`", and §"Derived views rebuilt in JavaScript" presents a 14-builder table as
the current architecture. The reports run on **SQL** (`app/reports/sql/`). The document's *arithmetic*
is still the best description of the rules; its *architecture* is a generation behind.

## Verified correct (the cheap claims, re-checked)

| Claim | Result |
|---|---|
| Report inventory | **14 pages** = 10 reports (`pages/reports/`: dailysale, difference, itemsales, outstanding, payments, paymentsbycompany, productsale, profit, salesreport, stock) + 4 ledgers (`pages/ledgers/`: area, booker, general, party) |
| `spoolreports.js` keys | **10** — the reports only; ledgers are not spool keys |
| Report `.sql` files | **11** under `app/reports/sql/reports/` — three reports share a file with another |
| Migrations | **14** under `trailbase/migrations/main/`, `U1790208000` … `U1790600000` |
| Host crate | `tb-ah-run-js/src/` = api, api.rs, config.rs, init.rs, jobs.rs, lib.rs, render.rs, runtime.rs, spool.rs, ts_transform.rs |
| Two `sql` directories | `app/sql/` (latest_business_date, refs) and `app/reports/sql/` (prelude + reports) — both real, different things |
| Four systems framing | Restated in `vault/README.md`: legacy pair = **production and frozen**, guest = replacement |

## Why the vault drifts

Three distinct causes, and they need different fixes:

1. **A rename that was recorded in one note and not applied elsewhere.** `host/` → `tb-ah-run-js/` is
   the worst case: 31 citations, and the plan repeated it. A mechanical sweep over 194 documents is
   not something a session reliably does by hand.
2. **A document that could not be edited.** The collapsed-line defect
   ([[three-reference-docs-lost-their-line-structure]]) meant corrections to `environment.md` and
   `build-and-run.md` were simply skipped, so they carried the port and migration errors for days.
   **Fixing editability fixed correctness as a side effect.**
3. **A number quoted as if it were stable.** Six contradictory smoke counts accumulated
   ([[smoke-count-is-not-a-hard-coded-number]]), and two gates asserted success without asserting the
   thing ([[route-snapshot-was-snapshotting-redirects]], §6 above).

The generalisable rule is the vault's own: *settle a structural claim with the artifact that owns it.*
Every error above was a document asserting something about code, where opening the code would have
answered it in seconds. The path sweep is now a script, so it can be a gate.

## Recommended (not done — the vault has no place to run a gate)

A `paths.mjs` in the vault tooling, run like `check.mjs`, that flags a `host/`-style citation whose
target does not exist **unless** the containing sentence is dated or the note is in `decisions/` and
the path is inside a "supersedes"/"retired" construction. The triage above is exactly the rule set it
would need; automating it is what stops the next rename from taking 31 citations with it.

## Verdict on "move the tables to manifests"

Asked directly, mid-session: **reduce the number of JS/TS files and put declarations in
`meta.json` wherever possible.** Applied to every hand-written table found:

| Table | Was | Now |
|---|---|---|
| `ENTITIES` — 6 screens, 20 fields, 20 columns | `app/lib/entities.js`, 116 lines of near-pure data | **`app/manifests/entities.json`**, generated from the module and read back by it |
| `ENTITY_ORDER` — the hub's display order | a second literal in the same file | **inside the manifest**, beside the table it orders |
| `CONTENT_TYPES` — a MIME table | a literal in `route.ts` | **`app/manifests/content-types.json`** |
| `JOBS` — three jobs | `app/lib/queue.js` | **left alone, deliberately** — see below |

`app/manifests/index.js` reads them once at start-up and caches. `app/lib/entities.js` shrank from
116 lines of data to a 60-line installer that keeps `ENTITIES` a plain object.

### Why `JOBS` did not move

Each of the three jobs is a `steps()` function plus handlers — `demo.count` computes its step list
from its input, `invdoc.rebuild` calls the invoice-document module, `print.run` fans out over invoice
ids. That is **behaviour**, not data, and putting it in a manifest would be a category error: the
manifest would need code in it to mean anything, which is the thing the direction is moving away from.

The split that *would* help, when someone wants it: the job **metadata** (label, whether its steps are
idempotent, a retry ceiling) is data and belongs in `jobs.json`; the `steps()` bodies stay in
`queue.js`. Nothing needed it yet, so nothing was split.

### The shim limitation this exposed, and it is worth knowing

`export let` **cannot be reassigned after load.** The ESM shim builds the export object with
`__exports[n] = typeof n !== "undefined" ? n : undefined` — a snapshot of the value at load time — so
a module-level `let` that `install()` updates leaves `exports.X` pointing at its initial value.

The symptom was quiet and the gate missed it: `install()` set the order, every entity **screen**
rendered correctly from the manifest, and `route-coverage` still reported **77/77** — while
`/management` listed **no entities at all**. Found by loading the hub and looking at the HTML.

The fix is `order()` returning the live value, which is the only shape the shim supports for "set
after load". **Any manifest-backed value that is installed rather than declared must be reached through
a function.**

### The other thing this cost

The manifest is **generated from the module and read back by it**, not retyped. That is what makes
"there is one declaration" true rather than aspirational — and it is why `ENTITY_ORDER` moved into the
manifest: as two separate literals in one file they were already free to drift, and `install()` now
rejects a manifest whose order names a missing entity or omits one.

### The second sweep: the schema contract, and a gate that left debris

| Table | Was | Now |
|---|---|---|
| `TABLES` — 16 base tables | a literal in `app/lib/data.js` | **`app/manifests/schema.json`** |
| `RELATIONS` — 19 foreign-key columns across 9 tables | same module | same manifest |
| `BOOLEANS` — 8 columns across 7 tables | same module | same manifest |

`data.js` keeps `normalizeRow()` — which reads the second and third — and gains `install()`,
`ready()`, `relationsOf()` and `booleansOf()`. `TABLES` is **mutated** (`length = 0; push(…)`), not
reassigned, because `reports.js` captures a reference by destructuring at import time; reassigning
would leave it holding an empty array and every fingerprint probe would cover zero tables — which reads
as "the data never changes" rather than as a bug. Verified: `/reports/status` reports **16**
fingerprints, matching the manifest exactly.

`app/manifests/index.js` gained `loadAll()`, so a **missing** manifest fails at start-up with its name
rather than at the first request that needs it.

#### The gate left seven junk items, and nothing noticed for hours

`route-coverage.mjs` created **seven items with an empty name** across seven early runs — before
`/inventory/save` learned to reject a body with no `name`. Its `mutates` flags only covered the two
routes that declared them, and its cleanup only removed sections and expenses.

The visible symptom was a `route-snapshot` diff reporting **"5 differences"** that were the gate's own
rows: the items page quietly grew from 2 rows to 8, which showed up in `/inventory`, `/management/items`,
`/reports/difference` and `/reports/stock`. **`guest-smoke` passed throughout** — it seeds its own
depot, so it cannot be the thing that changed, and that is what identified the cause rather than the
diff.

Two lessons, one of them about the gate rather than the vault:

1. **A gate that leaves debris poisons the next gate.** The diff was reporting real differences; they
   were just not about the code.
2. **The fix is in the tool, not in the notes.** `route-coverage` now checks its own aftermath — it
   re-reads `/management/items` and fails if any row has an empty name or the `coverage-probe` marker.
   It does not trust the inventory's `mutates` flags, because those are the thing that was incomplete.
   It is called "aftermath" and it says so when it fires:

   ```text
   LEFTOVER: 7 item(s) with an empty name and 0 "coverage-probe" row(s) in the depot. A create
   route accepted a request it should have rejected, or cleanup missed a table. This WILL show
   up as phantom differences in the next route-snapshot diff.
   ```

An empty-name row is the exact shape of *"a create route accepted a request it should have
rejected"*, which is why it is the thing asserted on rather than a count of markers.

**A separate slip worth recording:** the seven rows were first "cleaned" in a *copy* of the depot file
rather than the depot, and the aftermath check caught it immediately. I had been reading the copy to
count rows all session and confused it with the live one at the moment it mattered.

#### What was surveyed and deliberately left alone

`JOBS` (behaviour), and the remaining `const` in every module: path constants, SQL fragments, column
lists that belong to a specific statement, and the `named()`/`money()`/`uuidHex()` helpers. The
criterion applied throughout: **a manifest entry may not need code to mean anything.** `JOBS` fails
that test; `SCHEMA`, `ENTITIES` and `CONTENT_TYPES` pass it.

### Third sweep: static mounts, and a corrupted comment

| Table | Was | Now |
|---|---|---|
| Static mounts — 3 prefixes, 3 directories, 1 index fallback | three near-identical branches in `route.ts` | **`app/manifests/static-mounts.json`** |

`route.ts` lost three branches and two constants (`PUBLIC_DIR`, `COMPUTE_DIR`); `PLUGINS_DIR` stays
because the `/plugins` **index** walks the directory, which is code. `routeKit.resolveMount()` decides
*where from*; the caller still reads.

**Why the `..` refusal mattered enough to centralise.** Three branches each repeated
`if (!rel || rel.includes("..")) return text("Not found", 404);` — and a guard written three times is a
guard that ends up present twice and absent once. Refusing `..` is a security property, not a per-route
detail: a mount that does not refuse it serves the whole depot to anyone who asks for
`/static/../../data/main.db`. It is in one place now.

Verified **authenticated**, which is the case that matters — unauthenticated traversal is caught by the
auth gate and never reaches the mount, which is a better outcome but a weaker test:

```text
404  /static/../../data/main.db          404  /compute/../manifests/schema.json
404  /static/../lib/refs.js              404  /plugins/../app/public/css/app.css
200  /compute/format.js                  200  /static/css/app.css
```

#### A third damaged file, found by reading rather than by a gate

`app/lib/route-kit.js` line 1 read:

```js
// Guest route helpersABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_
```

**The base64 alphabet, pasted onto the end of a comment.** Harmless at runtime and invisible to every
check, because it is a comment — and notably the same file's own "ID ENCODING" note is *about* that
alphabet, so the text was available to be pasted by accident.

That is the third damaged-file instance in this session: `route.ts`'s collapsed `parsePairs` line, and
the two vault documents whose bodies had collapsed to one line. **Same family every time** — an edit
that went somewhere unintended, with nothing watching — and in this project **no check catches any of
them.** They are found by reading a file and noticing that it says something odd.

The generalisable gate would be trivial and does not exist: a maximum line length, or a check that a
comment does not contain a long unbroken run of identifier characters. Worth recording as the same
recommendation as the missing `paths.mjs` — the tooling records what a human noticed.

## Related

- [[cutover-is-guest-only]] — the premise correction that started this.
- [[route-snapshot-was-snapshotting-redirects]] — the other gate that asserted nothing.
- [[smoke-count-is-not-a-hard-coded-number]] — the other class of unsupportable claim.
- [[three-reference-docs-lost-their-line-structure]] — cause 2 above.