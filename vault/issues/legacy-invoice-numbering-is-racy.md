---
title: Legacy invoice numbering is client count+1 — by design, with a multi-device caveat
type: issue
status: by-design
severity: low
created: 2026-09-27
updated: 2026-09-27
tags: [invoices, concurrency, data-integrity, legacy, pos]
related_to: ["[[invoice-entry-freshness-and-writes]]", "[[frontend]]", "[[reports-and-ledgers]]"]
---

# Legacy invoice numbering is client count+1 — by design, with a multi-device caveat

## What it is

The legacy Next.js app computes an invoice's number and id **on the client**:

```ts
// frontend/src/app/app/invoices/InvoiceForm.tsx:206-224
id: idGenerator((invoiceCount.totalRecords ?? 0) + 1, props.type === "sale" ? "pos" : ...),
invoiceNo:
  (props.type === "sale"
    ? counts.data.sale_invoices
    : props.type === "purchase"
    ? counts.data.purchase_invoices
    : counts.data.return_invoices) + 1,
```

**This is intended behaviour** (owner-confirmed 2026-09-27), not an oversight: numbering is
`count-of-type + 1` and the id is derived from a total count. It has been correct in production use.

## Caveat worth knowing

- If **two devices create the same invoice type at the same moment**, both read the same count and
  both write `count + 1` — same number, and possibly the same derived id (a primary-key clash).
- **Deletes** make the count non-monotonic, so a number can be reused.
- Reports treat `invoiceNo` as an identifier (e.g. `GROUP_CONCAT(DISTINCT invoiceNo)` in the
  outstanding summary), so a duplicate would be visible there.

None of this matters if invoice entry is effectively single-device, or if concurrent creation of
the same type is not expected.

## What the new implementation does

The scheme is preserved ([[invoice-entry-freshness-and-writes]] §6): the same
per-type `count + 1` semantics, but computed **inside the write transaction** so the numbers are
identical for sequential use and two devices cannot collide. If the owner prefers the client to
keep computing it exactly as today, that is a one-line revert.

## Evidence

- `frontend/src/app/app/invoices/InvoiceForm.tsx:206-224` — the derivation above.
- `frontend/src/app/api/invoices.ts:97` — `invoiceNo` is `readOnly` in the form.
- `backend/pb_migrations/` — no migration or hook assigns `invoiceNo`.
- `trailbase/src/migrations/main/U1790208000__create_base_tables.sql:199` —
  `"invoiceNo" REAL NOT NULL DEFAULT 0`; the database does not allocate it.

## Related

- [[invoice-entry-freshness-and-writes]] — the design that preserves the scheme.
- [[frontend]] — the app this was verified in.
