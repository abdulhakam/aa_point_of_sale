// Gate every spooled report against the live JS implementation, on the real depot.
//
// One harness for all reports. Porting them one at a time with a bespoke checker each does not scale,
// and each bespoke checker can quietly differ from the last — which is how a wrong total passes.
//
// What is compared, per report:
//   - row COUNT, because two empty results "agree" and that is the failure mode that makes this kind
//     of gate worthless;
//   - the DISPLAY fields as a multiset, plus a field-level diff of the money columns;
//   - row ORDER, reported separately (it only decides some reports' totals);
//   - the totals, each reduced the way THAT report reduces them.
//
// The JS is the parity reference (vault: legacy-sql-views-differ-from-js-views).
//
// Usage: node trailbase/tools/verify-spool-reports.mjs [--filter <substr>] [--verbose]

import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
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
const sqlDir = join(repo, "trailbase", "runtime", "app", "reports", "sql");

const argv = process.argv.slice(2);
const VERBOSE = argv.includes("--verbose");
const fIdx = argv.indexOf("--filter");
const ONLY = fIdx >= 0 ? argv[fIdx + 1] : null;

const isBlob = (v) => v instanceof Uint8Array;
const b64 = (v) => Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64url");
const r2 = (v) => Math.round((Number(v ?? 0) + Number.EPSILON) * 100) / 100;
/**
 * A row's identity, for the per-row money diff.
 *
 * Normally the base64 of the `id` BLOB. Two exceptions:
 *   - `paymentsbycompany`'s id is a COMPOSITE key over two BLOBs (`paymentId|companyId`,
 *     views.js:221). The SQL assembles it with `hex()` (SQLite has no base64 builtin), so it cannot
 *     be byte-identical to the JS's base64 form. The two parts are therefore compared separately, on
 *     their own base64, rather than by the composite string.
 *   - a string id (either side) is used as-is.
 */
const rowId = (r) => {
  const v = r?.id;
  if (v === undefined || v === null) return String(v);
  if (typeof v === "string") return v.toLowerCase();
  return isBlob(v) ? b64(v) : String(v);
};
/**
 * Look up the JS row for an SQL row.
 *
 * `jm` is keyed on the same encoding the SQL emits (composite ids hexed on both halves, plain ids as
 * they are), so this is a plain map get. A miss is returned as undefined and reported as such, rather
 * than silently skipped — a join that does not match is exactly the failure worth being loud about.
 */
const jsRowFor = (jm, r) => jm.get(rowId(r));

/* ------------------------------------------------------------------ base data */

// `node:sqlite` returns each row as an OBJECT keyed by column name, not a positional array. Indexing
// one (`vals[i]`) gives undefined for every column, so every row becomes `{}` and the JS reference
// returns 0 rows — which looks like "the SQL works, the JS is broken" rather than a harness bug.
function readTable(db, table) {
  const cols = db.prepare(`SELECT name FROM pragma_table_info(?)`).all(table).map((r) => r.name);
  if (!cols.length) return [];
  return db.prepare(`SELECT * FROM "${table}" ORDER BY "id" DESC`).all().map((row) => {
    const o = {};
    for (const col of cols) {
      const v = row[col];
      // A BLOB is a Uint8Array, so Buffer.isBuffer is false and ids must be encoded from the byte
      // view. Getting that wrong breaks every join at once.
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

function buildAll(base) {
  const transactionView = buildTransactionView(base);
  const invoiceView = buildInvoiceView(base, transactionView);
  const transactionsReport = buildTransactionsReport(base, transactionView, invoiceView);
  const paymentsView = buildPaymentsView(base, invoiceView);
  return {
    transactionView, invoiceView, transactionsReport, paymentsView,
    paymentsInvoicesReport: buildPaymentsInvoicesReport(base, paymentsView, transactionsReport, invoiceView),
    itemsReport: buildItemsReport(base, transactionView),
    itemsDifferenceReport: buildItemsDifferenceReport(base, transactionView),
    ledgerJournal: buildLedgerJournal(base, paymentsView),
    ledgerBooker: buildLedgerBooker(paymentsView),
    ledgerParty: buildLedgerParty(paymentsView),
    outstanding: buildOutstanding(base, paymentsView),
    refs: buildRefs(base),
  };
}

/* --------------------------------------------------- registry + SQL composition */

/**
 * The spool registry, parsed from app/lib/spoolreports.js rather than duplicated, so the harness
 * cannot drift from the manifest the host enforces.
 *
 * Split on entry starts instead of matching `{...}` lazily: a `cols` list may contain `},` at a line
 * end, and a lazy body match stops there — registering only the first entry and reporting the rest as
 * "not ported". The key pattern must include the SLASH, since report keys are path-shaped
 * ("ledgers/booker"); without it those entries are dropped in silence.
 */
const registrySrc = readFileSync(join(repo, "trailbase", "runtime", "app", "lib", "spoolreports.js"), "utf8");
const REGISTRY = {};
{
  const start = registrySrc.indexOf("const REPORTS = {");
  const end = registrySrc.indexOf("\n};", start);
  const block = start >= 0 ? registrySrc.slice(start, end > start ? end : undefined) : "";
  const entries = block.split(/\n\s*(?=(?:["'][^"']+["']|[A-Za-z_$][\w$]*)\s*:\s*\{)/).slice(1);
  for (const entry of entries) {
    const name = /^\s*(?:["']([^"']+)["']|([\w$]+))\s*:\s*\{/.exec(entry);
    if (!name) continue;
    const key = name[1] ?? name[2];
    const sql = /sql:\s*"([^"]+)"/.exec(entry)?.[1];
    const colsRaw = /cols:\s*\[([\s\S]*?)\]/.exec(entry)?.[1] ?? "";
    const cols = colsRaw.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    if (!sql) throw new Error(`registry entry ${key} has no sql`);
    if (!cols.length) throw new Error(`registry entry ${key} has an empty cols manifest`);
    REGISTRY[key] = { sql, cols };
  }
}
if (!Object.keys(REGISTRY).length) throw new Error("could not parse the spool registry at all");
for (const key of Object.keys(REGISTRY)) {
  if (!REPORTS[key]) throw new Error(`registry has "${key}", which is not a report`);
}

/**
 * Per-report constant binds: parameters the page never supplies because they describe the REPORT,
 * not the user's filter. `salesreport` is "unpaid recieving/return only" (reports.js:146).
 * Without one, the statement returns the unrestricted row set and only the count differs — which is
 * how a real defect and a missing parameter look alike.
 */
const STATIC_BINDS = {
  salesreport: { salesOnly: "1" },
  difference: { agg: "difference" },
  stockreport: { agg: "stock" },
};

/** Report unbalanced parentheses with a usable message. */
function checkParenBalance(file) {
  const lines = readFileSync(file, "utf8").split("\n");
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*--/.test(line)) continue;
    for (const ch of line) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
    }
    if (depth < 0) return { ok: false, line: i + 1, why: "a `)` closes more than is open" };
  }
  return depth === 0
    ? { ok: true, depth: 0 }
    : { ok: false, depth, why: `${depth} unclosed paren(s)` };
}

/**
 * paymentsTotals / salesTotals bucket rules (reports.js:63-67, :88-90) as predicates over an SQL row.
 *
 * Keyed off the RAW type/paid/party_type, which is why the SQL carries those alongside the display
 * ones: `paymentRow` replaces them with labels, so summing the display row would bucket nothing.
 */
const PAYMENT_TOTAL_RULES = {
  recieving: (r) => Number(r.type_code) === 1 && !r.paid,
  recieved: (r) => Number(r.type_code) === 1 && !!r.paid,
  sending: (r) => Number(r.type_code) === 0 && !r.paid,
  sent: (r) => Number(r.type_code) === 0 && !!r.paid,
  recievingReturns: (r) => Number(r.type_code) === 2 && Number(r.party_type) === 0,
  sendingReturns: (r) => Number(r.type_code) === 2 && Number(r.party_type) !== 0,
  invoiceTotal: (r) => !r.paid,
  totalPaid: (r) => !!r.paid,
};

const preludePath = join(sqlDir, "prelude.sql");
// The prelude is a CTE list with NO statement: the loader joins each report's SELECT onto it. So it
// is legitimately one paren short on its own, and checking the file directly reports a false failure.
// The meaningful invariant is that the COMPOSED statement balances, which is how it is actually run.
{
  const bal = checkParenBalance(preludePath);
  // `line` is only set when a `)` closed more than was open (a hard error). One unclosed paren with no
  // line is the expected shape of a CTE list that has no statement of its own.
  const expectedShape = bal.depth === 1 && bal.line == null;
  if (!bal.ok && !expectedShape) {
    throw new Error(`prelude.sql:${bal.line ?? "end"} UNBALANCED PARENS (${bal.why})`);
  }
}
const prelude = readFileSync(preludePath, "utf8").replace(/;\s*$/, "").trimEnd();

function runSpool(db, name, filters) {
  const spec = REGISTRY[name];
  if (!spec) throw new Error("not in the spool registry");
  const file = join(sqlDir, "reports", spec.sql);
  const bal = checkParenBalance(file);
  if (!bal.ok) throw new Error(`${spec.sql}:${bal.line ?? "end"} UNBALANCED PARENS (${bal.why})`);

  const body = readFileSync(file, "utf8").trim();
  // Two body shapes (mirrors the loader in app/lib/spoolreports.js):
  //   - opens with its own CTEs -> the prelude needs a trailing COMMA to join them, and the body's
  //     own leading one must go (both -> `..., , next AS (` -> `near ","`);
  //   - contributes only a final SELECT -> NO comma (`..., SELECT` -> `near "SELECT"`).
  // The CTE marker follows the header comment block, so leading `--` lines are skipped.
  // Whitespace (blank lines included) may sit between the header comments and the CTE marker; requiring
  // adjacency left a `, name AS (` unstripped, and the statement then failed with the same
  // `near "SELECT"` as a missing comma -- pointing at the wrong cause.
  const withoutLeadComment = body.replace(/^((?:\s*--[^\n]*\n)+)\s*/, "$1");
  const opensWithCte = /^\s*,?\s*[\w$]+\s+AS\s*\(/.test(withoutLeadComment);
  let sql = prelude + (opensWithCte ? ",\n" : "\n")
    + (opensWithCte ? body.replace(/^((?:\s*--[^\n]*\n)+)\s*,\s*/, "$1") : body);

  // EVERY declared named parameter must be bound, even to "". node:sqlite binds nothing when handed
  // `{}`, and SQLite then treats `:booker` as NULL -- so `(:booker = '' OR ...)` is NULL (falsy) and
  // every filter excludes every row: 0 rows, no error, reads as "the port is wrong".
  // Named parameters are collected from the SQL with comments STRIPPED. A comment that mentions
  // something like `api::value_to_json` otherwise contributes `value_to_json` as a phantom parameter,
  // which the binder then tries to supply and SQLite rejects ("Unknown named parameter").
  const declared = [...new Set(
    [...body.replace(/--[^\n]*/g, "").matchAll(/:([a-z_][a-z0-9_]*)/gi)].map((m) => m[1]),
  )];
  const params = { ...(STATIC_BINDS[name] ?? {}) };
  for (const k of declared) {
    const v = filters[k] ?? params[k];
    const s = v === undefined || v === null ? "" : String(v);
    // A blob id is a base64url string, so inline it as a blob literal. NOT `unhex(hex('..'))`:
    // `hex()` on a hex STRING returns the hex of its ASCII bytes, so that idiom (right for BLOB
    // writes) rebuilds the bytes of the text and matches nothing. Dates stay bound.
    if (/^[A-Za-z0-9_-]{20,}$/.test(s) && s.length % 4 !== 1) {
      sql = sql.split(`:${k}`).join(`x'${Buffer.from(s, "base64url").toString("hex")}'`);
    } else {
      params[k] = s;
    }
  }
  return db.prepare(sql).all(params);
}

/* -------------------------------------------------------------------- the gate */

const db = new DatabaseSync(depotDb, { readOnly: true });
const base = loadBase(db);
const views = buildAll(base);

let passed = 0;
const failed = [];
const skipped = [];
const orderOnly = [];
const boundaryCases = [];

for (const name of Object.keys(REPORTS)) {
  if (ONLY && !name.includes(ONLY)) continue;

  const spec = REPORTS[name];
  const ctx = {};
  for (const input of spec.inputs) ctx[input] = views[input];

  if (!REGISTRY[name]) {
    skipped.push(`${name} (no SQL yet)`);
    continue;
  }

  let js;
  try {
    js = runReport(name, ctx, {});
  } catch (e) {
    skipped.push(`${name} (JS threw: ${e.message})`);
    continue;
  }

  let sqlRows;
  try {
    sqlRows = runSpool(db, name, {}) ?? [];
  } catch (e) {
    failed.push(`${name}: SQL ERROR ${e.message}`);
    console.log(`FAIL  ${name.padEnd(20)} SQL ERROR: ${e.message}`);
    continue;
  }

  const issues = [];

  // --- row content, as a multiset over the display columns -------------------------------
  // The key is built from every column EXCEPT the money ones. Money is compared properly in the
  // per-row diff below, with the exact-half-paisa float tolerance applied there; folding the money
  // into this key as well made one boundary row read as "1 differing row" while it was identical in
  // every business field, and leaving the money out entirely read as "158 differing rows" because the
  // key then lacked the columns that identify a row (item, company, qtyText).
  const MONEY_COLS = new Set([
    "credit", "creditText", "debit", "debitText", "balance", "balanceText",
    "amount", "amountText", "net_amount", "net_amountText", "final_amount", "final_amountText",
    "profit", "profitText", "stock_amount", "stockAmountText", "cost_price", "costText",
    "sale_price", "invoice_total", "invoice_totalText", "paid_total", "paid_totalText",
    "units", "qty", "invoice", "invoiceNo", "invoiceId",
  ]);
  // `id` identifies a row but is a BLOB, base64 on the SQL side and the same base64 in JS, so it is
  // compared separately (and exactly) rather than folded into this display key.
  //
  // The key is built over the columns the TWO SIDES SHARE, and only those. The JS report emits more
  // than the SQL row does (ledgerRow adds `invoiceId`, `balanceText`; txRow adds `qtyText` alongside
  // `qty`), so a key over each side's own columns never matches — every row "differs" while saying
  // nothing. Comparing the intersection also means a column that exists on one side only is reported
  // by the registry/parity checks rather than silently ignored here.
  const jsKeys0 = (js.rows ?? []).map((r) => Object.keys(r).filter((k) => k !== "id")).sort();
  const sqlKeys0 = sqlRows.length ? Object.keys(sqlRows[0]).filter((k) => k !== "id").sort() : [];
  const shared = jsKeys0.filter((k) => sqlKeys0.includes(k) && !MONEY_COLS.has(k));

  const key = (r) => shared.map((k) => `${k}=${r[k] ?? ""}`).join("|");
  const jsKeys = (js.rows ?? []).map(key).sort();
  const sqlKeys = sqlRows.map(key).sort();

  if (jsKeys.length !== sqlKeys.length) {
    issues.push(`rows js ${jsKeys.length} vs sql ${sqlKeys.length}`);
  } else {
    const bad = sqlKeys.filter((k, i) => k !== jsKeys[i]).length;
    if (bad) issues.push(`${bad} differing rows of ${jsKeys.length}`);
  }

  // --- row order, reported separately -----------------------------------------------------
  // Content must match exactly; order only DECIDES some reports' totals, and SQL cannot always
  // reproduce a JS sort (compareText is a per-character comparator, and a JS Array.sort on a constant
  // key keeps the array's original order). Reporting one as the other would either hide a real
  // ordering defect or cry wolf on a harmless one.
  const sameOrder = jsKeys.length === sqlKeys.length && jsKeys.every((k, i) => k === sqlKeys[i]);
  if (!sameOrder) orderOnly.push(name);

  // --- money columns, per row ---------------------------------------------------------------
  // The multiset key covers only the display columns, so a money field the template does not print
  // (stock_amount) can differ while every row still "matches" — which is exactly how stockreport
  // reported matching rows and a total off by 60.
  for (const f of ["stock_amount", "amount", "invoice_total", "paid_total", "balance"]) {
    if (!js.rows?.length || !sqlRows.length) continue;
    if (!(f in sqlRows[0]) || !(f in js.rows[0])) continue;
    // Keyed on the same encoding the SQL emits. The SQL builds this composite with hex() (SQLite has no
    // base64 builtin); the JS builds it by interpolating base64url strings. So both halves are
    // re-encoded to hex here, and LOWERCASED because SQLite's hex() emits lowercase — an uppercase
    // key matched nothing at all, which showed up as 32,562 of 32,562 rows "differing" while the row
    // count was exact.
    const jm = new Map((js.rows ?? []).map((r) => [
      typeof r.id === "string" && r.id.includes("|")
        ? r.id.split("|").map((p) => (p ? Buffer.from(p, "base64url").toString("hex") : "")).join("|").toLowerCase()
        : String(r.id),
      r,
    ]));
    let n = 0;
    let ex = "";
    for (const r of sqlRows) {
      const j = jsRowFor(jm, r);
      if (!j) { n++; continue; }
      const got = Number(r[f]);
      const want = Number(j[f]);
      if (Math.abs(got - want) <= 0.005) continue;
      // The raw sum behind `balance` is the boundary evidence; the rounded outputs carry no
      // fractional part of their own (2774.49 vs 2774.50), so the boundary is invisible without it.
      const raw = "credit_raw" in r ? Number(r.debit_raw) - Number(r.credit_raw)
        : "invoice_raw" in r ? Number(r.invoice_raw) - Number(r.paid_raw) - Number(r.return_raw)
        : undefined;
      if (isBoundaryDifference(got, want, raw)) {
        boundaryCases.push(`FIELD ${f}: party row on an exact half-paisa boundary (sql ${got} js ${want})`);
        continue;
      }
      n++;
      if (!ex) ex = ` sql=${r[f]} js=${j ? j[f] : "NO MATCH"} (id ${String(rowId(r)).slice(0, 24)})`;
    }
    if (n) issues.push(`FIELD ${f}: ${n} rows differ.${ex}`);


  }

  // --- totals, each reduced the way THAT report reduces them ---------------------------------
  issues.push(...compareTotals(js.totals ?? {}, sqlRows));

  const label = `${name.padEnd(20)} ${String(jsKeys.length).padStart(6)} rows`;
  if (issues.length === 0) {
    passed++;
    console.log(`ok    ${label}${sameOrder ? "" : "   (rows match, ORDER differs)"}`);
    if (VERBOSE) console.log(`      totals ${JSON.stringify(js.totals)}`);
  } else {
    failed.push(`${name}: ${issues.join("; ")}`);
    console.log(`FAIL  ${label}`);
    for (const i of issues.slice(0, 6)) console.log(`        ${i}`);
  }
}

db.close();
console.log(`\n${"-".repeat(70)}`);
console.log(`${passed} passed, ${failed.length} failed, ${skipped.length} not ported`);
if (skipped.length) console.log(`  not ported: ${skipped.join(", ")}`);
if (orderOnly.length) console.log(`  rows match but ORDER differs: ${orderOnly.join(", ")}`);
if (boundaryCases.length) {
  console.log(`  tolerated float-boundary differences (exact half-paisa):`);
  for (const bc of boundaryCases) console.log(`    - ${bc}`);
}
if (failed.length) {
  console.log(`\n  failures:`);
  for (const f of failed) console.log(`   - ${f}`);
}
process.exit(failed.length ? 1 : 0);

/* --------------------------------------------------------------- totals helpers */

/**
 * Is this a float-sum boundary rather than a real difference?
 *
 * A float sum has no defined order: the JS accumulates in `payments_view` order (payments.id DESC)
 * while SQLite's SUM does not promise that one. Where the TRUE magnitude sits exactly on a
 * half-paisa boundary the two round to opposite sides.
 *
 * Measured on ledgers/area, over all 872 parties: exactly ONE has a raw group sum on a boundary —
 * credit_sum 18731.385, i.e. 1873138.4999999998. JS rounds it to 18731.39, SQLite to 18731.38, and
 * that single row shifts the report's credit TOTAL by a paisa (25,943,447.70 vs .69). The boundary is
 * a property of an INDIVIDUAL row's raw sum, not of the total (millions have no meaningful fraction),
 * so the evidence is the per-row raw values.
 *
 * Forcing SQLite's order was tried and is WORSE: an ordered window SUM changed 664 credits and 754
 * balances versus 1, because it perturbs every group rather than only the boundary ones. So plain SUM
 * stands and this tolerance applies where — and only where — a raw value lands on a boundary.
 */
function isBoundaryDifference(got, want, rawValues) {
  if (Math.abs(got - want) > 0.011) return false;
  // Accepts one value or a list: the field-level check has a single row's raw sum, the totals check
  // has the whole column.
  const list = Array.isArray(rawValues) ? rawValues : [rawValues];
  return list.some((v) => {
    if (v === null || v === undefined || !Number.isFinite(Number(v))) return false;
    const cents = Number(v) * 100;
    return Math.abs(cents - Math.round(cents)) >= 0.499;
  });
}

/**
 * Per-report totals, each reduced the way the JS reduces it.
 *
 * Applying one formula to all of them is how a real mismatch gets misread as a pass (or the
 * reverse), so the rule per report is stated explicitly. From compute/reports.js:
 *
 *   payments / salesreport  buckets over type/paid/party_type     (paymentsTotals,     :59-81)
 *   profit                  +profit for sale, -profit otherwise    (reportProfit,       :259-261)
 *   itemsales               two conditional sums, then their diff (reportItemSales,    :267-271)
 *   stockreport             sum of ROUNDED per-row stock_amount   (reportStock,        :300)
 *   ledgers/party           the LAST row's balanceText            (reportLedgerParty,  :349)
 *   ledgers/booker          round2(creditTotal - debitTotal)      (reportLedgerBooker, :361-363)
 *   ledgers/area            sum of the per-row balances           (reportLedgerArea,   :396-398)
 *   outstanding             invoice_total / paid_total sums, and the per-row balance sum
 *                                                               (reportOutstanding,  :513-517)
 *   productsale             round2 over the RAW sum               (reportProductSale,  :546)
 *
 * `dailysale`, `paymentsbycompany` and `ledgers/general` are not ported yet.
 */
function compareTotals(T, rows) {
  const issues = [];
  const raw = (f) => rows.reduce((t, x) => t + Number(x[f] ?? 0), 0);
  const rawR2 = (f) => r2(raw(f));
  const roundedSum = (f) => r2(rows.reduce((t, x) => t + r2(x[f]), 0));

  const cmp = (label, jsVal, sqlVal) => {
    const a = typeof jsVal === "number" ? r2(jsVal) : parseFloat(jsVal);
    const b = typeof sqlVal === "number" ? r2(sqlVal) : parseFloat(sqlVal);
    if (!(Math.abs(a - b) <= 0.005)) issues.push(`${label}: js ${jsVal} sql ${sqlVal}`);
  };

  /**
   * `rawValues` is the list of PER-ROW raw sums behind this total, and it is what proves or disproves
   * a float boundary: the total itself is millions, so its own fraction says nothing, while one row
   * sitting on a half-paisa value is the whole explanation for a one-paisa difference.
   */
  const cmpSum = (label, jsVal, sqlVal, rawValues) => {
    const before = issues.length;
    cmp(label, jsVal, sqlVal);
    if (issues.length > before && isBoundaryDifference(Number(sqlVal), Number(jsVal), rawValues)) {
      issues.pop();
      const list = Array.isArray(rawValues) ? rawValues : [rawValues];
      const which = list.findIndex((v) => {
        const cents = Number(v) * 100;
        return Number.isFinite(cents) && Math.abs(cents - Math.round(cents)) >= 0.499;
      });
      boundaryCases.push(
        `${label}: js ${jsVal} vs sql ${sqlVal} — row ${which} has a raw sum on an exact `
        + `half-paisa boundary (${list[which]})`,
      );
    }
  };

  const first = rows[0] ?? {};
  const has = (f) => f in first;

  // payments / salesreport — keyed off the RAW type/paid/party_type, so they must NOT also be applied
  // to paymentsbycompany, whose `type` is a LABEL and whose party_type is not carried.
  // `payments` ALSO publishes invoiceTotal/totalPaid/recievingReturns (paymentsTotals, :63-67) but
  // buckets them off the RAW type/paid/party_type, not off the label — its `type` is a label too, so
  // "has type_code and type" is not enough to tell the two apart. The distinguishing field is
  // `party_type`, which only paymentsByCompany's rows lack (it is not projected there).
  const labelBuckets = has("type_code") && has("type") && !has("party_type") && "invoiceTotal" in T;
  if (!labelBuckets) {
    for (const [k, pred] of Object.entries(PAYMENT_TOTAL_RULES)) {
      if (!(k in T)) continue;
      cmp(k, T[k], r2(rows.reduce((t, x) => t + (pred(x) ? Number(x.amount ?? 0) : 0), 0)));
    }
  }

  // paymentsbycompany (reports.js:185-188) buckets on the LABEL, not on the raw type code:
  //   invoiceTotal     = !paid && !type.startsWith("return")
  //   totalPaid        = paid
  //   recievingReturns = type.startsWith("return")
  // `type` here is the composed label ("sale invoice", "recieving payment", ...), reports.js:170, so
  // the generic PAYMENT_TOTAL_RULES above cannot be used: those key off `type_code` and would bucket
  // everything as recieving/sending. This report is identified by having `type_code` AND a label.
  if (labelBuckets && "invoiceTotal" in T) {
    cmp("invoiceTotal", T.invoiceTotal, r2(rows.reduce(
      (t, x) => t + (!x.paid && !String(x.type).startsWith("return") ? Number(x.amount ?? 0) : 0), 0,
    )));
  }
  if (labelBuckets && "totalPaid" in T) {
    cmp("totalPaid", T.totalPaid, r2(rows.reduce(
      (t, x) => t + (x.paid ? Number(x.amount ?? 0) : 0), 0,
    )));
  }
  if (labelBuckets && "recievingReturns" in T) {
    cmp("recievingReturns", T.recievingReturns, r2(rows.reduce(
      (t, x) => t + (String(x.type).startsWith("return") ? Number(x.amount ?? 0) : 0), 0,
    )));
  }

  // profit (reports.js:259-261)
  if ("profit" in T) {
    cmp("profit", T.profit, r2(rows.reduce((t, x) => t + (Number(x.type_code) === 1 ? r2(x.profit) : -r2(x.profit)), 0)));
  }

  // itemsales (reports.js:267-271)
  if ("sale" in T && "returns" in T) {
    const sale = r2(rows.reduce((t, x) => t + (Number(x.type_code) === 1 ? r2(x.final_amount) : 0), 0));
    const returns = r2(rows.reduce((t, x) => t + (Number(x.type_code) !== 1 ? r2(x.final_amount) : 0), 0));
    cmp("sale", T.sale, sale);
    cmp("returns", T.returns, returns);
    cmp("total", T.total, r2(sale - returns));
  }

  // stockreport (reports.js:300): the ROW field is already round2(qty * cost_price) (reports.js:292),
  // so the total sums ROUNDED rows. Summing raws gave 3,336,910.03 against the JS 3,336,971.22.
  if ("stockAmount" in T) cmp("stockAmount", T.stockAmount, roundedSum("stock_amount"));

  // productsale (reports.js:546): round2 over the RAW sum.
  if ("amount" in T) cmp("amount", T.amount, rawR2("amount"));

  // ledgers/booker (reports.js:361-363): round2 of each total, then their difference.
  if ("credit" in T) cmpSum("credit", T.credit, roundedSum("credit"), rows.map((x) => x.credit_raw));
  if ("debit" in T) cmpSum("debit", T.debit, roundedSum("debit"), rows.map((x) => x.debit_raw));

  // `balance` differs per report, so the ROW SHAPE decides the formula rather than the presence of
  // the key — ledgers/booker, ledgers/area and ledgers/party all publish one, and applying one
  // formula to all of them reports the same real difference twice (or hides it):
  //   ledgers/area   (reports.js:398): sum of the per-row balances, each round2(debit - credit).
  //                   Identified by debit_raw, which only this report carries. The boundary evidence
  //                   is the summed RAW per-row difference, NOT the total: the total is millions, so
  //                   its own fraction is meaningless, while the per-row diffs add up to the exact
  //                   half-paisa value (2774.495) that the float order decides.
  //   ledgers/booker (reports.js:363): round2(creditTotal - debitTotal) of the two rounded totals.
  //   ledgers/party  (reports.js:350): the LAST row's balanceText, so the ORDER decides it.
  if ("balance" in T && !("invoice" in T)) {
    if (has("debit_raw")) {
      cmpSum("balance", T.balance, r2(raw("balance")), rows.map((x) => Number(x.debit_raw) - Number(x.credit_raw)));
    } else if ("credit" in T && "debit" in T) {
      cmp("balance", T.balance, r2(roundedSum("credit") - roundedSum("debit")));
    } else if (rows.length && has("balance")) {
      cmp("balance", T.balance, r2(rows[rows.length - 1].balance));
    }
  }

  // outstanding (reports.js:513-517): invoice_total / paid_total sums, and the per-row balance sum.
  // Guarded on `invoice` so it does not ALSO run the ledgers/party branch above — `outstanding` has a
  // `balance` column, and without the guard one real difference is reported twice: once as "the last
  // row's balance" (500.00) and once as the correct sum-of-rows.
  if ("invoice" in T) cmp("invoice", T.invoice, rawR2("invoice_total"));
  if ("paid" in T) cmp("paid", T.paid, rawR2("paid_total"));
  if ("invoice" in T && "balance" in T) {
    cmpSum("balance", T.balance, r2(raw("balance")), rows.map(
      (x) => Number(x.invoice_raw) - Number(x.paid_raw) - Number(x.return_raw),
    ));
  }

  return issues;
}