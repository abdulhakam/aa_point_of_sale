---
title: TB-0021 Invoices, cash memos and printing on the guest platform
type: task
status: done
priority: high
created: 2026-09-27
updated: 2026-09-30
tags: [invoices, cashmemo, printing, realtime, concurrency, pos]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[invoice-entry-freshness-and-writes]]", "[[legacy-invoice-numbering-is-racy]]", "[[guest-frontend-feature-parity-gaps]]", "[[tb-0028-guest-transactional-screens-and-mobile]]", "[[guest-invoice-lifecycle]]", "[[jobs-in-process-durable-queue]]", "[[heavy-report-blocks-runtime-threads]]", "[[base64-id-decoder-accepted-one-alphabet]]", "[[invoice-lifecycle-draft-open-append-only]]", "[[returns-are-negative-quantities]]", "[[single-writer-per-invoice]]", "[[client-side-live-recalculation]]", "[[verified-negative-quantity-stock-and-money]]", "[[imported-completed-flag-carries-no-information]]", "[[esm-shim-rewrites-text-inside-comments]]", "[[heavy-report-blocks-runtime-threads]]"]
---

# TB-0021 Invoices, cash memos and printing on the guest platform

Build the money-making screens the former Node frontend (`frontend-ssr`, removed
2026-09-27) deliberately left out and that the guest frontend ([[runtime-js-guest-platform]])
still lacks ([[guest-frontend-feature-parity-gaps]] §1). Design and all owner decisions:
[[invoice-entry-freshness-and-writes]].

## Spike first (blocking) — answered

- [x] Does `/api/records/v1/<name>/subscribe/*` hold an SSE/WS stream for a **wasm-hosted**
      TrailBase, and how does it authenticate? — **No.** The endpoint returns **403** for both
      cookie and bearer auth on a table that reads fine, and no realtime config exists
      ([[trailbase-subscribe-endpoint-forbidden]]). **The screens poll** the context endpoint with
      `If-None-Match`.

## Build

### First slice — done (2026-09-27)

The write API and its lease/idempotency are implemented on the guest and verified by
`trailbase/tools/invoice-check.mjs` (all checks pass, repeatedly):

- [x] **Context endpoint** `GET /invoice/context?type=…` — items with advisory derived stock and
      prices, parties, bookers, areas, sections, categories, companies, and the next number per
      type; `ETag` (snapshot version + per-type counts) with a `304` on revalidation
- [x] **Immediate-push entry**: `POST /invoice` inserts the row `completed=0`;
      `PATCH /invoice/<id>` updates the header (full-state, 2 dp money); `POST /invoice/<id>/line`
      adds, `DELETE /invoice/<id>/line/<lineId>` removes; `POST /invoice/<id>/complete` sets
      `completed` and releases the lease
- [x] **`invoice_lock`**: lease (invoice, user, device, `lease_until`), atomic take/renew with an
      expired-lease/own-user predicate, release on complete, and a `409` for another device
- [x] **Server-side invoice-number allocation** by the INSERT itself
      (`(SELECT COUNT(*) FROM invoices WHERE type = ?) + 1`, preserving `count+1`); ids `uuid_v7()`
- [x] **Idempotency**: an `invoice_create_key` (UNIQUE) per create and an `invoice_line_op` (UNIQUE)
      per line add, so a retry cannot double-post (verified: same id/line on repeat)
- [x] **Money at 2 dp** on every write ([[money-is-2dp-everywhere]])
- [x] **Access**: gated by the app's authenticated-user check, behind one `userHex` helper
- [x] Invoice mutations **invalidate the report snapshot** (the F5 concern, found and fixed during
      integration: reports were stale after a write)
- [x] `GET /invoice/<id>` for read-back (header + lines), used by the check tool

### Printing — done (2026-09-30)

Printing is the browser's dialog over a **server-rendered** page; there is no printer driver, and
nothing here prints without the operator confirming the dialog.

- [x] **Paper is chosen by the page, not guessed.** `layout.html` emits `<body data-paper="a5">`
      or `a4`, and `app.css` selects a NAMED page (`@page a5` / `@page a4`) through the `page`
      property. A5 for an invoice or a voucher, A4 for a report — a till slip and a filed copy are
      different artefacts. Both default **portrait**; the operator picks Landscape in the print
      dialog. *(Corrected 2026-10-09: this line previously claimed the sizes were sized from the
      attribute — they were bare `@page { size }` rules that cascaded to A4 landscape on every
      page. See [[every-guest-page-prints-a4-landscape]].)*
- [x] **One renderer for screen and paper.** `/invoices/{id}/view?print=1` is the *same*
      materialised document the screen shows, so a printout cannot diverge from what was on screen.
      `&paper=a4` gives the other size.
- [x] **A PRINT button that actually prints** — opens the `?print=1` page (so it is bookmarkable and
      reloadable) and then the dialog, falling back to a plain navigation if a popup blocker refuses.
- [x] **A4 for reports**, carrying the filters that are on screen, with the table header repeated on
      every page and rows kept off page breaks.
- [x] **`print.run`, a durable print job** — one leased step per slip, so a batch of 200 is 200
      steps rather than one that fails as a unit. A reprint is the same job with one id. Verified:
      200 requested, 200 printed, 0 skipped.
- [x] **`/print`** — queue a range, see recent runs, follow a job.

> **CORRECTED 2026-10-08 — the print queue was rebuilt to match legacy.**
> The batch form ("queue a range", the `print.run` durable job, the "Recent runs" table) was
> **removed**. `/print` is now the legacy picker (Invoice Type + Invoice No → View Invoice, a
> preview, and a Queue rail) and `/print/queue` is the legacy queue page. The queue is
> **browser-local** (`localStorage` `print-queue`), exactly as legacy's was, and the sheet carries
> the legacy "Print Invoice Now" + "Add to Print Queue" actions. The `print.run` job spec is gone
> from `app/lib/queue.js`. See [[print-queue-parity-fix-2026-10-08]] and
> [[print-queue-is-browser-local-like-legacy]]. The "printer-driver integration" caveat below still
> stands (printing is the browser's dialog over a server-rendered sheet).

### Cash memo — done (2026-09-30)

The legacy app had five screens here. The data for all of them is `payments` (a voucher or a DA
entry is a payment with or without an invoice behind it) plus `expenses`, so this is one index over
four working screens rather than five near-duplicates.

- [x] **Payment vouchers** `/cashmemo/vouchers?type=0` — money out, no invoice behind it, printable
      on A5.
- [x] **Receive vouchers** `/cashmemo/vouchers?type=1` — money in.
- [x] **DA entry** `/cashmemo/da` — standalone entries, with the add form.
- [x] **Expenses** `/cashmemo/expenses` — list, search, date range, add, edit, delete, over the
      `expenses` table the v1 import created and the guest had never written to.
- [x] **Cash in hand** on the hub: recieving − sending − expenses. It counts **every** settled
      payment, not only the standalone ones — money received against an invoice is cash the shop has.
      Read as 0.00 before that was fixed, because all 26,526 payments in the depot are
      invoice-linked.
- [x] **Printable voucher** `/cashmemo/vouchers/{id}?print=1`, on A5.

### Remaining

- [ ] Nothing outstanding for printing or the cash memo. The one thing deliberately left is a
      **printer-driver integration**: printing is the browser's dialog over a server-rendered A5
      sheet, and the queue is browser-local ([[print-queue-parity-fix-2026-10-08]]); a real printer
      would read the same documents.


Re-measured 2026-09-29 after [[tb-0028-guest-transactional-screens-and-mobile]] landed the first
browser screens. The lifecycle, the grid, the standalone document, printing and the cash memo all
landed after this list was first written — see [[guest-invoice-lifecycle]] for the first two and
the sections above for the rest. What is actually left:

- [x] ~~**Return and difference invoices**~~ — **decided against**: a return is a negative-quantity
      row on the same invoice and a difference is an invoice to the Difference party
      ([[returns-are-negative-quantities]]). No new types, and the arithmetic needed no change.
- [x] ~~**Orders**~~ — **dropped as not needed** (owner, 2026-09-29).
- [x] ~~**Void / cancel**~~ — a `status` column now exists with `draft`/`open` and a trigger, a
      draft is not in the books, and an open invoice is append-only rather than mutable
      ([[invoice-lifecycle-draft-open-append-only]]). There is deliberately **no void state**: a
      mistake is corrected by appending.
- [x] ~~**Line edit**~~ — a draft's lines are editable in the grid (`editLine`); an open invoice's
      are immutable by design, and a "remove" appends a reversal.
- [x] ~~**Surface `lockHolder`**~~ — the grid names the device that holds the lease and is read-only
      for anyone else ([[single-writer-per-invoice]]).
- [x] ~~**Fields the schema has and the screen does not expose**~~ — `duedate`, `discount_2` and the
      per-line `discount_1` / `discount_2` / `scheme` are on the grid and the header form.
- [ ] **Stock guard** — nothing prevents selling below zero. Still unbuilt.
- [ ] Lease **contention across two real users** in the check tool (needs a second user). The only
      genuinely untested claim in the concurrency design.
- [ ] Resolve the remaining F-items in [[invoice-entry-freshness-and-writes]]: F4 (totals recompute)
      and F5 (invalidation storms). F1, F2 and F3 are closed by the lifecycle work; F6–F9 were never
      built.

### Integration observations (to investigate)

- Findings recorded while building the slice: [[guest-db-bridge-text-params-only]] (the DB bridge binds text parameters only) and [[trailbase-user-ids-are-uuidv4]] (the lock schema).

- With the SQL report path enabled, **fresh invoices (empty `dated`) diverged** between the SQL and
  JS base views and the guest errored on some reports, so `USE_SQL_VIEWS` is back **off**
  ([[legacy-sql-views-differ-from-js-views]]; the flag was deleted 2026-10-02 with the legacy view
  layer).
- On the integration depot, `ledgers/party` now fails guest-side (the ~20 s guest limit on a
  26.5k-row ledger) while the other 13 pages match — a performance limit
  ([[trailbase-guest-cpu-js-limits]], [[guest-report-performance-options]]).

## Note (existing behaviour, not a bug to fix here)

Reports do not filter `completed` (legacy or ported), so an in-progress invoice is visible to
reports while it is entered — as it already is today
([[invoice-entry-freshness-and-writes]] §2). The design's weak points (status/void, lock lifecycle,
idempotent line writes, totals recompute, invalidation storms) are listed as F1–F9 in
[[invoice-entry-freshness-and-writes]] §Known flaws and must be decided before or during the build.

## Related

- [[invoice-entry-freshness-and-writes]] — the settled design.
- [[legacy-invoice-numbering-is-racy]] — the intended numbering scheme.
- [[jobs-in-process-durable-queue]] — the print queue's mechanism.
