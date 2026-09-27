---
title: AA Point of Sale knowledge base
type: meta
status: active
created: 2026-09-26
tags: [meta, index, pos, erp]
---

# AA Point of Sale knowledge base

A local-first, file-first knowledgebase (opinionated vault) for the
`aa_point_of_sale` trade & distribution ERP/POS workspace.

The workspace holds **four systems** in two states of maturity. This vault exists so
that questions about any of them are answered from these documents instead of by
re-reading source.

| System | Directory | State | Role today |
|---|---|---|---|
| [[trailbase]] | `trailbase/` | **New / experimental** | TrailBase SQLite server: 17-table schema + record APIs, validated against a running server |
| [[frontend-ssr]] | `frontend-ssr/` | **New / experimental** | Express + MiniJinja server-rendered dashboard / reports / management |
| [[backend]] | `backend/` | **Legacy / production** | PocketBase 0.22.55 serving the live POS |
| [[frontend]] | `frontend/` | **Legacy / production** | Next.js 14 + Mantine SPA talking to PocketBase |

**The legacy pair is what is actually running in production.** The new pair is the
replacement under construction: the TrailBase schema and APIs are done and verified,
and the SSR frontend covers dashboard, reports and management — but no production data
has been migrated and the legacy Next.js app does not talk to TrailBase yet. See
[[aa-point-of-sale]] for the programme view and [[trailbase-migration]] for the active
workstream.

## Rules

- Collections are optional: only the ones that are needed exist.
- Every collection directory contains one `*.schema.json` contract.
- Documents may carry any extra frontmatter fields; missing recommended fields produce
  warnings, never errors.
- `.md` / `.html` documents are the source of truth. Everything written to `.vault/`
  is derived and rebuildable.

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

1. [[aa-point-of-sale]] — the business context, the four systems, and which one is live.
2. [[trailbase]] and [[frontend-ssr]] — the replacement pair.
3. [[backend]] and [[frontend]] — what production runs today.
4. [[data-model]] — the 17 tables, the enumeration codes, and the PocketBase → TrailBase value translation.
5. [[reports-and-ledgers]] — the report arithmetic, and why it now lives in JavaScript.
6. [[build-and-run]] and [[environment]] — how to start all four systems, and the credentials each
   needs (the local-only `credentials/` collection, e.g. `credentials/experimental-trailbase.md`).

## Status at a glance

- 17 of 17 TrailBase tables exposed as record APIs; migration applies clean on an empty depot.
- 14 reports implemented in `compute/reports.js`; 14 declarative pages plus 4 ledger pages.
- `npm run smoke` in `frontend-ssr` reports `== 55/55 checks passed ==` against a throw-away depot.
- Legacy Next.js app still points at PocketBase (`NEXT_PUBLIC_PB_URL`), and PocketBase still holds the production data.

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
- [[previous-vault-recovery]] — how to recover the pre-`cleanup` vault from git history.
