---
title: The runtime-js authoring contract — a route is a folder, not a JavaScript file
type: decision
status: active
created: 2026-10-01
updated: 2026-10-01
tags: [runtime-js, architecture, authoring, manifest, generic-code]
related_to: ["[[runtime-js-guest-platform]]", "[[one-manifest-is-the-page-definition]]", "[[compiled-artifacts-are-generic-capabilities]]", "[[report-logic-stays-runtime-file-based]]", "[[client-side-live-recalculation]]", "[[compiled-artifacts-are-generic-capabilities]]"]
---

# The runtime-js authoring contract — a route is a folder, not a JavaScript file

## The contract

**Page authoring** requires a directory and nothing else:

```
app/pages/<group>/<name>/
  meta.json     the page definition — inert data
  page.html.jinja     optional template override
```

**Route authoring** requires a directory with its workflow file and one or more route-code scripts.
A `.ts`/`.js` file in a route directory may define extra endpoints (`POST`, `PUT`, `DELETE`, `PATCH`),
used only when strictly needed.

The guest discovers, dispatches and renders — so adding a report or a page does not mean editing a
central registry, and a person editing an app does not have to read a router.

## What is deliberately NOT here

**`meta.json` stays inert data.** It is not replaced by a `route.mjs` in which a `META` constant is
mixed with handler functions. The reason is specific, not aesthetic:

- **A manifest can be listed without being executed.** The crawler reads 14+ files and knows the whole
  route table from JSON alone. If a page is a module, listing the site means *running* every page.
- **The guest has no real ESM.** `ahscripts/routes/_app/route.ts` carries a ~60-line regex shim that
  rewrites `import`/`export` into `new Function`. A `.mjs` route file is parsed by that shim, so
  growing the role of module files grows dependence on it.

Handler code is still available where it is actually needed — as a `route.mjs` loaded lazily beside a
manifest, only on first request, and only when present. That is additive: a page without one is
rendered from its manifest alone, with no JavaScript executed to serve it.

## The compiled side stays generic

Generic capabilities — SQL execution, rendering, id codecs, the spool/KV handoff — are **implemented
in Rust and exposed to the guest**, not written in JavaScript. JS/TS is the interpreted,
app-specific authoring surface.

The line, stated as a test: **a Rust component must not know the name of a report, a column, or a
business rule.** Today the spool/KV handoff already satisfies this — `render.spooled(name, ctx,
[{field, key}])` and `sql.spool(name, sql, cols, params)` are pure mechanism, and
`tb-ah-run-js/src/render.rs` holds no report names at all.

## The `sql` library, and the statement guard (P3, 2026-10-01)

`tb-ah-run-js/src/api/sqlite.rs` exposes one SQL surface to the guest, named `sql`, with `sqlite` kept
as an alias so the dispatcher's hundred existing call sites keep working:

```
sql.query(sql, params)                 -> rows
sql.get(sql, params)                   -> the first row
sql.spool(name, sql, cols, params)     -> { key, rows, bytes, queryMs, writeMs }   (never enters QuickJS)
sql.execute(sql, params)               -> rows affected
```

Two changes beyond the naming:

**The rows no longer round-trip through a JSON string.** The old path was
`serde_json::to_string(&rows)` then `ctx.json_parse`, which allocated a copy of the entire result
set as text and parsed it straight back. `json_to_js` builds the JS value directly.

**A statement guard.** `DROP`, `ATTACH`, `DETACH`, `PRAGMA`, `VACUUM` and `REINDEX` are refused, on
every entry point, with a thrown message that names the keyword. It is a **blocklist and not
"only SELECT"** on purpose: the guest's own write path legitimately runs `CREATE TABLE` (the
rendered-page cache), `INSERT`, `UPDATE` and `DELETE` (management CRUD), so a whitelist would refuse
work the app is supposed to do. Everything on the list is a statement whose damage the app cannot undo.

### The guard's first version did not work, and why that matters

The obvious implementation — look at the statement's **leading** keyword — is not a guard, it is a
spelling check. The spool hands the guard a *composed* statement: the prelude's `WITH …` chain
followed by the report body, so the leading keyword is `WITH` and always was. A report body carrying

```sql
SELECT 1; DROP TABLE IF EXISTS pagecache
```

sails straight past it. This was found by **probing it with exactly that statement** rather than with
a bare `DROP`, which the old code appeared to catch (it did not — SQLite rejected it as a syntax
error, which looked like the guard working and was not).

The guard now masks strings and comments, splits on `;`, and checks every statement. Verified with a
throwaway report installed in the **served copy only**, never the source:

```
status: 500
message: Guest error: totals statement failed for zzguard:
         sql: DROP is not permitted by the guest's SQL guard
```

and `pagecache` was still there afterwards. The lesson worth keeping: **a security check is only
tested by the attack it is meant to stop**, and a test that passes for the wrong reason is worse than
no test, because it retires the question.

### What P3 did NOT achieve

The render context is now handed to the renderer as a value rather than a `JSON.stringify`d string, so
the last `JSON.stringify` on the page path is gone. **This is a simplification, not a measured
speed-up**: the context is kilobytes while the rows are megabytes, and `pagecache` serves a repeat
view straight from SQLite without rendering at all, which makes a before/after timing
meaningless. The large win was P1 and P2 (one definition; `/p` at 465 KB instead of 8,242 KB).

## `app.config.json` — the mode is the app's choice (P4, 2026-10-01)

`/app/config/app.config.json` selects how the host routes, read once at server start by
`tb-ah-run-js/src/config.rs`:

```json
{ "mode": "dispatcher", "dispatcher": "/ahscripts/routes/_app/route.ts" }
```

| mode | a path with **no route folder** of its own is answered by |
|---|---|
| `dispatcher` (default) | the catch-all. Dynamic paths like `/reports/<key>` need this — they cannot be URL folders. |
| `crawler` | nothing. It is a 404. |

A per-URL folder is tried **first in both modes**, so a route folder always beats the dispatcher.

### The host was already a crawler

This is the finding that made P4 small. `lib.rs` resolves a URL to a FOLDER
(`/mode` → `ahscripts/routes/mode/route.ts`) and only falls back to `_app` afterwards. The catch-all
was never the primary mechanism — it was always the fallback. P4 does not build a crawler; it makes
the *absence* of the fallback configurable.

### Verified, both ways

`ahscripts/routes/mode/route.ts` is a route folder and the smallest complete example of the contract:
a folder, `GET` exported, one of the shapes the host knows. It answers in both modes, which is what
makes it a proof.

```text
dispatcher mode:   /mode 200   /login 200   /dashboard 200   /reports/payments 200
crawler mode:      /mode 200   /login 404   /dashboard 404   /reports/payments 404
```

The mode was switched in the **served copy only** and the source left at `dispatcher`, so the default
cannot be lost by accident.

### The queue poller follows the mode

`job_handlers` drives `/jobs/reconcile`, a dynamic path with no folder of its own, so it needs the
dispatcher. In `crawler` mode it registers **no job at all** rather than one whose route cannot
exist — which would otherwise log a failure every minute forever.

### Two limits, stated because they are real

- **The host serves no static files.** `/static/*` was served by the app's own `readStatic`. In
  `crawler` mode `/static/app.js` is a 404, because the app is gone entirely. A crawler frontend must
  answer its own asset URLs from a route folder, or the host needs a static rule. Not fixed here.
- **An unknown mode falls back to `dispatcher`**, and says so in the log. The catch-all is the more
  permissive of the two, so an unrecognised mode must not silently become the strict one.

## Related

- [[runtime-js-guest-platform]] — the system these rules govern.
- [[compiled-artifacts-are-generic-capabilities]] — the compiled/app boundary.
- [[report-logic-stays-runtime-file-based]] — why report SQL stays a runtime `.sql` file rather than a
  SQLite view.
- [[client-side-live-recalculation]] — the same instinct on the client: as little JavaScript as possible.
