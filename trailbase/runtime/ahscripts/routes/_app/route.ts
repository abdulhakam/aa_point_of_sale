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
const PUBLIC_DIR = "/app/public";
const PLUGINS_DIR = "/app/plugins";
const COMPUTE_DIR = "/app/compute";

// ------------------------------------------------------------------ module loading

const MODULE_CACHE: Record<string, any> = (() => {
  const g: any = globalThis as any;
  if (!g.__AA_MODS__) g.__AA_MODS__ = {};
  return g.__AA_MODS__;
})();

function normalizePath(p: string): string {
  const abs = String(p).startsWith("/");
  const parts = String(p).replace(/\\/g, "/").split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return (abs ? "/" : "") + out.join("/");
}

function dirOf(p: string): string {
  const n = normalizePath(p);
  const i = n.lastIndexOf("/");
  return i <= 0 ? "/" : n.slice(0, i);
}

function resolveSpec(from: string, spec: string): string {
  if (spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/")) {
    return normalizePath(dirOf(from) + "/" + spec);
  }
  return spec;
}

function transformEsm(src: string): { code: string; names: string[]; deps: string[] } {
  const names: string[] = [];
  const deps: string[] = [];
  let code = String(src);

  code = code.replace(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]\s*;?/g, (_m, list, spec) => {
    deps.push(spec);
    const bind = list
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean)
      .map((n: string) => {
        const m = n.split(/\s+as\s+/);
        // `{ exported as local }` -> `{ exported: local }`
        return m.length === 2 ? `${m[0]}: ${m[1]}` : n;
      })
      .join(", ");
    return `const { ${bind} } = __require(${JSON.stringify(spec)});`;
  });

  code = code.replace(/import\s*\*\s*as\s+([A-Za-z0-9_$]+)\s*from\s*['"]([^'"]+)['"]\s*;?/g, (_m, ns, spec) => {
    deps.push(spec);
    return `const ${ns} = __require(${JSON.stringify(spec)});`;
  });

  code = code.replace(/import\s+([A-Za-z0-9_$]+)\s*from\s*['"]([^'"]+)['"]\s*;?/g, (_m, name, spec) => {
    deps.push(spec);
    return `const ${name} = __require(${JSON.stringify(spec)}).default;`;
  });

  code = code.replace(/import\s*['"]([^'"]+)['"]\s*;?/g, (_m, spec) => {
    deps.push(spec);
    return `__require(${JSON.stringify(spec)});`;
  });

  code = code.replace(/\bexport\s*\{([^}]*)\}\s*(?:from\s*['"]([^'"]+)['"]\s*)?;?/g, (_m, list, spec) => {
    const lines: string[] = [];
    if (spec) deps.push(spec);
    for (const raw of list.split(",")) {
      const n = raw.trim();
      if (!n) continue;
      const m = n.split(/\s+as\s+/);
      const local = m[1] || m[0];
      names.push(local);
      lines.push(spec ? `const ${local} = __require(${JSON.stringify(spec)})[${JSON.stringify(m[0])}];` : m[1] ? `const ${local} = ${m[0]};` : ``);
    }
    return lines.filter(Boolean).join("\n");
  });

  code = code.replace(/\bexport\s+default\s+/g, "const __default = ");
  code = code.replace(/\bexport\s+(async\s+)?function\s+([A-Za-z0-9_$]+)/g, (_m, a, n) => {
    names.push(n);
    return `${a || ""}function ${n}`;
  });
  code = code.replace(/\bexport\s+(const|let|var)\s+([A-Za-z0-9_$]+)/g, (_m, k, n) => {
    names.push(n);
    return `${k} ${n}`;
  });

  return { code, names, deps };
}

async function loadModule(path: string): Promise<any> {
  const key = normalizePath(path);
  if (MODULE_CACHE[key]) return MODULE_CACHE[key];
  const src: string = await fs.readFile(key);
  const { code, names, deps } = transformEsm(src);
  for (const dep of deps) await loadModule(resolveSpec(key, dep));
  const exports: Record<string, any> = {};
  const assign = names
    .map((n) => `try { __exports[${JSON.stringify(n)}] = typeof ${n} !== "undefined" ? ${n} : undefined; } catch (e) {}`)
    .join("\n");
  const factory = new Function("__require", "__exports", code + "\n" + assign);
  factory((spec: string) => MODULE_CACHE[resolveSpec(key, spec)], exports);
  MODULE_CACHE[key] = exports;
  return exports;
}

async function app(): Promise<any> {
  const g: any = globalThis as any;
  // Optional per-deployment business identity; defaults to the legacy values in DEFAULT_BUSINESS.
  if (!g.__AA_BUSINESS__) {
    g.__AA_BUSINESS__ = DEFAULT_BUSINESS;
    try {
      const raw: string = await fs.readFile("/app/config/business.json");
      const cfg = JSON.parse(raw);
      g.__AA_BUSINESS__ = {
        name: String(cfg.name || DEFAULT_BUSINESS.name),
        address: String(cfg.address || DEFAULT_BUSINESS.address),
        phone: String(cfg.phone || DEFAULT_BUSINESS.phone),
      };
    } catch (e) {
      // Optional file: absent or unreadable keeps the defaults.
    }
  }
  if (g.__AA_APP__) return g.__AA_APP__;
  const modules = {
    format: await loadModule("/app/compute/format.js"),
    ids: await loadModule("/app/compute/ids.js"),
    views: await loadModule("/app/compute/views.js"),
    reportsCompute: await loadModule("/app/compute/reports.js"),
    entities: await loadModule("/app/lib/entities.js"),
    data: await loadModule("/app/lib/data.js"),
    pages: await loadModule("/app/lib/pages.js"),
    plugins: await loadModule("/app/lib/plugins.js"),
    management: await loadModule("/app/lib/management.js"),
    invoicing: await loadModule("/app/lib/invoicing.js"),
    service: await loadModule("/app/lib/reports.js"),
    http: await loadModule("/app/lib/http.js"),
    reportPages: await loadModule("/app/lib/report-pages.js"),
  };
  // The queue engine is a plain script so the scheduler's fresh runtime can load it too.
  if (!g.__AA_QUEUE__) {
    const source: string = await fs.readFile("/app/lib/queue.js");
    (0, eval)(source);
  }
  modules.jobs = g.__AA_QUEUE__;
  // Same reason: /ahscripts/init/invoice-doc.js reads this file in a fresh context at server start
  // and calls the same rebuild. One implementation of "rebuild", so a boot rebuild and a button
  // rebuild cannot drift apart.
  if (!g.__AA_INVDOC__) {
    const invoiceDocSource: string = await fs.readFile("/app/lib/invoice-doc.js");
    (0, eval)(invoiceDocSource);
  }
  modules.invoiceDoc = g.__AA_INVDOC__;
  g.__AA_APP__ = modules;
  return modules;
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

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
};

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
// identity + the report + its filters, so a write (which moves the fingerprint) misses and re-renders.
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
    return { body, contentType: CONTENT_TYPES[extOf(fsPath)] || "application/octet-stream" };
  } catch {
    return text("Not found", 404);
  }
}

function userOf(req: any): any {
  const u = req.user;
  if (!u || !u.id) return null;
  return { name: u.username || u.email || "User", email: u.email || "" };
}

// Business identity for the header and printed reports. The defaults are the legacy values
// (frontend/.env.local: NEXT_PUBLIC_NAME/ADDRESS/PHONE) so a direct shift matches what staff know;
// an operator can override them without a rebuild by editing the optional
// /app/config/business.json (loaded once in `app()`, see `app/config/business.json`).
const DEFAULT_BUSINESS = {
  name: "SAMPLE TRADERS",
  address: "123 Sample Street, Sample City",
  phone: "000-0000000",
};

function business(): { name: string; address: string; phone: string } {
  return (globalThis as any).__AA_BUSINESS__ || DEFAULT_BUSINESS;
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
  if (path === "/healthz") return { ok: true, workers: A.service.status() };

  // Capability probes for the component-split work. Each isolates one bridge so a failure names
  // the bridge rather than the route. Kept until the A/B is finished.
  if (path === "/bench/ping") return { ok: true };
  if (path === "/bench/t1") {
    const raw = await db.all('SELECT "amount" FROM payments ORDER BY "id" DESC LIMIT 3', []);
    return { t1: "ok", n: (raw ?? []).length, first: (raw ?? [])[0] };
  }
  if (path === "/bench/t2") {
    const raw = await fs.readFile("/app/views/bench/payload.html");
    return { t2: "ok", len: String(raw).length };
  }
  if (path === "/bench/t3") {
    const out: string = (globalThis as any).render.html("bench/payload.html", { rows: [] });
    return { t3: "ok", len: String(out).length };
  }
  if (path === "/bench/t4") {
    const origin = (String(req.url || "").match(/^https?:\/\/[^/]+/) || [""])[0];
    const res: any = await (globalThis as any).http.request({ method: "GET", url: origin + "/rpc/payload?limit=3" });
    return { t4: "ok", status: res && res.status, body: String((res && res.body) || "").slice(0, 200) };
  }

  // Whether the DB bridge accepts PRAGMAs at all. The cold-mode flush depends on this, and both
  // call sites swallow the error, so without this probe a silent no-op would look like a working
  // feature. It also reports which PRAGMAs read back, since a rejected *set* is invisible.
  if (path === "/bench/pragma") {
    const out: any = {};
    const probe = async (label: string, fn: () => Promise<any>) => {
      try { out[label] = "ok: " + JSON.stringify(await fn()); }
      catch (e) { out[label] = "ERR: " + (e && e.message ? e.message : String(e)); }
    };
    await probe("execute shrink_memory", () => db.execute("PRAGMA shrink_memory", []));
    await probe("execute cache_size=1", () => db.execute("PRAGMA cache_size = 1", []));
    await probe("query cache_size", () => db.all("PRAGMA cache_size", []));
    await probe("query page_count", () => db.all("PRAGMA page_count", []));
    return out;
  }

  // The report keys the sweep should cover, taken from the app's own registry so the bench cannot
  // drift from the reports that actually exist.
  if (path === "/bench/reportkeys" && method === "GET") {
    return { keys: Object.keys(A.reportsCompute.REPORTS).slice().sort() };
  }

  // Per-report acquisition A/B, for the all-reports sweep.
  //
  // Scope, stated precisely: this measures acquiring the **base-table rows each report needs** —
  // the step a component split would actually move. The report arithmetic (compute/reports.js)
  // stays in the guest in both arms, because it is JavaScript; a component cannot serve it without
  // porting it, which is separate work. So this is an acquisition benchmark per report, not a
  // report benchmark.
  if (path === "/bench/report" && method === "GET") {
    const key = String(query.key || "");
    const arm = String(query.arm || "inline");

    let tables: string[] = [];
    try {
      const views = A.service.viewsForReport(key);
      tables = A.views.tablesForViews(views).slice().sort();
    } catch (e) {
      return { error: "unknown report: " + key };
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

  // Worker endpoint for the optional fan-out. Internal: it executes one already-claimed step by
  // id, and re-running a step is idempotent, so it is reachable without a session (the fan-out
  // call is server-to-self and carries no cookie). It cannot create work.
  if (/^\/worker\/[^/]+\/step$/.test(path) && method === "POST") {
    const work = jsonBody(req);
    const stepId = String(work.stepId || "").toUpperCase();
    if (!/^[0-9A-F]+$/.test(stepId)) return text("bad step id", 400);
    return await A.jobs.executeStep(db, stepId);
  }
  if (path.startsWith("/static/")) {
    const rel = path.slice("/static/".length);
    if (!rel || rel.includes("..")) return text("Not found", 404);
    return readStatic(PUBLIC_DIR + "/" + rel);
  }
  if (path === "/favicon.svg") return readStatic(PUBLIC_DIR + "/favicon.svg");

  if (path === "/login" && method === "GET") {
    return html(
      A.http.page(shell(user, "", "Log in"), "auth/login.html", {
        next: query.next || "",
        expired: query.expired || "",
        error: "",
      })
    );
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
        html: A.http.page(shell(null, "", "Log in"), "auth/login.html", {
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

  // Static assets the browser runtime needs.
  if (path.startsWith("/compute/")) {
    const rel = path.slice("/compute/".length);
    if (!rel || rel.includes("..")) return text("Not found", 404);
    return readStatic(COMPUTE_DIR + "/" + rel);
  }
  if (path.startsWith("/plugins/")) {
    const rel = path.slice("/plugins/".length);
    if (!rel || rel.includes("..")) return text("Not found", 404);
    // Directory-style plugin URL -> its index.html. `path` arrives with the trailing slash
    // normalised away, so treat any extension-less rel as a directory (not as a file).
    if (rel.endsWith("/") || rel.indexOf(".") < 0) {
      const res = await readStatic(PLUGINS_DIR + "/" + rel.replace(/\/$/, "") + "/index.html");
      if (res && res.status !== 404) return res;
    }
    return readStatic(PLUGINS_DIR + "/" + rel);
  }

  if (path === "/dashboard") {
    const snap = await A.service.getViews(["counts"]);
    const c = snap.views.counts;
    const tiles = [
      { label: "Sections", value: c.sections },
      { label: "Areas", value: c.areas },
      { label: "Item Companies", value: c.categories },
      { label: "Parties", value: c.parties },
      { label: "Order Bookers", value: c.order_bookers },
      { label: "Items", value: c.items },
      { label: "Purchase Invoices", value: c.purchase_invoices },
      { label: "Sale Invoices", value: c.sale_invoices },
      { label: "Return Invoices", value: c.return_invoices },
      { label: "Recieving Payments", value: c.recieving_payments },
      { label: "Sending Payments", value: c.sending_payments },
    ];
    return html(
      A.http.page(shell(user, "dashboard", "Dashboard"), "dashboard/index.html", {
        tiles,
        shortcuts: [
          { title: "Reports", target: "reports", tone: "pink" },
          { title: "Management", target: "management", tone: "gray" },
        ],
      })
    );
  }

  if (path === "/reports") {
    return html(
      A.http.page(shell(user, "reports", "Reports"), "reports/index.html", {
        tiles: A.reportPages.REPORT_INDEX,
        ledgerTiles: A.reportPages.LEDGER_INDEX,
      })
    );
  }
  if (path === "/reports/status") return A.service.status();
  if (path === "/reports/refresh" && method === "POST") {
    const full = query.full === "1" || query.full === "on" || form.full === "1" || form.full === "on";
    if (full) A.service.invalidate();
    await A.service.refresh(db);
    const accept = String((req.headers && req.headers.accept) || "");
    if (accept.includes("application/json")) return A.service.status();
    const referer = String((req.headers && req.headers.referer) || "");
    const back = referer ? referer.replace(/^https?:\/\/[^/]+/, "") : "/dashboard";
    return redirect(back || "/dashboard");
  }
  if (path === "/reports/ledgers") {
    return html(A.http.page(shell(user, "reports", "Ledgers"), "reports/ledgers/index.html", { tiles: A.reportPages.LEDGER_INDEX }));
  }

  const reportMatch = /^\/reports\/(.+)$/.exec(path);
  if (reportMatch && method === "GET") {
    const key = reportMatch[1];
    const pageDef = A.reportPages.REPORT_PAGES[key];
    if (!pageDef || !A.reportsCompute.REPORTS[key]) return text("Not found", 404);
    const filters = A.reportPages.parseFilters(pageDef, query);

    const showAll = String(query.all || "") === "1";
    const requestedMax = Number(query.maxRows || 0);
    const maxRows = showAll ? Number.POSITIVE_INFINITY : requestedMax > 0 ? requestedMax : RENDER_MAX_ROWS;

    // Rendered-page cache lookup. The fingerprint is the live data version, so any write misses.
    let cacheKey: string | null = null;
    try {
      const fp = await A.service.fingerprint();
      cacheKey = JSON.stringify([fp, (user && (user.email || user.name)) || "anon", key, filters, showAll, requestedMax]);
      const cached = await pageCacheGet(db, cacheKey);
      if (cached !== null) return html(cached);
    } catch {
      cacheKey = null;
    }

    const inputs = A.reportsCompute.REPORTS[key].inputs.concat(["refs"]);
    const snap = await A.service.getViews(inputs);
    const options = A.reportPages.filterOptions(snap.views.refs, pageDef.fields);
    const missing = (pageDef.requires || []).filter((name: string) => !filters[name]);
    const result = missing.length ? { rows: [], totals: {}, meta: {} } : await A.service.run(key, filters);
    const allRows: any[] = result.rows || [];
    const truncated = allRows.length > maxRows;
    const rows = truncated ? allRows.slice(0, maxRows) : allRows;
    const rawQuery = String(req.query || "");
    const rowInfo = {
      shown: rows.length,
      total: allRows.length,
      truncated,
      allHref: `${path}?${rawQuery ? rawQuery + "&" : ""}all=1`,
    };
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
    const page = A.http.page(shell(user, "reports", pageDef.title), pageDef.view || A.reportPages.DEFAULT_VIEW, {
      def: pageDef,
      basePath: "/reports/" + key,
      filters,
      options,
      appliedLabels,
      missing,
      rows,
      rowInfo,
      totalsGroups: pageDef.totals ? pageDef.totals(result.totals || {}) : [],
      opening: result.opening || null,
      meta: result.meta || {},
    });
    if (cacheKey) await pageCachePut(db, cacheKey, page);
    return html(page);
  }

  if (path === "/management") {
    const entities = A.entities.ENTITY_ORDER.map((key: string) => ({ key, ...A.entities.ENTITIES[key] }));
    return html(A.http.page(shell(user, "management", "Management"), "management/index.html", { entities }));
  }
  const mgmtMatch = /^\/management\/([^/]+)$/.exec(path);
  if (mgmtMatch && method === "GET") {
    const entityKey = mgmtMatch[1];
    const entity = A.entities.ENTITIES[entityKey];
    if (!entity) return text("Unknown entity", 404);
    const snap = await A.service.getViews(["refs"]);
    const options = A.management.optionLists(snap.views.refs);
    const all = A.management.sortRows(await A.data.readTable(entity.api), entity.sort);
    const visible = all.filter((row: any) => !entity.softDelete || !row.deleted);
    const links = await A.management.loadLinks(entity);
    const editId = String(query.edit || "");
    const editRow = editId ? all.find((r: any) => r.id === editId) ?? null : null;
    return html(
      A.http.page(shell(user, "management", entity.label), "management/list.html", {
        entity,
        entityKey,
        columns: entity.columns,
        rows: A.management.displayRows(entity, visible, snap.views.refs, links),
        fields: A.management.formFields(entity, editRow, options, links),
        editRow,
        status: query.status || "",
        message: query.message || "",
      })
    );
  }

  // Writes: create / update / delete, then invalidate the snapshot so reads see the change.
  const writeMatch = /^\/management\/([^/]+)\/(create|([^/]+)\/(update|delete))$/.exec(path);
  if (writeMatch && method === "POST") {
    const entityKey = writeMatch[1];
    const entity = A.entities.ENTITIES[entityKey];
    if (!entity) return text("Unknown entity", 404);
    const action = writeMatch[2];
    const idHex = writeMatch[3] ? A.management.base64ToHex(writeMatch[3]) : null;
    if (action === "create") {
      const newHex = await A.management.createRow(db, entity, form);
      await A.management.syncLinks(db, entity, newHex, form);
    } else if (action.endsWith("update")) {
      await A.management.updateRow(db, entity, form, idHex);
      await A.management.syncLinks(db, entity, idHex, form);
    } else if (action.endsWith("delete")) {
      if (entity.softDelete) await A.management.softDeleteRow(db, entity, idHex);
      else await A.management.hardDeleteRow(db, entity, idHex);
    }
    A.service.invalidate();
    const message = action === "create" ? "Created" : action.endsWith("update") ? "Updated" : "Deleted";
    return redirect(`/management/${entityKey}?status=ok&message=${message}`);
  }


  if (path === "/plugins") {
    const plugins = await A.plugins.loadPlugins(PLUGINS_DIR);
    return html(A.http.page(shell(user, "plugins", "Plugins"), "plugins/index.html", { plugins }));
  }

  // Jobs: durable queue API.
  if (path === "/jobs" && method === "POST") {
    const body = jsonBody(req);
    const jobHex = await A.jobs.enqueue(db, String(body.name || ""), body.input || {});
    await A.jobs.reconcile(db);
    const view = await A.jobs.jobView(db, jobHex);
    return { id: view.id, state: view.state };
  }
  if (path === "/jobs/reconcile" && method === "POST") {
    const fanout = query.fanout === "1" || form.fanout === "1";
    const concurrency = Number(query.concurrency || form.concurrency || 1) || 1;
    const origin = (String(req.url || "").match(/^https?:\/\/[^/]+/) || [""])[0];
    const reconciled = await A.jobs.reconcile(db, fanout ? { origin, concurrency } : {});
    // Report materialisation runs here, off the request path: the minutely job drives this route,
    // so the heavy view snapshot is built once and persisted for every runtime thread instead of
    // being built on a report request that would hit the ~20 s call deadline.
    let materialized: any = null;
    if (query.materialize !== "0") {
      try {
        const snap = await A.service.refresh(db);
        materialized = { version: snap.version, views: snap.built.length };
      } catch (error) {
        console.log("report materialize failed: " + error);
      }
    }
    return { reconciled, materialized };
  }
  const jobResultMatch = /^\/jobs\/([^/]+)\/result$/.exec(path);
  if (jobResultMatch && method === "GET") {
    if (query.reconcile !== "0") await A.jobs.reconcile(db);
    const view = await A.jobs.jobView(db, A.management.base64ToHex(jobResultMatch[1]));
    if (!view) return text("No such job", 404);
    return { state: view.state, result: view.result, artifacts: view.artifacts };
  }
  const jobCancelMatch = /^\/jobs\/([^/]+)\/cancel$/.exec(path);
  if (jobCancelMatch && method === "POST") {
    await A.jobs.cancelJob(db, A.management.base64ToHex(jobCancelMatch[1]));
    return { ok: true };
  }
  const jobRecoverMatch = /^\/jobs\/([^/]+)\/steps\/([0-9]+)\/recover$/.exec(path);
  if (jobRecoverMatch && method === "POST") {
    await A.jobs.recoverStep(db, A.management.base64ToHex(jobRecoverMatch[1]), Number(jobRecoverMatch[2]));
    return { ok: true };
  }
  const jobMatch = /^\/jobs\/([^/]+)$/.exec(path);
  if (jobMatch && method === "GET") {
    // `?reconcile=0` inspects without running due work (used by the poller test).
    if (query.reconcile !== "0") await A.jobs.reconcile(db);
    const view = await A.jobs.jobView(db, A.management.base64ToHex(jobMatch[1]));
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
      : A.management.base64ToHex(id);
  })();
  const locked = () =>
    ({ body: JSON.stringify({ error: "locked", holder: "another device" }), contentType: "application/json; charset=utf-8", status: 409 });
  const rowsToObjects = (columns: string[], rows: any[]) =>
    (rows ?? []).map((values) => Object.fromEntries(columns.map((c, i) => [c, values[i]])));

  if (path === "/invoice/context" && method === "GET") {
    const type = String(query.type || "sale");
    const snap = await A.service.getViews(["refs", "itemsReport"]);
    const refs = snap.views.refs ?? {};
    const items = (snap.views.itemsReport ?? []).map((r: any) => ({
      id: r.id, name: r.name, category: r.category, box_size_qty: r.box_size_qty,
      cost_price: r.cost_price, sale_price: r.sale_price, stock: r.qty,
    }));
    const counts = await db.all('SELECT "type", COUNT(*) FROM "invoices" GROUP BY "type" ORDER BY "type"', []);
    const countOf = (code: number) => {
      const hit = (counts ?? []).find((r: any[]) => Number(r[0]) === code);
      return (hit ? Number(hit[1]) : 0) + 1;
    };
    const etag = `W/"inv-ctx-${snap.version}-${JSON.stringify(counts)}-${type}"`;
    const headers = { etag, "cache-control": "private, no-cache" };
    if (String((req.headers && req.headers["if-none-match"]) || "") === etag) {
      return { status: 304, body: "", contentType: "application/json; charset=utf-8", headers };
    }
    const payload = {
      version: snap.version,
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
    const created = await A.invoicing.createInvoice(db, {
      type: body.type, key: body.key, userHex, device: body.device,
    });
    A.service.invalidate(); // the report snapshot must see the new invoice
    return created;
  }

  const invoiceMatch = /^\/invoice\/([^/]+)$/.exec(path);
  if (invoiceMatch && method === "GET") {
    const hex = A.management.base64ToHex(invoiceMatch[1]);
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
    const hex = A.management.base64ToHex(invoiceMatch[1]);
    if (!(await A.invoicing.takeLock(db, hex, userHex, String(body.device || "")))) return locked();
    const updated = await A.invoicing.patchHeader(db, hex, body);
    A.service.invalidate();
    return { updated };
  }

  const lineMatch = /^\/invoice\/([^/]+)\/line$/.exec(path);
  if (lineMatch && method === "POST") {
    const body = jsonBody(req);
    const hex = A.management.base64ToHex(lineMatch[1]);
    if (!(await A.invoicing.takeLock(db, hex, userHex, String(body.device || "")))) return locked();
    const line = await A.invoicing.addLine(db, hex, body, body.opKey);
    A.service.invalidate();
    return { line };
  }
  const lineIdMatch = /^\/invoice\/([^/]+)\/line\/([^/]+)$/.exec(path);
  if (lineIdMatch && method === "DELETE") {
    const hex = A.management.base64ToHex(lineIdMatch[1]);
    if (!(await A.invoicing.takeLock(db, hex, userHex, ""))) return locked();
    const deleted = await A.invoicing.deleteLine(db, A.management.base64ToHex(lineIdMatch[2]));
    A.service.invalidate();
    return { deleted };
  }
  const completeMatch = /^\/invoice\/([^/]+)\/complete$/.exec(path);
  if (completeMatch && method === "POST") {
    const hex = A.management.base64ToHex(completeMatch[1]);
    if (!(await A.invoicing.takeLock(db, hex, userHex, ""))) return locked();
    const completed = await A.invoicing.completeInvoice(db, hex, userHex, true);
    A.service.invalidate();
    return { completed };
  }
  const releaseMatch = /^\/invoice\/([^/]+)\/release$/.exec(path);
  if (releaseMatch && method === "POST") {
    return { released: await A.invoicing.releaseLock(db, A.management.base64ToHex(releaseMatch[1]), userHex) };
  }

  if (path === "/p") {
    const pages = await A.pages.listPages(PAGES_DIR);
    return html(A.http.page(shell(user, "pages", "Pages"), "pages/index.html", { pages }));
  }

  const dataMatch = /^\/p\/(.+)\/data$/.exec(path);
  if (dataMatch && method === "GET") {
    const slug = dataMatch[1];
    const def = await A.pages.readPage(PAGES_DIR, slug);
    if (!def) return text("No such page", 404);
    const filters = filtersFor(def, query);
    const reportInputs =
      def.compute && def.compute.report && A.reportsCompute.REPORTS[def.compute.report]
        ? A.reportsCompute.REPORTS[def.compute.report].inputs
        : [];
    const snap = await A.service.getViews(reportInputs.concat(def.needs.views || []));
    await A.service.ensureTables(def.needs.tables || []);
    const etag = `W/"v3-${snap.version}-${encodeURIComponent(JSON.stringify(filters))}"`;
    const headers: Record<string, string> = {
      etag,
      "cache-control": "private, no-cache",
      vary: "accept-encoding",
    };
    const ifNoneMatch = String((req.headers && req.headers["if-none-match"]) || "");
    if (ifNoneMatch === etag) {
      return { status: 304, body: "", contentType: "application/json; charset=utf-8", headers };
    }
    const result = def.compute && def.compute.report ? await A.service.run(def.compute.report, filters) : null;
    const payload: any = { version: snap.version, slug: def.slug, filters, result, meta: { report: (def.compute && def.compute.report) || null } };
    if (def.needs.tables.length) {
      const tables: any = {};
      for (const table of def.needs.tables) tables[table] = A.service.baseTable(table);
      payload.tables = tables;
    }
    return { body: JSON.stringify(payload), contentType: "application/json; charset=utf-8", headers };
  }

  const pageMatch = /^\/p\/(.+)$/.exec(path);
  if (pageMatch && method === "GET") {
    const slug = pageMatch[1];
    const def = await A.pages.readPage(PAGES_DIR, slug);
    if (!def) return text("No such page", 404);
    const payload = { ...def, dataUrl: `/p/${def.slug}/data` };
    const metaJson = JSON.stringify(payload).replace(/</g, "\\u003c");
    return html(A.http.page(shell(user, "pages", def.title), `${def.slug}/${def.template}`, { meta: def, metaJson }));
  }

  return text("Not found", 404);
}

/** Resolve only declared filter fields; a manifest controls the compute input. */
function filtersFor(def: any, query: Record<string, any>): Record<string, any> {
  const filters: Record<string, any> = {};
  for (const field of def.filters) {
    const raw = query[field.name];
    const value = Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "");
    filters[field.name] = field.type === "check" ? (value === "on" ? "on" : "") : value || field.value;
  }
  if (filters.type !== undefined && filters.type !== "") filters.type = Number(filters.type);
  return filters;
}

// ------------------------------------------------------------------ entry points

async function handle(req: any): Promise<any> {
  try {
    return await dispatch(req);
  } catch (e: any) {
    const detail = e && e.stack ? String(e.stack) : String(e);
    console.error("[app] " + detail);
    return { text: "Guest error: " + detail, status: 500 };
  }
}

// Entry points, installed on globalThis for the host's `{method}(req)` call.
(globalThis as any).GET = handle;
(globalThis as any).POST = handle;
(globalThis as any).PATCH = handle;
(globalThis as any).DELETE = handle;
})();
