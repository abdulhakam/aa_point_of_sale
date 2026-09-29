---
title: "The invoice document is maintained by triggers, and rebuilt on the job queue"
type: decision
status: accepted
decided_on: 2026-09-29
created: 2026-09-29
tags: [invoices, materialised, document-model, json, triggers, cache, rebuild, performance, trailbase]
related_to: ["[[component-split-and-sql-materialised-tables]]", "[[invoice-document-parity-2026-09-29]]", "[[money-is-2dp-everywhere]]", "[[guest-writes-via-sql]]", "[[jobs-in-process-durable-queue]]", "[[materialised-store-cannot-be-a-separate-database]]", "[[deterministic-sort-and-sql-reads-in-guest]]", "[[guest-db-bridge-text-params-only]]", "[[init-script-result-must-be-a-string]]", "[[init-script-result-must-be-a-string]]", "[[report-build-cold-cache-near-the-call-deadline]]", "[[jobs-fanout-reconcile-count-is-zero]]", "[[tb-0027-materialised-invoice-documents]]", "[[tb-0022-move-reports-to-sql]]"]
---

# The invoice document is maintained by triggers, and rebuilt on the job queue

## Decision

One JSON document per live invoice, in the depot's own SQLite, in table `inv_doc`.

1. **Write-through, in the same transaction.** Fourteen triggers keep it current. Any write to
   `invoices`, `transactions` or `payments` re-derives the affected invoice's document inside the
   same transaction as the write, so no reader can see an invoice whose stored total disagrees
   with its own lines. There is no window and no invalidation step.
2. **Rebuild on demand, on the durable job queue.** `POST /invoice-doc/rebuild` enqueues an
   `invdoc.rebuild` job; the minutely poller runs it. It builds into a shadow table and swaps.
   A rebuild is seconds, and seconds do not belong inside a request.
3. **Names are denormalised into the document.** Party, item, booker and type names, plus the
   payment type and party. A read needs no join at all. Renames reach the affected documents
   through three more triggers.

**Automatic rebuild at server start is deliberately not built yet.** `ensureFresh()` in
`app/lib/invoice-doc.js` is the hook, and the reason it is not wired up is
[[init-script-result-must-be-a-string]].

## Why the document exists

The invoice screen is the slowest read in the system and the vault has been circling this for
three sessions. `/invoice/context` needs the 23,421-row `itemsReport` view, and the whole report
build is **~12 s cold**, which is most of the way to the guest's ~20 s call deadline
([[report-build-cold-cache-near-the-call-deadline]]). A document read is **0.03 ms** by primary
key. That is the whole argument.

## The arithmetic exists in exactly one place

This is the constraint that shapes every file. The money arithmetic must be written once.

SQLite cannot call a stored statement from a trigger, so the trigger bodies are *copies*. A copy
is where money goes wrong. So:

- The build statement is written once, as a commented block a reader can follow
  (`U1790300500`, section 2).
- The **executable** statement (section 4) and the text stored in `materialised_source.sql` are
  that same text.
- Each of the 12 document-rederivation triggers is that text with its four depot-wide scans
  narrowed to one invoice. The three rename triggers narrow it to the row being updated.
- `trailbase/tools/invoice-doc-check.mjs` re-derives every trigger from the committed statement
  and fails if any differs. It also asserts the four scans are narrowed in **every** trigger,
  because a substitution written for one form silently misses the other three.

The check is not decoration. Removing one narrowing predicate by hand makes it fail on 8 checks.
The unnarrowed form measured **237 ms per line write**, which is an unusable till.

**The runtime rebuild is the stored text, executed.** `app/lib/invoice-doc.js` reads
`materialised_source.sql` and runs it, so "rebuild" and "what the migration ran" cannot differ.
The registry is generic: `kind` names a document type, `table_name` the table, `sql` the
statement. A second materialised document type is a row, not a mechanism.

## Renames re-derive rather than patch — the least obvious choice here

A name-only patch is about half the cost: 444 ms against 1,213 ms for the worst item rename
(1,063 documents). It was rejected anyway.

A patch is a **second copy of the document's field list**. Add a field to the build statement
without updating the patch and the documents keep a stale name with no error anywhere — the
renamed party, the wrong name in 784 documents, and nothing in the system complains. Re-deriving
cannot drift. It costs a one-off of 1–8 s on a master-data edit, and buys "a rename cannot
perturb money and cannot fall out of sync with the shape".

The same reasoning, applied consistently, is why `verify()` compares the denormalised names
against the base tables: a document whose `party_name` no longer matches the party row is
internally consistent and still a lie, which is the one drift a self-consistency check cannot
see.

## Measurements, on the production depot

8,932 invoices, 23,421 lines, 26,526 payments, 16.9 MB of documents at 1.9 KB each.
Ranges are the spread across runs on a busy machine, not a single sample.

| | |
|---|---|
| line insert, 36-line invoice | 0.9 – 2.9 ms |
| line update / soft delete / hard delete | 0.1 – 2.0 ms |
| payment insert / update / delete | 0.1 – 7.7 ms |
| invoice header update, completed flag | 1.5 – 9.6 ms |
| entering an invoice line by line, 100 lines | 0.4 – 0.6 s total |
| line moved to another invoice, both re-derived | 10 – 17 ms |
| item rename, worst case (1,063 documents) | 0.65 – 2.3 s |
| party rename, worst case (784 documents) | 0.45 – 1.6 s |
| booker rename, worst case (4,122 documents) | 2.1 – 8.2 s |
| full rebuild, in place | 3 – 15 s |
| full rebuild, shadow table + atomic swap | 3 – 18 s |
| read one document by primary key | 0.03 ms |
| outstanding, `GROUP BY party` | 20 – 44 ms |
| item sales via `json_each` over documents | ~730 ms — do not |

Two things to read off that table.

**A per-invoice write is cheap but not constant.** Re-deriving a document costs what the invoice
contains, so the 100th line of a 100-line invoice costs about 100× the first. Half a second for
a hundred lines is fine; it is still the shape of the cost, and it is the argument against
patching individual fields on the write path.

**A booker rename is the worst case in the system** — one booker covers 4,122 of 8,932 invoices —
and at the slow end it is 8 s, against a ~20 s deadline. It is a master-data edit from the
Management screen, never on a till's path. If that ever stops being true the fix is to split the
rename across a job, and the trigger has to change with it: the fan-out cannot be batched without
giving up "the rename and the documents change together".

## Parity

`trailbase/tools/invoice-document-parity.py` reads the build statement out of the migration (never
restates it) and diffs every money figure against PocketBase on a scratch copy:

```
invoices compared      : 8935
total      mismatches  : 0
unrounded  mismatches  : 0
final_total mismatches : 0
  (worst per-line delta 0.000e+00)
transaction lines      : 23413   mismatches: 0
payments (COALESCE rule): 26526   mismatches: 0
```

The enrichments added no arithmetic. `total`, `unrounded_total`, `final_total`, `paid_total` and
`remaining` are character-for-character what the earlier run verified, including the legacy quirk
of rounding `unrounded_total` *before* subtracting `discount_rs`.

## What this is not

- **Not precomputation.** Triggers keep the documents correct between rebuilds, so a rebuild is a
  repair, not the thing that makes them current ([[component-split-and-sql-materialised-tables]]
  tier 2). `reports.no_precomputation` is about *report* figures; nothing here feeds a report yet.
- **Not a report tier.** `inv_doc` answers "one invoice, completely" in 0.03 ms. It is 730 ms
  for item sales, which is why [[tb-0022-move-reports-to-sql]] still needs the aggregate tier and
  a report cannot simply read documents.
- **Not used by anything yet.** The read API exists; no screen reads it. Wiring `/invoice` to
  `GET /invoice-doc/document` is the next obvious step and is the thing that would retire the
  `itemsReport` cold path.

## Endpoints

| | |
|---|---|
| `GET /invoice-doc` | status: counts, payload size, in-step, last rebuild, live lease |
| `GET /invoice-doc/verify` | drift report; **~13 s**, a report and not a page load |
| `GET /invoice-doc/list` | summaries from generated columns — no JSON parsing, no joins |
| `GET /invoice-doc/document?id=<base64>` | one whole document |
| `GET /invoice-doc/inv-<no>` | one whole document by the human id |
| `POST /invoice-doc/rebuild` | enqueue; `?reconcile=1` runs it in the same call |
| `GET /invoice-doc/rebuild` | rebuild-in-progress view, for a screen to poll |

An id is base64, and `=` inside a path segment is fragile through the router, so a base64 id
goes in the query. The path form is for `inv-<no>` and hex.

## Related

- [[invoice-document-parity-2026-09-29]] — the evidence.
- [[materialised-store-cannot-be-a-separate-database]] — why it lives in the depot's SQLite.
- [[tb-0027-materialised-invoice-documents]] — the task.
