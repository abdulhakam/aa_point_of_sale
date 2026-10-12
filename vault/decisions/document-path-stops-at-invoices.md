---
title: The document path stops at invoices — the general document store is dropped
type: decision
status: accepted
decided_on: 2026-10-02
created: 2026-10-02
tags: [documents, cache, triggers, sql, views, print, performance]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[document-store-and-streaming-render]]", "[[sql-review-2026-10-02]]", "[[tb-0027-materialised-invoice-documents]]", "[[legacy-parity-checks-waived]]", "[[tb-0032-manifest-first-refactor]]", "[[money-is-2dp-everywhere]]", "[[render-split-measured]]"]
---

# The document path stops at invoices — the general document store is dropped

## Context

[[document-store-and-streaming-render]] built a general document store on 2026-09-30: a
`document(kind, id, doc)` table holding a precomputed JSON document per invoice, voucher, party and
item, maintained by **12 SQLite triggers** so that an INSERT anywhere produces the document with no
application code running. It was verified 15/15 and it worked.

It was never read. A review on 2026-10-02 ([[sql-review-2026-10-02]] §2b) found zero
`SELECT … FROM "document"` in the guest and no record collection exposing it, and recommended
deleting it — which was corrected at the time, because "unread" meant the consumer was not wired up
yet rather than the work being abandoned.

## Decision

**The document path is not being built beyond invoices** (owner, 2026-10-02). So the general store
has no consumer and is **dropped**, in migration `U1790600000__drop_general_document_store.sql`:

| Dropped | Count |
|---|---|
| triggers | **12** — `document__{voucher,party,item,invoice}_{insert,update,delete}` |
| views | **3** — `document__{voucher,party,item}_src` |
| table + indexes | `document`, `document_kind_readable_idx`, `document_kind_dated_idx` |
| rows | **36,603** — 26,526 vouchers + 8,927 invoice mirrors + 943 parties + 207 items |

## What survives, and the confusion to avoid

**`inv_doc` is untouched** — 8,927 rows, its own 14 `inv_doc__*` triggers on the base tables, and it
is the store the app actually reads (`app/views/invoices/document.html.jinja` and `app/lib/queue.js`;
routes `/invoice-doc/<id>` and `/invoice-doc/document?id=`).

The `document` table also held a *mirror* of the invoice documents; that mirror is what went.
Verified after the migration: `views = 0`, `document__*` triggers = 0, table gone, `inv_doc` 8,927
rows with 8,927/8,927 resolving back to their invoice, and all 14 maintenance triggers present on
`invoices`, `items`, `parties`, `order_bookers`, `payments` and `transactions`.

## Why this, and not a KV store

The store's one irreplaceable property is **freshness with no invalidation logic**, because
`payments`, `parties`, `items` and `invoices` are all `CREATE`-writable through TrailBase's record
API. A write there never runs the guest, so a guest-written cache — KV included — is stale from the
instant it is written. That is why the question "could the KV store do this?" answers **no**, and it
is worth keeping as the reason: the deciding fact is *who writes*, not what shape the store has.

What made deletion right is not that shape but the plan: **no consumer is coming**.

## Consequences

**Accepted**

- **TrailBase's SQLite now holds no `VIEW` at all** — the owner's standing instruction, which could
  not hold while the store existed, because a SQLite trigger cannot read a `.sql` file.
- Every write to `payments`, `parties` and `items` gets cheaper. Measured on a copy of the depot
  before the migration:

  | Write | Before | After | Saved |
  |---|---|---|---|
  | `payments` row | 10.07 ms | 5.10 ms | **~5 ms** |
  | `parties` row | 3.29 ms | 0.13 ms | **~3.2 ms** |
  | `items` row | 2.79 ms | 0.28 ms | **~2.5 ms** |

- 36,603 rows of derived data, none of it read, no longer rebuilt on every write.

**Given up**

- A general document path — a voucher, party or item document assembled once and read cheaply. If
  that is ever wanted, the cheapest route is **not** to rebuild this store: `spoolreports.js` already
  spools report rows to a KV key and hands it to the renderer, and any single-document cache must be
  trigger-maintained regardless.
- The render measurements that accompanied the store ([[render-split-measured]], minijinja at
  **0.031 ms/row**) are unaffected and still stand — they were about the template engine, not the
  store.

**Still true from the original finding**

Streaming a render chunk by chunk would save almost nothing, because streaming does not reduce
template CPU. That half of [[document-store-and-streaming-render]] is untouched by this decision.

## Related

- [[document-store-and-streaming-render]] — what the store was, and what it would have been for.
- [[sql-review-2026-10-02]] — the review that found the three views and recommended the drop.
- [[tb-0027-materialised-invoice-documents]] — `inv_doc`, which stays.