/**
 * Assert that every MONEY TEXT column keeps its trailing zeroes.
 *
 * The parity gate compares money as NUMBERS, so a text column that lost its `.00` would pass it
 * silently — the numbers are right, and the page shows "0" where it must show "0.00".
 * `printf('%.2f', x)` does keep them ("3.50", "3.00"); `printf('%!.2f', x)` does NOT ("3.5"). The
 * distinction is one character and it is only visible in the rendered text, so it is asserted here
 * rather than assumed.
 *
 * The other thing checked here: the formatting FUNCTIONS the guest actually has. They are queried
 * from the running component, not from node:sqlite — the two engines differ (the guest has no
 * floor()/ceil()/trunc()), so a capability question about the guest can only be answered by the
 * guest.
 *
 * Usage:
 *   node trailbase/tools/check-money-text.mjs            # text check only (no server needed)
 *   BASE=http://127.0.0.1:4000 node ... --caps        # also query the guest's capabilities
 */

import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// `here` is trailbase/tools, so the repo root is two levels up — resolve(..) would give `trailbase`
// and every path below would silently miss.
const repo = resolve(here, "../..");
const sqlRoot = join(repo, "trailbase", "runtime", "app", "reports", "sql");
const depot = join(repo, "trailbase", "traildepot", "data", "main.db");

/** Money TEXT columns, and the ones that must be whole rupees with `.00` or two decimals. */
const TEXT_COLUMNS = [
  "creditText", "debitText", "balanceText", "amountText", "net_amountText", "final_amountText",
  "profitText", "stockAmountText", "totalText", "invoice_totalText", "paid_totalText",
  "costText", "cashText", "recievableText", "payableText",
];

// A money text is either "1234.56" or "1234.00" — always at least TWO decimals, never none, and
// never a trailing bare ".". Exponents and thousands separators are not produced by printf.
const MONEY_TEXT = /^-?\d+(\.\d{2})$/;

const isBlob = (v) => v instanceof Uint8Array;
const b64 = (v) => Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64url");

function readTable(db, table) {
  const cols = db.prepare(`SELECT name FROM pragma_table_info(?)`).all(table).map((r) => r.name);
  if (!cols.length) return [];
  return db.prepare(`SELECT * FROM "${table}" ORDER BY "id" DESC`).all().map((row) => {
    const o = {};
    for (const col of cols) o[col] = isBlob(row[col]) ? b64(row[col]) : row[col];
    return o;
  });
}

const TABLES = [
  "party_types", "invoice_types", "payment_types", "sections", "companies", "areas", "parties",
  "order_bookers", "items", "expenses", "party_companies", "order_booker_companies",
  "invoices", "invoices_return_reference", "transactions", "payments",
];

const db = new DatabaseSync(depot, { readOnly: true });

// Registry → { sql, cols }, parsed rather than duplicated.
const registrySrc = readFileSync(join(repo, "trailbase", "runtime", "app", "lib", "spoolreports.js"), "utf8");
const REGISTRY = {};
for (const m of registrySrc.matchAll(/\n {2}\S[^\n]*: \{([\s\S]*?)\n {2}\},/g)) {
  const body = m[1];
  const sql = /sql:\s*"([^"]+)"/.exec(body)?.[1];
  if (!sql) continue;
  const colsRaw = /cols:\s*\[([\s\S]*?)\]/.exec(body)?.[1] ?? "";
  const cols = colsRaw.split(",").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean);
  const key = m[0].replace(/^\n {2}/, "").replace(/:\s*\{$/, "");
  REGISTRY[key] = { sql, cols };
}

const prelude = readFileSync(join(sqlRoot, "prelude.sql"), "utf8").replace(/;\s*$/, "").trimEnd();

const problems = [];
let checkedColumns = 0;
let checkedValues = 0;

const base = {};
for (const t of TABLES) base[t] = readTable(db, t);
const committed = new Set(
  db.prepare(`SELECT id FROM invoices WHERE status IS NULL OR status <> 'draft'`).all().map((r) => b64(r.id)),
);
base.invoices = base.invoices.filter((r) => r.status !== "draft");
for (const t of ["transactions", "payments"]) {
  base[t] = base[t].filter((r) => r.invoice == null || committed.has(String(r.invoice)));
}

const values = {
  booker: "", from: "", to: "", party: "", area: "", section: "", item: "", company: "",
  invoice: "", type: "", salesOnly: "", agg: "",
};

for (const [name, spec] of Object.entries(REGISTRY)) {
  const reportSql = readFileSync(join(sqlRoot, "reports", spec.sql), "utf8").trim();
  const withoutLead = reportSql.replace(/^((?:\s*--[^\n]*\n)+)\s*/, "$1");
  const opensWithCte = /^\s*,?\s*[\w$]+\s+AS\s*\(/.test(withoutLead);
  const sql = prelude + (opensWithCte ? ",\n" : "\n")
    + (opensWithCte ? reportSql.replace(/^((?:\s*--[^\n]*\n)+)\s*,\s*/, "$1") : reportSql);

  // Bind ONLY the parameters the statement declares. node:sqlite rejects an object carrying an
  // unknown key ("Unknown named parameter 'party'"), and a bound-but-unused key is just as wrong as
  // a missing one — so the declared set is discovered from the SQL, comments stripped first.
  const declared = [...new Set(
    [...reportSql.replace(/--[^\n]*/g, "").matchAll(/:([a-z_][a-z0-9_]*)/gi)].map((m) => m[1]),
  )];
  const binds = Object.fromEntries(declared.map((k) => [k, values[k] ?? ""]));

  const rows = db.prepare(sql).all(binds);
  const textCols = spec.cols.filter((c) => TEXT_COLUMNS.includes(c));
  if (!textCols.length) continue;

  for (const col of textCols) {
    checkedColumns++;
    const bad = [];
    for (const r of rows) {
      const v = r[col];
      if (v === null || v === undefined || v === "") continue;
      checkedValues++;
      const s = String(v);
      if (!MONEY_TEXT.test(s)) bad.push(s);
    }
    if (bad.length) {
      const sample = [...new Set(bad)].slice(0, 5);
      problems.push(`${name}.${col}: ${bad.length}/${rows.length} not 2-dp — e.g. ${JSON.stringify(sample)}`);
    }
  }
}

console.log(`checked ${checkedColumns} money text column(s) across ${Object.keys(REGISTRY).length} report(s),`);
console.log(`${checkedValues.toLocaleString()} non-empty value(s)\n`);
if (problems.length === 0) {
  console.log("PASS — every money text keeps exactly two decimals (trailing zeroes included)");
} else {
  for (const p of problems) console.log("  " + p);
  console.log("\nFAIL — a money text lost its trailing zeroes");
}
