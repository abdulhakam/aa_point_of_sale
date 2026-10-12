---
title: AA Point of Sale knowledge base
type: meta
status: active
created: 2026-09-26
updated: 2026-09-27
tags: [meta, index, pos, erp]
---

# AA Point of Sale knowledge base

A local-first, file-first knowledgebase (opinionated vault) for the
`aa_point_of_sale` trade & distribution ERP/POS workspace.

The workspace holds **two live systems** and one **frozen parity oracle**. This vault exists so
that questions about any of them are answered from these documents instead of by re-reading source.

> **The "four systems, legacy is production" framing is superseded.** This table previously listed
> `backend/` and `frontend/` as `Legacy / production` and said in bold that "the legacy pair is what
> is actually running in production". That was true when written and stopped being true on
> **2026-09-29**, when commit `c167d311` deleted both directories from git. They now live only as
> `legacyforparity/` — untracked, git-ignored, and (for the frontend) **compiled with no `src/`**.
> See [[cutover-is-guest-only]].

| System | Directory | State | Role today |
|---|---|---|---|
| [[trailbase]] | `trailbase/` | **New / experimental** | TrailBase SQLite server: 17-table schema + record APIs, validated against a running server |
| [[runtime-js-guest-platform]] | `trailbase/` | **New / experimental** | WebAssembly app host: the frontend as TrailBase guest components (Rust + QuickJS + minijinja), serving dashboard / reports / management / invoicing |
| [[backend]] | `legacyforparity/backend/` | **Legacy / production** | PocketBase 0.22.55 — **what the shop runs on**; never edited, no git copy |
| [[frontend]] | `legacyforparity/standalone/` | **Legacy / production** | compiled Next.js 14 + Mantine bundle — **what staff use**; runnable, **no source**, never edited |

**The legacy pair is production; the guest is the replacement.** The legacy source was deleted, so
shape A (repointing the Next.js UI) was never available — but the frozen compiled bundle is still
what the shop runs on via `legacyforparity/RUN MINI.BAT`. The production import **has been
run** through the guest `import-from-v1` plugin (60,245 records, 0 errors) and the reports were timed
on it ([[new-system-report-timings]], [[report-performance-baseline]]). The depot was rebuilt and
re-imported on 2026-09-29 and is loaded — 60,245 records, 0 failures, run through the browser UI,
with per-table money and quantity sums verified equal to PocketBase
([[reports-parity-and-e2e-2026-09-29]]). An earlier revision of this paragraph said the depot was
reset and "no production data is currently loaded"; that was stale and is corrected here and in
[[aa-point-of-sale]], [[system-status-overview]] and [[trailbase-migration]]. The guest platform is
the chosen frontend and the legacy UI is to be shifted onto it screen-for-screen
([[guest-ui-is-a-direct-shift-of-legacy]]); the intermediate Node `frontend-ssr` experiment was
removed on 2026-09-27. See [[aa-point-of-sale]] for the programme view and
[[trailbase-migration]] for the active workstream.

## Rules

- Collections are optional: only the ones that are needed exist.
- Every collection directory contains one `*.schema.json` contract.
- Documents may carry any extra frontmatter fields; missing recommended fields produce
  warnings, never errors.
- `.md` / `.html` documents are the source of truth. Everything written to `.vault/`
  is derived and rebuildable.
- `attachments/` holds captured assets (e.g. the legacy UI reference) and is not a collection.

## Collections

| Collection | Holds |
|---|---|
| `projects/` | The programme and the active workstreams that own the work |
| `systems/` | One note per system — what it is, how it is put together, how to run it, what it cannot do |
| `decisions/` | Durable choices with their rationale, so a settled question is not re-opened by accident |
| `references/` | Data model, API contract, route map, report arithmetic, build/run, environment, caching |
| `issues/` | Known defects, gaps and upstream limitations — verified, with the evidence |
| `tasks/` | Actionable work items with GFM checkboxes for subtasks |
| `credentials/` | Operator credentials per system and environment (production + experimental) — plaintext, see the collection's README |
| `notes/` | How to use this vault, plus material that fits nowhere else |

## Reading order for a newcomer

1. [[aa-point-of-sale]] — the business context, the systems, and which one is live.
2. [[backend]] and [[frontend]] — **what production runs today**, and why it cannot be edited.
3. [[trailbase]] and [[runtime-js-guest-platform]] — the replacement pair.
4. [[data-model]] — the 17 tables, the enumeration codes, and the PocketBase → TrailBase value translation.
5. [[reports-and-ledgers]] — the report arithmetic, and why it lives in JavaScript at runtime.
6. [[build-and-run]] and [[environment]] — how to start the new system, and the credentials it
   needs (the local-only `credentials/` collection, e.g. `credentials/experimental-trailbase.md`).

Since 2026-10-02 the new system is served on **all interfaces** (`0.0.0.0:4000`) so other devices
on the LAN can use it, behind a Private-profile Windows firewall rule —
[[serve-the-app-on-all-interfaces]]. The legacy stack is still loopback-only, and frozen.

## Status at a glance

- 17 of 17 TrailBase tables exposed as record APIs; migration applies clean on an empty depot.
- 10 reports + 4 ledgers (14 entries in `trailbase/runtime/ahscripts/compute/reports.js`, and 14
  declarative page folders under `trailbase/runtime/ahscripts/pages/`).
- The guest serves the same app without Node: the smoke suite passes in full, differential **14/14**
  (`trailbase/tools/`), plus a first verified invoice-entry slice.
- **The legacy stack is production and has no source** — deleted from git 2026-09-29; it runs from
  `legacyforparity/` as a compiled bundle plus the PocketBase data directories, all untracked. It is
  the running system, so a defect in it cannot be fixed in it.
- Parity target restated: the guest frontend must be **functionally equal** to the legacy UI — every
  capability it has — and is free to look however it does the job better
  ([[parity-is-functional-not-visual]]). ⚠️ **Revised 2026-10-05**: this line previously read *"a direct
  shift of the legacy UI, same look"* ([[guest-ui-is-a-direct-shift-of-legacy]]), and that visual
  mandate was withdrawn; the remaining gaps are in
  [[guest-frontend-feature-parity-gaps]].

Detail in [[system-status-overview]].

## Tools

Validate structure and frontmatter, validate wikilinks, and build the statistics report
with the opinionated-vault tools, passing this directory as the argument:

```sh
node ~/.agents/skills/opinionated-vault/scripts/check.mjs vault
node ~/.agents/skills/opinionated-vault/scripts/links.mjs vault
node ~/.agents/skills/opinionated-vault/scripts/stats.mjs vault --write-report
```

Generated reports land in `.vault/reports/`, which is git-ignored and never source.
See [[vault-guide]] for the authoring conventions actually used here.

## Related

- [[vault-guide]] — conventions, and how to add a document or a collection.
- [[system-status-overview]] — one screen of status, coverage and risk.
- [[legacy-ui-reference-captures]] — captured legacy UI, the parity reference.
- [[previous-vault-recovery]] — how to recover the pre-`cleanup` vault from git history.
