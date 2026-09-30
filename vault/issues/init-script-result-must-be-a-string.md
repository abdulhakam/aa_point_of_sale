---
title: "Init scripts: the host always reports an error, and they run on every WASM runtime"
type: issue
status: open
created: 2026-09-29
tags: [trailbase, host, init-scripts, runtime-js, quickjs, startup]
belongs_to: "[[trailbase]]"
related_to: ["[[runtime-js-guest-platform]]", "[[invoice-document-write-through-and-rebuild]]", "[[invoice-doc-sync]]", "[[trailbase-runtime-js-scheduler-not-running-jobs]]", "[[tb-0027-materialised-invoice-documents]]"]
---

# Init scripts: the host always reports an error, and they run on every WASM runtime

Two separate facts about `/ahscripts/init/**.js` in `trailbase/tb-ah-run-js/src/init.rs`, both found the
hard way while adding the materialised invoice documents on 2026-09-29.

## 1. Every init script always logs an error, and there is nothing a script can do about it

`host/src/init.rs:175-179`:

```rust
let res = context.async_with(|ctx| Box::pin(async move {
        let promise: Promise = ctx.eval(run_code.as_str())?;
        let res: String = unsafe { SendWrapper::new(promise.into_future()) }.await?;
        Ok::<_, rquickjs::Error>(res)
})).await;
```

The promise is awaited **as a `String`**. The wrapper it evaluates is:

```js
(async () => {
    try {
        {code}
        if (typeof _ah_export === 'function') { await _ah_export(); }
    } catch (e) { console.error("JS Error in {filename}: " + e + "\n" + (e.stack || "")); throw e; }
})()
```

The wrapper has no `return`, so its promise always resolves to `undefined`, and the conversion to
`String` always fails:

```
Error in init script "/ahscripts/init/invoice-doc.js": JS Error: Error converting from js 'undefined' into type 'string'
```

An IIFE written inside `{code}` cannot help: its value is a statement in the wrapper's body and is
discarded. So **this is not a script bug and cannot be fixed from the script side.** Returning
`"ok"` from the IIFE, exporting a default function, and not returning at all were all tried; the
message is identical every time.

**It is harmless, and that is the only reason it was tolerated.** The error is captured into
`res` and mapped into `ScriptReport.result`, not propagated — `run_init_scripts` returns `Ok`, and
`ensure_global_init` goes on to write `last_init_time`. A script that *throws*, by contrast, is
not harmless: see §2's note on `last_init_time` below, and the fact that the `try/catch` in the
wrapper rethrows.

**What to do about it:** it is a host defect. Either the wrapper should `return await` whatever
the script produced, or `execute_init_script` should await as `rquickjs::Value` and stringify for
the report. Until then, treat `Error in init script ...: Error converting from js 'undefined' into
type 'string'` as the expected steady state and look for a *different* message.

## 2. Init scripts run on every WASM runtime, so a request pays whatever they cost

`host/src/runtime.rs:67` declares `STATE` `thread_local`, and `runtime::init()` (line 97) runs
`crate::init::run_init_scripts(&context)` on first use **in that thread**. The host creates a
WASM runtime with 4 threads (`Created dedicated WASM runtime with 4 threads`), and
`ensure_global_init` adds a fifth context of its own. So one boot executes the init scripts five
times, and **the first request on each of the four request threads pays whatever the script
does.**

There is no way to tell the contexts apart from JS: `ensure_global_init` calls exactly
`crate::api::init_api(&ctx)` (line 67), and so does `runtime::init()` (line 107). Both get
`trailbase`, `db`, `sqlite`, `fs`, `kv`, `fetch` and `console`.

Measured: a rebuild of 8,932 documents takes 3–18 s. Run from an init script, that is 3–18 s
added to the first request of each of four threads after every restart. `/healthz` did not answer
for 25 s, and did answer in 0.7 s on the second call.

**This is why the automatic rebuild is not wired up.** `app/lib/invoice-doc.js` keeps
`ensureFresh()` — the check-and-rebuild decision — and `requestRebuild()`, which enqueues on the
durable queue. The automatic path wants those two plus a cheap "out of step?" check; it does not
want the rebuild itself inside the script. When it is built, the guard is the queue, and
`server_start_time` in the KV store is the boot identity that makes "once per boot" expressible.

## Related

- [[trailbase-runtime-js-scheduler-not-running-jobs]] — the host's own scheduler does not run
  `ahscripts/jobs` either; the app drives `/jobs/reconcile` from a minutely poller.
- [[invoice-doc-sync]] — what the init script was written for.