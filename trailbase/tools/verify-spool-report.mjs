// Differential: the ported ledger/booker SQL vs the live JS implementation.
//
// The JS path is the reference (it is what the report serves today). This compares row multisets
// and the totals, so a divergence is a concrete row difference rather than a claim.
//
// Usage:  node trailbase/tools/verify-spool-report.mjs
//
// It imports `compute/reports.js` + `compute/views.js` directly and drives them over the same
// base tables `lib/data.js` reads, so no server and no guest are needed.

import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildRefs, buildTransactionView, buildInvoiceView, buildPaymentsView, buildLedgerBooker } from "../runtime/app/compute/views.js";
import { reportLedgerBooker } from "../runtime/app/compute/reports.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const depotDb = process.env.DEPOT_DB || join(repo, "trailbase", "traildepot", "data", "main.db");
const sqlPath = join(repo, "trailbase", "runtime", "app", "reports", "sql", "reports", "ledger_booker.sql");

// Mirrors lib/data.js: read every column, rows ordered `id` DESC, ids base64-encoded exactly as
// the host bridge encodes BLOB values.
//
// Two harness facts that are easy to get wrong and produce a *silent* zero-row result rather than
// an error:
//
//   - `node:sqlite` returns each row as an OBJECT keyed by column name, not a positional array.
//     Indexing it (`vals[i]`) yields undefined for every column, so every row becomes `{}`.
//   - a BLOB comes back as a Uint8Array, so `Buffer.isBuffer` is false and ids must be encoded
//     from the byte view explicitly. Getting that wrong breaks every join at once.
//
// (The host bridge is the opposite on both counts: `query` returns positional `Vec<Vec<Value>>`,
// which is why the app re-attaches names from `pragma_table_info`.)
const b64 = (v) => Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64url");
const isBlob = (v) => v instanceof Uint8Array;

function readTable(db, table) {
  const cols = db
    .prepare(`SELECT name FROM pragma_table_info(?)`)
    .all(table)
    .map((r) => r.name);
  if (!cols.length) return [];
  const rows = db.prepare(`SELECT * FROM "${table}" ORDER BY "id" DESC`).all();
  return rows.map((row) => {
    const obj = {};
    for (const col of cols) {
      const v = row[col];
      obj[col] = isBlob(v) ? b64(v) : v;
    }
    return obj;
  });
}

const COMMITTED = `SELECT id FROM invoices WHERE status IS NULL OR status <> 'draft'`;

function baseData(db) {
  const tables = [
    "party_types", "invoice_types", "payment_types", "sections", "companies", "areas",
    "parties", "order_bookers", "items", "expenses", "party_companies",
    "order_booker_companies", "invoices", "invoices_return_reference", "transactions", "payments",
  ];
  const base = {};
  for (const t of tables) base[t] = readTable(db, t);

  const committed = new Set(
    db.prepare(COMMITTED).all().map((r) => (isBlob(r.id) ? b64(r.id) : String(r.id))),
  );
  // isCommitted, per lib/data.js: drafts are out, payments/transactions judged by their invoice.
  base.invoices = base.invoices.filter((r) => r.status !== "draft");
  for (const t of ["transactions", "payments"]) {
    base[t] = base[t].filter((r) => r.invoice === null || r.invoice === undefined || committed.has(String(r.invoice)));
  }
  return base;
}

const round2 = (v) => Math.round((Number(v ?? 0) + Number.EPSILON) * 100) / 100;

/** The JS reference result for a filter set. */
function runJs(base, filters) {
  // views.js dependency chain for ledgerBooker: paymentsView needs invoiceView, which needs
  // transactionView. The real builders are used rather than restated ones — a hand-rolled copy
  // of `buildTransactionView` would omit `total`/`net_amount`, and the totals would then differ
  // for a reason that has nothing to do with the SQL under test.
  const txView = buildTransactionView(base);
  const invoiceView = buildInvoiceView(base, txView);
  const paymentsView = buildPaymentsView(base, invoiceView);
  const ledgerBooker = buildLedgerBooker(paymentsView);
  const refs = buildRefs(base);
  return reportLedgerBooker({ ledgerBooker, refs, invoiceView }, filters);
}

function runSql(db, filters) {
  const sql = readFileSync(sqlPath, "utf8").split("-- TOTALS")[0];
  const p = (v) => (v === undefined || v === null ? "" : String(v));

  // The booker id is a base64url string here (how the host hands a BLOB to JS) but a BLOB in the
  // database, so it is inlined as a `x'..'` blob literal.
  //
  // NOT `unhex(hex('...'))`, which is the idiom the app uses for BLOB *writes*: `hex()` on a hex
  // STRING returns the hex of its ASCII bytes, so `unhex(hex('01a0..'))` rebuilds the bytes of the
  // text "01a0.." and matches nothing. `x'..'` round-trips correctly. It is the only substitution;
  // the dates stay bound via named parameters so dropping a placeholder cannot shift the numbering.
  let literal = sql;
  if (filters.booker) {
    const hex = Buffer.from(filters.booker, "base64url").toString("hex");
    // replaceAll: `:booker` occurs twice in the predicate (`(:booker = '' OR booker_id = :booker)`),
    // and String.replace only swaps the first — leaving an unbound placeholder that silently
    // matches nothing.
    literal = literal.replaceAll(":booker", `x'${hex}'`);
  } else {
    literal = literal.replaceAll(":booker", "''");
  }

  const rows = db.prepare(literal).all({
    from: p(filters.from),
    to: p(filters.to),
  });

  const credit = round2(rows.reduce((t, r) => t + r.credit, 0));
  const debit = round2(rows.reduce((t, r) => t + r.debit, 0));
  return {
    rows,
    totals: { credit: credit.toFixed(2), debit: debit.toFixed(2), balance: round2(credit - debit).toFixed(2) },
  };
}
/** Compare on the fields both sides produce, as a multiset keyed on a stable row identity. */
function compare(label, js, sql, filters) {
  const key = (r) => [r.date, r.entry, r.party ?? "", r.booker ?? "", r.creditText, r.debitText].join("|");

  const jsRows = js.rows.map(key).sort();
  const sqlRows = sql.rows.map((r) => key(r)).sort();

  const problems = [];
  if (jsRows.length !== sqlRows.length) {
    problems.push(`row count: js ${jsRows.length} vs sql ${sqlRows.length}`);
  }

  const counts = new Map();
  for (const k of jsRows) counts.set(k, (counts.get(k) || 0) + 1);
  let onlyJs = 0;
  for (const k of jsRows) {
    if ((counts.get(k) || 0) > 0) counts.set(k, counts.get(k) - 1);
    else onlyJs++;
  }
  for (const k of sqlRows) if (!(k in counts)) { /* counted below via missing */ }
  const missing = sqlRows.filter((k) => !jsRows.includes(k)).length;

  for (const field of ["credit", "debit", "balance"]) {
    if (js.totals[field] !== sql.totals[field]) {
      problems.push(`totals.${field}: js ${js.totals[field]} vs sql ${sql.totals[field]}`);
    }
  }

  console.log(`${label.padEnd(26)} js ${String(jsRows.length).padStart(6)}  sql ${String(sqlRows.length).padStart(6)}  ` +
    `credit ${js.totals.credit}/${sql.totals.credit}  debit ${js.totals.debit}/${sql.totals.debit}  balance ${js.totals.balance}/${sql.totals.balance}`);
  if (problems.length) {
    for (const p of problems) console.log(`   MISMATCH ${p}`);
    if (onlyJs || missing) console.log(`   row multiset differs (only-js ${onlyJs}, only-sql ${missing})`);
    return false;
  }
  console.log(`   ok`);
  return true;
}

const db = new DatabaseSync(depotDb, { readOnly: true });
const base = baseData(db);
console.log(`base rows: ${Object.entries(base).map(([k, v]) => `${k} ${v.length}`).join(", ")}\n`);

// Cases are derived from the live data, not hard-coded. A hard-coded date window that happens to
// match nothing yields two empty results that "agree", which passes while proving nothing.
const createdDates = base.payments.map((p) => String(p.created ?? "")).filter(Boolean).sort();
const sorted = [...createdDates].sort();
const q = (frac) => sorted[Math.floor((sorted.length - 1) * frac)]?.slice(0, 10);
const busiestBooker = (() => {
  const counts = new Map();
  for (const inv of base.invoices) {
    const b = inv.booker;
    if (b) counts.set(b, (counts.get(b) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
})();

const cases = [
  { label: "all (no filters)", filters: {} },
  { label: "date range (middle)", filters: { from: q(0.4), to: q(0.6) } },
  { label: "single day", filters: { from: q(0.99), to: q(0.99) } },
  { label: "busiest booker", filters: { booker: busiestBooker } },
  { label: "booker + range", filters: { booker: busiestBooker, from: q(0.3), to: q(0.8) } },
  { label: "range excludes all", filters: { from: "1990-01-01", to: "1990-01-02" } },
];

let allOk = true;
let sawRows = 0;
for (const c of cases) {
  const js = runJs(base, c.filters);
  const sql = runSql(db, c.filters);
  if (js.rows.length) sawRows++;
  if (!compare(c.label, js, sql, c.filters)) allOk = false;
}

db.close();
console.log(`\n${allOk ? "PASS" : "FAIL"} — ledger/booker SQL vs JS (${sawRows}/${cases.length} cases returned rows)`);
process.exit(allOk ? 0 : 1);
