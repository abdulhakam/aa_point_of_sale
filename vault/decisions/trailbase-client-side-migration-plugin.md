---
title: Make the data migration a client-side plugin, not backend code
type: decision
status: accepted
decided_on: 2026-09-25
created: 2026-09-26
tags: [frontend-ssr, plugins, migration, pocketbase, import]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[frontend-ssr]]", "[[pos-0027-migrate-production-data-to-trailbase]]"]
---

# Make the data migration a client-side plugin, not backend code

## Context

Moving production records out of PocketBase ([[backend]]) into TrailBase ([[trailbase]]) is a
one-time, but non-trivial, job: ~15 collections in dependency order, ids translated from
PocketBase's `'r…'` to UUIDv7, enum text translated to integer codes, and two JSON-array
relations expanded into link tables ([[data-model]]).

Where should that code live? Options considered:

| Option | Problem |
|---|---|
| A PocketBase JS migration (`//go:build` hook or `pb_hooks`) | Runs *inside* the old server, which is meant to be left alone; it would also need to be deployed there |
| A standalone Node script in `trailbase/` | A second place that needs a TrailBase client, auth handling and paging — duplicating `frontend-ssr/src/lib/trailbase.js` |
| Server-side code in [[frontend-ssr]] | The migration becomes part of the running app's surface area forever, for something run once |
| A browser page that talks to both servers | No backend code at all, and both credentials are already available to the operator doing it |

## Decision

The migration is the bundled **`import-from-v1` plugin**: a self-contained folder
`frontend-ssr/plugins/import-from-v1/` containing `meta.md` + `index.html`, served at
`/plugins/import-from-v1/` **behind the same login as the rest of the app**.

It signs in to PocketBase (admin login + paged reads) and TrailBase (user login + bulk record
writes) directly from the browser and copies the data itself. No backend code is added to
[[frontend-ssr]], and nothing is added to [[backend]] or [[trailbase]] beyond the schema.

It does the translation work:

- Writes in **dependency order**: masters → link tables → invoices → return references →
  transactions → payments.
- Translates PocketBase ids to fresh TrailBase UUIDs.
- Translates enum text (`sale`, `customer`, `sending`, …) to the integer codes.
- Expands the multi-valued `parties.company` / `order_bookers.company` relations into
  `party_companies` / `order_booker_companies` rows.
- **Skips a collection the source server does not have**, instead of failing.
- Offers an optional clear-first and a read-only **dry run**.
- Drops `invoices.invoice_maker` — it points at PocketBase's `_user`, which TrailBase does not
  share ([[import-from-v1-drops-invoice-maker]]).

## Why this is the right shape

- **The plugin contract is designed for exactly this.** `plugins/<slug>/{meta.md,index.html}` is
  a single self-contained page, addable and removable by copying or deleting a folder, with no
  change to `src/` or `views/` ([[frontend-ssr]]). A one-off migration is the archetypal plugin.
- **It is behind the login**, so the page — and therefore the two sets of credentials it uses —
  is not reachable anonymously.
- **Both servers are reachable from the operator's browser** (`:8090` and `:4000` on
  `127.0.0.1`), which is the normal deployment shape for this application
  ([[offline-local-deployment]]).
- **It is disposable.** When the migration is done the folder can be deleted; nothing in the app
  references it.
- **Paging and auth for both APIs are already solved** in the two client libraries the browser
  can load, and TrailBase's `enable_record_transactions: true` allows an invoice plus its
  transactions to be submitted atomically.

## Consequences

**Accepted**

- The migration runs in the browser, so a very large dataset depends on the tab staying open.
  Acceptable for a one-time job at this data size; a resume/idempotency story would be needed if
  it were not.
- The plugin talks to PocketBase directly, so PocketBase stays reachable and writable during the
  migration. The dry-run mode and the optional clear-first are the guard rails.
- The dry run + skip-missing-collections behaviour makes it reusable as a *verification* tool, not
  just a one-shot import.

**Given up / open**

- It is **not yet wired into a process**: there is no recorded run against the production dataset,
  no reconciliation step that compares row counts or totals between the two servers, and no
  id-remapping story for ids stored outside the database (printed invoices, QR payloads).
  Tracked as [[pos-0027-migrate-production-data-to-trailbase]].
- `invoices.invoice_maker` is dropped, so invoice authorship does not survive the migration.
- The plugin's own `PLAN` field mapping is inline in `index.html` rather than documented here; the
  authoritative translation table is [[data-model]].

## Evidence

- `frontend-ssr/plugins/README.md` — the plugin format, and "Plugin pages are behind the same
  login as the rest of the app."
- `frontend-ssr/plugins/import-from-v1/meta.md` — frontmatter (`author: Abdul Hakam`,
  `license: MIT`, `tags: [migration, pocketbase, import, one-time]`, `order: 10`) and the "What it
  does" list quoted above.
- `frontend-ssr/src/lib/plugins.js` + `src/routes/plugins.js` — the hub that reads each `meta.md`
  and serves the page.
- `frontend-ssr/src/server.js` — `app.use("/plugins", requireAuth, express.static(config.pluginsDir, { index: "index.html" }))`.
- `trailbase/README.md` § *Data migration* — the value translations the plugin implements.
- The prior vault's `decisions/trailbase-migration-is-a-client-side-plugin.md` (`bd81f2f`) is the
  original record; see [[previous-vault-recovery]].
