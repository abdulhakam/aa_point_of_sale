// Baseline sweep: time every report through the LIVE JS implementation, on the real depot.
//
// This is the "before" column. It imports the shipping `compute/reports.js` and drives it over the
// same base tables `lib/data.js` reads, so the numbers are the ones the guest produces, with no
// server and no wasmtime in the way. The spooled arm is measured separately, in the guest, by
// `run-spool-bench.ps1` — this file establishes what it has to beat.
//
// Usage:  node trailbase/tools/bench-reports-baseline.mjs [--json] [--filter <substr>]

import { DatabaseSync } from "node:sqlite";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { REPORTS, runReport } from "../runtime/app/compute/reports.js";
import {
  buildRefs, buildTransactionView, buildInvoiceView, buildTransactionsReport,
  buildPaymentsView, buildPaymentsInvoicesReport, buildItemsReport,
  buildItemsDifferenceReport, buildLedgerJournal, buildLedgerBooker, buildLedgerParty,
  buildOutstanding,
} from "../runtime/app/compute/views.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const depotDb = process.env.DEPOT_DB || join(repo, "trailbase", "traildepot", "data", "main.db");

const argv = process.argv.slice(2);
const AS_JSON = argv.includes("--json");
const filterArg = argv.indexOf("--filter");
const ONLY = filterArg >= 0 ? argv[filterArg + 1] : null;

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
    db.prepare(`SELECT id FROM invoices WHERE status IS NULL OR status <> 'draft'`)
      .all()
      .map((r) => b64(r.id)),
  );
  // lib/data.js isCommitted: drafts are out of the books; payments/transactions judged by invoice.
  base.invoices = base.invoices.filter((r) => r.status !== "draft");
  for (const t of ["transactions", "payments"]) {
    base[t] = base[t].filter((r) => r.invoice == null || committed.has(String(r.invoice)));
  }
  return base;
}

const median = (a) => {
  const s = a.slice().sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** Every view, built once — the shared cost of the JS path. */
function buildAll(base) {
  const transactionView = buildTransactionView(base);
  const invoiceView = buildInvoiceView(base, transactionView);
  const transactionsReport = buildTransactionsReport(base, transactionView, invoiceView);
  const paymentsView = buildPaymentsView(base, invoiceView);
  const paymentsInvoicesReport = buildPaymentsInvoicesReport(base, paymentsView, transactionsReport, invoiceView);
  const itemsReport = buildItemsReport(base, transactionView);
  const itemsDifferenceReport = buildItemsDifferenceReport(base, transactionView);
  const ledgerJournal = buildLedgerJournal(base, paymentsView);
  const ledgerBooker = buildLedgerBooker(paymentsView);
  const ledgerParty = buildLedgerParty(paymentsView);
  const outstanding = buildOutstanding(base, paymentsView);
  return {
    transactionView, invoiceView, transactionsReport, paymentsView, paymentsInvoicesReport,
    itemsReport, itemsDifferenceReport, ledgerJournal, ledgerBooker, ledgerParty, outstanding,
    refs: buildRefs(base),
  };
}

const db = new DatabaseSync(depotDb, { readOnly: true });

const tLoad = Date.now();
const base = loadBase(db);
const loadMs = Date.now() - tLoad;

const tBuild = Date.now();
const views = buildAll(base);
const buildMs = Date.now() - tBuild;

if (!AS_JSON) {
  const counts = Object.entries(views)
    .filter(([k]) => Array.isArray(views[k]))
    .map(([k, v]) => `${k} ${v.length.toLocaleString()}`);
  console.log(`JS baseline sweep — ${depotDb}`);
  console.log(`base: ${Object.entries(base).map(([k, v]) => `${k} ${v.length}`).join(", ")}`);
  console.log(`views: ${counts.join(", ")}\n`);
  console.log(`base-table read ${loadMs} ms (one-off), view build ${buildMs} ms (one-off, shared by every report)\n`);
}

const results = [];
for (const name of Object.keys(REPORTS)) {
  if (ONLY && !name.includes(ONLY)) continue;

  const spec = REPORTS[name];
  const ctx = {};
  for (const input of spec.inputs) ctx[input] = views[input];

  // Three reps, median. The first rep warms QuickJS/JIT paths, so it is not representative.
  const times = [];
  let result = null;
  let error = null;
  for (let i = 0; i < 3; i++) {
    const t0 = process.hrtime.bigint();
    try {
      result = runReport(name, ctx, {});
    } catch (e) {
      error = e && e.message ? e.message : String(e);
      break;
    }
    times.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }

  const row = {
    report: name,
    title: spec.title,
    inputs: spec.inputs,
    rows: result && Array.isArray(result.rows) ? result.rows.length : 0,
    runMs: times.length ? Math.round(median(times)) : 0,
    samples: times.map((t) => Math.round(t)),
    error,
    totals: result ? result.totals : null,
  };
  results.push(row);

  if (!AS_JSON) {
    console.log(
      error
        ? `FAIL ${name.padEnd(20)} ${error}`
        : `${name.padEnd(20)} ${String(row.rows).padStart(7)} rows   ${String(row.runMs).padStart(7)} ms   (${row.samples.join(", ")})`
    );
  }
}

db.close();

if (AS_JSON) {
  console.log(JSON.stringify({ depot: depotDb, loadMs, buildMs, reports: results }, null, 2));
} else {
  const total = results.filter((r) => !r.error).reduce((a, r) => a + r.runMs, 0);
  const failed = results.filter((r) => r.error);
  console.log(`\n${"-".repeat(72)}`);
  console.log(`${results.length - failed.length}/${results.length} reports ran.`);
  console.log(`  sum of per-report medians: ${total.toLocaleString()} ms`);
  console.log(`  shared one-off cost: base read ${loadMs} ms + view build ${buildMs} ms`);
  if (failed.length) console.log(`  failed: ${failed.map((r) => r.report).join(", ")}`);
}

if (process.env.BENCH_JSON_OUT) {
  writeFileSync(process.env.BENCH_JSON_OUT, JSON.stringify({ depot: depotDb, loadMs, buildMs, reports: results }, null, 2));
}