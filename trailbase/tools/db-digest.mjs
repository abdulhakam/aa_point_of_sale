/**
 * Whole-database digest: per-table row counts and money/quantity sums, for the legacy PocketBase
 * database and the TrailBase depot, compared side by side.
 *
 * Both databases hold the same business data after an import, so a per-table digest of counts and
 * money sums is the cheapest honest statement that the import moved everything and moved it intact.
 * It is deliberately **not** a row-by-row comparison: ids are deliberately re-mapped (PocketBase
 * `'r…'` ids become UUIDv7), so a join on id is not available, and every figure is aggregated so a
 * single unmapped row shows up as a delta rather than as noise.
 *
 * **Money is compared at whole paisas, per value, not on the raw float total.** The new schema
 * rounds every money write to 2 dp, and legacy holds some values below a paisa (`1551.375`,
 * `3987.696`), so `sum(amount)` legitimately differs by a paisa or two between the two stores even
 * when every row is intact. Rounding each value first asks the question that matters — is the money
 * the same? — instead of the question that is really about float accumulation. The raw totals are
 * printed alongside, because a large raw/whole-paisa gap is itself worth seeing.
 *
 *   node trailbase/tools/db-digest.mjs --legacy legacyforparity/backend/pb_data/data.db \
 *     --trailbase trailbase/traildepot/data/main.db --json out.json
 *
 * Reads both files read-only, so both servers may be running; SQLite WAL mode means a read-only
 * connection still sees committed data.
 */

import { DatabaseSync } from "node:sqlite";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i > -1 ? process.argv[i + 1] : d;
};
const has = (n) => process.argv.includes(n);

const LEGACY = arg("--legacy", "legacyforparity/backend/pb_data/data.db");
const TB = arg("--trailbase", "trailbase/traildepot/data/main.db");
const JSON_OUT = arg("--json", "");

const r2 = (n) => Math.round(Number(n ?? 0) * 100) / 100;

/** Tables in one database. `glob '_*'`, not `like '_%'`: `_` is a LIKE wildcard matching any char. */
const tablesOf = (db) =>
  db
    .prepare("select name from sqlite_master where type='table' and name not glob '_*' and name not like 'sqlite_%'")
    .all()
    .map((r) => r.name)
    .sort();

const colsOf = (db, t) => db.prepare(`pragma table_info("${t}")`).all().map((c) => c.name);

const q = (db, sql) => {
  try {
    return db.prepare(sql).get();
  } catch (e) {
    return { __error: e.message };
  }
};

/**
 * Count, plus per-column sums for every money/quantity-looking column.
 * `sum` rounds each value to whole paisas before adding; `raw` is the plain float total.
 */
function digest(db, t) {
  const cols = colsOf(db, t);
  const measures = cols.filter((c) => /amount|net|discount|price|cost|paid|reciev|receiv|cash|balance|total|profit|qty|quantity|box_size/i.test(c));
  const out = { count: q(db, `select count(*) c from "${t}"`).c ?? 0, sum: {}, raw: {} };
  for (const c of measures) {
    out.sum[c] = r2(q(db, `select round(sum(round("${c}" * 100)) / 100, 2) s from "${t}"`).s);
    out.raw[c] = r2(q(db, `select sum("${c}") s from "${t}"`).s);
  }
  return out;
}

const sumAll = (d, key) => r2(Object.values(d[key]).reduce((a, b) => a + (b ?? 0), 0));

/** Rows on one side only, by `name` when the table has one, else by id. Shown so a count delta explains itself. */
function onlyOn(db, t, limit = 8) {
  const key = colsOf(db, t).includes("name") ? "name" : "id";
  try {
    return db
      .prepare(`select cast("${key}" as text) k, count(*) c from "${t}" group by "${key}" order by c desc, k limit ${limit}`)
      .all()
      .map((r) => `${r.k} x${r.c}`);
  } catch {
    return [];
  }
}

const legacy = new DatabaseSync(resolve(LEGACY), { readOnly: true });
const tb = new DatabaseSync(resolve(TB), { readOnly: true });
const lTables = tablesOf(legacy);
const tTables = tablesOf(tb);

// `categories` becomes `companies` in the new schema; `users` is auth state the import does not carry.
const RENAMES = { categories: "companies" };
const SKIP = new Set(["users", "_migrations", "_params", "_collections", "_admins", "sqlite_sequence"]);

const rows = [];
for (const lt of lTables) {
  if (SKIP.has(lt)) continue;
  const tt = RENAMES[lt] ?? lt;
  const present = tTables.includes(tt);
  const ld = digest(legacy, lt);
  const td = present ? digest(tb, tt) : null;
  let verdict = "ok";
  if (!td) verdict = "MISSING";
  else if (ld.count !== td.count) verdict = "ROWS";
  else if (Math.abs(sumAll(ld, "sum") - sumAll(td, "sum")) >= 0.005) verdict = "MONEY";
  rows.push({ legacy: lt, trailbase: present ? tt : `MISSING (${tt})`, verdict, legacy_digest: ld, trailbase_digest: td });
}

const w = (s, n) => String(s ?? "").padEnd(n);
console.log(`\nlegacy    : ${LEGACY}`);
console.log(`trailbase : ${TB}`);
console.log(`money compared at whole paisas, per value. raw = the plain float total.\n`);
console.log(`${w("legacy table", 26)}${w("trailbase table", 26)}${w("legacy n", 9)}${w("tb n", 9)}${w("Σ money legacy", 17)}${w("Σ money tb", 17)}${w("Σ raw legacy", 17)}${w("Σ raw tb", 17)}verdict`);
console.log("-".repeat(150));

let problems = 0;
for (const r of rows) {
  if (r.verdict !== "ok") problems++;
  console.log(
    `${w(r.legacy, 26)}${w(r.trailbase, 26)}${w(r.legacy_digest.count, 9)}${w(r.trailbase_digest?.count ?? "-", 9)}` +
      `${w(r.legacy_digest.count ? sumAll(r.legacy_digest, "sum").toLocaleString() : "0", 17)}` +
      `${w(r.trailbase_digest ? sumAll(r.trailbase_digest, "sum").toLocaleString() : "-", 17)}` +
      `${w(r.legacy_digest.count ? sumAll(r.legacy_digest, "raw").toLocaleString() : "0", 17)}` +
      `${w(r.trailbase_digest ? sumAll(r.trailbase_digest, "raw").toLocaleString() : "-", 17)}${r.verdict}`
  );
  if (r.verdict === "MONEY" && has("--verbose")) {
    for (const c of new Set([...Object.keys(r.legacy_digest.sum), ...Object.keys(r.trailbase_digest.sum)])) {
      const a = r.legacy_digest.sum[c], b = r.trailbase_digest.sum[c];
      if (Math.abs((a ?? 0) - (b ?? 0)) >= 0.005) console.log(`      ${c}: legacy=${a}  trailbase=${b}  (raw ${r.legacy_digest.raw[c]} / ${r.trailbase_digest.raw[c]})`);
    }
  }
  if (r.verdict === "ROWS" && has("--verbose")) {
    console.log(`      count ${r.legacy_digest.count} -> ${r.trailbase_digest.count}; largest keys legacy ${JSON.stringify(onlyOn(legacy, r.legacy))}`);
    console.log(`                                       trailbase ${JSON.stringify(onlyOn(tb, r.trailbase))}`);
  }
}

const totalRows = rows.reduce((a, r) => a + r.legacy_digest.count, 0);
const totalTb = rows.reduce((a, r) => a + (r.trailbase_digest?.count ?? 0), 0);
console.log("-".repeat(150));
console.log(`${w("TOTAL", 52)}${w(totalRows, 9)}${w(totalTb, 9)}`);
console.log(`\n${problems === 0 ? "ALL TABLES MATCH" : `${problems} TABLE(S) NEED AN EXPLANATION: ` + rows.filter((r) => r.verdict !== "ok").map((r) => `${r.legacy}=${r.verdict}`).join(", ")}`);

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify({ legacy: LEGACY, trailbase: TB, totalRows, totalTb, problems, rows }, null, 2));
  console.log(`wrote ${JSON_OUT}`);
}
process.exit(problems === 0 ? 0 : 1);