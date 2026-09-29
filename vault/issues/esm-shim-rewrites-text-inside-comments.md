---
title: "The guest's ESM shim rewrites text inside comments — never write a literal export form in one"
type: issue
status: open
severity: medium
created: 2026-09-29
updated: 2026-09-29
tags: [runtime-js, quickjs, esm, shim, comments, guest]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[runtime-js-single-host]]", "[[guest-invoice-lifecycle]]", "[[trailbase-guest-error-string-opaque]]", "[[dispatcher-transpiled-per-request]]"]
---

# The guest's ESM shim rewrites text inside comments — never write a literal export form in one

Found 2026-09-29, cost an hour of a module that would not load for a reason no trace pointed at.

## What happens

`app/lib/*.js` modules are ESM, and the host rewrites them to CJS with a regex shim in
`ahscripts/routes/_app/route.ts` (`transformEsm`) before evaluating them with `new Function`. The
shim's patterns are plain regexes with **no comment awareness**. A doc comment that quotes an export
form is therefore *rewritten as if it were code*.

The instance: a comment explaining why this module avoids a class export contained the literal text

```
 * it has no rule for `export class`, so a class export makes the whole module fail…
```

The named-list pattern `/\bexport\s*\{([^}]*)\}\s*(?:from…)?/g` matched `export {…}` **inside the
comment**, captured `…` as an export name, and appended this to the compiled module:

```js
try { __exports["…"] = typeof … !== "undefined" ? … : undefined; } catch (e) {}
```

`typeof …` treats U+2026 HORIZONTAL ELLIPSIS as an identifier. V8 accepts it — the ellipsis is
Unicode `ID_Continue`. **QuickJS's identifier table does not include it**, so the module failed to
load with:

```
Guest error: unexpected character
    at <input>:311:5
    at Function (native)
    at loadModule (eval_script:97:78)
```

The stack points at the *generated* line 311, which is in the middle of the file, and the error
names neither the module nor the comment. Reproducing the shim in node also *passed*, because node
is V8 — so the usual "run it locally" instinct gives the wrong answer here.

## The rule

**Never write a literal export form inside a comment in an `app/lib/*.js` or `app/compute/*.js`
module.** Describe it instead: "a class export", "a named export list". The same applies to the
`import … from` forms and to `export default`.

## Why it is worth writing down

Three things made this expensive, and all three generalise:

1. The shim is the app's module loader, so its behaviour is load-bearing for every module.
2. It has no comment handling, which is the same class of bug as a regex that matches its own
   documentation.
3. **The guest's JS engine is not the one you develop in.** A construct V8 accepts can be rejected
   by QuickJS, and a node-based test of the same code will agree with V8 and disagree with production.

## How to check a change without a QuickJS build

Reproduce the shim outside the guest and compare the *captured export names*, not just whether the
file compiles:

```js
const { names } = transformEsm(source);
console.log(names);   // a name that is not a real identifier is the bug
```

That is what found it, and it is cheap. The harness that does this is
`C:\Users\wajiz.pk\AppData\Local\Temp\kilo\transformed.mjs` for this session; it should become a
repo check.

## Related

- [[runtime-js-single-host]] — why modules are rewritten at all.
- [[trailbase-guest-error-string-opaque]] — the neighbouring weakness: a guest error with no module
  and no line in the source.
- [[dispatcher-transpiled-per-request]] — the same shim runs on the dispatcher too.
