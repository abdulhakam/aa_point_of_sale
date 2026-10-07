---
$schema: "./issues.schema.json"
title: Guest invoice print dropped the party and booker names
type: issue
status: resolved
severity: medium
created: 2026-10-06
updated: 2026-10-06
tags: [invoice, print, parity, defect, resolved, guest]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-invoice-lifecycle]]", "[[guest-depot-created-is-import-time]]", "[[parity-is-functional-not-visual]]", "[[invoice-and-print-discrepancies-between-guest-and-legacy-2026-10-06]]"]
---

# Guest invoice print dropped the party and booker names

**Verified defect, found and fixed 2026-10-06.** The guest's printed invoice sheet rendered the
`Party` label with **no name** and omitted the `Booker` line entirely, while the same invoice's
materialised document already held both names.

## Evidence

Invoice **#8606** (sale), guest `GET /invoices/<id>/view?print=1&paper=a5`:

- Before the fix, `.doc-parties` was just `Party` — no value, no Booker.
- `inv_doc` for the same invoice contains `party_name = "COUNTER SALE"` and
  `booker_name = "ABDUL MAJID"` (plus the hex ids), so the names were never missing from the data.
- The legacy sheet (`/app/invoices/print?invoiceId=pos000000008606`) prints
  `Party COUNTER SALE ()` and `Booker ABDUL MAJID (03332958757)`.

## Cause

`runtime/ahscripts/routes/invoices/{id}/view/route.ts` re-resolved the names from the `refs`
snapshot with `hexToB64(doc.party)` mapped against the refs' base64 ids. That conversion matched
nothing, so `partyName`/`bookerName` came back empty. The names were already in the document
(`doc.party_name` / `doc.booker_name`); re-deriving them was both unnecessary and wrong.

## Fix (2026-10-06)

The view route now:

- takes the name/phone from the document (`doc.party_name` / `doc.party_phone` /
  `doc.booker_name`) rather than re-resolving;
- keys the refs lists by **hex** (`b64ToHex(id)`) — the direction that actually matches the document's
  hex ids — for the fields the document does not carry: the party's **Address**
  (`- <area> - <section>`) and the booker's phone;
- adds the legacy sheet's line columns (`BOX SIZE`, `QUANTITY CTN/UNTS/FREE`, `PRICES UNIT/CTN`) and
  totals labels (`TOTAL AMOUNT`, `DISCOUNT 1/2`, `DISCOUNT cash`, `PAYABLE AMOUNT`).

With the fix the guest line row for #8606 is byte-identical to legacy
(`1 | KORMA MASALA 10G | 360 | 0 | 12 | 0 | 7.50 | 2700.00 | 90.00`) and the header matches, except
**Invoice Time** — see the residual note below.

> **Review follow-ups, 2026-10-06 (post-review).** A code review of the fix found three more
> divergences, now corrected: the printed **Address** omitted the party's own `address` (legacy prints
> `address - area - section`); **Address** and **Booker** were emitted for every invoice type where
> legacy shows them on **sale only**; and the per-line **DISCOUNTS** columns were dropped, which the
> previous guest sheet had shown. The line table now prints a `Discounts` group (`1(%)`, `2(%)`,
> `IN RS`) only when a line carries a discount. Verified on #8606 and on sale #2 (which has line
> discounts).

## Residual: Invoice Time

The legacy sheet's `Invoice Time` comes from the invoice's v1 `created`
(`2026-04-11 09:33:45Z` → `2:33:45 PM` local). The import does not preserve v1 `created` — the guest
`created` is the import timestamp ([[guest-depot-created-is-import-time]]) — so the guest sheet shows
the **dated** time instead (`9:33:21 AM`). Matching this needs the importer to carry v1 `created`
into a column the sheet can read; not done here.

## Related

- [[invoice-and-print-discrepancies-between-guest-and-legacy-2026-10-06]] — the full screen-by-screen comparison.
- [[guest-invoice-lifecycle]] — the document/print path this lives on.
