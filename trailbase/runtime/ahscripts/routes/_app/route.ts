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
// The rendered-page cache (`pageCacheGet`/`pageCachePut`) moved with the report renderer to
// `app/lib/report-render.js` (tb-0030 step 5).

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

  // The `/reports` hub and its `ledgers`, `status` and `refresh` siblings all moved to route folders
  // (tb-0030 step 5), and the report-page family with `reports/{key}/route.ts`. Nothing for
  // `/reports/*` renders in this dispatcher any more.
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

  // The /invoice-doc family moved to route folders (tb-0030 step 5): `ahscripts/routes/invoice-doc/route.ts`
  // and its `verify`, `list`, `rebuild`, `document` and `{id}` siblings.
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

  // The /cashmemo and /print families moved to route folders (tb-0030 step 5). `round2to` and `pick`
  // were the last callers of either helper in this file and are gone with them.
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
