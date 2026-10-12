---
title: "The guest's base64 id decoder accepted only one of the two base64 alphabets"
type: issue
status: resolved
severity: high
created: 2026-09-30
updated: 2026-09-30
tags: [base64, ids, management, guest, quickjs, harness]
belongs_to: "[[trailbase-migration]]"
related_to: "[[guest-invoice-lifecycle]]", "[[tb-0021-invoices-cashmemos-printing]]", "[[guest-db-bridge-text-params-only]]", "[[api-contract-trailbase]]", "[[esm-shim-rewrites-text-inside-comments]]"
---

# The guest's base64 id decoder accepted only one of the two base64 alphabets

Found 2026-09-30 while printing a cash-memo voucher, which is the first screen that resolves a
payment **by its own id** rather than by listing. The voucher route returned 404 for an id that was
copied straight out of a link on the page next to it.

## The defect

`management.base64ToHex` — the function every relation write and every by-id read goes through —
built its alphabet as base64url and then *skipped* any character not in it:

```js
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const idx = B64.indexOf(ch);
if (idx < 0) continue;        // a `+` or `/` vanishes
```

Standard base64 and base64url differ only in the last two symbols — `+/` against `-_` — and over
the 22 characters of a 16-byte id that difference is **not rare**. Measured on the depot:

| | invoices |
| --- | --- |
| ids whose standard base64 contains `+` or `/` | **8,930 of 8,935 (99.9%)** |
| ids where standard base64 differs from base64url | 8,935 (100%) |
| mis-decoded if the caller passed the **bridge's** (base64url) id | **0** |
| mis-decoded if the caller passed a **record-API** id (standard) | **8,930 (99.9%)** |

## Why it was silent, and why it was not yet a live bug

The DB bridge emits **base64url**, so every id the app itself handled decoded correctly — which is
why nothing had ever failed, and why this could have sat here indefinitely unnoticed. The exposure
is any id that arrives from a **record-API** client, which uses standard base64: the import, the
`invoice-check` harness, and any Node tool. There the `+` and `/` are dropped, the hex comes out
**short**, and the lookup matches no row — a 404 or an empty result rather than an error, which is
the worst shape a decoder bug can have.

The first symptom was a `+`-bearing id arriving from a test script, but the same class of failure
would hit any record-API caller.

## The fix

The two standard symbols are accepted as **synonyms** of `-` and `_`, via a lookup table rather than
by appending to the alphabet string — a character's *index* in that string is its 6-bit value, so
appending `+/` would have given them 64 and 65 and silently corrupted every such id.

Verified over **60,032 real ids** across `invoices`, `payments`, `items`, `parties` and
`transactions`: both encodings now decode to the correct hex, 0 wrong either way.

## The rule this establishes

**An id decoder must accept every encoding its callers use, and a decoder that silently skips a
character is a bug even when no caller uses that character yet.** The `idx < 0 → continue` guard is
what made it silent: dropping an unknown character is the wrong default for a decoder, where it
should be an error.

## Evidence

- `trailbase/runtime/ahscripts/lib/management.js` — `B64` and `B64_STANDARD`.
- The measurement: 60,032 ids, 0 mis-decoded from base64url, 0 from standard.
- `trailbase/runtime/ahscripts/lib/payments.js` — `readPayment`, the first by-id read this exposed.

## Related

- [[guest-invoice-lifecycle]] — the print and cash-memo work this was found in.
- [[api-contract-trailbase]] — the record API's base64, which is the standard alphabet.
