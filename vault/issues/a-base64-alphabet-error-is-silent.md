---
title: A short base64 alphabet decodes silently to the wrong bytes
type: issue
status: verified
created: 2026-09-30
tags: [trailbase, guest, quickjs, correctness, ids]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-helpers-pure-vs-cached]]", "[[invoice-document-write-through-and-rebuild]]", "[[file-router-conventions-not-a-data-dag]]"]
---

# A short base64 alphabet decodes silently to the wrong bytes

## Symptom

A base64 alphabet literal with 62 characters instead of 64 — specifically `…01256789-_` where
`…0123456789-_` was meant — produces **no error at all**. Concretely, for the app's URL-safe alphabet:

- sextet 63 indexes one past the end and yields the string `undefined`, concatenated straight into
  the output id;
- every sextet ≥ 48 shifts, so all four and all eight-byte values decode to the wrong bytes.

An id produced this way is 22 characters of plausible base64 that matches **no row**. The screen
renders empty rather than failing.

## How it happened

Hand-typing the 64-character literal into
`trailbase/runtime/ahscripts/lib/route-kit.js` while extracting the id codec. The `edit` tool reported
"oldString and newString are identical" on the correction attempt, because the intended and actual
strings differed by characters that are not visible in a diff — `3` and `4` missing from a digit run
inside a long string. An earlier scripted rewrite used a line-relative index to slice a whole-file
string, which corrupted nothing visibly and also failed to apply.

## Verification

`trailbase/tools/id-codec-check.mjs` now asserts the alphabet byte-for-byte before any encoding
test, then round-trips both directions including the recorded vector:

```
01A0EBFD3E2176D294C5C5797E90A6E5  ->  AaDr_T4hdtKUxcV5fpCm5Q
```

Run it with `node trailbase/tools/id-codec-check.mjs`. It reads the shipped source, not a copy.

## Why it is recorded

This is the same failure the original `route.ts:303-309` comment warns about — base64 that is
*filled* rather than *padded* produced a 24-character id that silently matched nothing, and a whole
materialised invoice document rendered with empty item names
([[invoice-document-write-through-and-rebuild]]).
The lesson generalised: **an id codec has no loud failure mode, so it needs an assertion, and the
assertion must check the alphabet before it checks any encoding** — because every encoding assertion
downstream of a wrong alphabet reports a failure that looks like a logic bug rather than a typo.

## Rule that follows

Never retype this literal; never "improve" it by removing the padding that the original comment
warns about. The check exists so that a hand-edit cannot pass unnoticed.

## Related

- [[guest-helpers-pure-vs-cached]] — why the codec is the one helper that went to Rust.
- [[file-router-conventions-not-a-data-dag]] — the refactor in progress when this was found.
