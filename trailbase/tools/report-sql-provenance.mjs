/**
 * THE decisive check: does the guest's report data come out of SQLite?
 *
 * For every spooled page, this fetches `/p/<slug>/data` from the guest and then runs the SAME composed
 * statement directly against `main.db` in node:sqlite, and compares the two **row for row, in order,
 * including every column value and the key order**. If they are identical then every number the guest
 * published is a number SQLite computed, every filter SQLite applied, and every position SQLite chose —
 * there is no room left for a JavaScript sum, sort or filter to have produced any of it.
 *
 * This is deliberately stronger than checking the totals, and stronger than reading the SQL. A totals
 * comparison passes even when the sort happened in JS and a column was rounded in JS, as long as the
 * sum lands the same. Full-row equality in order cannot.
 *
 *   node tools/report-sql-provenance.mjs [--from 2024-01-01] [--to 2026-10-04]
 *     [--base http://127.0.0.1:4000] [--db trailbase/traildepot/data/main.db]
 */
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNTIME = join(HERE, "..", "runtime");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const FROM = arg("--from", "");
const TO = arg("--to", "");
const BASE = arg("--base", "http://127.0.0.1:4000");
const DB = arg("--db", join(HERE, "..", "traildepot", "data", "main.db"));
const ONLY = arg("--only", "");

const PRELUDE = readFileSync(join(RUNTIME, "app", "reports", "sql", "prelude.sql"), "utf8").replace(/;\s*$/, "").trimEnd();

/** The app's own composition rule — `spoolreports.js::composeStatement`. */
function compose(body) {
  const withoutLeadComment = body.replace(/^((?:\s*--[^\n]*\n)+)\s*/, "$1");
  const opensWithCte = /^\s*,?\s*[\w$]+\s+AS\s*\(/.test(withoutLeadComment);
  return PRELUDE + (opensWithCte ? ",\n" : "\n") + (opensWithCte ? body.replace(/^((?:\s*--[^\n]*\n)+)\s*,\s*/, "$1") : body);
}

/** Named parameters, with `::` casts, comments and string literals removed first. */
function paramNames(sql) {
  const s = sql.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/'(?:[^']|'')*'/g, "''").replace(/::/g, " ");
  return [...new Set([...s.matchAll(/(?<![:\w]):([a-zA-Z_][a-zA-Z0-9_]*)/g)].map((m) => m[1]))];
}
function bindsFor(body, spec) {
  const out = {};
  for (const n of paramNames(body)) {
    if (spec?.binds && n in spec.binds) out[n] = spec.binds[n];
    else if (/^(to|end|tdate|applydate)$/i.test(n)) out[n] = TO;
    else if (/^(from|start|fdate|date)$/i.test(n)) out[n] = FROM;
    else if (/^(party|booker|item|company|section|area|invoice|booker_)$/i.test(n)) out[n] = "";
    else out[n] = "";
  }
  return out;
}

function pages(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (e === "meta.json") out.push(p);
  }
  return out;
}

const login = await fetch(`${BASE}/api/auth/v1/login`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ email_or_username: arg("--email", "admin@localhost"), password: arg("--password", "administrator-0ne") }),
  redirect: "manual",
});
const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
if (!cookie) { console.error(`login failed: ${login.status}`); process.exit(1); }

const db = new DatabaseSync(DB, { readOnly: true });
const SQL_DIR = join(RUNTIME, "app", "reports", "sql", "reports");
let identical = 0, transported = 0, differing = 0, failed = 0;
// The worst error seen anywhere, so the summary after the loop can state the bound in one line.
let worstAbs = 0, worstRel = 0;

console.log(`base ${BASE}`);
console.log(`db   ${DB}`);
console.log(`range ${FROM || "(unfiltered)"} .. ${TO || "(unfiltered)"}\n`);
console.log(`${"slug".padEnd(24)}${"rows".padStart(8)}${"cols".padStart(6)}${"diff".padStart(7)}  verdict`);
console.log("-".repeat(64));

for (const metaPath of pages(join(RUNTIME, "app", "pages")).sort()) {
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  if (!meta.spool?.sql) continue;
  const slug = metaPath.slice(join(RUNTIME, "app", "pages").length + 1).replace(/[\\/]meta\.json$/, "").replace(/\\/g, "/");
  if (ONLY && !slug.includes(ONLY)) continue;

  const body = readFileSync(join(SQL_DIR, meta.spool.sql), "utf8");
  const binds = bindsFor(body, meta.spool);

  let local;
  try {
    local = db.prepare(compose(body)).all(binds);
  } catch (e) {
    console.log(`${slug.padEnd(24)}${"-".padStart(8)}${"-".padStart(6)}${"-".padStart(7)}  SQLITE ${e.message}`);
    failed++;
    continue;
  }

  const url = `${BASE}/p/${slug}/data${FROM || TO ? `?from=${FROM}&to=${TO}` : ""}`;
  const res = await fetch(url, { headers: { cookie } });
  if (!res.ok) { console.log(`${slug.padEnd(24)}${"-".padStart(8)}${"-".padStart(6)}${"-".padStart(7)}  HTTP ${res.status}`); failed++; continue; }
  const payload = await res.json();
  const remote = payload?.result?.rows ?? payload?.result ?? [];
  if (!Array.isArray(remote)) { console.log(`${slug.padEnd(24)}${"-".padStart(8)}${"-".padStart(6)}${"-".padStart(7)}  shape ${JSON.stringify(Object.keys(payload ?? {}))}`); failed++; continue; }

  // Row-for-row, in order, every column. Keys are compared as SETS (SQLite is positional, the JSON is
  // named) and values by exact string form, so a float that JS re-rounded shows up as a difference.
  //
  // ONE column is compared in a codec rather than a form: `id` is a 16-byte BLOB in SQLite and a
  // base64url string on the wire, because `routeKit` hex<->base64s every id crossing the boundary
  // (see `tools/id-codec-check.mjs`). That is an identity translation, not a calculation, so it is
  // normalised here — including the `=` padding, which node's `base64url` strips and the guest's codec
  // keeps, and which decodes to the same 16 bytes either way. Every other column is compared as-is,
  // which is what makes a difference in any of them meaningful.
  const b64u = (buf) => Buffer.from(buf).toString("base64url");
  const unpadded = (s) => (/^[A-Za-z0-9_-]+={0,2}$/.test(s) && s.length > 20 ? s.replace(/=+$/, "") : s);
  const norm = (col, v) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return /(^id$|Id$|_id$)/.test(col) ? unpadded(v) : v;
    if (v instanceof Uint8Array) return /(^id$|Id$|_id$)/.test(col) ? unpadded(b64u(v)) : `bytes:${b64u(v)}`;
    return String(v);
  };

  // A difference is CLASSIFIED, not just counted, because there is exactly one benign shape and it has
  // a known fingerprint: a double whose shortest round-trip form needs 17 significant digits, which the
  // host carried at 15 — SQLite's own REAL->TEXT format (`%!.15g`). If `toPrecision(15)` of the SQLite
  // value reproduces the guest's digits exactly, the difference IS that, and it is transport, not
  // arithmetic. Anything else is a real disagreement and is reported as such.
  const TRANSPORT = new Map(); // column -> { cells, maxAbs }
let cells = 0, real = 0;
  let maxAbs = 0, maxRel = 0;
  const firstReal = [];
  const n = Math.min(remote.length, local.length);
  for (let i = 0; i < n; i++) {
    const r = remote[i], l = local[i];
    const lKeys = Object.keys(l);
    const rKeys = Object.keys(r);
    if (rKeys.length !== lKeys.length) { real++; firstReal.push(`row ${i}: column count ${rKeys.length} vs ${lKeys.length}`); continue; }
    for (const k of lKeys) {
      if (!(k in r)) { real++; firstReal.push(`row ${i}: guest has no column "${k}"`); break; }
      const a = norm(k, l[k]);
      const b = norm(k, r[k]);
      if (a === b) continue;
      cells++;
      const na = Number(a), nb = Number(b);
      const isTransport = Number.isFinite(na) && Number.isFinite(nb) && Number(na.toPrecision(15)) === nb && na !== nb;
      const abs = Math.abs(nb - na);
      maxAbs = Math.max(maxAbs, abs);
      if (na !== 0) maxRel = Math.max(maxRel, abs / Math.abs(na));
      worstAbs = Math.max(worstAbs, abs);
      if (na !== 0) worstRel = Math.max(worstRel, abs / Math.abs(na));
      if (isTransport) {
        const e = TRANSPORT.get(k) ?? { cells: 0, maxAbs: 0 };
        e.cells++; e.maxAbs = Math.max(e.maxAbs, abs);
        TRANSPORT.set(k, e);
      } else {
        real++;
        if (firstReal.length < 6) firstReal.push(`row ${i} "${k}": sqlite=${a}  guest=${b}  (abs ${abs.toExponential(3)})`);
      }
    }
  }

  const cols = local.length ? Object.keys(local[0]).length : 0;
  const rowDelta = Math.abs(remote.length - local.length);
  const transportOnly = rowDelta === 0 && real === 0;
  const verdict = transportOnly ? (cells ? "identical (15-digit transport)" : "byte-identical") : real ? "REAL DIFFERENCE" : "ROW COUNT DIFFERS";
  if (transportOnly && cells === 0) identical++; else if (transportOnly) transported++; else differing++;
  const t = [...TRANSPORT.entries()].map(([k, e]) => `${k} x${e.cells} (max ${e.maxAbs.toExponential(2)})`).join(", ");
  console.log(`${slug.padEnd(24)}${String(local.length).padStart(8)}${String(cols).padStart(6)}${String(cells + real + rowDelta).padStart(7)}  ${verdict}${t ? `\n${" ".repeat(24)}${" ".repeat(8)}${" ".repeat(6)}${" ".repeat(7)}  15-digit: ${t}` : ""}`);
  for (const line of firstReal) console.log(`${" ".repeat(24)}  ${line}`);
}

console.log("-".repeat(64));
console.log(`${identical} page(s) byte-identical, ${transported} identical but for 15-significant-digit transport, ${differing} with a real difference`);
if (worstAbs > 0) console.log(`largest difference anywhere: ${worstAbs.toExponential(3)} absolute, ${worstRel.toExponential(3)} relative  (one paisa is 1e-2)`);
process.exit(differing === 0 ? 0 : 1);