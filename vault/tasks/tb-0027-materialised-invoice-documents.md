---
title: "TB-0027 Materialised invoice documents — write-through maintenance and on-demand rebuild"
type: task
status: done
priority: high
created: 2026-09-29
updated: 2026-09-29
tags: [invoices, materialised, document-model, json, triggers, cache, rebuild, trailbase]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[invoice-document-write-through-and-rebuild]]", "[[invoice-doc-sync]]", "[[component-split-and-sql-materialised-tables]]", "[[invoice-document-parity-2026-09-29]]", "[[materialised-store-cannot-be-a-separate-database]]", "[[tb-0021-invoices-cashmemos-printing]]", "[[tb-0022-move-reports-to-sql]]", "[[money-is-2dp-everywhere]]", "[[jobs-in-process-durable-queue]]", "[[guest-writes-via-sql]]", "[[init-script-result-must-be-a-string]]", "[[init-script-result-must-be-a-string]]", "[[report-build-cold-cache-near-the-call-deadline]]", "[[jobs-fanout-reconcile-count-is-zero]]"]
---

# TB-0027 Materialised invoice documents — write-through maintenance and on-demand rebuild

One JSON document per invoice, in the depot's own SQLite, held in `inv_doc`. Maintained by
triggers in the same transaction as the write, rebuildable on demand. Scoped to invoices; the
mechanism is generic, and a second document type is a row in `materialised_source`, not a second
mechanism. The design and the measurements are in [[invoice-document-write-through-and-rebuild]].

## Why this task existed

`U1790300300__materialised_invoice_documents.sql` created and backfilled `inv_doc` and was
deliberately **inert** — no trigger, so nothing about current behaviour changed. On the loaded
production depot the table was **empty (0 rows)**, because the migration ran before the v1 import
and the import is a plugin that writes into a migrated database. The first half of the prototype
(a correct, PocketBase-parity document) had shipped without the second half (anything that keeps
it correct, and anything that fills it).

## Done

- [x] **Measured the design on the production depot before writing it** — fan-out, write-through
      cost, rename cost, rebuild cost, read cost. A wrong cost model would have decided the
      design, so it was measured first.
- [x] **`U1790300500__invoice_document_sync.sql`** — the enriched build statement, 14 triggers, the
      `materialised_source` registry, the repopulate (the table was empty), and an index for the
      one `payments` column the rename path reaches that had none (`paid_to`).
- [x] **One definition of the arithmetic, enforced.** The build statement is written once; the
      executable statement, the text stored for the runtime rebuild, and all 12 document triggers
      are narrowings of it. `trailbase/tools/invoice-doc-check.mjs` re-derives every trigger from
      the committed statement and fails if any differs. Negative-tested: removing one narrowing
      predicate by hand fails 8 checks.
- [x] **Write-through verified on a scratch copy of the live depot** — every operation re-derives
      and the document is checked for self-consistency after each: line insert/update/soft
      delete/hard delete, line moved between invoices, payment insert/update/delete, header update,
      completed flag, soft-deleting and restoring an invoice, entering 100 lines, an item rename
      across 1,063 documents.
- [x] **`app/lib/invoice-doc.js`** — status, verify, rebuild, requestRebuild, ensureFresh, read,
      list. A plain script, so the request path and any future start-up path share one
      implementation. KV-backed lease (so a crashed rebuild does not block later ones) and rebuild
      record.
- [x] **Rebuild is on the durable job queue.** `invdoc.rebuild` in `queue.js`; the route enqueues
      and returns. Run inline it completed the work and then lost the HTTP response to the ~20 s
      guest deadline, so that is not the default.
- [x] **Routes** — `GET /invoice-doc`, `/verify`, `/list`, `/document?id=`, `/rebuild` (GET and
      POST), `/invoice-doc/{id|inv-<no>}`.
- [x] **`trailbase/tools/invoice-doc-check.mjs`** — the drift guard, with a `--live` pass against a
      running server.
- [x] **`invoice-document-parity.py` updated** — reads the build statement out of the new
      migration, installs the migration's own 14 triggers instead of deriving a fifteenth, and
      checks an item rename leaves no stale name. Parity with PocketBase is still **exact**.
- [x] **Verified end to end on a live server** — emptied the cache, confirmed drift detection,
      requested the rebuild, watched the poller run it, confirmed the documents and the names came
      back.
- [x] **Regression** — `invoice-doc-check --live` all green, `management-check` all green,
      `jobs-check` and `invoice-check` each have **one pre-existing failure**, both reproduced with
      the committed files and both written up ([[jobs-fanout-reconcile-count-is-zero]],
      [[report-build-cold-cache-near-the-call-deadline]]).

## Deliberately not done

- [ ] **Automatic rebuild at server start.** Built, then removed at the user's direction: on-demand
      first. The code is kept — `ensureFresh()` is the check-and-rebuild decision, and
      `requestRebuild()` is the enqueue — because the automatic path is those two plus a cheap
      "out of step?" check, and not a rebuild inside the script. The reason is
      [[init-script-result-must-be-a-string]]: init scripts run on all four WASM runtimes, so a
      rebuild there is 3–18 s added to the first request of each thread.
- [ ] **Wiring `/invoice` to the documents.** The read API exists and nothing reads it. This is
      what would retire the ~12 s `itemsReport` cold path
      ([[report-build-cold-cache-near-the-call-deadline]]) and it is the next step in
      [[tb-0022-move-reports-to-sql]].

## Next

1. Point the invoice screen at `GET /invoice-doc/document` and stop asking for `itemsReport`.
2. Then decide the automatic rebuild, with the queue as the mechanism.
3. Then a second document type, to prove the registry is generic rather than claimed to be.

## Constraints this respected

- **Never edit an applied migration.** `U1790300300` is byte-identical; the depot's checksum record
  depends on it ([[trailbase-stale-depot-skips-migration]]).
- **Route `.sql` may only read.** The build and the triggers never write to the base tables
  (`runtime_js.route_sql_read_only`).
- **Money stays 2 dp and stays one rounding site** ([[money-is-2dp-everywhere]]).
- **The rebuild is not precomputation.** Triggers keep the documents correct between rebuilds, so a
  rebuild is a repair, not the thing that makes them current
  ([[component-split-and-sql-materialised-tables]] tier 2).

## Related

- [[invoice-document-write-through-and-rebuild]] — the decision.
- [[invoice-doc-sync]] — how to run the checks, and how to break the cache on purpose.
- [[tb-0021-invoices-cashmemos-printing]] — the invoice screen these documents are built for.
