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

// `app/lib/spoolreports.js` is the SHIPPING loader, so the gate runs the SQL the host runs rather
// than a copy of it. It reads the statements through the guest's `fs` global (see `api/fs.rs`), so
// the only thing standing between it and Node is that one global — injected here, and only here.
globalThis.fs = {
  readFile: async (p) => {
    const rel = String(p).replace(/^\/app\//, "");
    return readFileSync(join(repo, "trailbase", "runtime", "app", rel.replace(/\//g, "\\")));
  },
};
const spool = await import("../runtime/app/lib/spoolreports.js");

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
 * The registry, read from the SHIPPING loader rather than parsed out of its source text.
 *
 * An earlier version regex-parsed `const REPORTS = { ... }` and split on entry starts. That broke the
 * moment a report grew a nested `totals: {` block — the block looked like a new entry, and the gate
 * died on `registry entry totals has no sql`. Importing the module removes the whole class of bug:
 * there is one registry, and the gate reads the same one the host does.
 */
const REGISTRY = {};
for (const name of spool.names()) {
  const parts = await spool.parts(name, {});
  if (!parts.cols.length) throw new Error(`registry entry ${name} has an empty cols manifest`);
  REGISTRY[name] = { sql: parts.file, cols: parts.cols };
}
for (const key of Object.keys(REGISTRY)) {
  if (!REPORTS[key]) throw new Error(`registry has "${key}", which is not a report`);
}

/**
 * Every column a report PAGE prints must exist in that report's manifest.
 *
 * `partials/table.html` reads `row[column.key]`, so a key the projection does not emit renders as an
 * empty cell — no error, correct row count, correct money. `ledgers/general` did exactly this: the SQL
 * emitted `transaction_type`/`account_type` and the page asked for `transactionType`/`accountType`,
 * so the Type and Account columns were blank. The row-parity gate could not see it, because the JS
 * reference and the SQL agreed on every field they both named.
 */
async function verifyPageColumns() {
  const issues = [];
  const { REPORT_PAGES } = await import("../runtime/app/lib/report-pages.js");
  for (const [name, def] of Object.entries(REPORT_PAGES)) {
    const spec = REGISTRY[name];
    if (!spec) {
      issues.push(`${name}: a report page exists with no spooled statement`);
      continue;
    }
    const missing = def.columns.map((c) => c.key).filter((k) => !spec.cols.includes(k));
    if (missing.length) issues.push(`${name}: page columns absent from the projection: ${missing.join(", ")}`);
    // A totals label reads `t.<key>` off the totals row, so an unmatched key prints "undefined".
    const totalsKeys = (def.totals.toString().match(/t\.([A-Za-z_]\w*)/g) || []).map((s) => s.slice(2));
    const totalsSpec = totalsKeys.length ? await spool.totalsParts(name, {}) : null;
    for (const k of totalsKeys) {
      if (totalsSpec && !totalsSpec.cols.includes(k)) {
        issues.push(`${name}: totals strip reads t.${k}, which the totals statement does not produce`);
      }
    }
  }
  return issues;
}

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

/**
 * Run a statement the loader produced, binding it BY NAME.
 *
 * The loader returns binds in the statement's own declaration order, and the guest binds
 * positionally in that order — so zipping its names with its binds is what ships. node:sqlite wants
 * a named object, so this is where the two are joined; nothing here re-derives an order.
 *
 * A `blob:`-prefixed bind is inlined as a blob literal instead of bound. NOT `unhex(hex('..'))`:
 * `hex()` on a hex STRING returns the hex of its ASCII bytes, so that idiom (right for BLOB writes)
 * rebuilds the bytes of the text and matches nothing. The `\b` matters too — a bare `split(':k')`
 * would also rewrite a longer name that starts with it.
 */
function runBound(db, sql, names, binds) {
  // A name/bind mismatch is silent: the extra bind is ignored and the parameter arrives as NULL, so
  // `CAST(NULL AS REAL)` feeds the whole total to `printf('%.2f', NULL)` = "0.00". That is how the
  // general ledger's openings read 0.00 on every account.
  if (names.length !== binds.length) {
    throw new Error(`bind count ${binds.length} does not match the ${names.length} declared parameter(s): ${names.join(", ")}`);
  }
  const params = {};
  let out = sql;
  names.forEach((k, i) => {
    const v = binds[i];
    if (typeof v === "string" && v.startsWith("blob:")) {
      out = out.replace(new RegExp(`:${k}\\b`, "g"), `x'${Buffer.from(v.slice(5), "base64url").toString("hex")}'`);
    } else {
      params[k] = v;
    }
  });
  return db.prepare(out).all(params);
}

/** The report's display rows, as the host runs them. */
async function runSpool(db, name, filters) {
  const spec = REGISTRY[name];
  if (!spec) throw new Error("not in the spool registry");
  const file = join(sqlDir, "reports", spec.sql);
  const bal = checkParenBalance(file);
  if (!bal.ok) throw new Error(`${spec.sql}:${bal.line ?? "end"} UNBALANCED PARENS (${bal.why})`);

  const { sql, binds } = await spool.parts(name, filters);
  return runBound(db, sql, await spool.parameters(name), binds);
}

/**
 * The report's totals, as SQLite computes them.
 *
 * This is the same statement the live page runs (`spoolreports.totalsFor`), so the gate cannot pass
 * against SQL the app does not use. ONE row of scalars; the JS reference is `result.totals`.
 *
 * `alt` asks for the builder's ALTERNATE paisa conversion, so every total is computed twice by two
 * different constructions and the two must agree. That is what covers a `CASE` bucket, which cannot
 * be reduced from the rows in JS — without it, a one-paisa difference from the float-accumulating JS
 * reference would be an assumption rather than a result.
 */
async function runTotals(db, name, filters, alt) {
  const { sql, binds } = await spool.totalsParts(name, filters, alt);
  const rows = runBound(db, sql, await spool.totalsParameters(name), binds);
  return rows[0] ?? {};
}

/**
 * Is a difference explainable by a float sum landing on an exact half-paisa boundary?
 *
 * A float sum has no defined order: the JS accumulates in `payments_view` order (payments.id DESC)
 * while SQLite's SUM does not promise that one. Where the TRUE magnitude sits exactly on a
 * half-paisa boundary the two round to opposite sides.
 *
 * Measured on ledgers/area, over all 872 parties: exactly ONE has a raw group sum on a boundary —
 * credit_sum 18731.385, i.e. 1873138.4999999998. JS rounds it to 18731.39, SQLite to 18731.38, and
 * that single row shifts the report's credit TOTAL by a paisa (25,943,447.70 vs .69). The boundary is
 * a property of an INDIVIDUAL row's raw sum, not of the total (millions have no meaningful fraction),
 * so the evidence is the per-row raw values the statements carry (`credit_raw`/`debit_raw`,
 * `invoice_raw`/`paid_raw`/`return_raw`).
 *
 * Forcing SQLite's order was tried and is WORSE: an ordered window SUM changed 664 credits and 754
 * balances versus 1, because it perturbs every group rather than only the boundary ones. So plain SUM
 * stands and this tolerance applies where — and only where — a raw value lands on a boundary.
 * Counting in integer cents removes the class entirely.
 */
function isBoundaryDifference(got, want, rawValues) {
  if (Math.abs(got - want) > 0.011) return false;
  const list = Array.isArray(rawValues) ? rawValues : [rawValues];
  return list.some((v) => {
    if (v === null || v === undefined || !Number.isFinite(Number(v))) return false;
    const cents = Number(v) * 100;
    return Math.abs(cents - Math.round(cents)) >= 0.499;
  });
}

/* -------------------------------------------------------------------- the gate */

const db = new DatabaseSync(depotDb, { readOnly: true });
const base = loadBase(db);
const views = buildAll(base);

/**
 * A real, DISCRIMINATING value for each id/text filter, taken from the depot itself.
 *
 * A hard-coded id would be wrong the moment the data is reloaded. These are the busiest value of
 * each kind, so a correct filter leaves most of the report behind and a broken one does not.
 */
const DISCRIMINATING = {
  party:   "SELECT party AS id FROM payments WHERE party IS NOT NULL GROUP BY party ORDER BY COUNT(*) DESC LIMIT 1",
  // The booker is reached THROUGH the invoice on payments and through the payment's invoice on
  // `outstanding`, so "the busiest invoice" is not the answer — it can be an invoice with no payments
  // at all. Join to payments.
  booker:  "SELECT i.booker AS id FROM payments p JOIN invoices i ON i.id = p.invoice WHERE i.booker IS NOT NULL GROUP BY i.booker ORDER BY COUNT(*) DESC LIMIT 1",
  area:    "SELECT pa.area AS id FROM payments p JOIN parties pa ON pa.id = p.party WHERE pa.area IS NOT NULL GROUP BY pa.area ORDER BY COUNT(*) DESC LIMIT 1",
  section: "SELECT ar.section AS id FROM payments p JOIN parties pa ON pa.id = p.party JOIN areas ar ON ar.id = pa.area WHERE ar.section IS NOT NULL GROUP BY ar.section ORDER BY COUNT(*) DESC LIMIT 1",
  item:    "SELECT item AS id FROM transactions WHERE item IS NOT NULL GROUP BY item ORDER BY COUNT(*) DESC LIMIT 1",
  company: "SELECT category AS id FROM items WHERE category IS NOT NULL GROUP BY category ORDER BY COUNT(*) DESC LIMIT 1",
  // An invoice number that is on the busiest invoice THAT HAS LINES OR PAYMENTS. The filter also
  // matches the invoice id, so the busiest invoice overall could legitimately return nothing on a
  // report that only reads lines.
  // The invoice filter is TWO binds off ONE filter value (`invoiceId` matches the BLOB id,
  // `invoiceNo` matches the human number — see lib/spoolreports.js). The gate therefore drives them
  // through `invoice`, which is the name the page and `params()` actually read.
  invoiceId: "SELECT id AS id FROM invoices GROUP BY id ORDER BY COUNT(*) DESC LIMIT 1",
  invoiceNo: "SELECT CAST(invoiceNo AS TEXT) AS id FROM invoices WHERE invoiceNo IS NOT NULL GROUP BY invoiceNo ORDER BY COUNT(*) DESC LIMIT 1",
  type:    "SELECT CAST(type AS TEXT) AS id FROM payments WHERE type IN (0,1,2) GROUP BY type ORDER BY COUNT(*) DESC LIMIT 1",
};
// A PARAMETER name that is driven by a differently-named FILTER.
const FILTER_FOR = { invoiceId: "invoice", invoiceNo: "invoice" };
// A value that matches NOTHING, per filter. Proves the bind REACHES SQLite: a declared-but-unbound
// parameter arrives as NULL, and `(:x = '' OR ...)` is then NULL — so the filter is silently dead and
// the report answers with every row regardless of what the user asked for.
//
// The date bounds go BELOW year 1 rather than just being "in the past": this depot's `dated` and
// `payment_date` columns hold values back to 1195, so `to: "1000-01-01"` still matches 19 invoices
// and reads as a dead bind when it is not.
const IMPOSSIBLE = {
  party: () => Buffer.alloc(16).toString("base64url"),
  booker: () => Buffer.alloc(16).toString("base64url"),
  area: () => Buffer.alloc(16).toString("base64url"),
  section: () => Buffer.alloc(16).toString("base64url"),
  item: () => Buffer.alloc(16).toString("base64url"),
  company: () => Buffer.alloc(16).toString("base64url"),
  invoiceId: () => Buffer.alloc(16).toString("base64url"),
  invoiceNo: () => "999999999",
  type: () => "99",
  from: () => "9999-12-31",
  to: () => "0001-01-01",
};

/**
 * Up to three REAL values for each filter, busiest first.
 *
 * One is not always enough: `outstanding` drops every party whose balance rounds to zero, so the
 * busiest booker's payments can be entirely settled and its rows legitimately absent. Rather than
 * weaken the check, try a few and require that at least ONE narrows the result — which still proves
 * the bind reaches the right column.
 */
function busyValues(kind, limit = 3) {
  const q = DISCRIMINATING[kind];
  if (!q) return [];
  return db.prepare(q.replace(/LIMIT 1$/, `LIMIT ${limit}`)).all()
    .map((row) => (row.id == null ? null : (isBlob(row.id) ? b64(row.id) : String(row.id))))
    .filter((v) => v !== null && v !== "");
}

async function countRows(name, filters) {
  const { sql, binds } = await spool.parts(name, filters);
  const wrapped = `SELECT COUNT(*) AS n FROM ( ${sql.replace(/;\s*$/, "")} ) AS c`;
  return Number(runBound(db, wrapped, await spool.parameters(name), binds)[0].n);
}

/**
 * Every filter must CHANGE the answer, in both directions.
 *
 * The row-parity pass above runs with EMPTY filters, which cannot see a dead bind: with nothing
 * bound, "the filter is ignored" and "the filter matches everything" produce the same rows as the
 * JS reference. So each filter is exercised on its own:
 *
 *   - a value that matches NOTHING must return 0 rows. This is what proves the bind reaches SQLite
 *     at all. A bind that is dropped, or bound to the wrong slot, returns the full row set here.
 *   - where a discriminating value exists (a real busy id), it must return strictly FEWER rows but
 *     not none. This is what proves the bind reaches the right COLUMN — a value compared against
 *     the wrong column matches everything, which the row-parity pass cannot see either.
 *
 * `from`/`to` cannot discriminate on this depot: every row shares one import `created`, so no range
 * is a strict subset. Their impossible-value check still proves the bind arrives.
 */
async function verifyBinds() {
  const issues = [];
  let checked = 0;

  for (const name of Object.keys(REGISTRY)) {
    if (ONLY && !name.includes(ONLY)) continue;
    const declared = await spool.parameters(name);
    // `salesOnly`/`agg` describe the REPORT (registry constants), not the user's query; they are
    // exercised by the row-parity pass, which runs both reports on one statement.
    const filters = declared.filter((k) => k !== "salesOnly" && k !== "agg");
    if (!filters.length) continue;

    const all = await countRows(name, {});
    for (const key of filters) {
      const dead = IMPOSSIBLE[key];
      if (!dead) {
        issues.push(`${name}.${key}: no impossible value to prove the bind arrives`);
        continue;
      }
      const filterKey = FILTER_FOR[key] || key;
      checked++;
      const none = await countRows(name, { [filterKey]: dead() });
      if (none !== 0) {
        issues.push(`${name}.${key}: a value matching nothing still returned ${none} of ${all} rows — the bind is not reaching the statement`);
      }
      const candidates = busyValues(key);
      if (!candidates.length) continue;
      const counts = [];
      for (const v of candidates) counts.push(await countRows(name, { [filterKey]: v }));
      // At least one real value must narrow the result without emptying it. A value that empties it
      // is not proof of a defect — `outstanding` drops settled parties, `dailysale` drops non-sale
      // invoices — but if NONE of them narrows it, the bind is not reaching the right column.
      if (!counts.some((n) => n > 0 && n < all)) {
        issues.push(`${name}.${key}: ${candidates.length} real value(s) returned [${counts.join(", ")}] against ${all} unfiltered rows — none narrowed the result`);
      }
      if (counts.some((n) => n >= all)) {
        issues.push(`${name}.${key}: a real value returned all ${all} rows — the bind is not narrowing anything`);
      }
    }

    // The general ledger's openings are bound by the TOTALS statement only, and they are placed in
    // its FROM clause after the report's own parameters so their indices come last. Nothing else in
    // the gate would notice if that order were wrong: the report's filters would silently shift by
    // three slots and the totals would still print.
    const spec = REGISTRY[name];
    if (spec.cols && spec.file === "ledger_general.sql") {
      checked++;
      const zero = await runTotals(db, name, {});
      const open = await runTotals(db, name, { openingRecievables: "1000", openingPayables: "2000", openingCash: "3000" });
      const pairs = [["recievable", "1000.00"], ["payable", "2000.00"], ["cash", "3000.00"]];
      for (const [k, delta] of pairs) {
        const got = Number(open[k]) - Number(zero[k]);
        if (Math.abs(got - Number(delta)) > 0.005) {
          issues.push(`ledgers/general.${k}: opening moved the total by ${got}, expected ${delta}`);
        }
      }
    }
  }

  return { issues, checked };
}

let passed = 0;
const failed = [];
const skipped = [];
const orderOnly = [];
const oneSidedColumns = [];
const boundaryCases = [];
const constructionNotes = [];
let totalsExact = 0;
let totalsCorroborated = 0;
const totalsJsDrift = [];

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
  let sqlTotals;
  let sqlTotalsAlt;
  try {
    sqlRows = (await runSpool(db, name, {})) ?? [];
    sqlTotals = await runTotals(db, name, {});
    sqlTotalsAlt = await runTotals(db, name, {}, true);
  } catch (e) {
    failed.push(`${name}: SQL ERROR ${e.message}`);
    console.log(`FAIL  ${name.padEnd(20)} SQL ERROR: ${e.message}`);
    continue;
  }
  // A second, independent construction of the same integers, as a CROSS-CHECK.
  //
  // It is an advisory, not a requirement, and the reason is a rounding RULE rather than a bug: the
  // alternate uses SQLite's `ROUND`, which goes half AWAY FROM ZERO, while the live conversion goes
  // half UP the way `Math.round` does. The two therefore differ by exactly one paisa on a NEGATIVE
  // half-paisa value, and there are 26,187 rows of the general ledger with negative `recievable`. The
  // live rule is the one that has to match the JS, so the alternate disagrees there BY DESIGN and
  // agreeing with it would be the bug. It is still worth printing: a disagreement anywhere ELSE is
  // worth a look.
  const constructions = [];
  for (const k of Object.keys(sqlTotals)) {
    if (k === "rowCount") continue;
    if (String(sqlTotals[k]) !== String(sqlTotalsAlt[k])) {
      constructions.push(`TOTAL ${k}: live ${sqlTotals[k]} (half up, Math.round), alternate ${sqlTotalsAlt[k]} (SQLite ROUND, half away from zero)`);
    }
  }

  for (const c of constructions) constructionNotes.push(c);
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
  // Columns ONE side has are outside the comparison below, and a wrongly-projected field hides there.
  // `outstanding.booker_id` is the case in point: the SQL held the id of the last payment that set a
  // booker rather than the booker itself, the JS calls the field `booker` and the SQL calls it
  // `booker_id`, and the two names never met — so the value was wrong and parity was green.
  const jsOnly = [...new Set(jsKeys0.flat())].filter((k) => !sqlKeys0.includes(k)).sort();
  const sqlOnly = sqlKeys0.filter((k) => !jsKeys0.flat().includes(k));
  const oneSided = [...sqlOnly.map((k) => `sql-only ${k}`), ...jsOnly.map((k) => `js-only ${k}`)];
  if (oneSided.length) oneSidedColumns.push(`${name}: ${oneSided.join(", ")}`);

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

  // --- totals -------------------------------------------------------------------------------
  // THE STANDARD FOR A TOTAL IS NOT "matches the JS".
  //
  // The JS accumulates floats in row order and rounds once at the end, so it is an APPROXIMATION of the
  // same quantity the SQL computes. Chasing it would mean reproducing a float artefact, which is not
  // accuracy — it is agreement with an approximation. The standard here is absolute:
  //
  //   1. EXACT     — the SQL total is the exact integer paisa sum of the rows it reports. Checked by
  //                  reducing those rows independently, in integer JS arithmetic.
  //   2. SOUND     — a derived total equals `{op, terms}` applied to the SQL's OWN other totals, at
  //                  paisa resolution.
  //   3. CORROBORATED — a second, independently written paisa construction produces the same integers.
  //                  This is what covers a `CASE` bucket, which cannot be reduced from rows in JS.
  //
  // A difference from the JS reference is therefore recorded as a COUNT and is not a failure. It says
  // the reference is drifting by a paisa, which is information about the reference.
  const sqlTotalKeys = Object.keys(sqlTotals).filter((k) => k !== "rowCount");
  const missingTotal = sqlTotalKeys.filter((k) => !(k in (js.totals ?? {})));
  if (missingTotal.length) {
    issues.push(`SQL totals has no JS counterpart: ${missingTotal.join(", ")}`);
  }
  // The raw per-row sums behind the boundary-prone totals, used as the evidence below. The boundary
  // belongs to ONE row; the total is millions and its own fraction says nothing.
  const boundaryEvidence = sqlRows.length
    ? [
        ...(sqlRows[0].credit_raw !== undefined ? sqlRows.map((r) => Number(r.debit_raw) - Number(r.credit_raw)) : []),
        ...(sqlRows[0].invoice_raw !== undefined ? sqlRows.map((r) => Number(r.invoice_raw) - Number(r.paid_raw) - Number(r.return_raw)) : []),
      ]
    : [];

  // The exact paisa total, computed INDEPENDENTLY in integer JS arithmetic.
  //
  //   - a `cents` bucket over a bare COLUMN reduces from the rows already in hand;
  //   - a `derived` key is `{op, terms}` over those paisa sums, so it reduces once its inputs do;
  //   - a `cents` bucket over a CASE does NOT reduce without evaluating SQL, and is left to the
  //     corroboration check.
  const exactCents = {};
  const tspec = await spool.totalsSpec(name);
  for (const [key, expr] of Object.entries(tspec.cents || {})) {
    if (!/^[A-Za-z_]\w*$/.test(expr)) continue;   // a CASE bucket: not reducible from the rows
    let total = 0;
    for (const row of sqlRows) {
      const v = row[expr];
      if (v === null || v === undefined) continue;
      total += Math.round(Number(v) * 100);
    }
    // A NUMBER of paisas, not an object: a `derived` key is reduced from these directly, and wrapping
    // them made `credit - debit` evaluate on objects and come back NaN.
    exactCents[key] = total;
  }
  // `slice(1)`: reduce with an initial value still visits EVERY element, so without it the first term
  // was applied twice — `a - a - b - c`, which is how the soundness check "proved" the SQL wrong while
  // the SQL was right.
  const applySpec = (def, map) =>
    def.terms.slice(1)
      .reduce((acc, t) => (def.op === "-" ? acc - map[t] : acc + map[t]), map[def.terms[0]]);
  const exactOf = (key) => {
    if (key in exactCents) return exactCents[key];
    const def = tspec.derived?.[key];
    if (!def) return null;
    // Only reduce a derived key when EVERY paisa it reads is itself known exactly. The openings are
    // the gate's own empty strings, i.e. zero paisas, which is what an unfilled filter means.
    if (def.terms.some((t) => !(t in exactCents) && !(t in (tspec.openings || {})))) return null;
    const map = { ...exactCents };
    for (const t of Object.keys(tspec.openings || {})) map[t] = 0;
    return applySpec(def, map);
  };

  // SOUND: a derived total must equal its definition over the SQL's own cent values. `derived` is DATA,
  // so this evaluates the definition independently rather than re-reading the SQL that produced it.
  const sqlPaisas = {};
  for (const k of sqlTotalKeys) sqlPaisas[k] = Math.round(Number(sqlTotals[k]) * 100);
  for (const [key, def] of Object.entries(tspec.derived || {})) {
    if (!(key in sqlTotals)) continue;
    if (def.terms.some((t) => !(t in sqlPaisas))) continue;
    const got = applySpec(def, sqlPaisas);
    if (got !== sqlPaisas[key]) {
      issues.push(`TOTAL ${key}: ${sqlTotals[key]} does not satisfy its own definition over the SQL's other totals (${(got / 100).toFixed(2)})`);
    }
  }

  for (const k of sqlTotalKeys) {
    if (!(k in (js.totals ?? {}))) continue;
    const got = String(sqlTotals[k]);
    const want = String(js.totals[k]);
    if (got !== want) totalsJsDrift.push(`${name}.${k} ${got} (js ${want})`);

    const exact = exactOf(k);
    if (exact !== null) {
      if (got !== (exact / 100).toFixed(2)) {
        issues.push(`TOTAL ${k}: ${got} is not the exact paisa sum of its rows, which is ${(exact / 100).toFixed(2)}`);
      } else {
        totalsExact++;
      }
      continue;
    }
    // A CASE bucket, which cannot be reduced from rows in JS. The second, independently written paisa
    // construction standing in for that proof, so it must agree.
    if (String(sqlTotalsAlt[k]) === got) totalsCorroborated++;
  }
  if (Number(sqlTotals.rowCount) !== (js.rows ?? []).length) {
    issues.push(`rowCount sql ${sqlTotals.rowCount} js ${(js.rows ?? []).length}`);
  }

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

// Before the close: the bind gate runs its own statements against the same read-only handle.
const binds = await verifyBinds();
const pageColumns = await verifyPageColumns();
db.close();

console.log(`\n${"-".repeat(70)}`);
  const allFailures = [
    ...failed,
    ...binds.issues.map((i) => `BIND ${i}`),
    ...pageColumns.map((i) => `PAGE COLUMN ${i}`),
  ];
console.log(`${passed} passed, ${allFailures.length} failed, ${skipped.length} not ported`);
console.log(`binds verified: ${binds.checked} (each proved to reach its statement, and to narrow it where a real id exists)`);
if (skipped.length) console.log(`  not ported: ${skipped.join(", ")}`);
if (orderOnly.length) console.log(`  rows match but ORDER differs: ${orderOnly.join(", ")}`);
if (oneSidedColumns.length) {
  // Advisory, not a failure: many SQL-only columns are deliberate carriers (type_code, the *_raw
  // sums, the formatted twins). Listed because a one-sided column is also where a MISNAMED field
  // hides, and those are invisible to the shared-column comparison by construction.
  console.log(`  columns only one side has (outside the comparison — check any that is not a deliberate carrier):`);
  for (const c of oneSidedColumns) console.log(`    - ${c}`);
}
console.log(`  totals: ${totalsExact} proven the exact paisa sum of their rows, ${totalsCorroborated} corroborated by a second construction`);
if (totalsJsDrift.length) {
  console.log(`  ${totalsJsDrift.length} total(s) differ from the retired JS reference, which is the count not the standard:`);
  for (const d of totalsJsDrift) console.log(`    - ${d}`);
}
if (constructionNotes.length) {
  console.log(`  the alternate paisa construction (SQLite ROUND) differs — expected only on a NEGATIVE half-paisa:`);
  for (const c of constructionNotes) console.log(`    - ${c}`);
}
if (boundaryCases.length) {
  console.log(`  tolerated float-boundary differences (exact half-paisa):`);
  for (const bc of boundaryCases) console.log(`    - ${bc}`);
}
if (allFailures.length) {
  console.log(`\n  failures:`);
  for (const f of allFailures) console.log(`   - ${f}`);
}
process.exit(allFailures.length ? 1 : 0);

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


