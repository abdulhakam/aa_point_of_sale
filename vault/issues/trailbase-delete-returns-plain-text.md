---
title: TrailBase answers DELETE with plain text, not JSON
type: issue
status: known-limitation
severity: low
created: 2026-09-26
tags: [trailbase, api, json, delete, gotcha]
related_to: ["[[api-contract-trailbase]]", "[[frontend-ssr]]"]
---

# TrailBase answers DELETE with plain text, not JSON

## What happens

`DELETE /api/records/v1/<name>/<id>` succeeds with a **plain-text body** (`deleted`) rather than a
JSON document. A client that assumes every successful response is JSON — the natural assumption,
since every other endpoint returns JSON — throws a parse error on success.

The failure reads like a server bug, which makes it expensive to diagnose: the record *was* deleted,
the status was 2xx, and yet the caller reports an exception.

## How the shipped client handles it

`frontend-ssr/src/lib/trailbase.js` reads the body as text and only tries to parse it, falling back
to the raw string:

```js
const raw = await res.text();
if (!res.ok) throw new TrailBaseError(res.status, raw, path);
if (text) return raw;
if (!raw) return null;
try {
  return JSON.parse(raw);
} catch {
  // DELETE answers with a plain-text body ("deleted"), not JSON.
  return raw;
}
```

The comment is *in the code*, at the catch, so the next reader does not "simplify" the try/catch
away. That is the important part: the workaround is documented where it would be removed.

Note also `if (!raw) return null;` — an empty body is a third case, treated as a successful no-op
rather than a parse failure.

## Implications for other clients

- The legacy PocketBase SDK is not involved here — it only talks to PocketBase. But
  [[tb-0012-wire-nextjs-frontend-to-trailbase]] will introduce a TrailBase client into
  `frontend/src/app/api/`, and it must carry the same tolerance. The `crud.remove` shape in
  `useAPI.ts` returns the SDK's result, so whatever adapter is written has to decide what a delete
  returns.
- Any code that does `JSON.parse(await res.text())` without a guard will break on delete only, so it
  may survive a whole test cycle and fail in production.
- The plugin `import-from-v1` performs per-row deletes when its optional "clear destination first"
  is used, so it exercises this path in bulk.

## Why it is not going to change

It is TrailBase's behaviour, not a bug this project can fix. Treat it as part of the API contract —
it is recorded in [[api-contract-trailbase]] under *Writes*.

## Evidence

- `frontend-ssr/src/lib/trailbase.js` — the `request()` helper and its inline comment, plus
  `remove()` being a thin wrapper over it.
- `trailbase/README.md` — `trailbase/README.md` documents the client conventions; the
  `frontend-ssr` client header records the verified shapes.
- `frontend-ssr/plugins/import-from-v1/meta.md` — "Optionally clears the destination first",
  i.e. the bulk-delete path exists.
- The prior vault recorded this as `issues/trailbase-delete-returns-plain-text.md`; see
  [[previous-vault-recovery]].
