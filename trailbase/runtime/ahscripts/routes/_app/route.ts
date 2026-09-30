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
    lifecycle: await loadModule("/app/lib/invoice-lifecycle.js"),
    invoices: await loadModule("/app/lib/invoices.js"),
    expenses: await loadModule("/app/lib/expenses.js"),
    qtyAsText: (await loadModule("/app/lib/format-qty.js")).qtyAsText,
    payments: await loadModule("/app/lib/payments.js"),
    inventory: await loadModule("/app/lib/inventory.js"),
    service: await loadModule("/app/lib/reports.js"),
    http: await loadModule("/app/lib/http.js"),
    renderClient: await loadModule("/app/lib/render-client.js"),
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

// The inverse of management.base64ToHex. The materialised `inv_doc` stores relation ids as hex
// strings inside its JSON, so rendering a document needs hex -> the base64 the rest of the app uses.
//
// Base64 is 3 bytes -> 4 sextets, and the final partial group is PADDED, not filled: a 16-byte id
// is 22 characters plus "==". Filling the tail with data instead produced a 24-character id that
// silently matched nothing, which is why the document's item names rendered empty.
// Verified against the known id: 01A0EBFD3E2176D294C5C5797E90A6E5 -> AaDr_T4hdtKUxcV5fpCm5Q
const B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function hexToBase64(hex: string): string {
  const clean = String(hex ?? "").replace(/[^0-9a-fA-F]/g, "");
  let out = "";
  for (let i = 0; i < clean.length; i += 6) {
    const group = clean.slice(i, i + 6);
    const n = Math.floor(group.length / 2);
    const b = [0, 1, 2].map((k) => (k < n ? parseInt(group.slice(k * 2, k * 2 + 2), 16) : 0));
    out += B64_ALPHABET[b[0] >> 2];
    out += B64_ALPHABET[((b[0] & 3) << 4) | (b[1] >> 4)];
    out += n > 1 ? B64_ALPHABET[((b[1] & 15) << 2) | (b[2] >> 6)] : "=";
    out += n > 2 ? B64_ALPHABET[b[2] & 63] : "=";
  }
  return out.replace(/=+$/, "");
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
      await A.http.page(req, shell(user, "", "Log in"), "auth/login.html", {
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
      await A.http.page(req, shell(user, "dashboard", "Dashboard"), "dashboard/index.html", {
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
      await A.http.page(req, shell(user, "reports", "Reports"), "reports/index.html", {
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
    return html(await A.http.page(req, shell(user, "reports", "Ledgers"), "reports/ledgers/index.html", { tiles: A.reportPages.LEDGER_INDEX }));
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
    const page = await A.http.page(req, { ...shell(user, "reports", pageDef.title), paper: "a4" }, pageDef.view || A.reportPages.DEFAULT_VIEW, {
      def: pageDef,
      // Mobile layout is additive: a narrow report turns into labelled cards, a wide one keeps its
      // grid and scrolls sideways. The first column is the row's identity and reads as a heading
      // inside a card, so it is marked `lead` and drops its own label
      // ([[mobile-layout-is-additive-to-the-legacy-look]]).
      columns: pageDef.columns.map((c: any, i: number) => (i === 0 ? { ...c, lead: true } : c)),
      mobile: pageDef.columns.length <= 6 ? "cards" : "scroll",
      basePath: "/reports/" + key,
      // The print link carries the filters that are on screen, so a sheet is the report the
      // operator was looking at rather than an unfiltered default.
      rawQuery,
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
    return html(await A.http.page(req, shell(user, "management", "Management"), "management/index.html", { entities }));
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
      await A.http.page(req, shell(user, "management", entity.label), "management/list.html", {
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
    return html(await A.http.page(req, shell(user, "plugins", "Plugins"), "plugins/index.html", { plugins }));
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

  // ---------------------------------------------------------------- invoices / payments / stock
  //
  // The three working surfaces (tb-0028). Every write goes through the same module the JSON API
  // uses, so a screen and an API client cannot drift, and each one invalidates the report
  // snapshot so a report opened straight afterwards sees it. Money is rounded at 2 dp inside
  // those modules ([[money-is-2dp-everywhere]]).

  const typeOptions = (map) => Object.keys(map).map((code) => ({ code: Number(code), label: map[code] }));
  const invoiceTypes = typeOptions(A.invoices.INVOICE_TYPES);
  const paymentTypes = typeOptions(A.payments.PAYMENT_TYPES);
  const round2to = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
  const pick = (value, fallback) => (value === undefined || value === null || value === "" ? fallback : value);
  const flag = (value) => (value === "1" || value === "on" || value === "true" ? "on" : "");
  const editorItems = (refs) =>
    (refs?.items ?? []).map((it) => ({
      id: it.id,
      name: it.name ?? "",
      price: Number(it.sale_price) || 0,
      costPrice: Number(it.cost_price) || 0,
      boxSizeQty: Number(it.box_size_qty) || 0,
    }));

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
      if (String(form.id || "")) await A.expenses.updateExpense(db, String(form.id), form);
      else await A.expenses.createExpense(db, form);
      A.service.invalidate();
      return redirect("/cashmemo/expenses?status=ok");
    } catch (e: any) {
      return text("Expense not saved: " + (e && e.message ? e.message : String(e)), 400);
    }
  }

  const expenseDelete = /^\/cashmemo\/expenses\/([^\/]+)\/delete$/.exec(path);
  if (expenseDelete && method === "POST") {
    await A.expenses.deleteExpense(db, String(expenseDelete[1]));
    A.service.invalidate();
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
    const snap = await A.service.getViews(["refs"]);
    const refs = snap.views.refs ?? {};
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
          return { id: hexToBase64(String(r[0] ?? "")), state: r[3], created: String(r[4] ?? "").slice(0, 19), count };
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
      ids.push(A.management.base64ToHex(String(form.invoice)));
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
    return redirect("/print?status=queued&job=" + hexToBase64(String(jobHex)));
  }

  if (path === "/invoices" && method === "GET") {
    const snap = await A.service.getViews(["refs"]);
    const filters = {
      type: pick(query.type, ""),
      from: pick(query.from, ""),
      to: pick(query.to, ""),
      party: pick(query.party, ""),
      unpaid: flag(query.unpaid),
      drafts: flag(query.drafts),
    };
    const rows = await A.invoices.listInvoices(db, filters);
    const totals = await A.invoices.sumInvoices(db, filters);
    return html(
      await A.http.page(req, shell(user, "invoices", "Invoices"), "invoices/index.html", {
        rows,
        filters,
        types: invoiceTypes,
        selectedType: Number(filters.type || -1),
        parties: snap.views.refs?.parties ?? [],
        totals,
      })
    );
  }

  if (path === "/invoices/new") {
    const type = pick(query.type, "1") === "0" ? 0 : 1;
    const snap = await A.service.getViews(["refs"]);
    const refs = snap.views.refs ?? {};
    if (method === "GET") {
      return html(
        await A.http.page(req, shell(user, "invoices", "New invoice"), "invoices/entry.html", {
          isNew: true,
          type,
          typeLabel: A.invoices.typeLabel(type),
          parties: refs.parties ?? [],
          bookers: refs.bookers ?? [],
          items: editorItems(refs),
        })
      );
    }
    // A key from the form makes a repeated submit return the same invoice instead of a second one.
    const created = await A.invoicing.createInvoice(db, {
      type,
      key: String(form.key || ""),
      userHex,
      device: String(form.device || ""),
    });
    const hex = A.management.base64ToHex(String(created.id));
    await A.invoicing.patchHeader(db, hex, {
      party: String(form.party || ""),
      dated: A.format.dateOnly(new Date().toISOString()),
    });
    A.service.invalidate();
    return redirect("/invoices/" + created.id);
  }

  const invoiceNewRoute = /^\/invoices\/([^\/]+)\/(header|line|complete)$/.exec(path);
  const invoiceLineDelete = /^\/invoices\/([^\/]+)\/line\/([^\/]+)\/delete$/.exec(path);
  if ((invoiceNewRoute || invoiceLineDelete) && method === "POST") {
    const invoiceId = invoiceNewRoute ? invoiceNewRoute[1] : invoiceLineDelete[1];
    const hex = A.management.base64ToHex(String(invoiceId));
    if (!(await A.invoicing.takeLock(db, hex, userHex, ""))) return locked();
    if (invoiceLineDelete) {
      await A.invoicing.deleteLine(db, A.management.base64ToHex(String(invoiceLineDelete[2])));
    } else if (invoiceNewRoute[2] === "header") {
      await A.invoicing.patchHeader(db, hex, {
        party: String(form.party || ""),
        booker: String(form.booker || ""),
        dated: String(form.dated || ""),
        description: String(form.description || ""),
        discount_1: String(form.discount_1 || ""),
        discount_rs: String(form.discount_rs || ""),
      });
    } else if (invoiceNewRoute[2] === "line") {
      // An empty price or cost falls back to the item's own, so the mobile form can be short.
      const itemId = String(form.item || "");
      const item = await db.all(
        'SELECT "cost_price", "sale_price" FROM items WHERE "id" = unhex(?)',
        [A.management.base64ToHex(itemId)]
      );
      const cost = item && item.length ? Number(item[0][0]) || 0 : 0;
      const price = item && item.length ? Number(item[0][1]) || 0 : 0;
      await A.invoicing.addLine(
        db,
        hex,
        {
          item: itemId,
          qty: String(form.qty || "0"),
          price: form.price === undefined || form.price === "" ? String(price) : String(form.price),
          cost_price: form.cost_price === undefined || form.cost_price === "" ? String(cost) : String(form.cost_price),
          discount_1: String(form.discount_1 || "0"),
          discount_2: String(form.discount_2 || "0"),
          discount_rs: String(form.discount_rs || "0"),
          scheme: String(form.scheme || "0"),
        },
        String(form.opKey || "")
      );
    } else if (invoiceNewRoute[2] === "complete") {
      await A.invoicing.completeInvoice(db, hex, userHex, form.complete === "1");
    }
    A.service.invalidate();
    return redirect("/invoices/" + invoiceId + "?status=ok");
  }

  const invoicePage = /^\/invoices\/([^\/]+)$/.exec(path);
  if (invoicePage && method === "GET") {
    const snap = await A.service.getViews(["refs"]);
    const refs = snap.views.refs ?? {};
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
        items: editorItems(refs),
        message: query.status === "ok" ? "Saved" : "",
      })
    );
  }

  // The grid is the entry screen (tb-0029). `/invoices/{id}` above is the older form-and-list view
  // and is kept until the grid has been exercised end to end.
  const invoiceGrid = /^\/invoices\/([^\/]+)\/grid$/.exec(path);
  if (invoiceGrid && method === "GET") {
    const snap = await A.service.getViews(["refs"]);
    const refs = snap.views.refs ?? {};
    const hex = A.management.base64ToHex(String(decode(invoiceGrid[1])));
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
          status: state.status,
          canWrite,
          // A draft's committed lines are inputs; an open invoice's lines are permanent text.
          lineInputs: state.status === "draft" && canWrite,
          editable: state.status === "draft" && canWrite,
          // Somebody else holding the lease is named, so a read-only grid says why.
          heldBy:
            state.lease && String(state.lease.user ?? "").toUpperCase() !== userHex
              ? state.lease.device || "another device"
              : "",
          paymentTypeHint: invoice.type === 0 ? 0 : 1,
        },
        parties: refs.parties ?? [],
        bookers: refs.bookers ?? [],
        items: editorItems(refs),
      })
    );
  }

  // draft -> open. One UPDATE, and the lease is released with it.
  const invoiceCommit = /^\/invoices\/([^\/]+)\/commit$/.exec(path);
  if (invoiceCommit && method === "POST") {
    try {
      const hex = A.management.base64ToHex(String(invoiceCommit[1]));
      await A.lifecycle.requireLease(db, hex, userHex, String(form.device || ""));
      await A.lifecycle.commit(db, hex, userHex);
      A.service.invalidate();
      return redirect("/invoices/" + invoiceCommit[1] + "/grid?status=ok");
    } catch (e: any) {
      return text("Cannot open the invoice: " + (e && e.message ? e.message : String(e)), e?.status ?? 409);
    }
  }

  // The grid's save. A `remove:` op is a single action; a `save` posts the whole sheet, which the
  // form sends as parallel arrays, so the route zips them back into lines.
  const invoiceLines = /^\/invoices\/([^\/]+)\/lines$/.exec(path);
  if (invoiceLines && method === "POST") {
    const hex = A.management.base64ToHex(String(invoiceLines[1]));
    let step = "lease";
    try {
      await A.lifecycle.requireLease(db, hex, userHex, String(form.device || ""));
      step = "op";
      const op = String(form.op || "save");
      if (op.startsWith("remove:")) {
        const lineId = A.management.base64ToHex(op.slice(7));
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
          // A row that carries its own id is an EDIT and only a draft may be edited; a row with an
          // empty id is an APPEND and is how a return is entered on an open invoice. The guard
          // lives in editLine, not here — deciding by invoice state instead turned an edit into a
          // silent extra line.
          const existing = ids[i] ? A.management.base64ToHex(String(ids[i])) : null;
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
      step = "invalidate";
      A.service.invalidate();
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
    const snap = await A.service.getViews(["refs"]);
    const refs = snap.views.refs ?? {};
    const id = String(decode(invoiceDocument[1]));
    // The document stores ids as hex; the app's convention is base64. `boxByHex` is the one thing
    // the document does not carry, so it is resolved once from the refs snapshot.
    const boxByHex: Record<string, number> = {};
    for (const it of refs.items ?? []) {
      boxByHex[A.management.base64ToHex(String(it.id))] = Number(it.box_size_qty) || 0;
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
    const byHex = (list: any[], hex: any) => (hex ? (list.find((r: any) => String(r.id) === hexToBase64(String(hex)))?.name ?? "") : "");
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

  if (path === "/payments" && method === "GET") {
    const snap = await A.service.getViews(["refs"]);
    const filters = {
      type: pick(query.type, ""),
      from: pick(query.from, ""),
      to: pick(query.to, ""),
      party: pick(query.party, ""),
      standalone: flag(query.standalone),
      open: flag(query.open),
    };
    const rows = await A.payments.listPayments(db, filters);
    const totals = await A.payments.sumPayments(db, filters);
    return html(
      await A.http.page(req, shell(user, "payments", "Payments"), "payments/index.html", {
        rows,
        filters,
        types: paymentTypes,
        selectedType: Number(filters.type || -1),
        parties: snap.views.refs?.parties ?? [],
        totals,
      })
    );
  }

  if (path === "/payments/new" && method === "GET") {
    const snap = await A.service.getViews(["refs"]);
    const refs = snap.views.refs ?? {};
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
      await A.payments.createPayment(db, {
        type: String(form.type || "1"),
        amount: String(form.amount || "0"),
        date: String(form.date || ""),
        party: String(form.party || ""),
        paidTo: String(form.paidTo || ""),
        invoice: String(form.invoice || ""),
        description: String(form.description || ""),
        paid: "on",
      });
      A.service.invalidate();
      return redirect("/payments?status=ok");
    } catch (e: any) {
      return text("Payment not saved: " + (e && e.message ? e.message : String(e)), 400);
    }
  }

  const paymentDelete = /^\/payments\/([^\/]+)\/delete$/.exec(path);
  if (paymentDelete && method === "POST") {
    await A.payments.deletePayment(db, String(paymentDelete[1]));
    A.service.invalidate();
    return redirect("/payments?status=ok");
  }

  if (path === "/inventory" && method === "GET") {
    const snap = await A.service.getViews(["itemsReport", "refs"]);
    const rows = A.inventory.stockRows(snap.views.itemsReport ?? [], snap.views.refs ?? {}, pick(query.q, ""));
    const editId = String(query.edit || "");
    return html(
      await A.http.page(req, shell(user, "inventory", "Inventory"), "inventory/index.html", {
        rows,
        query: pick(query.q, ""),
        summary: A.inventory.stockSummary(rows),
        editRow: editId ? rows.find((r: any) => String(r.id) === editId) ?? null : null,
        companies: (snap.views.refs?.companies ?? []).map((c: any) => ({ id: c.id, name: c.name })),
      })
    );
  }

  if (path === "/inventory/save" && method === "POST") {
    if (String(form.id || "")) {
      await A.inventory.updateItem(db, "items", String(form.id), form);
    } else {
      await A.management.createRow(db, A.entities.ENTITIES.items, form);
    }
    A.service.invalidate();
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
    return html(await A.http.page(req, shell(user, "pages", def.title), `${def.slug}/${def.template}`, { meta: def, metaJson }));
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
