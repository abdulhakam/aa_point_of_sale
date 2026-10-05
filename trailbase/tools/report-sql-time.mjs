/**
 * Report SQL cost, measured outside the guest: the same composed statement, run directly against the
 * depot's SQLite with the same binds, timed.
 *
 *   node trailbase/tools/report-sql-time.mjs [--from 2024-01-01] [--to 2026-10-04] [--repeat 1]
 *
 * Why this exists: `report-sweep.mjs` measures what a user waits for, and when a report 500s at the
 * ~20 s WASM call deadline that number is 20 s — which says nothing about whether the statement is
 * slow or the host is slow. Running the same statement here answers that directly, and it is the only
 * way to see a query that takes 40 s when the request path refuses to wait that long.
 *
 * The composition rule is the app's own: `prelude.sql` (minus its trailing semicolon), then a comma
 * if the report opens with its own CTEs, then the report body — the same rule as
 * `spoolreports.js::composeStatement`, restated here because that function reads through the host's
 * `fs` bridge and cannot run in node. The bind names come from the report body itself.
 */

import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNTIME = join(HERE, "..", "runtime");
const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i > -1 ? process.argv[i + 1] : d;
};
const FROM = arg("--from", "");
const TO = arg("--to", "");
const REPEAT = Number(arg("--repeat", "1"));
const DB = arg("--db", join(HERE, "..", "traildepot", "data", "main.db"));
const JSON_OUT = arg("--json", "");

const PRELUDE = readFileSync(join(RUNTIME, "app", "reports", "sql", "prelude.sql"), "utf8")
  .replace(/;\s*$/, "")
  .trimEnd();

/** The app's own composition rule — see `spoolreports.js::composeStatement`. */
function compose(body) {
  const withoutLeadComment = body.replace(/^((?:\s*--[^\n]*\n)+)\s*/, "$1");
  const opensWithCte = /^\s*,?\s*[\w$]+\s+AS\s*\(/.test(withoutLeadComment);
  return PRELUDE + (opensWithCte ? ",\n" : "\n") + (opensWithCte ? body.replace(/^((?:\s*--[^\n]*\n)+)\s*,\s*/, "$1") : body);
}

/** Every page that declares a `spool`, walked the same way `spoolreports.js` walks it. */
function pages(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (e === "meta.json") out.push(p);
  }
  return out;
}

const SQL_DIR = join(RUNTIME, "app", "reports", "sql", "reports");
const PAGES_DIR = join(RUNTIME, "app", "pages");

/**
 * The named parameters a statement declares.
 *
 * A naive `/:(\w+)/` scan finds three things that are not parameters: `::` casts, string literals
 * (`'12:30:00'` yields `30`), and `:` inside comments. SQLite then rejects the statement with
 * `Unknown named parameter`, which reads as a broken statement rather than a broken scan — so the
 * literals, comments and casts are stripped first.
 */
function paramNames(sql) {
  const stripped = sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/::/g, " ");
  return [...new Set([...stripped.matchAll(/(?<![:\w]):([a-zA-Z_][a-zA-Z0-9_]*)/g)].map((m) => m[1]))];
}

/** Defaults for those names, so the statement runs over the whole database. */
function bindsFor(body, spec) {
  const out = {};
  for (const n of paramNames(body)) {
    if (spec?.binds && n in spec.binds) out[n] = spec.binds[n];
    else if (FROM && /^(to|end|tdate|applydate)$/i.test(n)) out[n] = TO || FROM;
    else if (FROM && /^(from|start|fdate|date)$/i.test(n)) out[n] = FROM;
    else out[n] = "";
  }
  return out;
}

const db = new DatabaseSync(DB, { readOnly: true });
const results = [];

console.log(`db ${DB}`);
console.log(`range ${FROM || "(unfiltered)"} .. ${TO || "(unfiltered)"}\n`);

for (const metaPath of pages(PAGES_DIR).sort()) {
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  if (!meta.spool?.sql) continue;
  const slug = metaPath.slice(PAGES_DIR.length + 1).replace(/[\\/]meta\.json$/, "").replace(/\\/g, "/");
  const body = readFileSync(join(SQL_DIR, meta.spool.sql), "utf8");
  const stmt = compose(body);
  const binds = bindsFor(body, meta.spool);
  let best = null, rows = 0, error = null;
  for (let i = 0; i < REPEAT; i++) {
    const t0 = process.hrtime.bigint();
    try {
      const r = db.prepare(stmt).all(binds);
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      rows = r.length;
      if (best === null || ms < best) best = ms;
    } catch (e) {
      error = e.message;
      break;
    }
  }
  results.push({ slug, sql: meta.spool.sql, rows, ms: best, error });
  const s = best == null ? "  ERR" : `${best.toFixed(0).padStart(6)}ms`;
  console.log(`  ${slug.padEnd(24)} ${meta.spool.sql.padEnd(26)} ${s}  ${String(rows).padStart(7)} rows${error ? `  ${error}` : ""}`);
}

const ok = results.filter((r) => r.ms != null).sort((a, b) => b.ms - a.ms);
console.log(`\nslowest: ${ok.slice(0, 5).map((r) => `${r.slug} ${r.ms.toFixed(0)}ms`).join(", ")}`);
const over = ok.filter((r) => r.ms > 20000);
console.log(over.length ? `\n${over.length} statement(s) exceed the ~20 s WASM call deadline on their own:\n${over.map((r) => `  ${r.slug} ${(r.ms / 1000).toFixed(1)}s`).join("\n")}` : "\nno statement exceeds 20 s on its own");

if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ db: DB, from: FROM, to: TO, results }, null, 2) + "\n");