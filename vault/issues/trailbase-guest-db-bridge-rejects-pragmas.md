---
title: The guest DB bridge rejects every PRAGMA, and a silent no-op hid it
type: issue
status: open
severity: medium
created: 2026-09-28
updated: 2026-09-28
tags: [trailbase, wasm, sqlite, bridge, pragma, correction]
related_to: ["[[clean-slate-benchmark-cycle]]", "[[component-split-and-sql-materialised-tables]]", "[[guest-writes-via-sql]]", "[[trailbase-loads-multiple-components-flat-router]]"]
---

# The guest DB bridge rejects every PRAGMA, and a silent no-op hid it

## Finding

**`PRAGMA` statements do not work through TrailBase's guest DB bridge.** Both channels reject them:

```json
GET /bench/pragma
{
  "execute shrink_memory":  "ERR: QuickJS library created a unknown error",
  "execute cache_size=1":   "ERR: QuickJS library created a unknown error",
  "query cache_size":       "ERR: QuickJS library created a unknown error",
  "query page_count":       "ERR: QuickJS library created a unknown error"
}
```

The underlying error is `pragmas not supported`. It applies to `db.execute` and `db.all` alike.

## The workaround the app already uses

The **table-valued function** form *is* a SELECT and works:

```sql
SELECT name FROM pragma_table_info(?)   -- works
PRAGMA table_info("t")                  -- rejected
```

`app/lib/data.js columnsOf()` already uses this form, which is why the app's own column lookup works
while a naive `PRAGMA` does not. `tb-ah-query-tbdb.wasm` initially used a DDL parse of `sqlite_master.sql`
(because `PRAGMA` failed) and was switched to `pragma_table_info(?)` once this was understood.

## The correction: a silent no-op that produced published numbers

An earlier revision implemented "cold SQL" mode as:

```js
await db.execute("PRAGMA shrink_memory", []);
await db.execute("PRAGMA cache_size = 1", []);
```

executed before the measured query — the inline arm inside `try/catch`, the component arm behind
`let _ =`. **Every one of those calls failed, and every failure was swallowed.** The `cold=1` flag
therefore changed nothing, and a five-run sweep was measured and recorded as "cold" while in fact
measuring warm behaviour, with the misleadingly precise result "−1.1% paired median".

That claim is withdrawn in [[component-split-and-sql-materialised-tables]] and
[[clean-slate-benchmark-cycle]]. There is **no way to flush SQLite's page cache from inside the
guest**; the only genuine mechanism is a fresh process, and the benchmark does not currently do that
per measurement.

## Lesson worth keeping

Swallowing an error to keep a feature "best effort" turned a missing capability into a fabricated
measurement. The probe route `/bench/pragma` now exists so the capability is checked rather than
assumed, and the cold implementation was removed rather than left in place looking functional.

## Evidence

- `GET /bench/pragma` on the running depot — the four errors above.
- `trailbase/tb-ah-query-tbdb/src/lib.rs` — the `cold_flush` tombstone and the reason the `PRAGMA` version
  was removed.
- `trailbase/runtime/app/lib/data.js` — `columnsOf` using the working `pragma_table_info(?)` form.

## Related

- [[clean-slate-benchmark-cycle]] — the methodology note whose cold section is corrected.
- [[component-split-and-sql-materialised-tables]] — the decision whose cold table is withdrawn.
