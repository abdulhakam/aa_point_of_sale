---
title: Vault/code drift audit (2026-09-28)
type: note
status: active
created: 2026-09-28
tags: [vault, audit, drift, docs, maintenance]
related_to: ["[[vault-guide]]", "[[runtime-js-guest-platform]]", "[[build-and-run]]", "[[trailbase-src-depot-layout]]", "[[guest-report-performance-options]]"]
---

# Vault/code drift audit (2026-09-28)

A check that the vault's code-coupled claims still match the repository. Method: an automated
sweep of every backticked repo-path citation against the filesystem (454 citations across 97 docs),
plus manual verification of the numeric/behavioural claims that rot fastest (flags, counts,
endpoints, host globals, sizes).

## Found and fixed

- **`USE_SQL_VIEWS`** — three docs still said the SQL report path was "on/true". It is **off**
  (`trailbase/runtime/app/lib/reports.js:25`), turned off in `5ccebd8` because the SQL base
  views diverge on fresh (empty-`dated`) invoices — a correctness reversal, not a speed one.
  Corrected in [[guest-report-performance-options]], [[report-parity-flakes-on-float-arithmetic]]
  and [[tb-0022-move-reports-to-sql]], each stating the earlier claim. (The flag and the `.sql`
  views it selected were deleted 2026-10-02 — see [[legacy-parity-checks-waived]].)
- **Smoke count** — four docs said the guest smoke passes **69/69**; the suite is now **71/71**.
  Corrected in [[guest-outbound-http-and-login]], [[jobs-in-process-durable-queue]],
  [[guest-app-host-port]] and [[tb-0018-port-app-host-on-runtime-js]].
- **Deleted-harness citation** — [[guest-writes-via-sql]] cited `guest-parity.mjs` as still
  producing 14/14; the tool was removed with the `frontend-ssr` baseline, so the note now marks the
  result as historical.
- **Code comment** — `reports.js` blamed the float flake for the SQL switch; the comment now states
  the actual reason (fresh-invoice divergence).

## Verified clean (no drift)

- **Paths after the layout refactor**: all `trailbase/{host,runtime,tools,migrations,config.metadata}`
  citations resolve; no live `runtime-js/…` or `trailbase/src/…` path citations remain.
- **Endpoints**: `/reports/refresh`, `/reports/status`, `/worker/{pool}/step`
  (`route.ts:296`), `/invoice/context`, `/jobs/reconcile` all present.
- **Host globals**: `trailbase`, `db`, `sqlite`, `kv`, `fs`, `http` (fetch), `render`, `time`,
  `setTimeout` — matches the claimed surface.
- **Counts**: 15 legacy SQL views extracted (`app/reports/sql/views/`, since deleted 2026-10-02),
  17 business tables, 14
  report/ledger pages, `workers: 1`.
- **Importer mapping**: `v1-categories-map-to-companies` matches the PLAN's `mirrorApi: "companies"`
  and the code (`flush()` writes to both id maps).
- **Component size**: the 5.88 → 7.17 MB claim matches the built component (7,187,264 bytes) in
  decimal MB.

## Known-open, already documented (not new drift)

- **`full_database_schema.sql` / `dltbl/` paths** — the files exist one directory *above* the
  workspace, and several docs cite them too shallow; recorded in
  [[stale-schema-sql-paths]] (status open, low).
- **Removed harnesses** — `guest-parity.mjs` / `perf-compare.mjs` are cited in historical notes,
  most of which already say "removed with `frontend-ssr`".
- **Retired `runtime-js/`** — cited only in [[trailbase-src-depot-layout]] as the former directory.
- **Old vault structure paths** (the previous vault's AGENTS.md, checkpoints, subsystems and
  work-sessions directories) — historical account in [[previous-vault-recovery]].

## Scope

This checks vault → code. The reverse (a code fact with no vault note) is covered by the normal
in-turn vault discipline, not by this sweep.
