---
title: Guest request header values are byte arrays, not strings
type: issue
status: known-limitation
severity: low
created: 2026-09-26
tags: [trailbase, wasm, guests, http, limitations]
related_to: ["[[trailbase-guest-wasm-spike-results]]"]
---

# Guest request header values are byte arrays, not strings

## The limitation

In `trailbase-wasm@0.6.0`, `HttpRequest.headers()` yields header **values as byte arrays**, not
strings. `/spike/echo` returns the `content-type` it found as an object keyed by byte index:

```json
{"method":"post",
 "contentType":{"0":97,"1":112,"2":112,"3":108,"4":105,"5":99,"6":97,"7":116,"8":105,"9":111,"10":110,"11":47,"12":106,"13":115,"14":111,"15":110},
 "csrfHeader":null,"len":21,"text":"{\"name\":\"CSRFProbe2\"}"}
```

`{0:97,…}` decodes to `application/json` (`97='a'`, `112='p'`, …). Header *names* compare fine
case-insensitively (`req.headers().find(([k]) => k.toLowerCase() === "…")` works), but the value
must be decoded (`new TextDecoder().decode(value)`) before it can be compared or parsed.

## What it costs

- Any handler that inspects a header value (content type, `accept`, `origin`, a CSRF header) must
  decode bytes; a naive `value === "application/json"` comparison silently fails.
- It is easy to miss because names behave like strings and only values are byte arrays; the JSON
  serialization above is what exposed it.

## Evidence

- `guests/src/index.ts` — `/spike/echo`.
- [[trailbase-guest-wasm-spike-results]] § Extra findings, with the raw response.
- `guests/node_modules/trailbase-wasm` (`HttpRequest.headers()` typing).

## Related

- [[trailbase-guest-wasm-spike-results]] — the full spike set.
