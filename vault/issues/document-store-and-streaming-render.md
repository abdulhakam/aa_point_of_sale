---
title: "A document store, and streaming a render chunk by chunk"
type: issue
status: resolved
severity: low
created: 2026-09-30
updated: 2026-09-30
tags: [render, documents, cache, performance, streaming, reports]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[render-split-measured]]", "[[rendering-is-a-component-behind-an-envelope]]", "[[tb-0022-move-reports-to-sql]]", "[[tb-0027-materialised-invoice-documents]]", "[[money-is-2dp-everywhere]]", "[[guest-report-performance-options]]", "[[heavy-report-blocks-runtime-threads]]", "[[sql-review-2026-10-02]]", "[[tb-0032-manifest-first-refactor]]"]
---

# A document store, and streaming a render chunk by chunk

Two questions answered with measurements on 2026-09-30, because both had plausible-sounding answers
that turned out to be wrong.

> **2026-10-02: nothing reads this store yet, and that is not a verdict on it.** A review asked
> whether the store was vestigial — `SELECT … FROM "document"` returns zero hits in the guest, and the
> `document` table is not an exposed record collection. It is not vestigial: it is infrastructure for
> the document/render path described below, which is not wired up yet. Two facts a later session
> should not have to rediscover:
>
> - **Do not delete it.** The first recommendation from that review was to drop the table and its 12
>   triggers; that was wrong, and the correction is recorded in [[sql-review-2026-10-02]] §2b. The
>   exclusions above are deliberate, and the property that matters — an INSERT creates a document with
>   no application code running — is the reason the triggers are the mechanism.
> - **Its three `CREATE VIEW`s are now in tension with a standing instruction** that TrailBase's
>   SQLite should hold no `VIEW`. A trigger cannot read a `.sql` file, so the way to satisfy both is to
>   generate the trigger bodies from the `.sql` file at migration time: one definition, no view in the
>   database. Until then, three views exist here and this is why.

## 1. "Send the layout first, then insert the data in chunks as it renders — how much would that save?"

**Almost nothing, and it is aimed at the wrong 3%.**

minijinja was measured directly, through the existing `/bench/payload` endpoint:

| rows | acquire | **render** | output |
| --- | --- | --- | --- |
| 5,000 | 292 ms | 192 ms | 0.88 MB |
| 10,000 | 318 ms | 230 ms | 1.76 MB |
| 20,000 | 665 ms | **542 ms** | 3.54 MB |

**0.031 ms/row.** For the 21.8k-row profit report that is **0.7 s** of render — about **3%** of the
20 s deadline it currently cannot fit inside. (The real profit template carries more columns than
the benchmark's seven; call it 1–2 s. Still not the problem.)

Streaming does not reduce CPU in the template engine. It buys **memory** and **time-to-first-byte**,
which is a real user-facing win on a slow connection and a non-event for the deadline. The vault had
already reached the same place from the other direction — shipping rows columnar and expanding them
in Rust gave no gain (warm profit 4.00 → 4.32 s) — so the cost was never the transport.

**The 20 s is in the JavaScript view pipeline**, and that is the thing to move.

## 2. "Store each document precomputed, and use it as the SQL→renderer cache so nothing needs JSON stringifying"

**Right idea, and it is now built — with one correction.** `inv_doc` was already exactly this design
for invoices, so the work was to generalise it rather than invent it.

`document(kind, id, doc)` now holds **36,611 documents** across four kinds on the production depot:

| kind | documents | JSON | mean |
| --- | --- | --- | --- |
| invoice | 8,935 | 16.9 MB | 1,988 B |
| voucher | 26,526 | 10.5 MB | 416 B |
| party | 943 | 0.3 MB | 333 B |
| item | 207 | 0.1 MB | 312 B |

The correction: **it does not remove JSON.** The document *is* a JSON string in a column. What it
removes is the per-render re-encoding, and it keeps the payload out of QuickJS — a renderer reads
the row and parses it in Rust, so the JS runtime never touches the bytes.

And it does **not** remove the need for [[tb-0022-move-reports-to-sql]]. Documents are
precomputable; a filtered report over 60k rows is not, because its parameter space is unbounded.
Documents make the *document* path cheap. Reports still need SQL materialisation.

### What each kind may carry, and why not more

A document is a cache, and a cache that lies is worse than none. So a kind carries the data it
**owns**:

- **voucher** — one payment: amount, date, direction, party and booker by name *and* id, and the
  invoice it settles. It owns these, so it cannot go stale.
- **party** — identity, contact, companies and document **counts**. Deliberately **no balance**: a
  party's outstanding aggregates invoices *and* payments, so caching it would add two more scoped
  trigger sets to the most visible number on screen, and `outstanding` already answers it in ~200 ms.
- **item** — identity, pricing, carton size. Deliberately **no stock**: stock aggregates every
  transaction for the item, and `stockreport` answers it in ~200 ms. A stale stock number on an item
  card would be read as the truth.

The excluded aggregates are exactly the ones already fast. What documents buy is the expensive
assembly that must walk thousands of rows — which today is the invoice and the voucher.

## Evidence

- `trailbase/migrations/main/U1790401000__general_document_store.sql` — the table, the three build
  views, and twelve triggers. Invoice documents are **mirrored** from `inv_doc`, not moved, so the
  proven 14 triggers are untouched and nothing can go stale because of the change.
- Verified 15/15 against a copy of the depot before it touched production, including the property
  that matters most: **an INSERT creates a document with no application code running**, because the
  triggers are the maintenance mechanism.
- An indexed lookup on the generated `label` column returns in **1 ms** — the columns are projected
  out of the JSON and stored, so the lookup is not a JSON scan.
- [[render-split-measured]] — the render measurements that accompany this work.
