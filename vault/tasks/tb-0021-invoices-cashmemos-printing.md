---
title: TB-0021 Invoices, cash memos and printing on the guest platform
type: task
status: todo
priority: high
created: 2026-09-27
updated: 2026-09-27
tags: [invoices, cashmemo, printing, realtime, concurrency, pos]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[invoice-entry-freshness-and-writes]]", "[[legacy-invoice-numbering-is-racy]]", "[[frontend-ssr-feature-parity-gaps]]", "[[jobs-in-process-durable-queue]]"]
---

# TB-0021 Invoices, cash memos and printing on the guest platform

Build the money-making screens `frontend-ssr` deliberately left out
([[frontend-ssr-feature-parity-gaps]] §1). Design and all owner decisions:
[[invoice-entry-freshness-and-writes]].

## Spike first (blocking) — answered

- [x] Does `/api/records/v1/<name>/subscribe/*` hold an SSE/WS stream for a **wasm-hosted**
      TrailBase, and how does it authenticate? — **No.** The endpoint returns **403** for both
      cookie and bearer auth on a table that reads fine, and no realtime config exists
      ([[trailbase-subscribe-endpoint-forbidden]]). **The screens poll** the context endpoint with
      `If-None-Match`.

## Build

- [ ] **Context endpoint** per screen: items + advisory derived stock + prices, parties, bookers,
      areas, sections, types, invoice-number state; ETag tied to the snapshot fingerprint
- [ ] **Polling client** for freshness: short-poll the context endpoint with `If-None-Match` → 304,
      refetch on focus and after every write (subscriptions are unavailable)
- [ ] **Immediate-push entry** (parity with legacy): Create inserts the invoice with
      `completed=0`; header edits PATCH the invoice; line changes POST/PATCH/DELETE transactions;
      OK sets `completed` (+ payments). No drafts (`localStorage` unused)
- [ ] **`invoice_lock`**: lease (invoice, user, device, `lease_until`), atomic take/renew, release on
      close/complete, expired-lease reclaim; second device is told who is editing
- [ ] **Server-side invoice-number allocation** inside the write transaction, preserving the
      `count+1` scheme; ids always `uuid_v7()`
- [ ] **Idempotency key** (UNIQUE) on Create so a retry cannot create two invoices
- [ ] **Access helper** gating on "authenticated" now, shaped so custom roles can replace it
- [ ] Screens: invoice entry (purchase/sale/return/difference), orders
- [ ] Cash memos: payment vouchers, receive vouchers, DA entry, expenses, payments
- [ ] **Printing**: server-rendered pages; **A5 receipts, A4 reports**; browser `window.print()`;
      a `print_job` queue (durable-queue job) for batch/reprint
- [ ] Tests: subscription-driven refetch, lock contention + lease expiry, number uniqueness under
      concurrent Create, idempotent Create retry, print-queue lifecycle

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
