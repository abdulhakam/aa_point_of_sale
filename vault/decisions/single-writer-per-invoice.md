---
title: "Single writer per invoice, every other user reads"
type: decision
status: accepted
decided_on: 2026-09-29
created: 2026-09-29
tags: [concurrency, invoices, locking, lease, trailbase, guest, pos]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-invoice-lifecycle]]", "[[invoice-lifecycle-draft-open-append-only]]", "[[invoice-entry-freshness-and-writes]]", "[[jobs-in-process-durable-queue]]", "[[guest-writes-via-sql]]", "[[trailbase-guest-cpu-js-limits]]"]
---

# Single writer per invoice, every other user reads

## Context

The shop's till is used by one person at a time per invoice, but several people look at the same
data all day. The system is therefore **single-writer, multiple-readers (SWMR)**: one writer per
document, many concurrent readers, never a writer and a writer.

[[invoice-entry-freshness-and-writes]] already sketched a lease (`invoice_lock`: invoice, user,
device, `lease_until`) with an atomic take that succeeds for an expired lease or the same user. What
it did not settle is what the lease is *for* — a hint, or the only way to write. This makes it the
only way.

## Decision

**The write lease is the only way to write to an invoice. It is per invoice. Readers never take it
and are never blocked by it.**

- Any mutation of an invoice — header, line, or appending a return — requires holding its lease.
  A request without the lease, or with a lease held by another device, is refused (`409`).
- **Reading is unconditional.** Any authenticated user may read any invoice, at any time, in any
  state, including someone else's in-progress draft. The reader sees the rows as committed.
- The lease **auto-expires**, so a crash or a closed tab cannot strand an invoice; the next write
  attempt takes an expired lease.
- A writer renews the lease on activity; a heartbeat is what keeps it alive, and the renewal is a
  write per heartbeat (F2 in the old design). Renewal is best-effort: if a renewal fails the writer
  keeps its unsaved cells locally and the save is refused rather than silently duplicated.

## Why

- **SWMR needs no conflict resolution.** Two writers is the hard case and the app never has it, so
  there is no merge, no last-write-wins, and no "who won" to explain to an operator.
- **The lease is already built and tested.** `invoicing.takeLock` / `releaseLock` exist, and
  `trailbase/tools/invoice-check.mjs` asserts the `409` for another device. This decision makes
  that the invariant rather than a courtesy.
- **Readers unblocked is the point.** The alternative — a read lock — would make a stuck writer's
  draft visible-but-frozen to everyone, which is strictly worse than seeing it and not being able
  to change it.
- **Auto-expiry is the only safe default.** A lease that can strand an invoice is a shop that
  cannot close its day.

## Consequences

**Accepted**

- A crash mid-entry loses the **unsaved cells** but never the invoice: the draft stays, the lease
  expires, and the same user resumes it.
- A different user **can open** a draft read-only, and must be told whose it is and that it is live.
  This is a visible behaviour, so the grid shows it plainly rather than showing a disabled form with
  no reason.
- Two users cannot edit the same invoice even sequentially-with-overlap: the second is refused
  until the first's lease expires or they release it.

**Given up**

- **A writer cannot hand an invoice to another user** mid-entry without releasing the lease. Fine
  for a till, wrong if the shop ever needs a manager to take over a paused entry — the release
  button covers it, but it is one more thing to teach.
- **Renewal is a write per heartbeat.** On a very long entry that is real traffic; the lease
  interval is a tuning knob, not a correctness one.
- Contention across two *real* users is still unverified — the check tool only exercises a single
  device, and that gap is unchanged by this decision.

## Evidence

- `trailbase/runtime/ahscripts/lib/invoicing.js` — `takeLock` / `releaseLock` / `lockHolder`.
- `trailbase/tools/invoice-check.mjs` — the `409`-for-another-device assertion.
- `vault/tasks/guest-invoice-lifecycle` — the grid's read-only-for-others path.

## Related

- [[invoice-lifecycle-draft-open-append-only]] — the states this lease guards.
- [[invoice-entry-freshness-and-writes]] — F2, the stranding flaw, closed by auto-expiry.
