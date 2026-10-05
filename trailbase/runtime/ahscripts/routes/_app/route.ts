// AA Point of Sale — guest app host for the runtime-js TrailBase component.
//
// This file is evaluated as a script by the host (no imports): it loads the app's modules
// itself through a small ESM->CJS shim, then routes requests across the whole URL space.
// Business logic lives in /app/compute and /app/lib; this file is only the HTTP front
// controller.
//
// The whole file runs inside an IIFE. `run_route` re-evaluates it in the same persistent
// QuickJS context for every request, so top-level `const`s would be a redeclaration error on
// the second request; the request entry points are installed on globalThis instead.

(function () {
const PAGES_DIR = "/app/pages";
// `PLUGINS_DIR` moved with the `/plugins` index to `ahscripts/routes/plugins/route.ts` (tb-0030 step 5).

// ------------------------------------------------------------------ module loading

// The module loader is injected by the host.
//
// `tb-ah-run-js` `run_route()` prepends a prelude to every route, so `__AA_LOAD__` exists before any
// route code runs. It used to live in this file, which meant only this file could use it - and a route
// entry that reached for a shared module with `import` failed in the guest with
// `Unexpected token '{'`, because a route file is type-stripped by SWC and then ESM-rewritten by a regex
// shim, and that composition does not survive an import statement.
//
// What the prelude installs is deliberately a two-name surface: `__AA_LOAD__` to load a module, and
// `__AA_TRANSFORM_ESM__` for the one caller that needs the raw transform. Everything else a route might
// want is reached through a module, not through the loader.
const loadModule: (path: string) => Promise<any> = (globalThis as any).__AA_LOAD__;

/** The host's wildcard yields a leading double slash ("//healthz"); collapse it. */
function normalizePath(p: string): string {
  const abs = String(p).startsWith("/");
  const out = String(p)
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== ".");
  return (abs ? "/" : "") + out.join("/");
}
// The module bundle is now built by `app/lib/context.js`, so a route FOLDER can build it too —
// see that file's header. This is the dispatcher's thin alias; its own call sites are unchanged.
let CTX: any = null;
async function app(): Promise<any> {
  CTX = await loadModule("/app/lib/context.js");
  return CTX.app();
}

// ------------------------------------------------------------------ component handoff
//
// The split architecture hands data over by *name*: the `sql` component stores the rows in the
// shared TrailBase KV store and answers with a key. The caller reads the bytes by that key and then
// deletes it, so the store does not accumulate one multi-megabyte entry per request. The WASI
// runtime root is read-only, so a spool file under /app is not an option.

// `kvTakeJSONL` (the spool handoff) moved to `app/lib/route-kit.js` (tb-0030 step 5).

// ------------------------------------------------------------------ request/response// ------------------------------------------------------------------ request/response

function decode(s: string): string {
  try {
    return decodeURIComponent(String(s).replace(/\+/g, " "));
  } catch {
    return String(s);
  }
}

function parsePairs(qs: string): Record<string, any> {  const out: Record<string, any> = {};
  for (const part of String(qs || "").split("&")) {
    if (!part) continue;
    const i = part.indexOf("=");
    const k = decode(i < 0 ? part : part.slice(0, i));
    const v = i < 0 ? "" : decode(part.slice(i + 1));
    if (out[k] === undefined) out[k] = v;
    else if (Array.isArray(out[k])) out[k].push(v);
    else out[k] = [out[k], v];
  }
  return out;
}

function jsonBody(req: any): any {
  const contentType = String((req.headers && req.headers["content-type"]) || "");
  if (!contentType.includes("application/json")) return {};
  try {
    return JSON.parse(String(req.body || "{}"));
  } catch {
    return {};
  }
}

/**
 * Extension to Content-Type, from `/app/manifests/content-types.json`.
 *
 * A MIME table is data with no behaviour in it, so it is not declared here.
 *
 * It reads `__AA_APP__` rather than closing over the bundle, because `readStatic` is module-level and the
 * bundle is built inside `app()`. `__AA_APP__` is published by that function, so this is the same object
 * — and it keeps `readStatic` callable from a module that has no app bundle, which is how a route folder
 * will use it.
 */
// `contentTypeFor`, `extOf` and `readStatic` moved to `app/lib/route-kit.js` (tb-0030 step 5), so a
// route folder can serve a static file.
function html(body: string): any {
  return { html: body };
}
function text(body: string, status?: number): any {
  return { text: body, status: status ?? 200 };
}
function redirect(location: string, status?: number): any {
  return { redirect: location, status: status ?? 303 };
}

function userOf(req: any): any {
  const u = req.user;
  if (!u || !u.id) return null;
  return { name: u.username || u.email || "User", email: u.email || "" };
}

// The hex <-> base64 id codec is not here. It is `routeKit.b64ToHex` / `routeKit.hexToB64`, which
// prefer the Rust implementation in `tb-ah-run-js/src/api/ids.rs` and fall back to JS. It used to be
// two copies in this file's neighbourhood — `management.base64ToHex` and a local `hexToBase64` —
// which is exactly the arrangement that let a wrong base64 alphabet go unnoticed (see
// `tools/id-codec-check.mjs`).

// Business identity for the header and printed reports. The defaults are the legacy values
// (frontend/.env.local: NEXT_PUBLIC_NAME/ADDRESS/PHONE) so a direct shift matches what staff know;
// an operator can override them without a rebuild by editing the optional
// /app/config/business.json (loaded once in `app()`, see `app/config/business.json`).
function business(): { name: string; address: string; phone: string } {
  // The shared context owns the default identity and the __AA_BUSINESS__ bootstrap. app() has
  // always run by the time a handler calls this, so CTX is set.
  return CTX.business();
}

function shell(user: any, active: string, title: string): any {
  const b = business();
  return {
    appName: b.name,
    businessName: b.name,
    businessAddress: b.address,
    businessPhone: b.phone,
    user,
    active,
    title,
  };
}

// ------------------------------------------------------------------ routing

// The report-page renderer (`renderReportPage`, its `RENDER_MAX_ROWS`/`DEFAULT_REPORT_VIEW`
// constants and `loadPageHandlers`) moved to `app/lib/report-render.js` (tb-0030 step 5), so
// `/reports/<key>` can be a route folder. Reached as `A.reportRender`.

async function dispatch(req: any): Promise<any> {
  const A = await app();
  const db: any = (globalThis as any).sqlite;
  const method = String(req.method || "GET").toUpperCase();
  // The host's wildcard yields a leading double slash (e.g. "//healthz").
  const path = normalizePath(String(req.path || "/"));
  const query = parsePairs(String(req.query || ""));
  const user = userOf(req);
  const contentType = String((req.headers && req.headers["content-type"]) || "");
  const form = contentType.includes("application/x-www-form-urlencoded") ? parsePairs(String(req.body || "")) : {};

// Public surfaces.
  // /healthz moved to the route folder `ahscripts/routes/healthz/route.ts` (tb-0030 step 5).

  // The /bench/* probes moved to route folders (tb-0030 step 5): `ahscripts/routes/bench/reportkeys`,
  // `report`, `payload`, `sqlfn`, `refs`, `spool` and `render`. Ungated except `render`, as here.

  // Worker endpoint for the optional fan-out.  // Worker endpoint for the optional fan-out. Internal: it executes one already-claimed step by
  // id, and re-running a step is idempotent, so it is reachable without a session (the fan-out
  // call is server-to-self and carries no cookie). It cannot create work.
    // /worker/<id>/step moved to `ahscripts/routes/worker/{id}/step/route.ts` (tb-0030 step 5).
  // Static mounts, declared in `/app/manifests/static-mounts.json` and resolved by
  // `routeKit.resolveMount`. Three near-identical branches used to live here, each repeating the
  // `..` guard — which is how a guard ends up present twice and absent once. The guard is now in one
  // place, in `route-kit.js`, because refusing `..` is a security property and not a per-route detail.
  // The static mounts moved to route folders (tb-0030 step 5): `static/[...path]`,
  // `compute/[...path]`, `plugins/[...path]` and `favicon.svg`, each calling `routeKit.resolveMount`
  // against the same `static-mounts.json`. Served without the auth gate, as here.

  // /login (GET screen, POST exchange) and /logout moved to route folders (tb-0030 step 5):
  // `ahscripts/routes/login/route.ts` and `.../logout/route.ts`. The `/` branch that used to sit here
  // was DEAD — the host's own `root_handler` answers `/` before this dispatcher.
  if (!user) {
    const next = encodeURIComponent(path + (req.query ? "?" + req.query : ""));
    return redirect("/login?next=" + next);
  }

  // /dashboard moved to the route folder `ahscripts/routes/dashboard/route.ts` (tb-0030 step 5). The
  // host's folder resolver matches it before this dispatcher, so the branch here would be dead.

  // The `/reports` hub and its `ledgers`, `status` and `refresh` siblings all moved to route folders
  // (tb-0030 step 5), and the report-page family with `reports/{key}/route.ts`. Nothing for
  // `/reports/*` renders in this dispatcher any more.
  // /management (the hub) moved to `ahscripts/routes/management/route.ts` (tb-0030 step 5).
  // The whole /management/<entity> family — the GET list and the create / update / delete writes —
  // moved to route folders (tb-0030 step 5): `ahscripts/routes/management/{entity}/route.ts` and the
  // three siblings under it. The host's folder resolver matches them before this dispatcher, so the
  // branches that used to live here would be dead; they are removed rather than left as a second
  // implementation that can drift. `/management` (the index) still renders here.


  // /plugins moved to the route folder `ahscripts/routes/plugins/route.ts` (tb-0030 step 5).

  // Jobs: durable queue API.
  if (path === "/jobs" && method === "POST") {
    const body = jsonBody(req);
    // Validate before enqueueing. `queue.enqueue` throws `Unknown job: <name>` for a name it does not
    // not know, which reached the client as an opaque `500 Guest error: Unknown job: ` — so a request
    // with a typo in the job name, or with no body at all, looked like a server fault. It is a bad
    // request and it is now answered as one. Found by `tools/route-coverage.mjs`, which asserted the
    // route was reachable and got a 500.
    const name = String(body.name || "");
    if (!A.jobs.isKnown(name)) {
      return { error: "unknown job", name, known: A.jobs.known() };
    }
    const jobHex = await A.jobs.enqueue(db, name, body.input || {});
    await A.jobs.reconcile(db);
    const view = await A.jobs.jobView(db, jobHex);
    return { id: view.id, state: view.state };
  }
  if (path === "/jobs/reconcile" && method === "POST") {
    const fanout = query.fanout === "1" || form.fanout === "1";
    const concurrency = Number(query.concurrency || form.concurrency || 1) || 1;
    const origin = (String(req.url || "").match(/^https?:\/\/[^/]+/) || [""])[0];
    const reconciled = await A.jobs.reconcile(db, fanout ? { origin, concurrency } : {});
    // Report materialisation runs here, off the request path: the minutely job drives this route, so
    // the fingerprint probe that invalidates every cached derived answer is not paid by a report
    // request that would otherwise hit the ~20 s call deadline.
    //
    // ⚠️ This read `snap.built.length`, and there is no `built` any more. The view snapshot was retired
    // in [[tb-0032-manifest-first-refactor]] phase 3 — `app/lib/reports.js` is now a probe and a diff,
    // and `refresh()` returns `state` — but this call site was left behind. It threw a TypeError on
    // every reconcile, the catch swallowed it, and `materialized` was therefore **always** null: a
    // route that logs an error every minute and reports that it did nothing. Found by reading the
    // server log during a fresh-depot report sweep, 2026-10-04, not by a failing check.
    let materialized: any = null;
    if (query.materialize !== "0") {
      try {
        const snap = await A.service.refresh(db);
        materialized = {
          tables: snap.fingerprints ? Object.keys(snap.fingerprints).length : 0,
          changed: snap.lastRefresh ? snap.lastRefresh.changed.length : 0,
          // Always empty, and deliberately so: a report's cost is its SQL on the current data, so
          // there is nothing to rebuild. Reported rather than dropped so this key cannot be mistaken
          // for the one that broke.
          rebuilt: snap.lastRefresh ? snap.lastRefresh.rebuilt.length : 0,
        };
      } catch (error) {
        console.log("report fingerprint probe failed: " + error);
      }
    }
    return { reconciled, materialized };
  }
  const jobResultMatch = /^\/jobs\/([^/]+)\/result$/.exec(path);
  if (jobResultMatch && method === "GET") {
    if (query.reconcile !== "0") await A.jobs.reconcile(db);
    const view = await A.jobs.jobView(db, A.routeKit.b64ToHex(jobResultMatch[1]));
    if (!view) return text("No such job", 404);
    return { state: view.state, result: view.result, artifacts: view.artifacts };
  }
  const jobCancelMatch = /^\/jobs\/([^/]+)\/cancel$/.exec(path);
  if (jobCancelMatch && method === "POST") {
    await A.jobs.cancelJob(db, A.routeKit.b64ToHex(jobCancelMatch[1]));
    return { ok: true };
  }
  const jobRecoverMatch = /^\/jobs\/([^/]+)\/steps\/([0-9]+)\/recover$/.exec(path);
  if (jobRecoverMatch && method === "POST") {
    await A.jobs.recoverStep(db, A.routeKit.b64ToHex(jobRecoverMatch[1]), Number(jobRecoverMatch[2]));
    return { ok: true };
  }
  const jobMatch = /^\/jobs\/([^/]+)$/.exec(path);
  if (jobMatch && method === "GET") {
    // `?reconcile=0` inspects without running due work (used by the poller test).
    if (query.reconcile !== "0") await A.jobs.reconcile(db);
    const view = await A.jobs.jobView(db, A.routeKit.b64ToHex(jobMatch[1]));
    if (!view) return text("No such job", 404);
    return view;
  }

  // The /invoice-doc family moved to route folders (tb-0030 step 5): `ahscripts/routes/invoice-doc/route.ts`
  // and its `verify`, `list`, `rebuild`, `document` and `{id}` siblings.
  // The /invoice/* JSON API moved to route folders (tb-0030 step 5): `ahscripts/routes/invoice/route.ts`
  // (POST create) and its `context`, `{id}`, `{id}/line`, `{id}/line/{lineId}`, `{id}/complete` and
  // `{id}/release` siblings. `userHex`, `locked` and `rowsToObjects` are now `route-kit` helpers.
  // ---------------------------------------------------------------- invoices / payments / stock
  //
  // The three working surfaces (tb-0028). Every write goes through the same module the JSON API
  // uses, so a screen and an API client cannot drift, and each one invalidates the report
  // snapshot so a report opened straight afterwards sees it. Money is rounded at 2 dp inside
  // those modules ([[money-is-2dp-everywhere]]).

  // The /cashmemo and /print families moved to route folders (tb-0030 step 5). `round2to` and `pick`
  // were the last callers of either helper in this file and are gone with them.
  // /bench/render moved to `ahscripts/routes/bench/render/route.ts` (tb-0030 step 5).
    // /print (GET queue, POST enqueue) moved to `ahscripts/routes/print/route.ts` (tb-0030 step 5).
  // GET /invoices (the list) moved to `ahscripts/routes/invoices/route.ts` (tb-0030 step 5).
  // `/invoices/new` and `/invoices/<id>/…` still fall through to this dispatcher.

  // /invoices/new (GET entry screen + POST create) moved to `ahscripts/routes/invoices/new/route.ts`
  // (tb-0030 step 5).

  // Three POST routes, previously one (`/invoices/{id}/(header|line|complete)`). Split in place
  // (tb-0030 step 3) while this dispatcher is still the reference, so each can become its own route
  // directory in step 5 without carrying the others' form fields with it.
  //
  // What that buys: the header took 6 fields, the line 9, the complete 1, and the shared branch had to
  // mention all three — so a reader of `/complete` was reading a `discount_2` default. They also
  // shared one `write()` and one redirect, which meant a change to any of them changed all three.
  //
  // What is unchanged, deliberately: the lease. Each route still takes the invoice lock, wraps its one
  // write in `routeKit.write()` (so the fingerprint is invalidated) and redirects to the same place.
  // Two users editing one invoice is still two users racing for one lock.
    // The whole /invoices/<id>/* family — the page, grid, lines, view and the header/complete/line
  // writes — moved to route folders (tb-0030 step 5):
  // `ahscripts/routes/invoices/{id}/route.ts` and its siblings. The dispatcher's branches are
  // deleted rather than left as a second implementation that can drift.
  // GET /payments (the list) moved to `ahscripts/routes/payments/route.ts` (tb-0030 step 5).
  // `/payments/new`, the POST and `/payments/<id>/delete` still fall through to this dispatcher.

  // /payments/new moved to `ahscripts/routes/payments/new/route.ts` (tb-0030 step 5).

    // The /payments writes moved to route folders (tb-0030 step 5): the POST is in
  // `ahscripts/routes/payments/route.ts`, the delete in `.../payments/{id}/delete/route.ts`.
  // GET /inventory moved to `ahscripts/routes/inventory/route.ts` (tb-0030 step 5). `/inventory/save`
  // still falls through to this dispatcher.

  // /inventory/save moved to `ahscripts/routes/inventory/save/route.ts` (tb-0030 step 5).

  // The /p family moved to route folders (tb-0030 step 5): `ahscripts/routes/p/route.ts` (index) and
  // `.../p/[...slug]/route.ts` (a page and its `/data` payload).
  return text("Not found", 404);
}

/**
 * The month that actually holds data, for the empty-window notice. `null` when the probe cannot
 * answer — an empty depot, or the probe failing — so the notice degrades to a plain statement that
 * the period is empty rather than to a broken link.
 */
// `latestPeriod` and `filtersFor` moved to `app/lib/report-render.js` (tb-0030 step 5). The
// `/p/<slug>/data` endpoint below calls `A.reportRender.filtersFor`.

// ------------------------------------------------------------------ entry points

async function handle(req: any): Promise<any> {
  try {
    return await dispatch(req);
  } catch (e: any) {
    // Both halves: QuickJS often gives a bare frame with the message on a different property, and
    // a stack without a message is useless in a log.
    const message = e && e.message ? String(e.message) : String(e);
    const detail = e && e.stack ? String(e.stack) : "";
    console.error("[app] " + message + (detail && detail !== message ? "\n" + detail : ""));
    return { text: "Guest error: " + message, status: 500 };
  }
}

// Entry points, installed on globalThis for the host's `{method}(req)` call.
(globalThis as any).GET = handle;
(globalThis as any).POST = handle;
(globalThis as any).PATCH = handle;
(globalThis as any).DELETE = handle;
})();
