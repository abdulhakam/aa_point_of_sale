---
title: tb-0030 — Retire the route.ts dispatcher in favour of file-router conventions
type: task
status: doing
priority: high
created: 2026-09-30
tags: [trailbase, routing, refactoring, manifest]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[file-router-conventions-not-a-data-dag]]", "[[guest-helpers-pure-vs-cached]]", "[[a-base64-alphabet-error-is-silent]]"]
---

# tb-0030 — Retire the `route.ts` dispatcher in favour of file-router conventions

## Goal

`trailbase/runtime/ahscripts/routes/_app/route.ts` is deleted — **2,055 lines** as of 2026-10-03
(it was 1,785 when this note was written; step 0 took it to 1,748 and work since has grown it). Every
route becomes a directory with a `route.json` manifest and handler files, following
[[file-router-conventions-not-a-data-dag]].

Adding a route becomes `mkdir` + write `route.json` + write a handler, with no dispatcher edit.

## Sequence

Each step is separately reversible and must leave the app byte-identical.

- [x] **0. Delete the dead `/bench/*` capability probes.** `/bench/ping`, `t1`–`t4` and
      `/bench/pragma` removed (37 lines, 1785 → 1748).
      **⚠️ retest against the corrected 49-route gate.** ✅ **retested 2026-10-03**: steps 0, 1a and 1b
      are verified against the *fixed* 49-route gate, which did not exist when they were first ticked.
      The diff against the committed baseline is one line — `page profit data` `version`, the
      fingerprint-derived integer — and no route changed status.
- [ ] **1. Extract three JS guest helpers** into `app/lib/route-kit.js` — `write()`,
      `renderRoute()`, `refs()` — and migrate every call site.
      - [x] `refs()` — 10 sites migrated (6 two-line collapses, 3 wider-snapshot kept as-is).
            ✅ **retested 2026-10-03 against the corrected 49-route gate** — no route changed status.
      - [x] `write()` — 15 of 16 sites migrated. The 16th is `/reports/refresh`'s deliberate
            `if (full) invalidate()`, which is a full drop rather than write-coupled and must stay.
            Verified: 45-route parity plus 13 write-path checks.
            ⚠️ **The write-path half of that is still sound** — `write-paths-check.mjs` logs in
            properly and asserts read-after-write, so it never depended on the broken snapshot gate.
            The route-parity half is not.
            The write paths needed their own gate: `route-snapshot.mjs` only issues GETs, so it
            cannot see a regression in a helper whose entire job is to run *after* a mutation.
      - [ ] `renderRoute()` — 23 inline `page(req, shell(user, …), tpl, data)` sites remain, plus one
            `pageSpooled` (different function — spooled rendering, left alone) and two
            `{ ...shell(…), paper }` variants that `renderRoute` also covers via its `paper` option.
            **⚠️ Deliberately NOT migrated ahead of step 5, and this is a decision, not an oversight.**
            Every one of these sites lives in `route.ts`, which **step 6 deletes**. Migrating them now
            means editing each site and then moving it; step 5 moves them anyway, and every new route
            handler will call `renderRoute` because that is what a handler does. Doing it twice buys
            nothing and risks a 21-site diff on the day the dispatcher changes shape.
            Verified that the two are interchangeable first: `app/lib/http.js` does `shell.paper ?? ""`,
            so `renderRoute` passing `""` is identical to `shell()` omitting `paper`.
            `/login` is already migrated and stands as the shape.

**The gate itself had to be fixed first.** Three defects in it, each of which produced a *false*
signal before it was caught:

1. **A 500 was reported as a regression.** The ~20 s WASM deadline makes `/reports/profit`,
   `/reports/paymentsbycompany`, `/reports/salesreport`, `/cashmemo` and `/p/reports/profit/data`
   genuinely load-dependent — 200 on a quiet server, 500 when several run back to back. The probe
   now retries a 500 twice before recording it. **A gate that cries wolf trains you to ignore
   diffs**, which is worse than having no gate.
2. **The retry silently dropped successful routes.** `if (res.status !== 500) return;` returned
   from `probe()` *without* pushing to `results`, so a snapshot held only its failures — 2 routes
   instead of 45, and the diff then cheerfully reported "no differences across 2 routes".
3. **Module edits need a server restart.** `route.ts` is re-read per request, but `app/lib/*` is
   cached on `globalThis` (`route.ts:20-24`). Changing `route-kit.js` and re-requesting served the
   OLD module, which showed up as `/login` returning a JSON array of character indices — the host
   had received a string where it expected `{ html }`. **Restart the server after editing anything
   under `app/`; only `ahscripts/` is live.**

**Never compare snapshots taken under different load.** `/reports/salesreport` read 500 in one
baseline and 200 in the run after it, which looks exactly like a regression. For a single route the
cheapest honest check is a direct byte comparison of the HTML.
- [x] **2. Rust `#[export]` hex/b64**, replacing the two divergent JS copies
      (`route.ts:311` and `management.js`).
      **The spike question is moot: this component does not use `#[export]` at all.** Bridges are
      registered manually with `Function::new` (`api.rs:17`, `:70`), so a pure sync function needs
      no macro. Added `tb-ah-run-js/src/api/ids.rs` and registered it as `ids.b64ToHex` /
      `ids.hexToB64` — a sync closure, matching `render.html`, because the functions do no I/O.
      `route-kit.js` and `management.js` prefer the bridge and keep their JS as a fallback.
      4 Rust unit tests pass; `cargo build --offline --release --target wasm32-wasip2` succeeds.
      **`--compare` verifies the Rust and JS paths agree** on 7 vectors including the recorded one.
      All 28 call sites now go through one codec (24 `b64ToHex`, 3 `hexToB64`); the local
      `hexToBase64` and its 14-line alphabet are deleted.
- [x] **3. Split the 3-in-1 invoice routes in place** — **done 2026-10-03**

`/invoices/{id}/(header|line|complete)` was one branch with one `write()` and one redirect, so each
route's reader was reading the others' form fields — `/complete`, a single boolean, sat under a
`discount_2` default. Now four independent branches: `/header`, `/complete`, `/line`,
`/line/{lineId}/delete`. Each takes the invoice lease, wraps its one write in `routeKit.write()`, and
redirects to the same place. Nothing else changed.

#### The gate for this step was also broken

`tools/write-paths-check.mjs` is the only harness that can see a regression here, because
`route-snapshot.mjs` only issues GETs. It has the **same login defect** as the route-snapshot tool
(omitted `redirect: 'manual'`, so the cookie it stored was empty and every write was bounced to
`/login?next=…`). It reported **6 failures out of 7**, which reads as six failing checks rather than as a
harness that never authenticated. Fixed: **13 checks, 0 failing** — which matches the 13 this note
claimed, so the claim was right about the count and the tool simply had never passed.

#### ⚠️ The same defect is systemic, and four more tools had it

| Tool | Was | Now |
|---|---|---|
| `write-paths-check.mjs` | 6 of 7 failing | **13 of 13 pass** |
| `management-check.mjs` | never authenticated | logs in; reports 6 failures **on the verification depot's seed** |
| `invoice-check.mjs` | never authenticated | logs in; **throws** — see below |
| `invoice-doc-check.mjs` | never authenticated | logs in |
| `id-codec-check.mjs` | never authenticated | logs in |

This is one defect copied tool to tool, not five coincidences. The two that had a
`check("login", Boolean(cookie))` assertion surfaced it as a *failing check*, which is why it survived:
it looked like the app was broken rather than the harness. Recorded once, in
[[route-snapshot-was-snapshotting-redirects]].

Two follow-ups these now expose, neither of which is a blocker and neither of which is fixed here:

- **`management-check.mjs` reports 6 failures against the verification depot.** It is written against
  `guest-smoke`'s seed, which seeds items; the verification depot is empty, so its item assertions have
  nothing to assert about. `guest-smoke.mjs` boots and seeds its own depot and is the primary gate — it
  passes in full.
- **`invoice-check.mjs` throws** rather than failing: line 91 reads `item.id` with no guard, so on a
  depot with no items it is a `TypeError` instead of a check. **A harness that throws on a missing
  precondition hides the checks after it**, so the fix is to guard the precondition — not done, because
  it is not this step's work and `guest-smoke` covers the same paths.

- [x] **4. Host routing** — **{param} and [...rest] done; the rest is step 6's** — 2026-10-03

`tb-ah-run-js/src/lib.rs` gains `resolve_route_file()`, a filesystem walk that replaces the
exact-path `exists()` probe. At each segment: **literal, then `{param}`, then `[...rest]`** — in that
order, because a literal directory must win over a `{param}` one or a future
`routes/reports/profit/` would be shadowed by `routes/reports/{key}/` the moment both existed.

**Not memoised, deliberately.** The alternative is a cached route tree that can go stale against a
runtime directory the app is meant to edit without restarting, and a stale route table is a 404 that
only reproduces sometimes.

Proven with throwaway route folders in the verification depot (removed afterwards; the source tree was
never touched):

```text
200  /probe/abc                   {param} one segment
200  /probe/nested/42/fixed       {param} mid-path, literal tail
200  /probe/rest/a/b/c/d.txt      [...rest] four segments
200  /probe/static/css/app.css    [...rest], the /static/* shape step 4 was written for
200  /probe/static/a/b/c/d.js     [...rest] five segments
404  /probe/rest                  [...rest] with NOTHING to absorb — CORRECT, see below
404  /probe/rest/                 same
```

A `[...rest]` does not match its own parent path. That is the convention, not a gap: a catch-all absorbs
a *remainder*, so `/static` alone is not its match, and matching it needs an optional `[[...rest]]`.
Recorded so it is not "fixed" later by someone reading the 404 as a defect.

#### Two bugs the first build had, both found by probing rather than by reading

1. **`is_last` on the catch-all.** I gated `[...rest]` on being the final request segment, which is
   backwards — the whole point is absorbing the remainder, so `/static/css/app.css` needs it to match
   at the `css` level, not at `app.css`. Symptom: every multi-segment catch-all 404'd while `{param}`
   worked in the same build, which reads as "catch-all unsupported" rather than "guard wrong".
2. **The walk did not stop after a catch-all matched.** It kept descending for the remaining segments,
   walked into `[...path]`, looked for a directory named `a`, found only `route.ts`, and fell through to
   the dispatcher. **The route was resolved and then discarded.** This is the worst shape the bug could
   take, and it is invisible without a diagnostic: the failure looks identical to "no route folder".

That second one is why the build carries a comment saying so. A resolver that finds the right file and
then throws it away is indistinguishable, from the outside, from one that never found it.

#### ⚠️ Step 4 cannot be completed as written, and the reason is the SDK

Two of the four items are **not implementable in the host**:

- **"delete the `_app` fallback in favour of a Rust 404"** — cannot happen until steps 5 and 6: the
  dispatcher *is* the application today. It is step 6's work by construction.
- **repointing `lib.rs:78` and `get_scripts_handler`** — `lib.rs:104` discovers jobs with
  `fs::read_dir("/traildepot/ahscripts")`, which is a **different preopen root** from the
  `/ahscripts` the routes live under, and `trailbase-wasm` 0.6.1 exposes exactly one filesystem call:
  `read_file`. There is no host-side `read_dir` or `metadata` in the SDK.

`std::fs::read_dir` *does* work in this component — verified, it lists `["mode", "probe", "_app"]` —
so directory walking is possible today, but it is `std`, not the SDK, and that is a thing to know before
relying on it rather than after.

The `/_app` fallback is still in place, which is correct: it is the whole URL space until step 6.

#### Gate

| Check | Result |
|---|---|
| `cargo build --offline --release --target wasm32-wasip2` | clean, no new warnings |
| `route-snapshot.mjs` | 49 routes, **0 erroring**; the 5 negative probes still 404 |
| diff vs baseline | 1 line: `page profit data` `version` |
| `guest-smoke.mjs` | every check passes |
| resolver probe | 5 required shapes 200, 2 correctly-absent shapes 404 |

- [ ] **5. Split the ~78 method+path pairs into ~30 route directories** with `route.json`.

  #### Prerequisite built first: a POST coverage gate

  Step 5 moves ~60 branches, **24 of them POST or DELETE**, and the gate that would have protected it
  issued **GETs only**. `write-paths-check.mjs` covered 13 checks on three write paths. So the invoice
  header/line/complete/release routes, the management CRUD trio, payments, expenses, the print queue and
  job cancel/recover had **no automated coverage at all** — and they are the routes that touch money.

  `tools/route-coverage.mjs` + `tools/route-inventory.json` now close that. **77 routes — every
  method+path branch in the dispatcher — probed against a live server, 77 reachable, 0 failing.**

  Two design points, both of which were wrong in the first version:

  - **The inventory is a checked-in JSON file, hand-seeded, not a parse of `route.ts`.** A regex scrape
    of a 2,167-line dispatcher is a second source of truth that silently loses branches — the exact
    failure the tool exists to prevent. It is updated in the same commit as any route is moved, so gate
    and refactor cannot drift.
  - **It cleans up after itself.** The first version created a section and an expense and exited, so the
    next `route-snapshot` run reported **seven "differences" that were the gate's own rows** (row counts
    2 → 6 across expenses, inventory, the general ledger, items, difference and stock). `guest-smoke`
    passed throughout, which is what identified the cause. Fixtures are now removed by marker, and a
    cleanup failure fails the tool rather than being reported as advice.

  #### Four real defects it found, all in write routes, all fixed

  Every one is "malformed input produces an opaque 500 or, worse, a silent write":

  | Route | Was | Now |
  |---|---|---|
  | `POST /jobs` | 500 `Unknown job: ` on an empty body | `{error:"unknown job", known:[…]}` — `queue.js` gained `isKnown`/`known` |
  | `POST /invoice` | `String(Number(undefined))` → `"NaN"` → tripped the invoices CHECK → 500 | `{error:"invalid invoice type", allowed:[0,1,2,3]}` |
  | `POST /inventory/save` | **silently created an item with `name = ''`** and redirected `303 ?status=ok` | `{error:"missing required fields", fields:["name"]}` |
  | `POST /management/items/create` | same | same, for every entity |

  The third is the one that mattered. `items.name` has been declared `required: true` in the entity
  spec from the start and **nothing read it**; the table's `name TEXT NOT NULL DEFAULT ''` satisfied the
  insert. So a double-submit or a truncated request created a junk item that then appeared in the
  inventory, the **stock report** and the **difference report** — a wrong stock figure from an empty
  POST body. `management.js` now enforces `required` in `createRow`/`updateRow`, and the two call sites
  check first so the refusal is a 400 rather than an unhandled 500.

  #### Three of my own mistakes, caught by the gate

  Worth recording because each produced failures that looked like application defects:

  1. **The gate could not tell a routed 404 from an unrouted one.** Both were the body `Not found` —
     TrailBase renders `HttpError::message(NOT_FOUND, …)` as that, and `route.ts` returns
     `text("Not found", 404)` in six places. So it reported two live routes as UNROUTED. Fixed at the
     source: the host now answers `{"error":"no_route_folder","path":…}`, which is also what a reader
     of a 404 needs to see.
  2. **The `{id}` substitute was not valid base64.** `does-not-exist` made `b64ToHex` throw, so nine
     routes reported `QuickJS library created a unknown error` — the gate was testing the id decoder.
  3. **Then it was valid base64 but not a valid UUIDv7.** `Buffer.alloc(16,1)` passes the decoder and
     fails the `invoice_lock` CHECK (`is_uuid_v7`), so eight invoice write routes still 500'd. A probe
     id must be well-formed all the way down, or the gate tests the codec instead of the route. It is
     now a real UUIDv7 in base64.

  A gate that asserts the wrong thing is worse than no gate: it reports defects that are not there, and
  the real ones get lost among them. All three of these would have been filed against the application.
- [ ] **6. Delete `_app/route.ts`**; add `app/lib/router.js` (manifest reading, param extraction,
      query coercion, auth gate) as a *module*, not a route.
- [ ] **7. `meta.json` column/filter presets**, separately — 11 lines saved on each of 15 page
      folders. Independent of the route work; not to be bundled with it.

## Acceptance gate

`node trailbase/tools/route-snapshot.mjs --out before.json`, make the change, then
`--out after.json` and `node trailbase/tools/route-snapshot-diff.mjs before.json after.json`.

**The gate is a live-server fingerprint of 49 routes: status, row counts, title and link set per
route.** Any difference is a regression to explain before the step is accepted.

⚠️ **This gate did not work until 2026-10-03, and this note did not know it.** `route-snapshot.mjs`
was omitting `redirect: 'manual'` on the TrailBase login, so it stored an empty cookie and every route
answered `303` — it reported "45 routes, 0 erroring" while testing nothing but redirects, and every
`Verified: no differences across 45 routes` claim in the sequence below rests on that. It also probed
`/reports/stock`, which is not a route, so the Stock Report was never covered. Both are fixed; four
report/ledger routes that were missing were added. **Steps 0, 1a and 1b need re-verifying against the
corrected gate before any of them is treated as proved** — see
[[route-snapshot-was-snapshotting-redirects]].

It has a companion, because the read gate alone is not enough for `write()`:
`node trailbase/tools/write-paths-check.mjs` drives the POST endpoints (13 checks) and asserts that
each write is *visible on the next read* — which is only true if `invalidate()` ran. It creates and
removes its own fixtures; `node trailbase/tools/probe-cleanup.mjs` removes any left by a run that
failed partway.

## Verification tools added

| Tool | Purpose |
|---|---|
| `tools/route-snapshot.mjs` | **49**-route fingerprint (status, rows, title, link set), JSON out; retries a 500 twice. ⚠️ broken until 2026-10-03 — see above |
| `tools/route-snapshot-diff.mjs` | Before/after diff of two snapshots; exit 1 on any difference |
| `tools/write-paths-check.mjs` | 13 POST checks incl. read-after-write; self-cleaning |
| `tools/probe-cleanup.mjs` | Removes `refactor-probe-*` fixtures by row-scoped id |
| `tools/id-codec-check.mjs` | Asserts the base64 alphabet byte-for-byte, then round-trips; `--compare` also runs the Rust bridge against the JS fallback through the server |
| `tools/brace-check.mjs` | Delimiter balance for a guest route script, with strings/templates/comments blanked first |

**`brace-check.mjs` exists because a raw count is misleading.** A plain `Select-String` count of `{`
and `}` in `route.ts` reads 406/408 — unbalanced — purely from braces inside template literals
and strings. After blanking, it is 346/346. The guest compiles `route.ts` through a regex ESM
transform, so a genuinely missing brace surfaces as a runtime error on an unrelated route rather
than at load time, which is exactly the failure this catches cheaply.

**Two routes fail this gate in steady state** — `/reports/paymentsbycompany` and
`/p/reports/profit/data` — both the ~20 s deadline on a full depot. They are recorded in every
snapshot, so they are visible rather than hidden; they are not caused by any refactor here.
`/reports/profit` and `/reports/salesreport` also exceed the deadline when run back to back with
other heavy reports, which is why the retry exists.

**Row-scoped id extraction matters.** Taking the nearest preceding `?edit=<id>` link on the whole
page picks up the *previous* row's link; an early version of the check did that, deleted a real
`areas` row, and leaked its own fixture instead. Split on `<tr` and match within the row.

## Evidence / gotchas found so far

- **Cold vs warm matters.** The same depot returns 6 extra HTTP 500s (~20 s WASM deadline) on a
  cold run that vanish once `[mview]` has persisted its views. A cold snapshot is not comparable to
  a warm one; this nearly read as a regression from step 0.
- **`/ahscripts/init directory not found`** is logged on several requests and is harmless — the
  depot has no init scripts.
- **`route.ts` in `runtime/` is not what the server runs.** `RUN.BAT` passes
  `--runtime-root-fs traildepot\runtime`, so every edit needs
  `robocopy runtime traildepot\runtime /MIR` before it takes effect. `clear_db.bat` does this but
  **wipes the database**, so sync by hand during development.
  **This failed silently and read as a regression:** a `robocopy` issued from the repo root (rather
  than `trailbase/`) printed an ERROR and copied nothing, and the resulting run showed 7 routes
  500-ing with `cannot read property 'refs' of undefined`. Always run the sync with the Bash tool's
  `workdir` set to `trailbase/`, and confirm with a count grep on the depot copy
  (`Select-String ... traildepot/runtime/...`) before trusting a result. The guest also caches
  loaded modules on `globalThis`, so a stale depot is not corrected by re-requesting.
- The id codec needs `node trailbase/tools/id-codec-check.mjs` — see
  [[a-base64-alphabet-error-is-silent]].

## Related

- [[file-router-conventions-not-a-data-dag]] — the design.
- [[guest-helpers-pure-vs-cached]] — why only the id codec goes to Rust.
- [[manifest-driven-routing-and-data-dag]] — the superseded predecessor.