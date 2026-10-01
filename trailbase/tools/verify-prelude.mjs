// Gate the SHARED PRELUDE against the JS views, before any report is built on top of it.
//
// A prelude bug would otherwise surface as N unrelated report diffs, which is expensive to diagnose.
// So this checks each prelude CTE against its `compute/views.js` counterpart first, on row count and
// then on the money fields that matter.
//
// Usage: node trailbase/tools/verify-prelude.mjs

import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildTransactionView, buildInvoiceView, buildTransactionsReport,
  buildPaymentsView,
} from "../runtime/app/compute/views.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const depotDb = process.env.DEPOT_DB || join(repo, "trailbase", "traildepot", "data", "main.db");
const preludePath = join(repo, "trailbase", "runtime", "app", "reports", "sql", "prelude.sql");

const isBlob = (v) => v instanceof Uint8Array;
const b64 = (v) => Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64url");

function readTable(db, table) {
  const cols = db.prepare(`SELECT name FROM pragma_table_info(?)`).all(table).map((r) => r.name);
  if (!cols.length) return [];
  return db.prepare(`SELECT * FROM "${table}" ORDER BY "id" DESC`).all().map((row) => {
    const o = {};
    for (const col of cols) {
      const v = row[col];
      o[col] = isBlob(v) ? b64(v) : v;
    }
    return o;
  });
}

const TABLES = [
  "party_types", "invoice_types", "payment_types", "sections", "companies", "areas",
  "parties", "order_bookers", "items", "expenses", "party_companies",
  "order_booker_companies", "invoices", "invoices_return_reference", "transactions", "payments",
];

function loadBase(db) {
  const base = {};
  for (const t of TABLES) base[t] = readTable(db, t);
  const committed = new Set(
    db.prepare(`SELECT id FROM invoices WHERE status IS NULL OR status <> 'draft'`).all().map((r) => b64(r.id)),
  );
  base.invoices = base.invoices.filter((r) => r.status !== "draft");
  for (const t of ["transactions", "payments"]) {
    base[t] = base[t].filter((r) => r.invoice == null || committed.has(String(r.invoice)));
  }
  return base;
}

/** Run `SELECT ... FROM <cte>` against the prelude. */
function sqlCte(db, cte, selectSql) {
  const prelude = readFileSync(preludePath, "utf8").replace(/;\s*$/, "");
  const sql = `${prelude}\n${selectSql.replace("FROM_CTE", `FROM ${cte}`)}`;
  return db.prepare(sql).all();
}

const near = (a, b) => Math.abs(Number(a ?? 0) - Number(b ?? 0)) < 0.005;
const problems = [];
function check(label, ok, detail) {
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) problems.push(label);
}

const db = new DatabaseSync(depotDb, { readOnly: true });
const base = loadBase(db);

const txView = buildTransactionView(base);
const invoiceView = buildInvoiceView(base, txView);
const txReport = buildTransactionsReport(base, txView, invoiceView);
const paymentsView = buildPaymentsView(base, invoiceView);

// --- transaction_view --------------------------------------------------------------
{
  const rows = sqlCte(db, "transaction_view", 'SELECT COUNT(*) AS n FROM_CTE');
  check("transaction_view row count", rows[0].n === txView.length, `sql ${rows[0].n} vs js ${txView.length}`);

  // Per-line totals, keyed by id, compared exactly (these drive all downstream money).
  const sqlRows = sqlCte(db, "transaction_view", "SELECT id, total FROM transaction_view");
  const byId = new Map(txView.map((t) => [t.id, t]));
  let bad = 0;
  let worst = 0;
  for (const r of sqlRows) {
    const js = byId.get(b64(r.id));
    if (!js) { bad++; continue; }
    const d = Math.abs(Number(r.total) - Number(js.total));
    if (d > worst) worst = d;
    if (d > 0.005) bad++;
  }
  check("transaction_view per-line total", bad === 0, `${bad} mismatched, worst delta ${worst.toFixed(6)}`);
}

// --- invoice_totals (final_total) ---------------------------------------------------
// `unrounded` lives on invoice_chain (invoice_totals only carries final_total), so the two are
  // read from their own CTEs and joined here — which also keeps each assertion about one shape.
  const finalRows = sqlCte(db, "invoice_totals", "SELECT id, final_total FROM invoice_totals");
  const chainRows = sqlCte(db, "invoice_chain", "SELECT id, unrounded FROM invoice_chain");
  {
    const byId = new Map(invoiceView.map((i) => [i.id, i]));
    let badFinal = 0;
    let worst = 0;
    for (const r of finalRows) {
      const js = byId.get(b64(r.id));
      if (!js) continue;
      const d = Math.abs(Number(r.final_total) - Number(js.final_total));
      if (d > worst) worst = d;
      if (d > 0.005) badFinal++;
    }
    check("invoice_totals.final_total", badFinal === 0, `${badFinal}/${finalRows.length} mismatched, worst ${worst.toFixed(4)}`);

      let badUnrounded = 0;
    for (const r of chainRows) {
      const js = byId.get(b64(r.id));
      if (!js) continue;
      if (Math.abs(Number(r.unrounded) - Number(js.unrounded_total)) > 0.005) badUnrounded++;
    }
    check("invoice_chain.unrounded_total", badUnrounded === 0, `${badUnrounded}/${chainRows.length} mismatched`);
  }

// --- payments_view -------------------------------------------------------------------
{
  const rows = sqlCte(db, "payments_view", 'SELECT COUNT(*) AS n FROM payments_view');
  check("payments_view row count", rows[0].n === paymentsView.length, `sql ${rows[0].n} vs js ${paymentsView.length}`);

  const sqlRows = sqlCte(db, "payments_view", "SELECT id, amount, payment_date, credit, debit, type, paid FROM payments_view");
  const byId = new Map(paymentsView.map((p) => [p.id, p]));
  let badAmount = 0;
  let badDate = 0;
  let badCredit = 0;
  let badDebit = 0;
  // views.js:358-359, the credit/debit pair. Checked HERE, not in the report gates: these were added
  // to the prelude after the first gate run, and an unasserted money column is exactly how the
  // booker report came to disagree by ~30M with every other column matching.
  const jsCredit = (r) => (r.type === 1 ? (r.paid ? r.amount : 0) : r.type === 0 ? (r.paid ? 0 : r.amount) : 0);
  const jsDebit = (r) => (r.type === 0 ? (r.paid ? r.amount : 0) : r.type === 1 ? (r.paid ? 0 : r.amount) : 0);
  for (const r of sqlRows) {
    const js = byId.get(b64(r.id));
    if (!js) continue;
    if (!near(r.amount, js.amount)) badAmount++;
    if (String(r.payment_date) !== String(js.payment_date)) badDate++;
    if (!near(r.credit, jsCredit(js))) badCredit++;
    if (!near(r.debit, jsDebit(js))) badDebit++;
  }
  check("payments_view.amount", badAmount === 0, `${badAmount}/${sqlRows.length} mismatched`);
  check("payments_view.payment_date", badDate === 0, `${badDate}/${sqlRows.length} mismatched`);
  check("payments_view.credit", badCredit === 0, `${badCredit}/${sqlRows.length} mismatched`);
  check("payments_view.debit", badDebit === 0, `${badDebit}/${sqlRows.length} mismatched`);
  const sqlCreditSum = sqlRows.reduce((t, r) => t + Number(r.credit || 0), 0);
  const jsCreditSum = paymentsView.reduce((t, r) => t + jsCredit(r), 0);
  check("payments_view.credit SUM", Math.abs(sqlCreditSum - jsCreditSum) < 0.05,
    `sql ${sqlCreditSum.toFixed(2)} vs js ${jsCreditSum.toFixed(2)}`);
}

// --- transactions_report (the money view) ----------------------------------------------
{
  const rows = sqlCte(db, "transactions_report", 'SELECT COUNT(*) AS n FROM transactions_report');
  check("transactions_report row count", rows[0].n === txReport.length, `sql ${rows[0].n} vs js ${txReport.length}`);

  const sqlRows = sqlCte(db, "transactions_report",
    'SELECT id, net_amount, profit, final_amount, unrounded_total FROM transactions_report');
  const byId = new Map(txReport.map((t) => [t.id, t]));
  let badNet = 0;
  let badProfit = 0;
  let badFinal = 0;
  let worstNet = 0;
  for (const r of sqlRows) {
    const js = byId.get(b64(r.id));
    if (!js) continue;
    const dn = Math.abs(Number(r.net_amount) - Number(js.net_amount));
    if (dn > worstNet) worstNet = dn;
    if (dn > 0.005) badNet++;
    if (Math.abs(Number(r.profit) - Number(js.profit)) > 0.005) {
      badProfit++;
      if (badProfit <= 3) {
        console.log(`      profit diff id=${b64(r.id).slice(0, 12)} sql=${r.profit} js=${js.profit} ` +
          `net=${r.net_amount}/${js.net_amount} alloc=${r.final_amount}/${js.final_amount} ` +
          `unrounded=${r.unrounded_total} cost=${r.cost_line}`);
      }
    }
    if (Math.abs(Number(r.final_amount) - Number(js.final_amount)) > 0.005) badFinal++;
  }
  check("transactions_report.net_amount", badNet === 0, `${badNet}/${sqlRows.length} mismatched, worst ${worstNet.toFixed(4)}`);
  check("transactions_report.profit", badProfit === 0, `${badProfit}/${sqlRows.length} mismatched`);
  check("transactions_report.final_amount", badFinal === 0, `${badFinal}/${sqlRows.length} mismatched`);
  // `unrounded_total` is NOT asserted against the JS view: buildTransactionsReport spreads `...t`
  // (a transactionView row) and adds only booker/company/final_amount/profit, so the JS row has no
  // such field. It is asserted structurally instead -- that it is present and non-NULL, which is
  // what the downstream allocation and the general ledger depend on.
  const missingUnrounded = sqlRows.filter((r) => r.unrounded_total === null || r.unrounded_total === undefined).length;
  check("transactions_report.unrounded_total present", missingUnrounded === 0, `${missingUnrounded}/${sqlRows.length} null/undefined`);
}

db.close();
console.log(`\n${problems.length ? `FAIL — ${problems.length} prelude check(s) failed` : "PASS — prelude matches compute/views.js"}`);
process.exit(problems.length ? 1 : 0);