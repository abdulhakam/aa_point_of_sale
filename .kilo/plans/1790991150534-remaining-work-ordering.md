# Remaining work: ordered plan

## The premise this plan corrects first

The vault describes four systems and says the legacy pair (`backend/` + `frontend/`) is
**production**. That is no longer true of the repository:

- `git ls-tree HEAD` shows only `.commandcode .gitignore .kilo AGENTS.md trailbase vault`. There is
  no `backend/` and no `frontend/`.
- Commit `c167d311` (2026-09-29, "deleted frontend/backend") removed both from git.
- The working tree has `.gitignore` **modified and uncommitted**, replacing `/frontend/...`,
  `/backend/...` and `/full_database_schema.sql` rules with `/legacyforparity/`.
- What remains on disk is `legacyforparity/` (untracked): `backend/` (`pocketbase.exe`,
  `pb_migrations/`, `p_data/data.db`) and `standalone/` — a **compiled** Next.js standalone bundle
  (`server.js`, `.next/`, `node_modules/`, `public/`). There is no `src/`, so the legacy frontend
  **cannot be edited, built or pointed at TrailBase**.
- `guests/` exists but is empty; the vault already records it as deleted 2026-09-28.

**Owner decision (this session): the legacy stack is a frozen parity oracle only.** It is never
edited, never a cutover target, and not source. Therefore:

- `pos-0028-decide-cutover-plan` is no longer a decision to *take*. Shape A ("repoint the Next.js
  UI") is impossible without restoring deleted source. It closes by **recording shape B — guest
  only — as a decision note**, per the task's own instruction that the answer belongs in
  `decisions/` and not as an edit to an existing note.
- `tb-0012-wire-nextjs-frontend-to-trailbase` and `tb-0013-rework-report-screens-without-views` are
  **superseded**, not done. Both presuppose editable `frontend/` source. Their checklists must be
  marked superseded with the reason, per the vault's own rule on stale claims.
- `trailbase/README.md` needs the same correction — it opens with "The Next.js frontend still talks
  to PocketBase; wiring it to this server is the remaining work" and cites `../backend` and
  `../full_database_schema.sql`, neither of which exists.

## Ordering rationale

Three constraints fix the sequence:

1. **Vault first, premise first.** Every later task writes to the vault. If the vault still says the
   legacy pair is production while the tree says otherwise, each later write inherits the error.
   The correction also decides what the other tasks *are*, so it cannot run in parallel with them.
2. **Cheap JS-runtime verification before expensive wasm verification.** Both large refactors are
   pure JS in `trailbase/runtime/`, gated by `node trailbase/tools/guest-smoke.mjs` — no `cargo`.
   Every Rust change to `tb-ah-run-js/` forces `cmd /c trailbase\build.bat` first. Keeping host work
   out of the refactor loop means the fast gate stays fast.
3. **The two refactors do not interleave.** `tb-0032` then `tb-0030`, each finished and verified
   before the next begins. `tb-0030` step 5 creates ~30 route directories; doing `tb-0032` after
   that scatters its manifest work across 30 folders instead of one dispatcher and one registry.

## Ordered tasks

### 1. Correct the vault premise: legacy is a parity oracle, not production

Owner decision, so it lands as a new note plus edits, never as a silent rewrite.

- [ ] Write `decisions/cutover-is-guest-only.md`: legacy deleted from git 2026-09-29, only a compiled
      bundle survives in untracked `legacyforparity/`, therefore shape B; the rollback story is "the
      compiled bundle plus `legacyforparity/backend/p_data/`", which is a frozen artefact, not a
      rebuild. Record explicitly that shape A is unavailable and why.
- [ ] `pos-0028-decide-cutover-plan` → `status: done`, tick every checklist box that the decision
      answers, mark the task superseded-by the new decision note.
- [ ] `tb-0012` and `tb-0013` → `status: blocked` (or the vault's blocked vocabulary) with a header
      line naming the decision note as the reason. Do not tick their checklists; they are unstarted,
      not finished.
- [ ] Fix the uncommitted `.gitignore` state: confirm `/legacyforparity/` is intended and commit it
      as part of this task's change, so the tree and the vault agree.
- [ ] Correct every doc that calls the legacy pair production or editable. Known sites:
      `vault/README.md` (table rows for `backend`/`frontend`), `notes/system-status-overview.md`,
      `projects/aa-point-of-sale.md`, `systems/backend.md`, `systems/frontend.md`,
      `references/route-map.md`, `references/build-and-run.md` (Prerequisites + Data directories
      tables), `references/environment.md` (ports 3000/8090/6006), `references/glossary.md`
      (standalone-build row), `decisions/keep-legacy-stack-in-production.md` (superseded), and
      `trailbase/README.md`. Say what is true now: untracked local artefact, never edited.
- [ ] Correct `pocketbase-data-dirs-in-git`, which says the risk is "resolved" because the user
      "deleted the PocketBase data directories from this branch" while `legacyforparity/backend/p_data/`
      holds the same `data.db` — the data is not gone, it is merely untracked. Correct the claim; do
      not delete the note.

### 2. Repair the vault's own broken documents

- [ ] Fix the collapsed line structure in the three docs named by
      `issues/three-reference-docs-lost-their-line-structure.md` (`references/build-and-run.md` line
      14, `references/environment.md` line 12, `systems/runtime-js-guest-platform.md` line 15 each
      hold a whole document as one line). Re-read
      `references/environment.md` in full: line 13 is truncated mid-table and the rest of the file
      is one paragraph, so content is genuinely missing, not merely unformatted.
- [ ] Delete `issues/zz-probe.md`. It is a 13-line empty shell titled "probe" with no body — a
      leftover from a base64 probe, and an issue document that asserts nothing.
- [ ] `vault/credentials/` is empty but has no schema, which `check.mjs` reports as `DIR_EMPTY`.
      Decide and record: either author `credentials.schema.json` plus the README the collection
      expects, or remove the empty directory. Given `.gitignore` already excludes `credentials/`
      (plaintext secrets, per project memory), removing the empty directory is the honest option —
      confirm before deleting.
- [ ] Resolve the smoke-count spread. `71/71`, `76/76`, `78/78`, `70/77`, `68/76` and `67/67` all
      appear across the vault. The harness prints `N/N` at runtime, so the correct move is: run
      `guest-smoke.mjs`, record the current figure once, and change every doc that states a number to
      either that figure or to "see [[build-and-run]]" without a hard-coded count.

### 3. Reconcile the vault against the code, and fix the code where the vault is right

A full sweep, because task 1 has just proven the vault diverges from the tree in ways nobody
noticed. The `vault-code-drift-audit` note is from 2026-09-28 and predates the 2026-09-29 deletion,
so it is not a usable baseline.

- [ ] Verify every `trailbase/`, `frontend/`, `backend/` and `legacyforparity/` path citation in the
      vault resolves, or is corrected to say why it no longer does. `references/route-map.md` is the
      densest offender: it still lists all 15 invoice and cash-memo routes as "❌ not built" although
      `guest-invoice-lifecycle` and `tb-0028` built them, and it says the guest runs "normally on
      `:4003`" when it is served on `:4000`.
- [ ] `frontend.md`'s "What the legacy app has that the guest app does not" table is now wrong in
      both directions — the guest has invoicing, printing and cash memo. Rebuild it from the
      2026-10-02 browser sweep recorded in `guest-invoice-lifecycle`.
- [ ] Re-verify claims that are cheap to check and currently stale: the report inventory in
      `references/reports-and-ledgers.md` (14 entries, `spoolreports.js` keys), the migration list
      (`trailbase/migrations/main/` has 14 files, not the 2 the older notes imply), and the
      `trailbase/README.md` layout block.
- [ ] Confirm the "four systems" framing in `vault/README.md` against the tree and restate it.
- [ ] Write `notes/vault-code-drift-audit-2026-10-03.md` recording what was checked, what was wrong,
      and what was corrected. Leave the 2026-09-28 note in place; mark it superseded and dated.
- [ ] `node links.mjs vault` → exit 0. `node check.mjs vault` → exit 0.
      `node stats.mjs vault --write-report` → refresh `.vault/reports/`.

### 4. TB-0032 manifest-first, completed and verified on its own

- [ ] `meta.json` names the SQL file (and its binds) for every report page.
- [ ] `app/lib/spoolreports.js` becomes a loader, not a registry — it reads the manifest and the
      `.sql` files the manifest points at. The `REPORTS` object at line 149 is what goes.
- [ ] Delete `app/compute/views.js` and `app/lib/reports.js`; repoint the dashboard `counts` query.
- [ ] At least one page served through a manifest-declared handlers directory, proving the contract.
- [ ] Gate: `verify-spool-reports.mjs` 14/14 with 72 binds, `route-snapshot.mjs` unchanged, all 15
      report and ledger pages 200, `guest-smoke.mjs` at the count recorded in task 2. Update
      `references/build-and-run.md` to describe the new flow in the same commit.

### 5. TB-0030 retire `route.ts`, completed and verified on its own

- [ ] Step 1 is already done (`app/lib/route-kit.js` exists and `route.ts:184` loads it) — tick it
      and verify the helpers are complete rather than redoing the extraction.
- [ ] Step 3: split the 3-in-1 invoice routes in place, while `route.ts` is still the reference.
- [ ] Step 4: host routing in `tb-ah-run-js/src/lib.rs` — `{param}` matching plus a `[...path]`
      fallback. This is the first wasm rebuild; do it as its own commit with `build.bat` in the loop.
- [ ] Step 5: split the ~78 method+path pairs into ~30 route directories with `route.json`.
- [ ] Step 6: delete `_app/route.ts` (1,821 lines today); add `app/lib/router.js` for manifest
      reading, param extraction and dispatch.
- [ ] Step 7: `meta.json` column/filter presets, separately.
- [ ] Gate: identical route snapshot before and after; every screen 200; smoke unchanged.

### 6. TB-0025 host endpoint hygiene, and the open TB-0017 host items

Host work is here so the rebuild stays out of tasks 4 and 5.

- [ ] Remove `routing::get("/count/{table}", …)` (`tb-ah-run-js/src/lib.rs:52-56`) rather than
      relying on the identifier-character restriction.
- [ ] Remove the `/api` mock so unmatched paths reach the real 404 (`lib.rs:380`).
- [ ] Return `500` from `run_route` errors, keep `404` for "no route file matched" (`lib.rs:374`).
- [ ] Delete or repoint `/getscripts`, which reads the wrong root (`lib.rs:54`).
- [ ] Decide `jobs.rs`: delete it and the `ensure_global_init` chain, or call it from `job_handlers()`
      (`lib.rs:59`, which currently documents the workaround).
- [ ] Document `setTimeout` as blocking and `setInterval` as absent, in `host/README.md` and the
      runtime-JS reference.
- [ ] Make `readFile({encoding:"binary"})` return bytes or reject; route `exists`/`readdir`/`std.fs`
      accordingly.
- [ ] TB-0017 remainder: make `init`/`jobs` accept `.ts` (`init.rs:106` filters `.js` only) and run
      `init` at startup; then real `fetch`, typed/transactional DB params, handler cache.
- [ ] Gate: `cmd /c trailbase\build.bat` then `guest-smoke.mjs` at the recorded count. The task note
      says "expect 71/71"; use the figure from task 2 instead and correct the note.

### 7. Close all 15 open and verified issues

Each ends in exactly one of: fixed, accepted with a decision note, or blocked with the blocker
named. Grouped by kind so the cheap ones land together.

- [ ] **Already fixed, only the status is wrong:** `imported-completed-flag-carries-no-information`
      (open, but the repair migration and post-repair check are documented) → `resolved`.
- [ ] **Cheap code fixes:** `jobs-fanout-reconcile-count-is-zero` (accumulate `reconciled` from the
      fan-out worker results, per the note's own reading that the field means "steps this call
      ran"); `id-filter-given-a-name-returns-500`; `esm-shim-rewrites-text-inside-comments`;
      `stale-schema-sql-paths`. Each needs a gate run, and several become dead code once tasks 4
      and 5 delete the files they describe — check that before fixing rather than fixing then
      deleting.
- [ ] **Snapshot and cache** (`persisted-snapshot-can-be-stamped-current-while-empty`,
      `snapshot-persistence-hits-the-20s-deadline`, `report-build-cold-cache-near-the-call-deadline`,
      `guest-depot-created-is-import-time`): decide fix vs accept. The third and fourth interact with
      the no-precomputation constraint — a cached snapshot that goes stale is exactly what
      `reports.no_precomputation` forbids, so "accept" may be the correct answer and the fix must not
      be a cache.
- [ ] **Licence** (`trailbase-wasm-osl-3-0-licence`, `trailbase-host-upstream-crate-license-unresolved`):
      research and record. These need a real answer about redistribution, not a code change; if the
      answer is "unresolved", record it as an open decision with the owner named rather than
      closing the issues.
- [ ] Re-run `links.mjs` and `check.mjs`; refresh `stats.mjs --write-report`.

### 8. TB-0026 invoice-maker attribution

The owner's answer: **attribute every imported invoice to the user running the import** — the person
logged in to the guest when the migration is executed. This is what the task note already decided, so
it needs no new decision, only execution and promotion off the "far-future deferrable" list.

- [ ] Resolve how the plugin learns the destination `_user` id. `_user` is hidden and deliberately
      has no record API, so the candidates are the id carried by the auth token,
      `/api/auths/refresh`, or a small guest endpoint returning the session user. **Verify the value
      is a `_user` id**, not a token subject or a record id.
- [ ] Set `invoice_maker` for every row whose source `invoice_maker` was set (8,927 on current
      data). Rows whose source maker was `NULL` stay `NULL` — "never had an author" stays distinct
      from "attributed to the importer".
- [ ] Replace the `droppedMakers` warning (`index.html:498`, `:535`) with a count of attributed
      invoices, so the log stops reporting a loss that no longer happens.
- [ ] Assert `COUNT(*) WHERE invoice_maker IS NOT NULL` equals the source count, and confirm every
      attributed value resolves against `_user` — a dangling reference is worse than `NULL`.
- [ ] **Say it in the UI.** The invoice screen and any print view showing authorship must not claim
      imported invoices were entered by the logged-in operator. This is the item most likely to be
      forgotten and the one that turns a data choice into a false statement.
- [ ] No migration is needed; the column, FK and index already exist. Do not add one — editing an
      applied migration is a recorded failure mode here.

### 9. TB-0020 guest fingerprint refresh, and the remaining product gaps

- [ ] KV report-cache eviction/TTL — old-version entries accumulate.
- [ ] Materialise the views as SQLite tables, or record explicitly that the guest does not and why.
- [ ] Background refresh job — this was blocked on the host's `jobs` module never being called.
      Task 6 decides `jobs.rs`, so this becomes unblocked here; if task 6 deleted the module, say so
      and close the item as not-applicable rather than leaving it blocked forever.
- [ ] TB-0021 leftovers: the **stock guard** (nothing prevents selling below zero — still unbuilt and
      a real business risk), two-user lease contention, and F4 (totals recompute) / F5 (optimistic
      UI) from `invoice-entry-freshness-and-writes`.
- [ ] TB-0027 leftover: wire `/invoice` to the materialised documents. The read API exists and nothing
      reads it.
- [ ] TB-0014: settle whether the UI label "Company" means `categories` or `companies`. The decision
      `v1-categories-map-to-companies` probably settles it — read that first rather than re-deriving.
- [ ] TB-0023 leftovers: rule on the category-4 opening differences, and per category-5 item decide
      whether the new-side-only screens stay.
- [ ] TB-0022 leftover: remove the JSON serialising on the paths the spool now covers, once tasks 4
      and 5 have removed what serialised.

### 10. Close the loop

- [ ] `vault/projects/trailbase-migration.md` — rewrite the Sequence so it reflects reality: the
      legacy pair is gone, the two refactors are done, and what remains is the list above. Its
      current Sequence still describes the legacy pair as live.
- [ ] `vault/notes/system-status-overview.md` — the Open risks table still lists the money/REAL risk
      (closed by TB-0015), the cutover-shape risk (closed by task 1) and "guest frontend has no
      invoicing" (closed 2026-09-30). Reconcile all three.
- [ ] Final gate: `links.mjs` → 0, `check.mjs` → 0, `stats.mjs --write-report`, `guest-smoke.mjs` at
      the recorded count, `verify-spool-reports.mjs` 14/14, all report and ledger pages 200.
- [ ] State accepted warnings explicitly in the closing summary.

## Validation

Per task, not once at the end:

| Task | Gate |
|---|---|
| 1, 2, 3 | `links.mjs` exit 0, `check.mjs` exit 0, `stats.mjs --write-report` |
| 4 | `verify-spool-reports.mjs` 14/14 / 72 binds, `route-snapshot.mjs` unchanged, 15 pages 200, smoke |
| 5 | identical route snapshot pre/post, every screen 200, smoke |
| 6 | `build.bat` then smoke |
| 7 | per-issue gate; overall links/check/stats |
| 8 | attributed count equals source count; FK resolves |
| 9 | per-feature gate |

Every task that touches the vault writes it **in the same commit as the code change**, per
`AGENTS.md`. Never edit a document with `archived: true`. Quote frontmatter wikilinks. Run
`links.mjs` after any rename.

## Risks

- **The `.gitignore` change is uncommitted.** Tasks 1 and 3 assume the tree is as described. Confirm
  the state before starting; if it differs, stop and reconcile first.
- **`legacyforparity/` is untracked and git-ignored.** It is the only copy of the parity oracle and
  the only copy of `p_data/data.db`. Nothing in this plan may delete, clean or re-`/MIR` it. If it is
  lost, the oracle is gone — there is no copy in git.
- **Correcting "the legacy pair is production" touches many documents at once.** Expect link and
  frontmatter fallout; that is what task 3's gate is for.
- **The smoke count is not yet known.** Tasks 4–6 gate on "the count recorded in task 2". Establish
  it first or those gates are unfalsifiable.
- **Task 7's snapshot items can collide with `reports.no_precomputation`.** A cache that goes stale
  is the thing that constraint forbids. Read it before fixing, not after.
- **`tb-0032` deletes `compute/views.js`, which the ESLint ignore list references**
  (`trailbase/runtime/app/.eslintignore`, confirmed present on disk). Fix that in the same change or
  lint breaks.
- **Licence questions may not be answerable in-repo.** If so, record as an open decision with the
  owner named rather than closing the issues falsely.

## Out of scope

- Restoring `frontend/` or `backend/` source from git history.
- Editing anything under `legacyforparity/`.
- Integer cents for money — declined 2026-10-01, recorded in `tb-0015`.
- Editing the v1 import — ruled out of scope 2026-10-02.
- Exact output parity with every legacy report — waived by `legacy-parity-checks-waived`; fix outputs
  known to be wrong as the replacement improves.