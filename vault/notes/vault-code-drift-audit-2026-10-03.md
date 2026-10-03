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

## Related

- [[cutover-is-guest-only]] — the premise correction that started this.
- [[route-snapshot-was-snapshotting-redirects]] — the other gate that asserted nothing.
- [[smoke-count-is-not-a-hard-coded-number]] — the other class of unsupportable claim.
- [[three-reference-docs-lost-their-line-structure]] — cause 2 above.