---
title: TB-0021 Invoices, cash memos and printing on the guest platform
type: task
status: todo
priority: high
created: 2026-09-27
updated: 2026-09-27
tags: [invoices, cashmemo, printing, realtime, concurrency, pos]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[invoice-entry-freshness-and-writes]]", "[[legacy-invoice-numbering-is-racy]]", "[[guest-frontend-feature-parity-gaps]]", "[[jobs-in-process-durable-queue]]", "[[tb-0028-guest-transactional-screens-and-mobile]]"]
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

### Remaining

Re-measured 2026-09-29 after [[tb-0028-guest-transactional-screens-and-mobile]] landed the first
browser screens. What follows is the true remainder, not the original list.

**Screens built** (sale + purchase only): `/invoices` list with type/date/party/unpaid filters and
whole-set totals, `/invoices/{id}` entry screen (header, lines, add + delete line, complete/reopen,
payments on the invoice), `/payments` list + new + delete, `/inventory` with live stock.

- [ ] **Return and difference invoices** — the entry screen offers sale and purchase only. Return
      needs `invoices_return_reference` (a return points at the original invoice); difference is how
      stock is adjusted, so `/inventory` currently has no way to change a quantity.
- [ ] **Orders** — `/app/invoices/orders` has no guest equivalent at all.
- [ ] **Fields the schema has and the screen does not expose**: `duedate`; the header's
      `discount_2`; per-line `discount_1`, `discount_2`, `scheme` ("Free") and a `cost_price`
      override (the route defaults cost from the item). The route already accepts all of them — only
      the form is missing.
- [ ] **Line edit** — a line can be added and deleted, never modified. The JSON API has no line
      `PATCH` either, so this is missing at both layers.
- [ ] **Void / cancel** — there is no `status`, no void, and no way to delete an invoice. An
      abandoned draft keeps its human number forever (F1).
- [ ] **Stock guard** — nothing prevents selling below zero.
- [ ] **Surface `lockHolder`** — the lease is enforced (409 for another device) but the screen never
      says who holds it (F2).
- [ ] Cash memos: payment vouchers, receive vouchers, DA entry, expenses, payments. Only the
      payment *rows* exist (`/payments`), including a standalone DA entry; the five legacy screens
      do not.
- [ ] **Printing**: server-rendered pages; **A5 receipts, A4 reports**; browser `window.print()`;
      a `print_job` queue (durable-queue job) for batch/reprint. The materialised invoice documents
      ([[tb-0027-materialised-invoice-documents]]) are the input, and there is no template.
- [ ] Lease **contention across two real users** in the check tool (needs a second user)
- [ ] Resolve the F-items in [[invoice-entry-freshness-and-writes]]: F1 status/void, F2 lock
      lifecycle and stranding, F4 totals recompute, F5 invalidation storms. F3 is partly closed —
      create and line-add carry an idempotency key and the header PATCH is full-state — but line
      **delete** is not idempotent, and it is a hard delete, so a retry can remove a different line.

### Integration observations (to investigate)

- Findings recorded while building the slice: [[guest-db-bridge-text-params-only]] (the DB bridge binds text parameters only) and [[trailbase-user-ids-are-uuidv4]] (the lock schema).

- With the SQL report path enabled, **fresh invoices (empty `dated`) diverged** between the SQL and
  JS base views and the guest errored on some reports, so `USE_SQL_VIEWS` is back **off**
  ([[legacy-sql-views-differ-from-js-views]]).
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
