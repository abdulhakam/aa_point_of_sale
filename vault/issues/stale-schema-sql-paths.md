---
title: The READMEs point at the preserved schema SQL by a path one level too shallow
type: issue
status: open
severity: low
created: 2026-09-26
tags: [docs, paths, stale, trailbase, runtime-js]
related_to: ["[[backend]]", "[[reports-and-ledgers]]"]
---

# The READMEs point at the preserved schema SQL by a path one level too shallow

## What is wrong

Two files cite the preserved PocketBase view SQL as `../full_database_schema.sql` and
`../dltbl/views_from_pb/U1776088644__create_views.sql`, relative to their own directory (a third
citation, in the removed Node frontend's `README.md`, went with `frontend-ssr` on 2026-09-27 — and
its successor `runtime-js/README.md` does not repeat it):

| File | Line | Text |
|---|---|---|
| `trailbase/README.md` | 4, 128 | "schema in `../full_database_schema.sql`", "preserved verbatim in `../full_database_schema.sql` and `../dltbl/views_from_pb/U1776088644__create_views.sql`" |
| `runtime-js/site/app/compute/views.js` | 5 | "preserved verbatim in `full_database_schema.sql` / `dltbl/views_from_pb/U1776088644__create_views.sql`" |

From `aa_point_of_sale/`, `../` resolves to `.../PRODUCTION_FULL/`, which does **not** contain
either artefact. A search of that tree finds nothing.

## Where the files actually are

Both exist, one level higher than the READMEs imply:

```text
D:\...\aa_point_of_sale\PRODUCTION\aa_point_of_sale\full_database_schema.sql
D:\...\aa_point_of_sale\PRODUCTION\aa_point_of_sale\dltbl\
```

That is `../../` from the workspace root — i.e. the citations are off by exactly one directory
level. Note the workspace itself sits at
`.../PRODUCTION/PRODUCTION_FULL/aa_point_of_sale/`, and there is a **sibling** copy at
`.../PRODUCTION/aa_point_of_sale/` which is where the artefacts live, next to
`PRODUCTION_FULL/`, `PRODUCTION_FULL.rar`, `project_stack_agnostic_spec.html` and
`trade-and-distribution-management-specification.html`.

## Why it matters

- The claim "the old SQL is not lost" ([[trailbase-drop-sql-views]]) is the safety net for the
  whole no-views decision. A reader following the citation concludes the safety net is missing.
- [[reports-and-ledgers]] and the future WASM-handler idea both point at those artefacts as the
  executable specification. A broken path makes the specification look unavailable.
- The remaining citations disagree with reality; with the third one removed along with the Node
  frontend, a reader has no way to tell whether the files were deleted or merely mis-cited.

## Options

1. **Fix the paths** to `../../full_database_schema.sql` /
   `../../dltbl/views_from_pb/U1776088644__create_views.sql` in both remaining places. Smallest
   change; keeps the artefacts outside the repository.
2. **Copy the artefacts into the workspace** (e.g. `backend/schema/`) and cite them relatively.
   Makes them part of the repository, at the cost of duplicating a file that belongs to the legacy
   side.
3. **Drop the citations** and describe the artefacts as external. Least useful — the whole point is
   that the SQL is retrievable.

Whichever is chosen, the fix should be applied to both locations together, and should state
plainly whether the file is inside the repository or beside it.

## Not done yet

Deliberately left as an issue rather than fixed, because the correct answer depends on whether
those artefacts should be *in* the repository — a decision about the legacy side's layout, not a
typo fix.

## Related

- [[reports-and-ledgers]] — why the preserved SQL matters.
- [[trailbase-drop-sql-views]] — the decision that makes it the specification.
- [[backend]] — the migrations that contain the same SQL in executable form.
