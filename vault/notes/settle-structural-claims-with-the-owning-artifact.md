---
title: Structural claims must be settled by the artifact that owns the behaviour
type: note
status: active
created: 2026-09-29
system: process
tags: [process, verification, evidence, correction, method, drift]
belongs_to: "[[vault-guide]]"
related_to: ["[[categories-is-the-company-list]]", "[[table-audit-2026-09-29]]", "[[vault-code-drift-audit]]", "[[guest-frontend-feature-parity-gaps]]", "[[route-map]]", "[[reports-parity-and-e2e-2026-09-29]]"]
---

# Structural claims must be settled by the artifact that owns the behaviour

This session made the **same class of mistake five times**, in five different forms, and every one
was overturned by a single direct check that took under a minute. The rule now lives in
[[vault-guide]]; this note is the evidence for why it is there.

## The recurring shape

**Absence in a listing was read as absence in the system.** Each case had a cheap proxy that looked
authoritative, and each proxy was wrong.

| # | claim written into the vault | the proxy that produced it | what actually settles it | cost of the fix |
|---|---|---|---|---|
| 1 | "no production data is currently loaded", in **4** documents | an old note said the depot was reset | `SELECT COUNT(*)` per table | 60,245 rows, sitting there |
| 2 | `outstanding`, `productsale`, `dailysale` have **no legacy route** | counted folders under `app/app/reports/` | open the route; drive the browser | all three exist, all three render (one hangs) |
| 3 | "guest additionally exposes Companies; legacy has no screen for it" | read the guest's entity list | read the legacy nav: `text: "companies", path: "management/categories"` | both halves wrong |
| 4 | `companies` is "a duplicate the migration invented" | it is absent from the PocketBase collection list | grep the **frontend**: legacy calls the `categories` collection "companies" everywhere | the claim is **inverted** |
| 5 | 7 tables are "unreferenced" | per-line SQL-keyword scan | the constant / map key / `base.<table>` the code binds them through | all 7 are live |

## Case 4 is the instructive one

It is the one that changed a decision. The evidence I had was *correct*: PocketBase has 12 base
collections and 13 views, and `companies` is in neither. The import log agrees —
`companies: not present on the source server, skipped`.

The claim built on that evidence was wrong, because **"no collection with this name" is not "this
concept does not exist"**. In legacy the company list is stored in a collection named `categories`:
the nav labels it "companies", `paymentsbycompany` reads `categories` into a variable called
`companies`, the stock and difference report filters are labelled "Company", and "Create Supplier"
inserts into it. The 15 names are business names — `BAKE PARLOR`, `ZEESHAN PAPAR`, `NATIONAL
RECIPIE` — and `items.category` means "which company this item belongs to".

So the migration did not invent a company dimension, it **promoted a real one out of a badly named
collection**. The conclusion I gave the user — "the redundant table is `companies`" — pointed at
the wrong table, and the one I called invented is the one actually carrying every foreign key.

Neither database could have told me. Only the frontend could. **A schema cannot answer a question
about what an application did.**

## Case 5 is the trap in tool output

A script reported seven tables with "no references found" and a clean table of per-table verdicts
that looked authoritative. It was wrong because it only matched SQL keywords on lines that named
the table, and the real references are indirect:

```js
const MVIEW_TABLE = "mview";                    // lib/reports.js:108
expenses: { tables: [...], views: [...] },       // compute/views.js:524
partyTypes: base.party_types,                    // compute/views.js:502
```

A confident, well-formatted, wrong answer from a tool is worse than a vague one, because it invites
action. If a tool is going to justify a destructive change, its output has to be cross-checked
against a second method before anyone acts on it.

## What to do instead

- **Absence of evidence is not evidence of absence.** A negative claim needs the same evidence as a
  positive one, and is wrong at least as often.
- **A negative claim is still a claim.** "X does not exist" is a structural assertion and gets the
  same standard as any other.
- **Open the consumer, not just the container.** Usage questions are answered by the code that uses
  the thing. For a legacy claim, that is usually the frontend, not the database.
- **Record the evidence path**, so the next session re-checks rather than re-derives.
- **Correct in place, name the old claim, keep both.** [[categories-is-the-company-list]] reverses
  [[table-audit-2026-09-29]] explicitly rather than silently, and both cite the artifact that
  reversed them. A quiet rewrite would have left the same false claim in the git history with no
  visible reason.

## Related

- [[vault-guide]] — where the rule now lives.
- [[vault-code-drift-audit]] — the same failure mode across a whole vault, from an earlier session.
