// SQL-only benchmark: how long each preserved view takes in SQLite, with no JS runtime and no
// minijinja in the path at all.
//
// The guest's report pages are slow (four of them cross the ~20 s call deadline). This measures the
// part of that which is SQL, so the remainder can be attributed rather than guessed. The composer is
// the one the guest itself uses at runtime (`app/lib/sqlviews.js`), reimplemented here the same way
// `verify-legacy-views.mjs` does it: every ported dependency inlined as a CTE, the target wrapped in
// a subquery so a view that opens with its own `WITH` still works.
//
// "Cold" means **SQLite-cold**: a fresh connection with `cache_size = 1`, which defeats SQLite's
// page cache. The operating system's file cache still serves the reads and cannot be dropped from
// inside the process, so this is the honest label — the same caveat recorded in
// `vault/issues/report-build-cold-cache-near-the-call-deadline`.
//
// Usage:  node trailbase/tools/sql-bench.mjs [--cold] [--rounds N] [--json]

import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const viewsDir = join(repo, "trailbase", "runtime", "app", "reports", "sql", "views");
const depotDb = process.env.DEPOT_DB || join(repo, "trailbase", "traildepot", "data", "main.db");

const argv = process.argv.slice(2);
const ROUNDS = Number(argv[argv.indexOf("--rounds") + 1]) || 3;
const AS_JSON = argv.includes("--json");

const views = new Map();
for (const file of readdirSync(viewsDir).filter((f) => f.endsWith(".sql"))) {
  views.set(file.replace(/\.sql$/, ""), readFileSync(join(viewsDir, file), "utf8").trim());
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const depsOf = (name) => {
  const sql = views.get(name) ?? "";
  return [...views.keys()].filter((n) => n !== name && new RegExp(`\\b${escapeRe(n)}\\b`).test(sql));
};

function compose(name) {
  const ctes = [];
  const seen = new Set();
  const add = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    for (const d of depsOf(n)) add(d);
    ctes.push(`"${n}" AS (\n${views.get(n)}\n)`);
  };
  for (const d of depsOf(name)) add(d);
  if (!ctes.length) return views.get(name);
  return `WITH ${ctes.join(",\n")}\nSELECT * FROM (\n${views.get(name)}\n) AS _report`;
}

// The guest's report registry names its inputs in camelCase; the ported SQL uses snake_case.
const camelToSnake = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
const outstanding = (s) => (s === "outstanding" ? "outstanding_summary" : camelToSnake(s));

// Every report, with the views it asks the service for. `refs` is not a ported view — it is
// assembled from the base tables — so it is dropped here.
const REPORTS = {
  payments: ["paymentsView", "invoiceView"],
  salesreport: ["paymentsView", "invoiceView"],
  paymentsbycompany: ["paymentsInvoicesReport", "invoiceView"],
  profit: ["transactionsReport"],
  itemsales: ["transactionsReport"],
  stockreport: ["itemsReport"],
  difference: ["itemsDifferenceReport"],
  "ledgers/party": ["ledgerParty", "invoiceView"],
  "ledgers/booker": ["ledgerBooker", "invoiceView"],
  "ledgers/area": ["paymentsView"],
  "ledgers/general": ["ledgerJournal"],
  dailysale: ["invoiceView"],
  outstanding: ["outstanding"],
  productsale: ["transactionView"],
};

const open = (cold) => {
  const db = new DatabaseSync(depotDb, { readOnly: true });
  if (cold) db.exec("PRAGMA cache_size = 1");
  return db;
};

const median = (a) => {
  const s = a.slice().sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/**
 * Run a composed statement `rounds` times, on a fresh cold connection each round, and then once
 * more on a warm connection.
 *
 * The two numbers answer different questions and the difference between them is the whole point of
 * a materialised table:
 *
 *   BUILD  the first run on a fresh connection with `cache_size = 1`. This is what a trigger
 *          maintaining the table would pay per write, and what a full rebuild costs.
 *   READ   the second run on the same connection, with SQLite's page cache now populated. This is
 *          what serving a report from a materialised table costs.
 */
function time(name, sql, { rounds }) {
  const coldTimes = [];
  let rows = 0;
  let error = null;
  for (let i = 0; i < rounds; i++) {
    const db = open(true);
    const t0 = process.hrtime.bigint();
    try {
      rows = db.prepare(sql).all().length;
    } catch (e) {
      error = e.message;
      db.close();
      return { name, rows: 0, coldMs: 0, warmMs: 0, error };
    }
    coldTimes.push(Number(process.hrtime.bigint() - t0) / 1e6);
    // Warm read on the same connection: pages are now resident.
    const t1 = process.hrtime.bigint();
    db.prepare(sql).all();
    const warm = Number(process.hrtime.bigint() - t1) / 1e6;
    if (i === 0) time.firstWarm = warm;
    db.close();
  }
  const warmTimes = [];
  {
    const db = open(false);
    for (let i = 0; i < rounds; i++) {
      const t = process.hrtime.bigint();
      db.prepare(sql).all();
      warmTimes.push(Number(process.hrtime.bigint() - t) / 1e6);
    }
    db.close();
  }
  const r2 = (v) => Math.round(v * 10) / 10;
  return { name, rows, coldMs: r2(median(coldTimes)), warmMs: r2(median(warmTimes)), error: null };
}

const pad = (s, n) => String(s).padStart(n);
const out = { depot: depotDb, engine: null, views: [], reports: [] };

const probe = open(false);
out.engine = probe.prepare("select sqlite_version() as v").get().v;
const counts = {};
for (const t of ["invoices", "transactions", "payments", "items", "parties"]) {
  counts[t] = probe.prepare(`select count(*) as n from "${t}"`).get().n;
}
probe.close();

if (!AS_JSON) {
  console.log(`SQL-only benchmark — ${out.engine} on ${depotDb}`);
  console.log(
    `data: ${Object.entries(counts).map(([k, v]) => `${k} ${v.toLocaleString()}`).join(", ")}`
  );
  console.log(`rounds ${ROUNDS}, cold = a fresh connection with cache_size=1 (SQLite-cold, not OS-cold)\n`);
  console.log("-- per view: BUILD is a cold first run (what a trigger would pay), READ is warm " + "-".repeat(14));
}

// 1. Every view on its own.
for (const name of [...views.keys()].sort()) {
  const r = time(name, compose(name), { rounds: ROUNDS });
  r.deps = depsOf(name);
  out.views.push(r);
  if (!AS_JSON) {
    console.log(
      r.error
        ? `FAIL ${name.padEnd(28)} ${r.error}`
        : `${name.padEnd(28)} ${pad(r.rows, 7)} rows  build ${pad(r.coldMs + " ms", 9)}   read ${pad(r.warmMs + " ms", 8)}  deps: ${r.deps.join(", ") || "-"}`
    );
  }
}

// 2. The SQL closure each report would need if its arithmetic moved to SQL: every input view it
//    asks for, timed together. This is the number the tb-0022 decision has to beat.
if (!AS_JSON) console.log("\n-- per report: SQL closure of the views that report reads " + "-".repeat(24));
for (const [report, inputs] of Object.entries(REPORTS)) {
  const need = [...new Set(inputs.map(outstanding))].filter((v) => views.has(v));
  if (!need.length) continue;
  let totalBuild = 0;
  let totalRead = 0;
  let rows = 0;
  const parts = [];
  let failed = null;
  for (const v of need) {
    const r = time(v, compose(v), { rounds: ROUNDS });
    if (r.error) { failed = `${v}: ${r.error}`; break; }
    totalBuild += r.coldMs;
    totalRead += r.warmMs;
    rows += r.rows;
    parts.push(`${v} ${r.coldMs}/${r.warmMs}ms`);
  }
  out.reports.push({ report, views: need, buildMs: Math.round(totalBuild), readMs: Math.round(totalRead), rows, parts, error: failed });
  if (!AS_JSON) {
    console.log(
      failed
        ? `FAIL ${report.padEnd(18)} ${failed}`
        : `${report.padEnd(18)} ${pad(rows, 7)} rows  build ${pad(Math.round(totalBuild) + " ms", 8)}  read ${pad(Math.round(totalRead) + " ms", 8)}  (${parts.join(" + ")})`
    );
  }
}

if (AS_JSON) {
  console.log(JSON.stringify(out, null, 2));
} else {
  const ok = out.views.filter((v) => !v.error).length;
  const totalAll = out.views.filter((v) => !v.error).reduce((a, v) => a + v.coldMs, 0);
  const readAll = out.views.filter((v) => !v.error).reduce((a, v) => a + v.warmMs, 0);
  console.log("\n" + "-".repeat(72));
  console.log(
    `${ok}/${out.views.length} views ran.` + "\n" + `  building every view cold: ${Math.round(totalAll)} ms` + "\n" + `  reading every view warm:   ${Math.round(readAll)} ms`
  );
}
