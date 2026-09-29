---
title: "The live write-through verification harness for the materialised invoice documents"
type: note
created: 2026-09-29
tags: [harness, invoices, materialised, trailbase, verification]
related_to: ["[[invoice-document-write-through-and-rebuild]]", "[[invoice-doc-sync]]", "[[tb-0027-materialised-invoice-documents]]", "[[component-split-and-sql-materialised-tables]]", "[[materialised-store-cannot-be-a-separate-database]]"]
belongs_to: "[[trailbase]]"
---

# The live write-through verification harness for the materialised invoice documents

## What runs, and what each thing is for

| command | needs a server | proves |
|---|---|---|
| `node trailbase/tools/invoice-doc-check.mjs` | no | the committed migration is self-consistent: the commented definition, the executed statement and the stored text are one statement, and every trigger is a narrowing of it |
| `node trailbase/tools/invoice-doc-check.mjs --live` | yes | the depot agrees with that migration, and the documents agree with the base tables |
| `python trailbase/tools/invoice-document-parity.py` | no | the money matches PocketBase, invoice by invoice, on a scratch copy |

Run the first on every edit to the migration. The second after the server is up. The third
whenever the arithmetic changes.

## `--live` against a running server

`GUEST_BASE=http://127.0.0.1:4000 node trailbase/tools/invoice-doc-check.mjs --live`

Logs in as admin, then asserts: the build statement is registered, there is one document per live
invoice, `verify()` finds no drift, `list()` returns rows, one whole document comes back complete
and its `total` equals the sum of its own lines, every line carries an item name, every payment
carries a date, and `inv-<no>` reads the same document the id does.

## The drift guard is a real guard, and that was checked

`trailbase/migration U1790300500` contains 12 copies of the build statement (12 triggers) plus the
commented definition and the `materialised_source` literal. A copy is where money goes wrong, so
the tool re-derives each one from the committed statement instead of trusting it.

The negative test: remove one narrowing predicate by hand from `inv_doc__line_insert` and the
check fails on 8 checks, naming `transactions -> one invoice` as unscoped. The unnarrowed form
measured 237 ms per line write.

The narrowing assertions are per-scan rather than per-statement on purpose. A substitution table
written against specific `FROM` text silently stops matching when the `FROM` changes — the
parity harness had exactly that failure when the build gained `LEFT JOIN items`, and it was
caught by an assertion rather than by a wrong number.

## Damaging the cache on purpose

To test the rebuild, break the table and rebuild it. **On a throwaway depot only.**

```python
# empty the table
DELETE FROM inv_doc
# drop it entirely
DROP TABLE inv_doc
# a mix: remove some documents and corrupt some names, so `verify()` has both kinds of drift
DELETE FROM inv_doc WHERE "party" IN (SELECT "party" FROM inv_doc ORDER BY RANDOM() LIMIT 50);
UPDATE inv_doc SET "doc" = json_set("doc", '$.party_name', 'WRONG') WHERE "rowid" % 97 = 0;
```

The second kind of damage is the one that matters. Missing documents are caught by a count; a
document whose `party_name` is present but *wrong* is internally consistent and still a lie, and
only the name checks in `verify()` can see it. Those four checks are what a broken rename trigger
would show up in.

## Two things the harness taught, both now in the code

**`sqlite.all` and `kv.get` are async.** They are host functions declared `Async(...)` in
`host/src/api.rs`, so they return promises. A synchronous wrapper reads a Promise: truthy, no
`.length`, and therefore an empty database rather than an error. The first symptom was
`status()` reporting `documents: 0` against a populated `inv_doc`.

**An init script cannot avoid the host's `undefined` error** — see
[[init-script-result-must-be-a-string]]. The automatic rebuild is not wired up for the other half
of the same problem, [[init-script-result-must-be-a-string]].

## Related

- [[invoice-document-write-through-and-rebuild]] — the decision these harnesses defend.
- [[tb-0027-materialised-invoice-documents]] — the task.
