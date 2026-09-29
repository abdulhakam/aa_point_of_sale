// Row-equivalence gate: do the ported SQL views produce the same rows as the JS views the app
// runs today?
//
//   node trailbase/tools/view-equivalence.mjs
//
// Reads the depot's base tables exactly as the guest's data layer does (same columns, same
// `ORDER BY id DESC`, same relation/boolean normalisation), builds every view with
// compute/views.js, runs the composed SQL for the same view, and diffs the rows as multisets.

import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as V from "../runtime/app/compute/views.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const viewsDir = join(repo, "trailbase", "runtime", "app", "reports", "sql", "views");
const depotDb = process.env.DEPOT_DB || "C:\\Users\\wajiz.pk\\AppData\\Local\\Temp\\kilo\\aa-perf-depot\\data\\main.db";

const TABLES = [
  "party_types", "invoice_types", "payment_types", "sections", "categories", "companies", "areas",
  "parties", "order_bookers", "items", "expenses", "party_companies", "order_booker_companies",
  "invoices", "invoices_return_reference", "transactions", "payments",
];
const RELATIONS = {
  areas: ["section"], parties: ["type", "area"], items: ["category"],
  invoices: ["type", "party", "booker", "invoice_maker"],
  invoices_return_reference: ["original_invoices"], transactions: ["invoice", "item"],
  payments: ["invoice", "party", "paid_to", "type"],
  party_companies: ["party", "company"], order_booker_companies: ["order_booker", "company"],
};
const BOOLEANS = {
  categories: ["deleted"], companies: ["deleted"], areas: ["deleted"], parties: ["deleted"],
  order_bookers: ["deleted"], invoices: ["completed", "deleted"], transactions: ["deleted"],
  payments: ["paid"],
};

// The bridge emits BLOBs as padded URL-safe base64; mirror it so ids match.
const b64url = (bytes) => Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
const quote = (name) => '"' + String(name).replace(/"/g, '""') + '"';

const db = new DatabaseSync(depotDb, { readOnly: true });

function readTable(table) {
  const cols = db.prepare("SELECT name FROM pragma_table_info(?)").all(table).map((r) => r.name);
  if (!cols.length) return [];
  const rows = db.prepare(`SELECT ${cols.map(quote).join(", ")} FROM ${quote(table)} ORDER BY "id" DESC`).all();
  return rows.map((row) => {
    const out = { ...row };
    for (const [k, v] of Object.entries(out)) if (v instanceof Uint8Array) out[k] = b64url(v);
    for (const col of RELATIONS[table] ?? []) out[col] = out[col] ?? null;
    for (const col of BOOLEANS[table] ?? []) out[col] = out[col] === true || out[col] === 1 ? 1 : 0;
    return out;
  });
}

const base = {};
for (const table of TABLES) base[table] = readTable(table);

// JS views, in dependency order.
const jsViews = {};
for (const name of V.VIEW_ORDER) jsViews[name] = V.buildView(name, base, jsViews);

// SQL views.
const sqlText = new Map();
for (const file of readdirSync(viewsDir).filter((f) => f.endsWith(".sql"))) {
  sqlText.set(file.replace(/\.sql$/, ""), readFileSync(join(viewsDir, file), "utf8").trim());
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const depsOf = (name) =>
  [...sqlText.keys()].filter((n) => n !== name && new RegExp("\\b" + escapeRe(n) + "\\b").test(sqlText.get(name)));
function compose(name) {
  const ctes = [];
  const seen = new Set();
  const add = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    for (const d of depsOf(n)) add(d);
    ctes.push('"' + n + '" AS (\n' + sqlText.get(n) + "\n)");
  };
  for (const d of depsOf(name)) add(d);
  return ctes.length
    ? "WITH " + ctes.join(",\n") + "\nSELECT * FROM (\n" + sqlText.get(name) + "\n) AS _report"
    : sqlText.get(name);
}

const canon = (row) => {
  const out = {};
  for (const k of Object.keys(row).sort()) {
    let v = row[k];
    if (v instanceof Uint8Array) v = b64url(v);
    // Kill float-representation noise (e.g. 283934.94999999995 vs 283934.95) without hiding a
    // cent: six decimals is far coarser than the noise and far finer than 0.01.
    else if (typeof v === "number" && Number.isFinite(v)) v = Number(v.toFixed(6));
    out[k] = v;
  }
  return JSON.stringify(out);
};

// The JS view names are camelCase (`transactionView`); the legacy SQL views are snake_case.
const ALIASES = { outstanding: "outstanding_summary", counts: "counts_for_row_numbers" };
const snake = (name) => name.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const sqlNameFor = (jsName) => {
  const direct = ALIASES[jsName] ?? snake(jsName);
  return sqlText.has(direct) ? direct : null;
};

const pairs = V.VIEW_ORDER.map((jsName) => ({ jsName, sqlName: sqlNameFor(jsName) })).filter((p) => p.sqlName);

let same = 0;
const problems = [];
for (const { jsName, sqlName } of pairs) {
  const js = jsViews[jsName];
  if (!Array.isArray(js)) continue;
  let sqlRows;
  try {
    sqlRows = db.prepare(compose(sqlName)).all();
  } catch (e) {
    problems.push(jsName);
    console.log("SQLFAIL " + jsName.padEnd(24) + " (" + sqlName + ") " + e.message);
    continue;
  }
  const counts = (rows) => {
    const m = new Map();
    for (const r of rows) m.set(canon(r), (m.get(canon(r)) ?? 0) + 1);
    return m;
  };
  const a = counts(js);
  const b = counts(sqlRows);
  let diff = 0;
  for (const [k, n] of a) if (b.get(k) !== n) diff += Math.abs((b.get(k) ?? 0) - n);
  for (const [k, n] of b) if (!a.has(k)) diff += n;
  if (diff === 0) {
    same++;
    console.log("ok    " + jsName.padEnd(24) + " " + String(js.length).padStart(6) + " rows identical");
    continue;
  }
  problems.push(jsName);
  const ks = Object.keys(js[0] ?? {});
  const ss = Object.keys(sqlRows[0] ?? {});
  const missing = ks.filter((k) => !ss.includes(k));
  const extra = ss.filter((k) => !ks.includes(k));
  console.log("DIFF  " + jsName.padEnd(24) + " js=" + js.length + " sql=" + sqlRows.length + " differing=" + diff);
  if (missing.length || extra.length) {
    console.log("      cols js-only:[" + missing.join(",") + "] sql-only:[" + extra.join(",") + "]");
  }
  const first = js.find((r) => !b.has(canon(r)));
  if (first) console.log("      e.g. js:  " + canon(first).slice(0, 200));
  // Field-level diff for one shared id, so the reconciliation is concrete.
  const idOf = (r) => (r?.id instanceof Uint8Array ? b64url(r.id) : r?.id);
  const byId = new Map(sqlRows.map((r) => [idOf(r), r]));
  const probe = js.find((r) => {
    const m = byId.get(idOf(r));
    return m !== undefined && canon(r) !== canon(m);
  });
  const match = probe ? byId.get(idOf(probe)) : undefined;
  if (probe && match) {
    const cv = (v) => (v instanceof Uint8Array ? b64url(v) : v);
    const diffs = [];
    for (const k of new Set([...Object.keys(probe), ...Object.keys(match)])) {
      const x = cv(probe[k]);
      const y = cv(match[k]);
      if (JSON.stringify(x) !== JSON.stringify(y)) {
        diffs.push(k + ": js=" + JSON.stringify(x) + " sql=" + JSON.stringify(y));
      }
    }
    console.log("      fields: " + diffs.slice(0, 10).join(" | "));
  }
}

console.log("\n== " + same + "/" + pairs.length + " views identical ==");
process.exit(problems.length ? 1 : 0);
