// Does the storage actually hold drift, or is the money rule hiding nothing?
//
// tb-0015 exists because every money column is REAL and `printf("%.2f")` was used to hide accumulated
// error. Before re-scoping it against live data, measure whether there is anything to hide: a column
// that already holds exact 2 dp values gains nothing from becoming INTEGER, and one that does not is
// carrying a real defect.
//
// For each column: how many values, how many are NOT exact 2 dp (sub-paisa residue), how many are
// negative, and the extremes. A sub-paisa residue means `x * 100` is not an integer, which is the
// condition integer cents would actually fix.

import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

const dbPath = process.argv[2];
const db = new DatabaseSync(dbPath, { readOnly: true });

const MONEY = {
  items: ["cost_price", "sale_price"],
  expenses: ["amount"],
  invoices: ["discount_1", "discount_2", "discount_rs"],
  transactions: ["cost_price", "price", "discount_1", "discount_2", "discount_rs"],
  payments: ["amount"],
};
const QTY = { items: ["box_size_qty"], transactions: ["qty", "scheme"] };
const ID = { invoices: ["invoiceNo"] };

// Merged per TABLE, not per object: `{...MONEY, ...QTY}` would have `items`, `invoices` and
// `transactions` overwritten wholesale by the later spread, so the money columns of exactly the three
// tables that also carry quantities or identifiers would have gone unreported — and those are the
// tables with the drift in them.
const ALL = new Map();
for (const [table, cols] of [...Object.entries(MONEY), ...Object.entries(QTY), ...Object.entries(ID)]) {
  const kind = MONEY[table] ? "MONEY" : QTY[table] ? "QTY" : "ID";
  ALL.set(table, [...(ALL.get(table) || []), ...cols.map((c) => [c, kind])]);
}

const one = (sql) => db.prepare(sql).get();

console.log("== every numeric column that participates in money ==");
for (const [table, entries] of ALL) {
  for (const [c, kind] of entries) {
    const t = one(`SELECT type FROM pragma_table_info('${table}') WHERE name = '${c}'`);
    if (!t) { console.log(`  ${table}.${c}  MISSING`); continue; }
    const n = one(`SELECT COUNT(*) n, SUM(CASE WHEN ${c} IS NOT NULL THEN 1 ELSE 0 END) nn FROM ${table}`);
    // A value is "exact 2 dp" when x*100 is an integer to within float noise.
    const drift = one(
      `SELECT COUNT(*) bad FROM ${table}
        WHERE ${c} IS NOT NULL
          AND ABS((${c} * 100) - CAST(ROUND(${c} * 100) AS INTEGER)) > 1e-6`,
    );
    const neg = one(`SELECT COUNT(*) n FROM ${table} WHERE ${c} < 0`);
    const rng = one(`SELECT MIN(${c}) mn, MAX(${c}) mx FROM ${table}`);
    const pct = n.nn ? ((drift.bad / n.nn) * 100).toFixed(2) : "0.00";
    console.log(
      `  ${(table + "." + c).padEnd(26)} ${kind.padEnd(5)} ${String(t.type).padEnd(8)}` +
      ` n=${String(n.nn).padStart(6)}` +
      ` not2dp=${String(drift.bad).padStart(6)} (${pct.padStart(6)}%)` +
      ` neg=${String(neg.n).padStart(6)}` +
      ` [${rng.mn}, ${rng.mx}]`,
    );
  }
}

console.log("");
console.log("== the worst offenders, with their exact residue ==");
for (const [table, cols] of Object.entries(MONEY)) {
  for (const c of cols) {
    const rows = db
      .prepare(
        `SELECT id, ${c} v FROM ${table}
          WHERE ${c} IS NOT NULL
            AND ABS((${c} * 100) - CAST(ROUND(${c} * 100) AS INTEGER)) > 1e-6
          ORDER BY ABS((${c} * 100) - CAST(ROUND(${c} * 100) AS INTEGER)) DESC LIMIT 3`,
      )
      .all();
    for (const r of rows) {
      const cents = r.v * 100;
      console.log(
        `  ${(table + "." + c).padEnd(26)} ${String(r.v).padEnd(24)}` +
        ` x100 = ${cents}  residue = ${cents - Math.round(cents)}`,
      );
    }
  }
}
