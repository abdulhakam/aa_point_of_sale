---
title: Invoice/cash-memo entry: immediate-push, locked, poll-driven; A5/A4 print
type: decision
status: accepted
decided_on: 2026-09-27
created: 2026-09-27
updated: 2026-09-27
tags: [invoices, cashmemo, printing, realtime, subscriptions, concurrency, pos]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[frontend-ssr-feature-parity-gaps]]", "[[guest-app-host-port]]", "[[jobs-in-process-durable-queue]]", "[[legacy-invoice-numbering-is-racy]]"]
---

# Invoice/cash-memo entry: immediate-push, locked, poll-driven; A5/A4 print

## Context

Invoice/cash-memo/printing are out of scope by request in `frontend-ssr`
([[frontend-ssr-feature-parity-gaps]] §1) but are the workflows that make money, so their
architecture is settled before they are built. Decisions below are confirmed with the owner
(2026-09-27). An earlier draft of this note wrongly said TrailBase realtime is per-record only;
table-level subscriptions exist (see below).

## Decisions

### 1. Freshness: table subscriptions, browser-direct, with an ETag fallback

- The browser opens TrailBase's change subscription for the tables the screen depends on —
  `GET /api/records/v1/<api_name>/subscribe/*` (SSE or WebSocket; insert/update/delete events).
  Use whichever transport the official TrailBase JS client's `subscribe()/subscribeAll()` defaults
  to. **The wasm guest does not hold or proxy streams.**
- First paint still fetches one **context payload** (items + advisory derived stock + prices,
  parties, bookers, areas/sections, types, invoice-number state) with an ETag; a subscription
  event triggers a refetch of that same payload (304 when unchanged). Short-poll is the fallback
  if a stream cannot be established.
- **Resolved (2026-09-27): the stream does not work here.** `…/subscribe/*` returns **403** with
  both the cookie and a bearer token on a readable table, and no realtime config exists; a live
  attempt also coincided with the host exiting ([[trailbase-subscribe-endpoint-forbidden]]). So the
  design uses the **polling fallback**: short-poll the context endpoint with `If-None-Match`
  (`304` when unchanged), refetching on focus and after every write. Revisit push only if
  TrailBase exposes/permits realtime and the streaming-disconnect panic is fixed.

### 2. Persistence: every change is pushed immediately (no drafts)

This is **parity with the legacy app**, verified: clicking *Create* inserts the invoice row with
`completed: false` (`InvoiceForm.tsx:434`, `:48`), lines are added/edited as the user works, and
*OK* PATCHes the invoice (`invComplete()`, `:287`). So:

- On *Create*: insert the invoice (incomplete) and take the **lock** (below).
- Each header edit: PATCH the invoice.
- Each line add/change/remove: POST/PATCH/DELETE the transaction rows.
- *OK / Order Completed*: PATCH `completed` (+ payments as needed) and release the lock.
- No `localStorage` drafts; nothing is deferred.

**Consequence to keep in mind (existing behaviour):** reports do **not** filter `completed` —
neither the legacy view SQL nor the ported `compute/` code has such a filter — so an in-progress
invoice is visible to reports while it is being entered. That is how the product already behaves;
excluding incomplete invoices would be a deliberate change, not a parity fix.

### 3. Concurrency: lock the invoice while it is being edited

Two devices must not edit the same invoice at once (with immediate push they would fight).

- A dedicated **`invoice_lock` table** (invoice, user, device, `lease_until`) rather than new
  columns on `invoices` (STRICT tables dislike churn). Take/renew with an atomic UPSERT; release
  on complete/close; an expired lease is reclaimable.
- A second device that cannot take the lock is told the invoice is being edited (and by whom).
- Locking is **new** — the legacy has none — and is what makes immediate push safe.

### 4. Numbering: human sequential number allocated server-side; ids are UUIDv7

- `invoiceNo` is a **human-facing** per-type sequence; keep the intended `count+1` scheme but
  allocate it **inside the write transaction** so two devices cannot produce the same number.
  Sequential use yields the same numbers as today.
- The record **id is always `uuid_v7()`** on the backend — never derived from a count
  ([[legacy-invoice-numbering-is-racy]]).

### 5. Access: authenticated now, roles later

Any authenticated user may enter invoices/cash memos for now, matching the record APIs' current
ACL. Build the check behind a single helper so a role model can replace it later without touching
the screens.

### 6. Printing: browser dialog, server-rendered

- Server-render the document with `minijinja` and print from the browser (`window.print()`).
- **A5 for receipts, A4 for reports.**
- A **print queue** (job over the durable queue, `print_job` table, idempotent steps) is for
  batch/reprint workflows, not the interactive print ([[jobs-in-process-durable-queue]]).

### 7. Writes

Incremental writes go through the record APIs (or `/api/transaction/v1/execute` when a change
spans tables); the guest calls them over `http.request` with the user's auth, so validation and
ACLs apply (unlike the management SQL path — [[guest-writes-via-sql]]). The *Create* carries an
**idempotency key** (UNIQUE) so a retry cannot create two invoices; subsequent PATCHes are
idempotent by nature.

## Known flaws and mitigations

These are the weak points of the design as it stands; each needs a decision before or during the
build.

| # | Flaw | Mitigation |
|---|---|---|
| F1 | **In-progress invoices are in reports.** Reports do not filter `completed` (legacy or ported), and immediate push keeps an incomplete invoice materially present for as long as the screen is open — including when abandoned. | Add a `status` (`draft`/`completed`/`void`) and a report predicate, or accept parity explicitly; decide whether abandoning frees the human number (with `count+1`, a delete reuses it, a kept row consumes it). |
| F2 | **The lock is load-bearing and can strand work.** A crash leaves an incomplete invoice plus a held lease until expiry; renewal is a write per heartbeat. | Auto-expiring leases, an admin force-unlock, a visible "being edited by X", and a resume/void path. |
| F3 | **Per-line writes are not idempotent.** Create has an idempotency key; line POST/PATCH/DELETE do not, so a retry on flaky wifi duplicates a line. | Client-generated `uuid_v7` line ids + `conflict_resolution: REPLACE`, or an idempotency key per line write; prefer full-state PATCH for header fields (idempotent) over deltas. |
| F4 | **Totals race.** Invoice totals derive from transactions; two fast line edits can each recompute from a stale read. | Recompute totals in the **same transaction** as the line change (or a SQL trigger). |
| F5 | **Thundering herd.** Every change bumps table fingerprints and emits a subscription event → every device refetches the context and report caches invalidate. Typing on one till makes the shop's screens churn. | Debounce/coalesce events, scope each screen's subscription to the tables it actually shows, and avoid invalidating report results for writes that cannot affect the viewed report (or rely on the cache TTL). |
| F6 | **Subscriptions are unavailable** — `…/subscribe/*` returns 403 for both cookie and bearer auth. | Resolved by polling with `If-None-Match` ([[trailbase-subscribe-endpoint-forbidden]]); a live stream attempt also coincided with the host exiting, so push is worse than polling until that panic is fixed. |
| F7 | **Server-to-self writes add a hop** and error-mapping work (forward the user's cookie, surface 4xx/409 unchanged). | Confine it to one helper; keep the browser's error shape. |
| F8 | **Ledgers/payments move mid-entry.** Payment and outstanding reports count a partially entered invoice's payments immediately. | Follows from parity; surface it, and let operators filter by `status` if F1 is adopted. |
| F9 | **Schema/ops.** New `invoice_lock` (and possibly `status`) tables/columns need migrations, and `invoiceNo` is `REAL` (should be `INTEGER`). | Add the migration; note the depot migration-staleness caveat ([[trailbase-stale-depot-skips-migration]]). |

## Evidence

- <https://trailbase.io/documentation/apis_record/#subscribe> — table- and record-level
  subscriptions, SSE/WS.
- `frontend/src/app/app/invoices/InvoiceForm.tsx:48,206,287,434` — create-with-`completed:false`,
  then PATCH on OK.
- `frontend/src/app/providers.tsx` — the legacy react-query staleness settings.
- `frontend-ssr/compute/views.js:115` and `compute/reports.js` — `completed` is carried in the
  invoice view but never filtered.
- The subscription probe: `…/subscribe/*` returns **403** for both auth methods
  ([[trailbase-subscribe-endpoint-forbidden]]).

## Related

- [[legacy-invoice-numbering-is-racy]] — the intended numbering scheme.
- [[tb-0021-invoices-cashmemos-printing]] — the build task.
- [[jobs-in-process-durable-queue]] — the print queue's mechanism.
