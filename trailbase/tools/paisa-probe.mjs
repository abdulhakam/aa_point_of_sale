// P0 probe: settle the productsale.amount 1-paisa difference.
//
// The gate reports:  sql 29988457.51  vs  js 29988457.52
//
// IMPORTANT: the runtime composes reports from `prelude.sql` (which owns the view chain and
// aliases `invoices.type AS inv_type`), NOT from the standalone views/*.sql files. An earlier
// probe composed views/*.sql and reported "no such column: tv.inv_type" — that was the probe
// being wrong, not the report. This one uses the prelude, exactly as spoolreports.js does.
//
// Three constructions of the same total:
//   1. EXACT — sum round2(per-item amount) in integer paisa
//   2. SQL   — toCents(SUM(float)), what spoolreports.js emits
//   3. JS    — round2(sum of the same floats), what compute/reports.js does
//
// Run:  node trailbase/tools/paisa-probe.mjs

import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

const db = new DatabaseSync("traildepot/data/main.db", { readOnly: true });
const prelude = readFileSync("runtime/app/reports/sql/prelude.sql", "utf8").replace(/;\s*$/, "").trimEnd();

// Exactly sqlFor("productsale"): the body opens with a CTE, so join with a comma.
const body = readFileSync("runtime/app/reports/sql/reports/productsale.sql", "utf8").trim();
const sql = `${prelude},\n${body.replace(/^((?:\s*--[^\n]*\n)+)\s*,\s*/, "$1")}`;

// `transaction_view` is a CTE inside the prelude, not a database table, so the inner query has to
// be the prelude plus a SELECT — the same shape the report body uses.
const inner = `${prelude}\nSELECT tv.item AS id, SUM(tv.qty) AS units, SUM(tv.total) AS amount
  FROM transaction_view tv WHERE tv.inv_type = 1 GROUP BY tv.item`;

const rows = db
  .prepare(
    `SELECT sg.id AS id, sg.amount AS amount_float, printf('%.2f', sg.amount) AS amountText
     FROM (SELECT * FROM (${inner}) WHERE units > 0) sg`
  )
  .all();

console.log(`rows the report shows: ${rows.length}`);

const exactPaisa = rows.reduce((s, r) => s + Math.round(Number(r.amount_float) * 100), 0);
const sumFloat = rows.reduce((s, r) => s + Number(r.amount_float), 0);
const sqlCents = Math.floor(sumFloat * 100 + 0.5);
const jsCents = Math.round((sumFloat + Number.EPSILON) * 100);
const printedPaisa = rows.reduce((s, r) => s + Math.round(Number(r.amountText) * 100), 0);

console.log(`\n1. EXACT  sum of round2(per-row) in paisa   : ${(exactPaisa / 100).toFixed(2)}`);
console.log(`2. SQL    toCents(SUM(float))               : ${(sqlCents / 100).toFixed(2)}`);
console.log(`3. JS     round2(SUM(float))                : ${(jsCents / 100).toFixed(2)}`);
console.log(`4. PRINTED  sum of what the user reads      : ${(printedPaisa / 100).toFixed(2)}`);

const offenders = rows
  .map((r) => ({ id: String(r.id).slice(0, 16), raw: Number(r.amount_float), printed: Number(r.amountText) }))
  .filter((r) => Math.round(r.raw * 100) !== Math.round(r.printed * 100));
console.log(`\nrows whose PRINTED amount != round2(raw): ${offenders.length}`);
for (const o of offenders.slice(0, 8)) {
  console.log(`  item ${o.id}  raw=${o.raw}  printed=${o.printed.toFixed(2)}  delta=${(o.printed - Math.round(o.raw * 100) / 100).toFixed(2)}`);
}

const sqlDrift = exactPaisa - sqlCents;
const jsDrift = exactPaisa - jsCents;
console.log(`\nSQL - exact = ${sqlDrift} paisa    JS - exact = ${jsDrift} paisa`);
console.log(
  `\nVERDICT: ` +
    (sqlDrift === 0 && jsDrift === 0
      ? "both match the exact sum."
      : jsDrift === 0
        ? "JS is correct; SQL dropped a paisa — a real SQL defect to fix."
        : sqlDrift === 0
          ? "SQL is correct; the JS float accumulation lost a paisa, so the gate's 'js' column is the wrong number."
          : "NEITHER matches the sum of the printed rows; the report is internally inconsistent.")
);

// Sanity: does the real composed statement run? (catches a probe that is still composing wrong)
try {
  db.prepare(`${sql} LIMIT 1`).all();
  console.log("\nthe real composed productsale.sql runs: OK");
} catch (e) {
  console.log(`\nthe real composed productsale.sql FAILED: ${e.message}`);
}

db.close();
