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

async function kvTakeJSONL(key: string): Promise<any[]> {
  const kv: any = (globalThis as any).kv;
  const raw = await kv.get(String(key));
  const rows = String(raw)
    .split("\n")
    .filter((line: string) => line.length > 0)
    .map((line: string) => JSON.parse(line));
  try { await kv.delete(String(key)); } catch (e) { /* best effort */ }
  return rows;
}

// ------------------------------------------------------------------ request/response

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
async function contentTypeFor(fsPath: string): Promise<string | null> {
  const app: any = (globalThis as any).__AA_APP__;
  if (!app || !app.manifests) return null;
  const table = (await app.manifests.contentTypes()).byExtension;
  return table[extOf(fsPath)] ?? null;
}

function extOf(p: string): string {
  const i = p.lastIndexOf(".");
  return i < 0 ? "" : p.slice(i).toLowerCase();
}

function html(body: string): any {
  return { html: body };
}
function text(body: string, status?: number): any {
  return { text: body, status: status ?? 200 };
}
function redirect(location: string, status?: number): any {
  return { redirect: location, status: status ?? 303 };
}

// Rendered-page cache (generic): a report page is one SQLite read on a repeat view instead of a
// full compute + minijinja render of every row. The key is the live data fingerprint + the viewing
// identity + the report + its filters + the RUNTIME REVISION, so a write (which moves the
// fingerprint) misses and re-renders, and so does a code change.
//
// The revision is the part that was missing. Without it the cache keyed on data alone, so editing a
// `.sql` file or a manifest, restarting, and requesting the page served the OLD html from a still-valid
// data fingerprint. Nothing looked wrong; the numbers were just yesterday's code. It cost an hour of
// false negatives during the manifest migration, and [[tb-0032-manifest-first-refactor]] is five
// phases of editing exactly these files. `paths.runtimeRevision()` is a content hash of the whole
// app tree, computed once per process, which `RUN.BAT` always pairs with a restart.
async function pageCacheGet(db: any, cacheKey: string): Promise<string | null> {
  try {
    const rows = await db.all("SELECT html FROM pagecache WHERE key = ?", [cacheKey]);
    return rows && rows.length ? String(rows[0][0]) : null;
  } catch {
    return null;
  }
}
async function pageCachePut(db: any, cacheKey: string, page: string): Promise<void> {
  try {
    await db.execute("CREATE TABLE IF NOT EXISTS pagecache (key TEXT PRIMARY KEY, html TEXT)");
    await db.execute("INSERT OR REPLACE INTO pagecache(key,html) VALUES(?,?)", [cacheKey, page]);
  } catch {
    // Cache is best effort; the page was already rendered.
  }
}

async function readStatic(fsPath: string): Promise<any> {
  try {
    const body: string = await fs.readFile(fsPath);
    // `contentTypeFor` reads `__AA_APP__` rather than closing over the bundle, so `readStatic` stays
    // callable from a module with no app bundle — which is how a route folder will use it.
    return { body, contentType: (await contentTypeFor(fsPath)) || "application/octet-stream" };
  } catch {
    return text("Not found", 404);
  }
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

// Rows a report page renders by default. The guest's minijinja render of tens of thousands of rows
// is the dominant cold cost (and can cross the ~20 s call deadline), so a page renders the first
// `RENDER_MAX_ROWS` rows with a "show all" link; `?all=1` renders everything, `?maxRows=N` overrides.
// Totals are always computed over every row — only the table body is capped.
const RENDER_MAX_ROWS = 1000;

// The shared server-rendered report template. A manifest may override it with `view` (the general
// ledger does), which is how a report gets a bespoke layout without its own route.
const DEFAULT_REPORT_VIEW = "reports/report.html";

// ------------------------------------------------------------------ the report page
//
// Render a report from its manifest, server-side. Shared by `/reports/<key>` and `/p/<slug>`, so
/**
 * Load the JavaScript a page declares in its manifest's `handlers`, merged into one object.
 *
 * This is the manifest-first handlers workflow (tb-0032 step 4), and it exists to remove a coupling
 * rather than to add a feature: the dispatcher used to carry a branch per page — "is this the general
 * ledger? then build its opening-balance row" — and one shared module per bespoke behaviour. A page that
 * needs its own code now says so in data, and the dispatcher loads exactly that.
 *
 * Returns null when the page declares none, so a caller can test it directly. `loadModule` memoises by
 * path, so a handler is compiled once per runtime context however many times its page renders.
 *
 * A handler that fails to load is the page's problem to announce, not a reason to 500 silently: the
 * error is logged and the page renders without it, because a broken handler should cost one page's
 * bespoke behaviour rather than the whole report.
 */
async function loadPageHandlers(A: any, pageDef: any): Promise<any | null> {
  const declared: string[] = (pageDef && pageDef.handlers) || [];
  if (!declared.length) return null;
  const dir = `${PAGES_DIR}/${String(pageDef.slug || "")}`;
  const merged: Record<string, unknown> = {};
  let loaded = 0;
  for (const rel of declared) {
    try {
      Object.assign(merged, await loadModule(`${dir}/${rel}`));
      loaded++;
    } catch (e) {
      console.log(`[handlers] ${pageDef.slug}: ${rel} failed to load — ${(e as any)?.message || String(e)}`);
    }
  }
  return loaded ? merged : null;
}

// the two routes are the same page: the rows arrive as a KV handle and are spliced into the
// template in Rust, so no row is ever materialised in QuickJS and the browser receives finished
// HTML. Before this, `/p` shipped the manifest to `public/js/runtime/page.js`, which rebuilt the
// table in the DOM from a multi-megabyte JSON payload - 171 lines of client JavaScript and an
// 8 MB response for the same report `/reports` returns in 465 KB.
async function renderReportPage(
  A: any, db: any, req: any, user: any, path: string, query: Record<string, any>,
  key: string, pageDef: any
): Promise<any> {
  // `filtersFor` honours the manifest's declared defaults when the query does not carry the
  // field, which is what the report page always wants. (The old `parseFilters` overwrote every
  // default from the query, so a bare GET computed all-time figures —
  // vault/issues/report-routes-ignore-date-defaults.md.)
  const filters = await filtersFor(A, pageDef, query);

  // Page handlers, resolved relative to the page's own directory. `normalizeMeta` has already rejected
  // absolute paths and `..`, so this cannot escape `app/pages/`.
  //
  // The merged exports of every declared handler, or null when the page declares none. Loading is
  // per-page and memoised by `loadModule`, so a page with no handlers — thirteen of the fourteen —
  // pays nothing, and a page with handlers does not make the dispatcher know what they are.
  const pageHandlers = await loadPageHandlers(A, pageDef);

  const showAll = String(query.all || "") === "1";
  const requestedMax = Number(query.maxRows || 0);
  // -1 means "no cap", which is what a `LIMIT`-less statement wants; the page renders everything
  // rather than slicing in JS.
  const maxRows = showAll ? -1 : requestedMax > 0 ? requestedMax : RENDER_MAX_ROWS;

  // Rendered-page cache lookup. The fingerprint is the live data version, so any write misses.
  let cacheKey: string | null = null;
  try {
    const fp = await A.service.fingerprint();
    const rev = await A.paths.runtimeRevision();
    cacheKey = JSON.stringify([rev, fp, (user && (user.email || user.name)) || "anon", key, filters, showAll, requestedMax]);
    const cached = await pageCacheGet(db, cacheKey);
    if (cached !== null) return html(cached);
  } catch {
    cacheKey = null;
  }

  const snap = await A.refs.refs(await A.service.fingerprint());
  const options = A.reportPages.filterOptions(snap, pageDef.fields);
  const missing = (pageDef.requires || []).filter((name: string) => !filters[name]);
  const rawQuery = String(req.query || "");
  const allHref = `${path}?${rawQuery ? rawQuery + "&" : ""}all=1`;
  const appliedLabels = pageDef.fields
    .filter((field: any) => filters[field.name])
    .map((field: any) => {
      const raw = String(filters[field.name]);
      if (field.type === "select") {
        const hit = (options[field.source] || []).find((o: any) => o.value === raw);
        return { label: field.label, value: hit ? hit.label : raw };
      }
      if (field.type === "check") return null;
      return { label: field.label, value: raw };
    })
    .filter(Boolean);
  // Everything the page renders apart from the rows, which the host splices in by KV key.
  const frame = {
    def: pageDef,
    // Mobile layout is additive: a narrow report turns into labelled cards, a wide one keeps its
    // grid and scrolls sideways. The first column is the row's identity and reads as a heading
    // inside a card, so it is marked `lead` and drops its own label
    // ([[mobile-layout-is-additive-to-the-legacy-look]]).
    columns: pageDef.columns.map((c: any, i: number) => (i === 0 ? { ...c, lead: true } : c)),
    mobile: pageDef.columns.length <= 6 ? "cards" : "scroll",
    basePath: path,
    // The print link carries the filters that are on screen, so a sheet is the report the
    // operator was looking at rather than an unfiltered default.
    rawQuery,
    filters,
    options,
    appliedLabels,
    missing,
    // The legacy report's period line, `11-Apr-2026`, on the right of the title row. There was no
    // `meta` on the frame — the old meta line below the filters was rendering `appliedLabels`, so the
    // period was never shown in the legacy's own form. See `app/lib/dates.js::legacyDate`.
    period: {
      from: A.dates.legacyDate(filters.from),
      to: A.dates.legacyDate(filters.to),
    },
  };
  const view = pageDef.view || DEFAULT_REPORT_VIEW;

  // The spool path. Two statements: the rows, and a one-row totals aggregate over the SAME
  // statement. Neither brings a row into QuickJS — the totals row is read back through the same
  // KV handoff and lands here as a small object of formatted strings.
  const totals = missing.length ? { rowCount: 0 } : await A.spooled.totalsFor(key, filters);
  const total = Number(totals.rowCount || 0);
  const shown = maxRows < 0 ? total : Math.min(total, maxRows);
  const spools = missing.length ? [] : [{ field: "rows", key: (await A.spooled.spoolRows(key, filters, maxRows)).key }];
  const page = await A.http.pageSpooled(req, { ...shell(user, "reports", pageDef.title), paper: "a4" }, view, {
    ...frame,
    // `latest` is only resolved when the window is empty, and it is what lets the page say WHICH
    // period has data instead of only that this one does not. The probe is fingerprint-cached, so
    // the empty case costs one indexed read.
    rowInfo: {
      shown,
      total,
      truncated: shown < total,
      allHref,
      // Resolved only when the window is empty, and it is what lets the page say WHICH period has data
      // instead of only that this one does not. One fingerprint-cached probe, so the cost is on the
      // empty path alone.
      latest:
        missing.length || total > 0
          ? null
          : await latestPeriod(A, pageDef.filters.find((f: any) => f.dateSource)?.dateSource),
    },
    totalsGroups: A.pages.bindTotalsGroups(pageDef.totals || [], totals),
    // Page handlers. The general ledger's opening row is an echo of three filter inputs, not a query
    // result, so there is nothing for SQL to add — which is the case a handler is for. It used to be
    // `pageDef.openings ? A.reportPages.openingRow(filters) : null`: the dispatcher knowing which page
    // needed which bespoke logic. Now the page declares it (`"handlers": ["handlers/openings.js"]`) and
    // the dispatcher loads only what this page asked for.
    opening: pageHandlers && typeof pageHandlers.openingRow === "function"
      ? pageHandlers.openingRow(filters)
      : null,
    meta: {},
  }, spools);
  if (cacheKey) await pageCachePut(db, cacheKey, page);
  return html(page);
}

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

// The report keys the sweep should cover, taken from the app's own registry so the bench cannot
  // drift from the reports that actually exist.
  if (path === "/bench/reportkeys" && method === "GET") {
    return { keys: (await A.spooled.names()).slice().sort() };
  }

    // Per-report acquisition A/B, for the all-reports sweep.
    //
    // Scope, stated precisely: this measures acquiring the **base-table rows each report needs** —
    // the step a component split would actually move. The report arithmetic is SQL in both arms, so
    // this is an acquisition benchmark per report, not a report benchmark.
  if (path === "/bench/report" && method === "GET") {
    const key = String(query.key || "");
    const arm = String(query.arm || "inline");

    let tables: string[] = [];
    try {
      // Which base tables this report touches, read from its own composed statement. It used to be
      // `A.views.tablesForViews(page.needs.views)` — a hand-written provenance map naming views that no
      // longer exist as a layer (tb-0032 step 3). Deriving it keeps the benchmark honest: it measures
      // the tables the query really reads, and cannot drift from the SQL.
      if (!(await A.spooled.names()).includes(key)) return { error: "unknown report: " + key };
      tables = await A.spooled.tablesForReport(key);
    } catch (e) {
      // Name the failure. The first version returned a bare "unknown report", which sent me looking
      // for a report that plainly exists — the error was in table derivation, and it said so nowhere.
      return { error: `bench/report ${key}: ${(e && (e as any).message) || String(e)}` };
    }

    const t0 = Date.now();
    let rows = 0;
    let bytes = 0;
    let acquireMs = 0;
    let handoffMs = 0;
    const perTable: any[] = [];

    for (const table of tables) {
      const tA = Date.now();
      if (arm === "component") {
        const origin = (String(req.url || "").match(/^https?:\/\/[^/]+/) || [""])[0];
        const res: any = await (globalThis as any).http.request({
          method: "GET",
          url: origin + "/rpc/table?name=" + encodeURIComponent(table),
        });
        if (!res || Number(res.status) !== 200) return { error: "sql component failed on " + table + ": " + (res && res.status) };
        const handle = JSON.parse(String(res.body));
        acquireMs += Date.now() - tA;
        const tH = Date.now();
        const got = await kvTakeJSONL(String(handle.key));
        handoffMs += Date.now() - tH;
        rows += got.length;
        bytes += Number(handle.bytes || 0);
        perTable.push({ table, rows: got.length, bytes: handle.bytes, queryMs: handle.queryMs, writeMs: handle.writeMs });
      } else if (arm === "raw") {
        // Fair-comparison arm: the SAME work as the component (read columns, select all rows, no
        // per-row normalisation), so the only difference from `component` is the packaging.
        // `inline` instead calls the app's `readTable`, which additionally base64-encodes relation
        // ids and coerces booleans per row — that is extra work, and comparing `inline` against
        // `component` would credit the split with work it simply does not do.
        //
        // `PRAGMA table_info` is rejected by the DB bridge, but the table-valued
        // `pragma_table_info(?)` form is a SELECT and works.
        const info = await db.all("SELECT name FROM pragma_table_info(?)", [table]);
        const cols = (info ?? []).map((r: any[]) => r[0]);
        const select = cols.map((c: string) => '"' + c + '"').join(", ");
        const got = await db.all('SELECT ' + select + ' FROM "' + table + '" ORDER BY "id" DESC', []);
        acquireMs += Date.now() - tA;
        rows += (got ?? []).length;
        perTable.push({ table, rows: (got ?? []).length });
      } else {
        const got = await A.data.readTable(table);
        acquireMs += Date.now() - tA;
        rows += got.length;
        perTable.push({ table, rows: got.length });
      }
    }

    return {
      key,
      arm,
      tables,
      rows,
      bytes,
      acquireMs,
      handoffMs,
      totalMs: Date.now() - t0,
      perTable,
    };
  }

  // Component-split A/B. `?arm=inline` acquires the rows in this component and renders straight
  // from the SQL result; `?arm=component` asks the separate `sql.wasm` component for the same rows
  // and gets back only a *handle* (a spool file path), then renders from that file. Both arms
  // produce byte-identical HTML from identical data — that equality is asserted by
  // `tools/split-bench.mjs`, and the timings are the measurement recorded in
  // vault/decisions/component-split-and-sql-materialised-tables.
  if (path === "/bench/payload" && method === "GET") {
    const arm = String(query.arm || "inline");
    const limit = Math.max(1, Math.min(50000, Number(query.limit || 2000) || 2000));
    const cols = ["amount", "paid", "payment_date", "description", "qty", "price", "discount_rs"];
    const t0 = Date.now();

    let rows: any[] = [];
    let acquireMs = 0;
    let handoffMs = 0;
    let handle: any = null;

    if (arm === "component") {
      const tAcq = Date.now();
      const origin = (String(req.url || "").match(/^https?:\/\/[^/]+/) || [""])[0];
      const res: any = await (globalThis as any).http.request({
        method: "GET",
        url: origin + "/rpc/payload?limit=" + encodeURIComponent(String(limit)),
      });
      acquireMs = Date.now() - tAcq;
      if (!res || Number(res.status) !== 200) return text("sql component failed: " + (res && res.status), 502);
      handle = JSON.parse(String(res.body));

      // The handoff: a name, not a value. Read the bytes the component left in the shared KV store.
      const tHand = Date.now();
      rows = await kvTakeJSONL(String(handle.key));
      handoffMs = Date.now() - tHand;
    } else {
      const tAcq = Date.now();
      // NOTE: there is no way to make this read cold from inside the guest. `PRAGMA cache_size` and
      // `PRAGMA shrink_memory` are rejected by the DB bridge ("pragmas not supported"), verified via
      // /bench/pragma, so an earlier `cold=1` implementation here was a silent no-op. Cold is now
      // achieved by restarting the server between measurements (tools/run-bench.ps1 -ColdRestart).
      const raw = await db.all(
        'SELECT p."amount", p."paid", p."payment_date", p."description", t."qty", t."price", t."discount_rs" ' +
          'FROM payments p LEFT JOIN transactions t ON t."id" = p."invoice" ' +
          'ORDER BY p."id" DESC LIMIT ?',
        [String(limit)]
      );
      rows = (raw ?? []).map((values: any[]) => {
        const obj: any = {};
        for (let i = 0; i < cols.length; i++) obj[cols[i]] = values[i];
        return obj;
      });
      acquireMs = Date.now() - tAcq;
    }

    const tRender = Date.now();
    const out: string = (globalThis as any).render.html("bench/payload.html", { rows });
    const renderMs = Date.now() - tRender;

    if (String(query.format || "") === "json") {
      return {
        arm,
        limit,
        rows: rows.length,
        acquireMs,
        handoffMs,
        renderMs,
        totalMs: Date.now() - t0,
        bytes: out.length,
        sqlComponent: handle,
      };
    }
    return { html: out, status: 200 };
  }

  // Which SQL functions does the GUEST's SQLite actually have?
  //
  // The depot DB is read through TrailBase's own bundled SQLite, which is NOT the same build as
  // node:sqlite's. `floor` is present in one and ABSENT in the other, and every `round2` site in the
  // prelude depends on it — so the port was verified green against the WRONG engine. This probe
  // reports what the guest can really evaluate, which is the only version that matters.
  if (path === "/bench/sqlfn" && method === "GET") {
    const names = ["floor", "ceil", "trunc", "round", "abs", "sign", "printf", "iif", "mod", "nullif", "cast"];
    const out: any = {};
    for (const fn of names) {
      try {
        await db.all(`SELECT ${fn}(1)`);
        out[fn] = "ok";
      } catch (e: any) {
        out[fn] = "MISSING: " + String(e && e.message ? e.message : e).slice(0, 80);
      }
    }
    // Evaluate a candidate round2 over a fixed set of values, INCLUDING the exact negative halves
    // that the JS `Math.round` semantics turn on.
    const expr = String(query.expr || "");
    let sample: any = null;
    if (expr) {
      try {
        const values = ["2.5", "-2.5", "-50.625", "-2.675", "-0.01", "1.115", "-1.5", "18731.385"];
        sample = [];
        for (const v of values) {
          const row = await db.all(`SELECT (${expr.replaceAll("$v", v)}) AS r`);
          // `db.all` yields rows as objects keyed by column name; `?.[0]?.r` is right but the host
          // may hand back the array positionally in some paths, so read both.
          const got = row && row.length
            ? (row[0].r !== undefined ? row[0].r : (Array.isArray(row[0]) ? row[0][0] : undefined))
            : undefined;
          sample.push({ v: Number(v), got });
        }
      } catch (e: any) {
        sample = { error: String(e && e.message ? e.message : e).slice(0, 200) };
      }
    }

    // STRING/NUMBER FORMATTING, which is a separate question from round2: does `printf('%.2f')` keep
    // TRAILING ZEROES? That is the property the ledger text columns depend on, and it is NOT
    // guaranteed to agree with node:sqlite — so it is checked here, in the guest, against the exact
    // string JS `toFixed(2)` produces.
    //
    // `want` is JS `toFixed(2)` of the literal. `printf('%!.2f', …)` is deliberately included: it is
    // the NO-trailing-zeroes variant, and it is the easy mistake to make here.
    let fmt: any = null;
    if (String(query.fmt || "") !== "") {
      const cases: [string, string, string][] = [
        ["printf('%.2f', 3.5)", "3.50", "printf %.2f on a half"],
        ["printf('%.2f', 3.0)", "3.00", "printf %.2f on a WHOLE number"],
        ["printf('%.2f', 0.0)", "0.00", "printf %.2f on zero"],
        ["printf('%.2f', 540.0)", "540.00", "printf %.2f on 540"],
        ["printf('%.2f', 47531.0)", "47531.00", "printf %.2f on 47531"],
        ["printf('%.2f', -2.5)", "-2.50", "printf %.2f on a negative half"],
        ["printf('%.2f', -3.0)", "-3.00", "printf %.2f on a negative whole"],
        ["printf('%.2f', 0.25)", "0.25", "printf %.2f on 0.25"],
        ["printf('%!.2f', 3.5)", "3.5", "printf %!.2f (NO trailing zeroes)"],
        ["format('%.2f', 47531.0)", "47531.00", "format %.2f on 47531"],
        ["format('%d', 5)", "5", "format %d"],
        ["json_group_array(1)", "[1]", "JSON1 json_group_array"],
        ["json_extract('{\"a\":1}', '$.a')", "1", "JSON1 json_extract"],
      ];
      fmt = [];
      for (const [q, want, label] of cases) {
        try {
          const row = await db.all(`SELECT ${q} AS r`);
          const got = row && row.length
            ? (row[0].r !== undefined ? row[0].r : (Array.isArray(row[0]) ? row[0][0] : undefined))
            : undefined;
          fmt.push({ label, want, got, match: String(got) === want });
        } catch (e: any) {
          fmt.push({ label, want, got: undefined, match: false, err: String(e && e.message ? e.message : e).slice(0, 70) });
        }
      }
    }

    return { functions: out, sample, fmt };
  }

  // Spool probe: the ledger/booker report run entirely in SQLite, with the rows handed to the
  // renderer by KV key instead of being materialised in QuickJS.
  //
  // `refs` equivalence: the SQL-defined list (app/sql/refs.sql, read by app/lib/refs.js) against the
  // JavaScript one it replaces (compute/views.js `buildRefs`). Step 1 of tb-0032 is only safe if the
  // two agree, and agreement has to be checkable from outside the guest — the JS side is deleted in
  // step 3, so this route is what makes the swap falsifiable rather than hopeful.
  if (path === "/bench/refs" && method === "GET") {
    // `refs` is defined by `app/sql/refs.sql` and read by `app/lib/refs.js` — step 1 of
    // [[tb-0032-manifest-first-refactor]]. The check is the DURABLE form of the equivalence test that
    // proved the swap: `buildRefs` is gone, so there is nothing left to compare against, and the thing
    // worth guarding is the failure mode that matters — a dropdown that silently renders empty. A
    // missing key, or a list that empties, must fail here rather than on a shop screen.
    const EXPECTED_REFS = { sections: 10, companies: 15, areas: 59, parties: 943, bookers: 4, items: 207, partyTypes: 2, invoiceTypes: 4, paymentTypes: 3 };
    const refsMod = await loadModule("/app/lib/refs.js");
    const fp = await A.service.fingerprint();
    const t0 = Date.now();
    const live = await refsMod.refs(fp);
    const sqlMs = Date.now() - t0;
    const shape = refsMod.shape(live);
    const problems: string[] = [];
    for (const key of Object.keys(EXPECTED_REFS)) {
      if (!(key in live)) problems.push(`missing key: ${key}`);
      else if (!Array.isArray(live[key])) problems.push(`not an array: ${key}`);
    }
    for (const key of Object.keys(live)) {
      if (!(key in EXPECTED_REFS)) problems.push(`unexpected key: ${key}`);
    }
    return {
      keys: Object.keys(live).length,
      problems,
      // Counts are reported, not asserted: the shop's master data grows, so a hard count would fail
      // for the wrong reason. The assertion that matters is structural — every key present, every
      // value an array — and that a party list is not empty.
      empty: Object.keys(live).filter((k) => (live[k] ?? []).length === 0),
      shape,
      sqlMs,
    };
  }

  // `?arm=spooled` is the new path: sqlite.spool -> KV handle -> render.spooled. `?arm=rows` is
  // the old shape, kept so the two are measurable against each other on the same data. Both render
  // the same template from the same SQL, so a timing difference is transport, not output.
  if (path === "/bench/spool" && method === "GET") {
    const t0 = Date.now();
    const arm = String(query.arm || "spooled");
    const reportName = String(query.report || "ledgers/booker");
    const spooled = await loadModule("/app/lib/spoolreports.js");
    const filters = {
      booker: query.booker || "",
      party: query.party || "",
      from: query.from || "",
      to: query.to || "",
    };
    const timing: any = {};
    // `?format=html` returns the rendered document itself, so a bench run can assert the two arms
    // are BYTE-IDENTICAL. A timing comparison between arms that render different bytes is
    // worthless, so equality has to be checkable from outside the guest.
    const asHtml = String(query.format || "") === "html";

    // Unknown report names must fail loudly. A silently-defaulted name would benchmark one report
    // under another's label, which is how a bench table ends up quietly wrong.
    const known = await spooled.names();
    if (!known.includes(reportName)) {
      return { error: `unknown report: ${reportName}`, known } as any;
    }

    if (arm === "rows") {
      // The old shape, on the same SQL and the same template: bring every row into QuickJS, zip
      // the columns in JS, then render. This is the cost the spool exists to remove, so it is the
      // baseline the other arm has to beat — same data, same output, different transport.
      const { sql, cols, binds } = await spooled.parts(reportName, filters);
      const tRows = Date.now();
      const raw = await db.all(sql, binds);
      const mapped = (raw ?? []).map((values: any[]) => {
        const obj: any = {};
        for (let i = 0; i < cols.length; i++) obj[cols[i]] = values[i];
        return obj;
      });
      const acquireMs = Date.now() - tRows;
      const html: string = (globalThis as any).render.html("bench/spooled.html", { rows: mapped });
      if (asHtml) return { html, status: 200 };
      return { report: reportName, arm, rows: mapped.length, acquireMs, totalMs: Date.now() - t0, htmlBytes: html.length };
    }

    const html: string = await spooled.renderPage(
      reportName,
      "bench/spooled.html",
      {},
      filters,
      -1,
      (h: any) => {
        timing.handle = h;
      }
    );
    if (asHtml) return { html, status: 200 };
    return {
      report: reportName,
      arm,
      rows: timing.handle ? timing.handle.rows : 0,
      bytes: timing.handle ? timing.handle.bytes : 0,
      queryMs: timing.handle ? timing.handle.queryMs : 0,
      writeMs: timing.handle ? timing.handle.writeMs : 0,
      totalMs: Date.now() - t0,
      htmlBytes: html.length,
    };
  }

  // Worker endpoint for the optional fan-out. Internal: it executes one already-claimed step by
  // id, and re-running a step is idempotent, so it is reachable without a session (the fan-out
  // call is server-to-self and carries no cookie). It cannot create work.
  if (/^\/worker\/[^/]+\/step$/.test(path) && method === "POST") {
    const work = jsonBody(req);
    const stepId = String(work.stepId || "").toUpperCase();
    if (!/^[0-9A-F]+$/.test(stepId)) return text("bad step id", 400);
    return await A.jobs.executeStep(db, stepId);
  }
  // Static mounts, declared in `/app/manifests/static-mounts.json` and resolved by
  // `routeKit.resolveMount`. Three near-identical branches used to live here, each repeating the
  // `..` guard — which is how a guard ends up present twice and absent once. The guard is now in one
  // place, in `route-kit.js`, because refusing `..` is a security property and not a per-route detail.
  const mount = A.routeKit.resolveMount(await A.manifests.staticMounts(), path);
  if (mount) {
    if (mount.refused) return text("Not found", 404);
    if (mount.single) return readStatic(mount.rel);
    if (mount.indexFallback) {
      // Directory-style plugin URL -> its index.html. `path` arrives with the trailing slash
      // normalised away, so treat any extension-less rel as a directory (not as a file).
      if (mount.rel.endsWith("/") || mount.rel.indexOf(".") < 0) {
        const res = await readStatic(mount.dir + "/" + mount.rel.replace(/\/$/, "") + "/index.html");
        if (res && res.status !== 404) return res;
      }
    }
    return readStatic(mount.dir + "/" + mount.rel);
  }

if (path === "/login" && method === "GET") {
    return A.routeKit.renderRoute(req, { user, active: "", title: "Log in", template: "auth/login.html" }, {
      next: query.next || "",
      expired: query.expired || "",
      error: "",
    });
  }
  if (path === "/login" && method === "POST") {
    // The app's own login: exchange the credentials for tokens via TrailBase's JSON login, then
    // set the same auth cookies its form flow would. No second session layer.
    const next = String(form.next || query.next || "/dashboard");
    const origin = (String(req.url || "").match(/^https?:\/\/[^/]+/) || [""])[0];
    let tokens: any = null;
    try {
      const text = await (globalThis as any).http.postJson(
        origin + "/api/auth/v1/login",
        JSON.stringify({ email: String(form.email || ""), password: String(form.password || "") })
      );
      tokens = JSON.parse(text);
    } catch {
      tokens = null;
    }
    if (!tokens || !tokens.auth_token) {
      return {
        html: await A.http.page(req, shell(null, "", "Log in"), "auth/login.html", {
          next,
          expired: "",
          error: "Invalid email or password",
        }),
        status: 401,
      };
    }
    const attrs = "Path=/; HttpOnly; SameSite=Strict";
    return {
      redirect: next,
      status: 303,
      headers: {
        "set-cookie": [
          `auth_token=${tokens.auth_token}; ${attrs}; Max-Age=3600`,
          `refresh_token=${tokens.refresh_token}; ${attrs}; Max-Age=2592000`,
        ],
      },
    };
  }
  if (path === "/logout") return redirect("/_/auth/logout");
  if (path === "/") return redirect(user ? "/dashboard" : "/login");

  if (!user) {
    const next = encodeURIComponent(path + (req.query ? "?" + req.query : ""));
    return redirect("/login?next=" + next);
  }

  // /dashboard moved to the route folder `ahscripts/routes/dashboard/route.ts` (tb-0030 step 5). The
  // host's folder resolver matches it before this dispatcher, so the branch here would be dead.

  // /reports (the hub) and /reports/ledgers moved to route folders (tb-0030 step 5):
  // `ahscripts/routes/reports/route.ts` and `.../reports/ledgers/route.ts`. `/reports/<key>`,
  // `/reports/status` and `/reports/refresh` still fall through to the dispatcher.
  if (path === "/reports/status") return A.service.status();
  if (path === "/reports/refresh" && method === "POST") {
    const full = query.full === "1" || query.full === "on" || form.full === "1" || form.full === "on";
    // `full` also drops the composed-SQL cache, or an edited `.sql` file would keep serving the
    // text that was composed when the process first read it.
    if (full) {
      await A.service.invalidate();
      A.spooled.invalidate();
    }
    await A.service.refresh(db);
    const accept = String((req.headers && req.headers.accept) || "");
    if (accept.includes("application/json")) return A.service.status();
    const referer = String((req.headers && req.headers.referer) || "");
    const back = referer ? referer.replace(/^https?:\/\/[^/]+/, "") : "/dashboard";
    return redirect(back || "/dashboard");
  }
  // /reports/ledgers moved to `ahscripts/routes/reports/ledgers/route.ts` (see the /reports note above).

  const reportMatch = /^\/reports\/(.+)$/.exec(path);
  if (reportMatch && method === "GET") {
    const key = reportMatch[1];
    // The manifest is the ONE page definition: `/reports/<key>` and `/p/<slug>` both read it, so a
    // report cannot be defined twice and drift. `REPORT_PAGES` in app/lib/report-pages.js used to be
    // the second copy, and it had already diverged - see
    // vault/issues/report-page-definitions-duplicated-and-already-divergent.md.
    const pageDef = (await A.pages.reportPages(PAGES_DIR))[key];
    // The spool registry decides what exists: the SQL is what a report IS.
    if (!pageDef || !(await A.spooled.names()).includes(key)) return text("Not found", 404);
    return renderReportPage(A, db, req, user, path, query, key, pageDef);
  }


  if (path === "/management") {
    // `order()` not `ENTITY_ORDER`: the ESM shim snapshots exports at load time, so a value that is set
    // after the module is loaded (`install()`, from the manifest) is only visible through a function.
    const entities = A.entities.order().map((key: string) => ({ key, ...A.entities.ENTITIES[key] }));
    return html(await A.http.page(req, shell(user, "management", "Management"), "management/index.html", { entities }));
  }
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

  // Materialised invoice documents (tb-0027).
  //
  //   GET  /invoice-doc                     status, counts, and the last rebuild
  //   GET  /invoice-doc/verify              drift check against the base tables
  //   GET  /invoice-doc/list                summaries from the generated columns
  //   GET  /invoice-doc/document?id=<id>    one whole document
  //   GET  /invoice-doc/{id|inv-1234}       one whole document (path form)
  //   POST /invoice-doc/rebuild             rebuild every document
  //
  // A rebuild is seconds, not milliseconds, so it is not something to hide behind a spinner on an
  // unauthenticated path -- it is an explicit POST that records who asked and why. The automatic
  // path (`ahscripts/init/invoice-doc.js`) is the one that runs unattended.
  if (path === "/invoice-doc" && method === "GET") {
    return await A.invoiceDoc.status({ kind: query.kind || "invoice.build" });
  }
  if (path === "/invoice-doc/verify" && method === "GET") {
    return await A.invoiceDoc.verify();
  }
  if (path === "/invoice-doc/list" && method === "GET") {
    return await A.invoiceDoc.list({
      type: query.type,
      party: query.party,
      booker: query.booker,
      completed: query.completed,
      datedFrom: query.datedFrom,
      datedTo: query.datedTo,
      unpaid: query.unpaid,
      orderBy: query.orderBy,
      order: query.order,
      limit: query.limit,
      offset: query.offset,
    });
  }
  if (path === "/invoice-doc/rebuild" && method === "POST") {
    const body = jsonBody(req);
    // Enqueue, do not run it here. A full rebuild of the production depot is 3-10 s of SQLite
    // work, and the guest's WASM call deadline is around 20 s -- reconciling inline completed the
    // rebuild and then lost the HTTP response to the deadline. The job is durable and the minutely
    // poller runs it; the caller polls `/jobs/{id}` or `GET /invoice-doc` for the outcome.
    // `?reconcile=1` runs it in this call, which is convenient on a small depot and in tests.
    const result = await A.invoiceDoc.requestRebuild({
      kind: String(query.kind || body.kind || "invoice.build"),
      reason: String(query.reason || body.reason || "manual"),
      reconcile: query.reconcile === "1",
    });
    if (!result.ok) {
      return { status: 500, body: JSON.stringify(result), contentType: "application/json; charset=utf-8" };
    }
    return result;
  }
  if (path === "/invoice-doc/rebuild" && method === "GET") {
    // The rebuild-in-progress view, so a screen can poll without holding a handle.
    return await A.invoiceDoc.status({ kind: query.kind || "invoice.build" });
  }
  if (path === "/invoice-doc/document" && method === "GET") {
    // `id` is base64, and `=` inside a path segment is fragile through the router, so the query
    // parameter is the supported form for a base64 id. The path form below is for `inv-<no>` and
    // for hex.
    const doc = await A.invoiceDoc.read(query.id || query.readableId || "");
    if (!doc) return text("No such invoice document", 404);
    return doc;
  }
  const invoiceDocMatch = /^\/invoice-doc\/([^/]+)$/.exec(path);
  if (invoiceDocMatch && method === "GET") {
    const doc = await A.invoiceDoc.read(decode(invoiceDocMatch[1]));
    if (!doc) return text("No such invoice document", 404);
    return doc;
  }

  // Invoice entry: immediate push, leased, server-numbered (tb-0021). JSON API for the screen.
  const userHex = (() => {
    const id = String(req.user?.id ?? "");
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)
      ? id.replace(/-/g, "").toUpperCase()
      : A.routeKit.b64ToHex(id);
  })();
  const locked = () =>
    ({ body: JSON.stringify({ error: "locked", holder: "another device" }), contentType: "application/json; charset=utf-8", status: 409 });
  const rowsToObjects = (columns: string[], rows: any[]) =>
    (rows ?? []).map((values) => Object.fromEntries(columns.map((c, i) => [c, values[i]])));

  if (path === "/invoice/context" && method === "GET") {
    const type = String(query.type || "sale");
    const items = (await A.baseviews.itemsReport()).map((r: any) => ({
      id: r.id, name: r.name, category: r.category, box_size_qty: r.box_size_qty,
      cost_price: r.cost_price, sale_price: r.sale_price, stock: r.qty,
    }));
    const counts = await db.all('SELECT "type", COUNT(*) FROM "invoices" GROUP BY "type" ORDER BY "type"', []);
    const countOf = (code: number) => {
      const hit = (counts ?? []).find((r: any[]) => Number(r[0]) === code);
      return (hit ? Number(hit[1]) : 0) + 1;
    };
    const refs = await A.routeKit.refs();
    // The ETag used to carry the snapshot's in-memory version COUNTER, which ticked when the refresh
    // job ran rather than when the data changed — so an invoice edited from another tab could leave the
    // ETag valid. The data fingerprint is what actually determines this payload, and it is already
    // memoised for 1.5 s, so it is both cheaper and more honest. Nothing reads `version` (checked
    // against app/public/js and the entry templates), but it stays in the payload for the shape's sake.
    const version = await A.service.dataVersion();
    const etag = `W/"inv-ctx-${version}-${JSON.stringify(counts)}-${type}"`;
    const headers = { etag, "cache-control": "private, no-cache" };
    if (String((req.headers && req.headers["if-none-match"]) || "") === etag) {
      return { status: 304, body: "", contentType: "application/json; charset=utf-8", headers };
    }
    const payload = {
      version,
      type,
      items,
      parties: refs.parties ?? [],
      bookers: refs.bookers ?? [],
      areas: refs.areas ?? [],
      sections: refs.sections ?? [],
      categories: refs.categories ?? [],
      companies: refs.companies ?? [],
      next: { purchase: countOf(0), sale: countOf(1), return: countOf(2), difference: countOf(3) },
    };
    return { body: JSON.stringify(payload), contentType: "application/json; charset=utf-8", headers };
  }

  if (path === "/invoice" && method === "POST") {
    const body = jsonBody(req);
    // Validate `type` before calling in. `createInvoice` does `String(Number(type))`, so a missing or
    // non-numeric type reached the INSERT as the literal string "NaN" and tripped the invoices CHECK
    // constraint — surfacing as an opaque `500`. It is a bad request. Found by
    // `tools/route-coverage.mjs`.
    //
    // 0 purchase, 1 sale, 2 return, 3 difference ([[data-model]]). The entry screens offer 0 and 1;
    // return and difference have no guest screen yet ([[guest-frontend-feature-parity-gaps]]), so they
    // are accepted but not reachable from the UI.
    const type = Number(body.type);
    if (!Number.isInteger(type) || type < 0 || type > 3) {
      return { error: "invalid invoice type", type: body.type ?? null, allowed: [0, 1, 2, 3] };
    }
    const created = await A.routeKit.write(() =>
      A.invoicing.createInvoice(db, { type, key: body.key, userHex, device: body.device })
    );
    return created;
  }

  const invoiceMatch = /^\/invoice\/([^/]+)$/.exec(path);
  if (invoiceMatch && method === "GET") {
    const hex = A.routeKit.b64ToHex(invoiceMatch[1]);
    const head = rowsToObjects(
      ["id", "type", "invoiceNo", "party", "booker", "dated", "discount_1", "discount_2", "discount_rs", "description", "completed"],
      await db.all('SELECT "id","type","invoiceNo","party","booker","dated","discount_1","discount_2","discount_rs","description","completed" FROM "invoices" WHERE "id" = unhex(?)', [hex])
    );
    if (!head.length) return text("No such invoice", 404);
    return {
      invoice: head[0],
      lines: rowsToObjects(
        ["id", "item", "qty", "price", "cost_price", "discount_1", "discount_2", "discount_rs", "scheme"],
        await db.all('SELECT "id","item","qty","price","cost_price","discount_1","discount_2","discount_rs","scheme" FROM "transactions" WHERE "invoice" = unhex(?) ORDER BY "id" DESC', [hex])
      ),
    };
  }
  if (invoiceMatch && method === "PATCH") {
    const body = jsonBody(req);
    const hex = A.routeKit.b64ToHex(invoiceMatch[1]);
    if (!(await A.invoicing.takeLock(db, hex, userHex, String(body.device || "")))) return locked();
    const updated = await A.routeKit.write(() => A.invoicing.patchHeader(db, hex, body));
    return { updated };
  }

  const lineMatch = /^\/invoice\/([^/]+)\/line$/.exec(path);
  if (lineMatch && method === "POST") {
    const body = jsonBody(req);
    const hex = A.routeKit.b64ToHex(lineMatch[1]);
    if (!(await A.invoicing.takeLock(db, hex, userHex, String(body.device || "")))) return locked();
    const line = await A.routeKit.write(() => A.invoicing.addLine(db, hex, body, body.opKey));
    return { line };
  }
  const lineIdMatch = /^\/invoice\/([^/]+)\/line\/([^/]+)$/.exec(path);
  if (lineIdMatch && method === "DELETE") {
    const hex = A.routeKit.b64ToHex(lineIdMatch[1]);
    if (!(await A.invoicing.takeLock(db, hex, userHex, ""))) return locked();
    const deleted = await A.routeKit.write(() => A.invoicing.deleteLine(db, A.routeKit.b64ToHex(lineIdMatch[2])));
    return { deleted };
  }
  const completeMatch = /^\/invoice\/([^/]+)\/complete$/.exec(path);
  if (completeMatch && method === "POST") {
    const hex = A.routeKit.b64ToHex(completeMatch[1]);
    if (!(await A.invoicing.takeLock(db, hex, userHex, ""))) return locked();
    const completed = await A.routeKit.write(() => A.invoicing.completeInvoice(db, hex, userHex, true));
    return { completed };
  }
  const releaseMatch = /^\/invoice\/([^/]+)\/release$/.exec(path);
  if (releaseMatch && method === "POST") {
    return { released: await A.invoicing.releaseLock(db, A.routeKit.b64ToHex(releaseMatch[1]), userHex) };
  }

  // ---------------------------------------------------------------- invoices / payments / stock
  //
  // The three working surfaces (tb-0028). Every write goes through the same module the JSON API
  // uses, so a screen and an API client cannot drift, and each one invalidates the report
  // snapshot so a report opened straight afterwards sees it. Money is rounded at 2 dp inside
  // those modules ([[money-is-2dp-everywhere]]).

  const typeOptions = (map) => Object.keys(map).map((code) => ({ code: Number(code), label: map[code] }));
  const paymentTypes = typeOptions(A.payments.PAYMENT_TYPES);
  const round2to = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
  const pick = (value, fallback) => (value === undefined || value === null || value === "" ? fallback : value);
  const flag = (value) => (value === "1" || value === "on" || value === "true" ? "on" : "");

  // ------------------------------------------------------------------ print queue
  //
  // Printing is a browser dialog over a server-rendered page; there is no printer driver. What the
  // queue adds is the part that is genuinely server-side: a run of slips that must exist as
  // documents before they can be printed, and a record of what was run. A single reprint is the
  // same job with one id.
  // ---------------------------------------------------------------- cash memo
  //
  // The legacy app had five screens here. The data for all of them is `payments` (a voucher or a
  // DA entry is a payment with or without an invoice behind it) plus `expenses`, so this is one
  // index over four working screens rather than five near-duplicates. Payments that settle an
  // invoice live on that invoice and are not repeated here.

  if (path === "/cashmemo" && method === "GET") {
    const range = { from: pick(query.from, ""), to: pick(query.to, "") };
    // Every settled payment counts, not only the standalone ones: money received against an invoice
    // is cash the shop has. The DA and voucher screens below are the *standalone* views, which is
    // where the `standalone` filter belongs. (With it here, this depot reads 0.00 / 0.00, because
    // all 26,526 of its payments are invoice-linked — cash in hand would be wrong by 48 million.)
    const recieved = await A.payments.sumPayments(db, { ...range, type: "1" });
    const sent = await A.payments.sumPayments(db, { ...range, type: "0" });
    const expenses = await A.expenses.sumExpenses(db, range);
    const inHand = round2to(recieved.recieved - sent.sent - expenses.total);
    return html(
      await A.http.page(req, shell(user, "cashmemo", "Cash memo"), "cashmemo/index.html", {
        filters: range,
        query,
        totals: {
          recievedText: recieved.recievedText,
          sentText: sent.sentText,
          expenseText: expenses.totalText,
          netText: A.format.money(inHand),
        },
      })
    );
  }

  if (path === "/cashmemo/vouchers" && method === "GET") {
    const type = pick(query.type, "0") === "1" ? "1" : pick(query.type, "0") === "2" ? "2" : "0";
    const filters = { type, from: pick(query.from, ""), to: pick(query.to, ""), standalone: "on" };
    const [rows, totals] = await Promise.all([
      A.payments.listPayments(db, filters),
      A.payments.sumPayments(db, filters),
    ]);
    return html(
      await A.http.page(req, shell(user, "cashmemo", "Vouchers"), "cashmemo/vouchers.html", {
        rows,
        filters,
        query,
        selectedType: Number(type),
        typeLabel: type === "1" ? "Receive" : type === "2" ? "Return" : "Payment",
        totals: { totalText: totals.netText },
      })
    );
  }

  if (path === "/cashmemo/da" && method === "GET") {
    const filters = { from: pick(query.from, ""), to: pick(query.to, ""), standalone: "on" };
    const [rows, totals] = await Promise.all([
      A.payments.listPayments(db, filters),
      A.payments.sumPayments(db, filters),
    ]);
    return html(
      await A.http.page(req, shell(user, "cashmemo", "DA entry"), "cashmemo/da.html", {
        rows,
        filters,
        query,
        totals: { recievedText: totals.recievedText, sentText: totals.sentText },
      })
    );
  }

  if (path === "/cashmemo/expenses" && method === "GET") {
    const filters = { from: pick(query.from, ""), to: pick(query.to, ""), q: pick(query.q, "") };
    const [rows, totals] = await Promise.all([
      A.expenses.listExpenses(db, filters),
      A.expenses.sumExpenses(db, filters),
    ]);
    const editId = String(query.edit || "");
    return html(
      await A.http.page(req, shell(user, "cashmemo", "Expenses"), "cashmemo/expenses.html", {
        rows,
        filters,
        query,
        totals,
        editRow: editId ? rows.find((r: any) => String(r.id) === editId) ?? null : null,
        today: A.format.dateOnly(new Date().toISOString()),
      })
    );
  }

  if (path === "/cashmemo/expenses/save" && method === "POST") {
    try {
      await A.routeKit.write(() =>
        String(form.id || "") ? A.expenses.updateExpense(db, String(form.id), form) : A.expenses.createExpense(db, form)
      );
      return redirect("/cashmemo/expenses?status=ok");
    } catch (e: any) {
      return text("Expense not saved: " + (e && e.message ? e.message : String(e)), 400);
    }
  }

  const expenseDelete = /^\/cashmemo\/expenses\/([^\/]+)\/delete$/.exec(path);
  if (expenseDelete && method === "POST") {
    await A.routeKit.write(() => A.expenses.deleteExpense(db, String(expenseDelete[1])));
    return redirect("/cashmemo/expenses?status=ok");
  }

  // One voucher on paper. A voucher is a payment, so this reads `payments` rather than a
  // materialised document: there is no invoice behind it by definition.
  const voucherPrint = /^\/cashmemo\/vouchers\/([^\/]+)$/.exec(path);
  if (voucherPrint && method === "GET") {
    const print = String(query.print ?? "") === "1";
    const found = await A.payments.readPayment(db, String(voucherPrint[1]));
    if (!found) return text("No such voucher", 404);
    return html(
      await A.http.page(req, { ...shell(user, "cashmemo", "Voucher"), paper: print ? String(query.paper ?? "a5") : "" }, "cashmemo/voucher.html", {
        voucher: found,
        print,
        selectedType: found.type,
        // A sending voucher pays out, a recieving one pays in. The words matter on paper: an
        // operator reading "recieving 5,000" on a payment slip is being misinformed.
        directionText: found.type === 1 ? "Recieved" : found.type === 0 ? "Paid out" : "Returned",
      })
    );
  }

  // What renderer answered the last page, and the render A/B. `?arm=component` is the measurement
  // the envelope decision names as the deliverable: the +71% on record is for ACQUISITION with
  // rows crossing the hop as a value, and this is a render with a context that does not have to.
  if (path === "/bench/render" && method === "GET") {
    const refs = await A.routeKit.refs();
    const rows = (refs.parties ?? []).slice(0, 200).map((p: any, i: number) => ({
      id: p.id,
      name: p.name,
      company: (refs.companies ?? [])[i % Math.max(1, (refs.companies ?? []).length)]?.name ?? "",
      amount: i * 13.37,
    }));
    const result = await A.renderClient.benchRender(req, "bench/payload.html", { rows }, Number(query.rounds ?? 5));
    return { ...(result || {}), renderer: await A.renderClient.rendererStatus(req) };
  }

  if (path === "/print" && method === "GET") {
    const recent = await db.all(
      'SELECT hex("id") hx, "name", "input", "state", "created" FROM "job" ' +
        'WHERE "name" = ? ORDER BY "created" DESC LIMIT 20',
      ["print.run"]
    );
    return html(
      await A.http.page(req, shell(user, "print", "Print queue"), "print/index.html", {
        recent: recent.map((r) => {
          // `input` is the job's JSON payload; the count is what the table wants, so it is parsed
          // here rather than in the template. The id is read as hex and shown in the base64 form
          // every other link in the app uses.
          let count = 0;
          try {
            count = (JSON.parse(String(r[2] ?? "{}")).invoices ?? []).length;
          } catch {
            count = 0;
          }
          return { id: A.routeKit.hexToB64(String(r[0] ?? "")), state: r[3], created: String(r[4] ?? "").slice(0, 19), count };
        }),
        query,
        today: A.format.dateOnly(new Date().toISOString()),
      })
    );
  }

  if (path === "/print" && method === "POST") {
    // A batch: every open invoice in the date range, or the one named. Ids are carried as hex,
    // because a BLOB column is matched with unhex(?) rather than against a base64 text parameter.
    const ids: string[] = [];
    if (form.invoice) {
      ids.push(A.routeKit.b64ToHex(String(form.invoice)));
    } else {
      const rows = await db.all(
        'SELECT hex("id") hx FROM invoices WHERE "status" = \'open\' AND "deleted" = 0 ' +
          'AND date("dated") >= date(?) AND date("dated") <= date(?) ORDER BY "dated" DESC LIMIT 200',
        [String(form.from || "1970-01-01"), String(form.to || "2999-12-31")]
      );
      for (const r of rows) ids.push(String(r[0]));
    }
    if (!ids.length) return text("No invoices in that range to print", 400);
    // enqueue answers with the job's hex id, which the job links want in base64.
    const jobHex = await A.jobs.enqueue(db, "print.run", { invoices: ids, reason: String(form.reason || "batch") });
    return redirect("/print?status=queued&job=" + A.routeKit.hexToB64(String(jobHex)));
  }

  // GET /invoices (the list) moved to `ahscripts/routes/invoices/route.ts` (tb-0030 step 5).
  // `/invoices/new` and `/invoices/<id>/…` still fall through to this dispatcher.

  if (path === "/invoices/new") {
    const type = pick(query.type, "1") === "0" ? 0 : 1;
    const refs = await A.routeKit.refs();
    if (method === "GET") {
      return html(
        await A.http.page(req, shell(user, "invoices", "New invoice"), "invoices/entry.html", {
          isNew: true,
          type,
          typeLabel: A.invoices.typeLabel(type),
          parties: refs.parties ?? [],
          bookers: refs.bookers ?? [],
          items: A.routeKit.editorItems(refs),
          // The quick-create panels' option lists: the party's area and the item's company. The party's
          // TYPE is the invoice's own type, and the item's numbers are typed, so neither needs a list.
          areas: refs.areas ?? [],
          companies: refs.companies ?? [],
        })
      );
    }
    // A key from the form makes a repeated submit return the same invoice instead of a second one.
    const created = await A.routeKit.write(async () => {
      // The party first: if it cannot be made, no invoice is created. A purchase's new party is a
      // supplier and carries a company of its own name; see `lib/quick-create.js`.
      const newParty = await A.quickCreate.partyFromForm(db, form);
      const invoice = await A.invoicing.createInvoice(db, {
        type,
        key: String(form.key || ""),
        userHex,
        device: String(form.device || ""),
      });
      const createdHex = A.routeKit.b64ToHex(String(invoice.id));
      await A.invoicing.patchHeader(db, createdHex, {
        party: newParty ? A.routeKit.hexToB64(newParty) : String(form.party || ""),
        dated: A.format.dateOnly(new Date().toISOString()),
      });
      return invoice;
    });
    return redirect("/invoices/" + created.id);
  }

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
  const invoiceHeader = /^\/invoices\/([^\/]+)\/header$/.exec(path);
  if (invoiceHeader && method === "POST") {
    const hex = A.routeKit.b64ToHex(String(invoiceHeader[1]));
    if (!(await A.invoicing.takeLock(db, hex, userHex, ""))) return locked();
    await A.routeKit.write(async () => {
      // A party typed into the panel is created here, and the header is then saved with it — the same
      // submit, so the date and booker that were being edited are not lost to a detour.
      const newParty = await A.quickCreate.partyFromForm(db, form);
      await A.invoicing.patchHeader(db, hex, {
        party: newParty ? A.routeKit.hexToB64(newParty) : String(form.party || ""),
        booker: String(form.booker || ""),
        dated: String(form.dated || ""),
        description: String(form.description || ""),
        discount_1: String(form.discount_1 || ""),
        discount_rs: String(form.discount_rs || ""),
      });
    });
    return redirect("/invoices/" + invoiceHeader[1] + "?status=ok");
  }

  const invoiceComplete = /^\/invoices\/([^\/]+)\/complete$/.exec(path);
  if (invoiceComplete && method === "POST") {
    const hex = A.routeKit.b64ToHex(String(invoiceComplete[1]));
    if (!(await A.invoicing.takeLock(db, hex, userHex, ""))) return locked();
    await A.routeKit.write(async () => {
      await A.invoicing.completeInvoice(db, hex, userHex, form.complete === "1");
    });
    return redirect("/invoices/" + invoiceComplete[1] + "?status=ok");
  }

  const invoiceLine = /^\/invoices\/([^\/]+)\/line$/.exec(path);
  if (invoiceLine && method === "POST") {
    const hex = A.routeKit.b64ToHex(String(invoiceLine[1]));
    if (!(await A.invoicing.takeLock(db, hex, userHex, ""))) return locked();
    await A.routeKit.write(async () => {
      // An item typed into the panel is created here and used for this very line, so "create the item"
      // and "add the line" are one submit. The legacy did it in two steps and left the operator to find
      // the item again in the list.
      const createdItem = await A.quickCreate.itemFromForm(db, form);
      const itemId = createdItem ? A.routeKit.hexToB64(createdItem) : String(form.item || "");
      if (!itemId) throw new Error("A line needs an item");
      // An empty price or cost falls back to the item's own, so the mobile form can be short.
      const item = await db.all(
        'SELECT "cost_price", "sale_price" FROM items WHERE "id" = unhex(?)',
        [A.routeKit.b64ToHex(itemId)]
      );
      const cost = item && item.length ? Number(item[0][0]) || 0 : 0;
      const price = item && item.length ? Number(item[0][1]) || 0 : 0;
      // ⚠️ The form ships `price` with a default of "0", so "empty" is not the only way the operator can
      // decline to name one. For an item made in this same submit the 0 is the form's own default, not a
      // price, and taking it literally would add every newly created item to its invoice at zero — the
      // one thing a create-and-add must not do. So the create path yields to the new item's own price
      // when the field is absent OR still at its default; a number the operator actually typed wins, as
      // it does everywhere else. The existing-item path is left exactly as it was, because that is money
      // behaviour nobody asked to change.
      const submittedPrice = form.price === undefined ? "" : String(form.price);
      const priceIsUnset = submittedPrice === "" || Number(submittedPrice) === 0;
      const linePrice = createdItem
        ? (priceIsUnset ? String(price) : submittedPrice)
        : (submittedPrice === "" ? String(price) : submittedPrice);
      await A.invoicing.addLine(
        db,
        hex,
        {
          item: itemId,
          qty: String(form.qty || "0"),
          price: linePrice,
          cost_price: form.cost_price === undefined || form.cost_price === "" ? String(cost) : String(form.cost_price),
          discount_1: String(form.discount_1 || "0"),
          discount_2: String(form.discount_2 || "0"),
          discount_rs: String(form.discount_rs || "0"),
          scheme: String(form.scheme || "0"),
        },
        String(form.opKey || "")
      );
    });
    return redirect("/invoices/" + invoiceLine[1] + "?status=ok");
  }

  const invoiceLineDelete = /^\/invoices\/([^\/]+)\/line\/([^\/]+)\/delete$/.exec(path);
  if (invoiceLineDelete && method === "POST") {
    const hex = A.routeKit.b64ToHex(String(invoiceLineDelete[1]));
    if (!(await A.invoicing.takeLock(db, hex, userHex, ""))) return locked();
    await A.routeKit.write(async () => {
      await A.invoicing.deleteLine(db, A.routeKit.b64ToHex(String(invoiceLineDelete[2])));
    });
    return redirect("/invoices/" + invoiceLineDelete[1] + "?status=ok");
  }

  const invoicePage = /^\/invoices\/([^\/]+)$/.exec(path);
  if (invoicePage && method === "GET") {
    const refs = await A.routeKit.refs();
    const invoice = await A.invoices.readInvoice(db, decode(invoicePage[1]));
    if (!invoice) return text("No such invoice", 404);
    return html(
      await A.http.page(req, shell(user, "invoices", "Invoice #" + invoice.invoiceNo), "invoices/entry.html", {
        invoice,
        type: invoice.type,
        // A sale is paid in, a purchase is paid out.
        paymentTypeHint: invoice.type === 0 ? 0 : 1,
        // Fresh per render, so a repeated submit of the same page is one line and a line added
        // from the reloaded page is a new one.
        opKey: "line-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e9).toString(36),
        parties: refs.parties ?? [],
        bookers: refs.bookers ?? [],
        items: A.routeKit.editorItems(refs),
        // The quick-create panels' option lists; see `/invoices/new` above.
        areas: refs.areas ?? [],
        companies: refs.companies ?? [],
        message: query.status === "ok" ? "Saved" : "",
      })
    );
  }

  // The grid is the entry screen (tb-0029). `/invoices/{id}` above is the older form-and-list view
  // and is kept until the grid has been exercised end to end.
  const invoiceGrid = /^\/invoices\/([^\/]+)\/grid$/.exec(path);
  if (invoiceGrid && method === "GET") {
    const refs = await A.routeKit.refs();
    const hex = A.routeKit.b64ToHex(String(decode(invoiceGrid[1])));
    if (!hex) return text("No such invoice", 404);
    const state = await A.lifecycle.readState(db, hex);
    if (!state) return text("No such invoice", 404);
    // Reading is unconditional; writing needs the lease. The grid shows who holds it rather than
    // presenting a dead form ([[single-writer-per-invoice]]).
    const canWrite = state.lease === null || (state.lease.user ?? "").toUpperCase() === userHex;
    const invoice = await A.invoices.readInvoice(db, decode(invoiceGrid[1]));
    if (!invoice) return text("No such invoice", 404);
    return html(
      await A.http.page(req, shell(user, "invoices", "Invoice #" + invoice.invoiceNo), "invoices/grid.html", {
        invoice: {
          ...invoice,
          canWrite,
          // Every saved invoice is editable, so the committed lines are inputs whenever the writer
          // holds the lease (vault/decisions/no-draft-invoices-published-on-save.md).
          lineInputs: canWrite,
          editable: canWrite,
          // Somebody else holding the lease is named, so a read-only grid says why.
          heldBy:
            state.lease && String(state.lease.user ?? "").toUpperCase() !== userHex
              ? state.lease.device || "another device"
              : "",
          paymentTypeHint: invoice.type === 0 ? 0 : 1,
        },
        parties: refs.parties ?? [],
        bookers: refs.bookers ?? [],
        items: A.routeKit.editorItems(refs),
      })
    );
  }

  // The grid's save. A `remove:` op is a single action; a `save` posts the whole sheet, which the
  // form sends as parallel arrays, so the route zips them back into lines.
  const invoiceLines = /^\/invoices\/([^\/]+)\/lines$/.exec(path);
  if (invoiceLines && method === "POST") {
    const hex = A.routeKit.b64ToHex(String(invoiceLines[1]));
    let step = "lease";
    try {
      await A.lifecycle.requireLease(db, hex, userHex, String(form.device || ""));
      await A.routeKit.write(async () => {
        step = "op";
        const op = String(form.op || "save");
        if (op.startsWith("remove:")) {
          const lineId = A.routeKit.b64ToHex(op.slice(7));
          await A.lifecycle.removeLine(db, hex, lineId, "rm-" + op.slice(7) + "-" + Date.now().toString(36));
        } else {
        const items = [].concat(form.item ?? []);
          const qty = [].concat(form.qty ?? []);
          const price = [].concat(form.price ?? []);
          const d1 = [].concat(form.discount_1 ?? []);
          const d2 = [].concat(form.discount_2 ?? []);
          const drs = [].concat(form.discount_rs ?? []);
          const scheme = [].concat(form.scheme ?? []);
          const ids = [].concat(form.line ?? []);
          for (let i = 0; i < items.length; i++) {
            if (!items[i]) continue;
            step = `line ${i}`;
            const line = {
              item: items[i],
              qty: qty[i] ?? "0",
              price: price[i] ?? "0",
              cost_price: "0",
              discount_1: d1[i] ?? "0",
              discount_2: d2[i] ?? "0",
              discount_rs: drs[i] ?? "0",
              scheme: scheme[i] ?? "0",
            };
            // A row that carries its own id is an EDIT of that line; a row with an empty id is an APPEND,
            // which is how a return is entered. Both are valid on a saved invoice
            // (vault/decisions/no-draft-invoices-published-on-save.md). The guard lives in
            // editLine, not here — deciding by invoice state instead turned an edit into a
            // silent extra line.
            const existing = ids[i] ? A.routeKit.b64ToHex(String(ids[i])) : null;
            if (existing) {
              await A.lifecycle.editLine(db, hex, existing, line);
            } else {
              await A.lifecycle.appendLine(
                db,
                hex,
                line,
                "line-" + invoiceLines[1] + "-" + i + "-" + Date.now().toString(36)
              );
            }
          }
        }
      });
      return redirect("/invoices/" + invoiceLines[1] + "/grid?status=ok");
    } catch (e: any) {
      const why = e && e.message ? e.message : typeof e === "string" ? e : Object.prototype.toString.call(e);
      return text(`Cannot save the line [${step}]: ${why}`, e?.status ?? 409);
    }
  }

  // The standalone document, rendered from the materialised inv_doc JSON rather than re-read from
  // the base tables, so the screen and the printout are the same artefact.
  //
  // The document is SELF-CONTAINED: each line already carries `item_name` and its own `d1`/`d2`/
  // `drs` and a precomputed `total`. Nothing here is resolved against `items` or `parties` again —
  // that is the whole point of materialising it, and re-deriving it is how the first version of
  // this route rendered empty item names.
  //
  // `?print=1` is the print mode: the same document, with the navigation dropped and A5 selected, so
  // the printed sheet and the on-screen document cannot diverge. A5, because a till slip is a
  // receipt; a report is A4 and is a different route.
  const invoiceDocument = /^\/invoices\/([^\/]+)\/view$/.exec(path);
  if (invoiceDocument && method === "GET") {
    const print = String(query.print ?? "") === "1";
    // A5 unless the caller names another sheet, so a till slip and a filed A4 copy are both one
    // link away and neither needs its own renderer.
    const paper = String(query.paper ?? "") || "a5";
    const doc = await A.invoiceDoc.read(String(decode(invoiceDocument[1])));
    if (!doc) return text("No materialised document for this invoice yet", 404);
    const refs = await A.routeKit.refs();
    const id = String(decode(invoiceDocument[1]));
    // The document stores ids as hex; the app's convention is base64. `boxByHex` is the one thing
    // the document does not carry, so it is resolved once from the refs snapshot.
    const boxByHex: Record<string, number> = {};
    for (const it of refs.items ?? []) {
      boxByHex[A.routeKit.b64ToHex(String(it.id))] = Number(it.box_size_qty) || 0;
    }
    const lines = (doc.lines ?? []).map((l: any, i: number) => {
      const d1 = Number(l.d1 ?? 0);
      const d2 = Number(l.d2 ?? 0);
      const drs = Number(l.drs ?? 0);
      const box = boxByHex[String(l.item)] ?? 0;
      return {
        index: i + 1,
        itemName: l.item_name ?? "",
        qtyText: String(A.format.round2(l.qty)),
        qtyAs: box ? A.qtyAsText(box, l.qty) : "",
        priceText: A.format.money(l.price),
        discountText: drs ? A.format.money(drs) : d1 || d2 ? `${d1}% / ${d2}%` : "—",
        amountText: String(l.total ?? A.format.money(l.total_raw ?? 0)),
      };
    });
    const live = await A.invoices.readInvoice(db, id);
    const totals = live ? { total: live.total, paid: live.paid, balance: live.balance } : null;
    const bal = A.lifecycle.balanceOf(doc.final_total ?? 0, doc.paid_total ?? 0);
    // Party and booker are the only names the document does not carry, so they are resolved from
    // the refs snapshot using the hex ids the document stores.
    const byHex = (list: any[], hex: any) => (hex ? (list.find((r: any) => String(r.id) === A.routeKit.hexToB64(String(hex)))?.name ?? "") : "");
    return html(
      await A.http.page(req, { ...shell(user, "invoices", "Invoice " + (doc.readable_id ?? "")), paper: print ? paper : "" }, "invoices/document.html", {
        doc,
        invoice: { id },
        print,
        // The business identity comes from the layout's flat fields (businessName / businessAddress
        // / businessPhone), which every page already carries, so a document template cannot fail
        // on a `business` object that was never passed.
        typeLabel: live ? live.typeLabel : "Invoice",
        dated: (doc.dated ?? "").slice(0, 10),
        partyName: byHex(refs.parties ?? [], doc.party),
        bookerName: byHex(refs.bookers ?? [], doc.booker),
        lines,
        lineSumText: A.format.money(doc.total ?? 0),
        totalText: A.format.money(doc.final_total ?? 0),
        paidText: A.format.money(doc.paid_total ?? 0),
        remainingText: A.format.money(bal.remaining),
        creditDue: bal.creditDue,
        payments: (doc.payments ?? [])
          .filter((p: any) => Number(p.paid) === 1)
          .map((p: any) => ({
            date: String(p.payment_date ?? "").slice(0, 10),
            amountText: A.format.money(p.amount),
            description: p.description ?? "",
          })),
        // A document older than the invoice is worth saying out loud: the printout would otherwise
        // quietly disagree with the ledger.
        stale: totals ? Math.abs(totals.total - (doc.final_total ?? 0)) > 0.005 : false,
      })
    );
  }

  // GET /payments (the list) moved to `ahscripts/routes/payments/route.ts` (tb-0030 step 5).
  // `/payments/new`, the POST and `/payments/<id>/delete` still fall through to this dispatcher.

  if (path === "/payments/new" && method === "GET") {
    const refs = await A.routeKit.refs();
    const invoice = query.invoice ? await A.invoices.readInvoice(db, String(query.invoice)) : null;
    const open = await A.invoices.listInvoices(db, { unpaid: "on" });
    return html(
      await A.http.page(req, shell(user, "payments", "New payment"), "payments/new.html", {
        invoice,
        openInvoices: open.slice(0, 100),
        types: paymentTypes,
        selectedType: Number(pick(query.type, invoice && invoice.type === 0 ? "0" : "1")),
        selectedParty: String(pick(query.party, invoice ? invoice.party || "" : "")),
        selectedPaidTo: "",
        amount: String(pick(query.amount, invoice ? invoice.balanceText : "")),
        today: A.format.dateOnly(new Date().toISOString()),
        parties: refs.parties ?? [],
        bookers: refs.bookers ?? [],
        error: "",
      })
    );
  }

  if (path === "/payments" && method === "POST") {
    try {
      await A.routeKit.write(() => A.payments.createPayment(db, {
        type: String(form.type || "1"),
        amount: String(form.amount || "0"),
        date: String(form.date || ""),
        party: String(form.party || ""),
        paidTo: String(form.paidTo || ""),
        invoice: String(form.invoice || ""),
        description: String(form.description || ""),
        paid: "on",
      }));
      return redirect("/payments?status=ok");
    } catch (e: any) {
      return text("Payment not saved: " + (e && e.message ? e.message : String(e)), 400);
    }
  }

  const paymentDelete = /^\/payments\/([^\/]+)\/delete$/.exec(path);
  if (paymentDelete && method === "POST") {
    await A.routeKit.write(() => A.payments.deletePayment(db, String(paymentDelete[1])));
    return redirect("/payments?status=ok");
  }

  // GET /inventory moved to `ahscripts/routes/inventory/route.ts` (tb-0030 step 5). `/inventory/save`
  // still falls through to this dispatcher.

  if (path === "/inventory/save" && method === "POST") {
    // Reject a body that omits a required field BEFORE the write. Without this an empty POST inserted
    // an item with `name = ''` and redirected `303 ?status=ok` — the table's
    // `name TEXT NOT NULL DEFAULT ''` was satisfied, and the junk item then showed up in the
    // inventory, the stock report and the difference report. `createRow` now also enforces this, so
    // the check here is what turns the refusal into a 400 rather than an unhandled 500.
    const missing = A.management.missingRequired(A.entities.ENTITIES.items, form);
    if (missing.length) return { error: "missing required fields", fields: missing };
    await A.routeKit.write(() =>
        String(form.id || "")
          ? A.inventory.updateItem(db, "items", String(form.id), form)
          : A.management.createRow(db, A.entities.ENTITIES.items, form)
      );
    return redirect("/inventory?status=ok");
  }

  if (path === "/p") {
    const pages = await A.pages.listPages(PAGES_DIR);
    return html(await A.http.page(req, shell(user, "pages", "Pages"), "pages/index.html", { pages }));
  }

  const dataMatch = /^\/p\/(.+)\/data$/.exec(path);
  if (dataMatch && method === "GET") {
    const slug = dataMatch[1];
    const def = await A.pages.readPage(PAGES_DIR, slug);
    if (!def) return text("No such page", 404);
    const filters = await filtersFor(A, def, query);
    // The ETag keys on the DATA fingerprint, not on a snapshot version counter. The rows come from
    // `spooled.jsonPayload`, which reads base tables through the prelude — nothing here used the view
    // snapshot except for its version, so hydrating the declared views was pure cost. And the fingerprint
    // is the honest key: it changes when the data changes, where the counter only ticked when the
    // refresh job ran.
    const version = await A.service.dataVersion();
    const etag = `W/"v3-${version}-${encodeURIComponent(JSON.stringify(filters))}"`;
    const headers: Record<string, string> = {
      etag,
      "cache-control": "private, no-cache",
      vary: "accept-encoding",
    };
    const ifNoneMatch = String((req.headers && req.headers["if-none-match"]) || "");
    if (ifNoneMatch === etag) {
      return { status: 304, body: "", contentType: "application/json; charset=utf-8", headers };
    }
    const reportName = (def.compute && def.compute.report) || null;
    // The rows are spliced into this payload and the whole body is serialised in Rust.
    const payload: any = { version, slug: def.slug, filters, meta: { report: reportName } };
    if (def.needs.tables.length) {
      await A.service.ensureTables(def.needs.tables);
      const tables: any = {};
      for (const table of def.needs.tables) tables[table] = A.service.baseTable(table);
      payload.tables = tables;
    }

    // No row cap here: an API consumer asked for the rows, so it gets every row.
    const totals = reportName ? await A.spooled.totalsFor(reportName, filters) : {};
    const body = await A.spooled.jsonPayload(reportName, filters, payload, totals, {});
    return { body, contentType: "application/json; charset=utf-8", headers };
  }

  const pageMatch = /^\/p\/(.+)$/.exec(path);
  if (pageMatch && method === "GET") {
    const slug = pageMatch[1];
    const def = await A.pages.readPage(PAGES_DIR, slug);
    if (!def) return text("No such page", 404);

    // A page that names a report is the SAME page as `/reports/<key>` - one manifest, one template,
    // one rendering path. It used to be different: the shell shipped the manifest as JSON and
    // `public/js/runtime/page.js` rebuilt the table in the DOM from `/p/<slug>/data`, which meant
    // 171 lines of client JavaScript and an 8 MB response for a report `/reports` returns in 465 KB.
    //
    // The JSON endpoint stays, uncapped, as an API for a programmatic consumer. The BROWSER does
    // not use it any more.
    if (def.compute && typeof def.compute.report === "string" && (await A.spooled.names()).includes(def.compute.report)) {
      return renderReportPage(A, db, req, user, path, query, def.compute.report, def);
    }

    // A page with no report behind it is still a page: filters and an empty table, rendered
    // server-side. It works with no JavaScript at all, which is the point of a declarative page.
    const options = A.reportPages.filterOptions(await A.refs.refs(await A.service.fingerprint()), def.fields);
    return html(
      await A.http.page(req, shell(user, "pages", def.title), `${def.slug}/${def.template}`, {
        meta: def,
        filters: await filtersFor(A, def, query),
        options,
        // The rows are the host's business; a page with no statement behind it has none.
        columns: def.columns.map((c: any, i: number) => (i === 0 ? { ...c, lead: true } : c)),
        rows: [],
        totalsGroups: A.pages.bindTotalsGroups(def.totals || [], {}),
      })
    );
  }

  return text("Not found", 404);
}

/**
 * The month that actually holds data, for the empty-window notice. `null` when the probe cannot
 * answer — an empty depot, or the probe failing — so the notice degrades to a plain statement that
 * the period is empty rather than to a broken link.
 */
async function latestPeriod(A: any, source?: string): Promise<{ from: string; to: string } | null> {
  try {
    const period = await A.dates.defaultPeriod(await A.service.fingerprint(), source);
    return period.from ? period : null;
  } catch {
    return null;
  }
}

/**
 * Resolve only declared filter fields; a manifest controls the compute input.
 *
 * Async because a page's `from`/`to` default is not always the manifest's: when a report declares
 * both date fields and the URL carries neither, the window comes from the DATA instead — the month
 * the newest entered business date falls in (`app/lib/dates.js`). `monthStart()`/`today()` are
 * `new Date()` inside the guest, so on 2026-10-02 they opened every report on a window whose only
 * rows were the dateless imported payments falling back to their insert time. An explicit `?from=`
 * or `?to=` always wins; the manifest default is the last resort, and a ledger with no entered date
 * at all still gets it.
 */
async function filtersFor(A: any, def: any, query: Record<string, any>): Promise<Record<string, any>> {
  const filters: Record<string, any> = {};
  for (const field of def.filters) {
    const raw = query[field.name];
    const value = Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "");
    filters[field.name] = field.type === "check" ? (value === "on" ? "on" : "") : value || field.value;
  }

  // The general ledger's opening balances are DECLARED by `spool.totals.openings` rather than by
  // `filters`, because they are binds that feed the totals statement, not query inputs with a default.
  //
  // ⚠️ They used to be unreachable. `filtersFor` looped `def.filters` only, and the general ledger
  // declares `from` and `to` — so `openingRecievables`, `openingPayables` and `openingCash` were never
  // placed in `filters`, which means BOTH the page's opening row AND the totals statement's `:openR` /
  // `:openP` / `:openC` binds always received "". The ledger rendered
  // `Opening Balance — Recievables: 0.00 · Payables: 0.00 · Cash: 0.00` for every input, and the
  // totals silently omitted them. Nothing in the UI shows these three, so there was no visible symptom
  // to notice; the declaration was in the manifest the whole time, read by nobody.
  //
  // They are taken from the query string only, and only when the manifest declares them. That keeps the
  // page's filter row unchanged — these are ledger inputs carried on a link, not on-screen controls.
  const openings = (def.spool && def.spool.totals && def.spool.totals.openings) || {};
  for (const spec of Object.values(openings)) {
    const key = String(spec).replace(/^:/, "");
    if (!(key in filters) && query[key] !== undefined) {
      const raw = query[key];
      filters[key] = Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "");
    }
  }
// A date filter whose manifest named a `source` takes its default from the DATA, not from
  // `monthStart()`/`today()` — those are `new Date()` inside the guest, so on 2026-10-02 every report
  // opened on 2026-10-01 → 2026-10-02 and the only rows on screen were the dateless imported payments
  // falling back to their insert time. The source is per filter, not global: this depot's newest
  // entered PAYMENT date is 2026-04-11 while an invoice is dated 2026-10-02, so one global maximum
  // is right for one report and empty for the other.
  //
  // An explicit `?from=`/`?to=` always wins, and a filter that declares no source keeps its manifest
  // default. `app/lib/dates.js` is fingerprint-cached, so this costs one indexed read per request at
  // most and none at all after the first.
  const wanted = def.filters.filter((f: any) => f.dateSource && !query[f.name]);
  if (wanted.length) {
    try {
      const fp = await A.service.fingerprint();
      for (const field of wanted) {
        const period = await A.dates.defaultPeriod(fp, field.dateSource);
        if (!period.from) continue;
        if (field.name === "from" || field.name === "to") filters[field.name] = period[field.name as "from" | "to"];
        else if (!(field.name in query)) filters[field.name] = period.to;
      }
    } catch (e: any) {
      // A probe failure must not take the report down — the manifest default is a usable window —
      // but it must be VISIBLE, because the symptom otherwise is a page quietly opening on the wrong
      // month again, which is the defect this replaced.
      console.error("[dates] default period probe failed: " + String(e && e.message ? e.message : e));
    }
  }
  // The value stays a STRING. It used to be coerced to a Number here, and that silently broke the
  // Payment Type select: the template marks an option selected with
  // `filters[field.name] == o.value`, and `o.value` is a string, so `Number(2) == "2"` is false in
  // minijinja and no option came back selected — an applied filter that looked unapplied.
  //
  // Nothing downstream needs the number. The statement casts it itself
  // (`AND (:type = '' OR pv.type = CAST(:type AS INTEGER))`), and the totals spec reads the same
  // string. Coercing here bought nothing and cost the UI its feedback.
  return filters;
}

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
