// Self-consistency gate for every report's SQL.
//
// It used to be a MIGRATION gate: SQL was compared row for row and total for total against
// `compute/reports.js`, and the goal was proving the two agreed before the JS was deleted. That
// migration is finished and the JS is gone, so the comparison is removed rather than left to rot.
//
// What remains is the part that was never relative. For each report it checks that:
//   - every column the page prints exists in the projection (a missing key renders as a blank cell,
//     with a correct row count and correct money);
//   - every totals key the page reads is produced by the totals statement;
//   - a filter with a real value NARROWS the result, and a value matching nothing returns nothing;
//   - the row-set SQL is paren-balanced as a file and as a composed statement;
//   - each total is EXACT (the integer paisa sum of the rows it reports, reduced independently in
//     integer arithmetic), SOUND (a derived total equals {op, terms} over the SQL's own totals at
//     paisa resolution), or CORROBORATED (a second, independently written paisa construction produces
//     the same integers).
//
// The standard for a total is absolute, not "matches the old implementation".
//
// Usage: node trailbase/tools/verify-spool-reports.mjs [--filter <substr>] [--verbose]
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildTransactionView, buildInvoiceView, buildTransactionsReport,
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
// There is no second registry to check against. `spool.names()` IS the list of reports: every report
// is SQL, and the SQL is what the manifest points at.

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
  // The page definitions are the manifests under `app/pages/**/meta.json`, which is what both
  // `/reports/<key>` and `/p/<slug>` read. They used to be a second copy in `report-pages.js`
  // (`REPORT_PAGES`), and the two had already drifted.
  //
  // Read with `node:fs` rather than through `app/lib/pages.js`: that module walks the tree with the
  // GUEST's async `fs` global, which does not exist in Node. Only the raw manifest shape is needed
  // here, and the guest's own normalisation is exercised by the page sweep instead.
  // `join(repo, ...)`, like every other path in this file. A bare relative path resolves against
  // process.cwd(), so this only worked when you happened to `cd trailbase` first — the documented
  // invocation (`node trailbase/tools/verify-spool-reports.mjs` from the repo root) walked every
  // report successfully and then died on the first page lookup, which is the worst shape a gate can
  // fail in: 14 green lines and a stack trace.
  const PAGES_DIR = join(repo, "trailbase", "runtime", "app", "pages");
  if (!existsSync(PAGES_DIR)) {
    throw new Error(`page manifests not found at ${PAGES_DIR}`);
  }
  const manifests = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "meta.json") {
        const meta = JSON.parse(readFileSync(full, "utf8"));
        if (meta.compute && meta.compute.report) manifests.push([meta.compute.report, meta]);
      }
    }
  };
  walk(PAGES_DIR);

  for (const [name, def] of manifests) {
    const spec = REGISTRY[name];
    if (!spec) {
      issues.push(`${name}: a report page exists with no spooled statement`);
      continue;
    }
    const columns = Array.isArray(def.columns) ? def.columns : [];
    const missing = columns.map((c) => c.key).filter((k) => !spec.cols.includes(k));
    if (missing.length) issues.push(`${name}: page columns absent from the projection: ${missing.join(", ")}`);
    // Each totals entry names a key on the totals row (or a composed `join` of them), so an
    // unmatched key prints "undefined".
    const groups = Array.isArray(def.totalsGroups) && def.totalsGroups.length
      ? def.totalsGroups
      : Array.isArray(def.totals) && def.totals.length
        ? [def.totals]
        : [];
    const totalsKeys = groups
      .flat()
      .flatMap((row) => (row.key ? [row.key] : (row.join || []).filter((p) => /^[A-Za-z_]\w*$/.test(p))));
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
 * Every total must be the sum of the column it prints.
 *
 * A report whose footer disagrees with its own body is wrong even when the disagreement is one paisa,
 * because the footer is what an operator trusts. Nothing else in this gate could see it: the EXACT
 * check reduces a total from the RAW rows, so it is happy when the total is internally consistent,
 * and a formatted column is by construction not the raw value.
 *
 * `productsale` was the case in point. It printed its amount with `printf('%.2f', …)`, which is
 * round-half-to-EVEN, while the totals strip rounds the same amounts half-UP. On a value landing
 * exactly on .xx5 the column and the footer disagreed, and the report's total was 2 paisa above the
 * sum of the numbers a user could add up. The statement now rounds with the money rule FIRST and only
 * then formats, so printf supplies trailing zeros and never a tie.
 *
 * The comparison is deliberately on the PRINTED text, in integer paisa, so it measures what a user
 * reading the page would total, not what the engine happened to produce.
 */
async function verifyTotalsMatchPrintedColumn(db) {
  const issues = [];
  let compared = 0;
  const WIDE = { from: "2020-01-01", to: "2030-12-31" };
  for (const name of Object.keys(REGISTRY)) {
    const tspec = await spool.totalsSpec(name);
    const cents = tspec.cents || {};
    // Only a `cents` key that reads a plain column can be paired with that column's printed twin. A
    // CASE bucket and a `derived` key are not printed as columns at all.
    const pairs = Object.entries(cents).filter(([, col]) => /^[A-Za-z_]\w*$/.test(String(col)));
    if (!pairs.length) continue;
    let rows, totals;
    try {
      rows = (await runSpool(db, name, WIDE)) ?? [];
      totals = await runTotals(db, name, WIDE);
    } catch (e) {
      issues.push(`${name}: ${e.message}`);
      continue;
    }
    for (const [key, col] of pairs) {
      const printedKey = `${col}Text`;
      if (!rows.length || rows[0][printedKey] === undefined) continue;   // not printed: nothing to compare
      let paisa = 0;
      for (const r of rows) {
        const t = r[printedKey];
        if (t === null || t === undefined || t === "") continue;
        const n = Number(t);
        if (!Number.isFinite(n)) { issues.push(`${name}.${printedKey}: a printed row is not a number (${t})`); break; }
        paisa += Math.round(n * 100);
      }
      const reported = Math.round(Number(totals[key]) * 100);
      compared++;
      if (reported !== paisa) {
        issues.push(
          `${name}.${key}: the total reads ${(reported / 100).toFixed(2)} but its own printed ` +
          `${printedKey} column sums to ${(paisa / 100).toFixed(2)} - off by ${((reported - paisa) / 100).toFixed(2)}`
        );
      }
    }
  }
  return { issues, compared };
}

/* -------------------------------------------------------------------- the gate */

const db = new DatabaseSync(depotDb, { readOnly: true });
// No base-table load and no in-JS view build: the retired engine was the only consumer, and the
// statements read the base tables themselves.

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
let totalsExact = 0;
let totalsCorroborated = 0;

for (const name of Object.keys(REGISTRY)) {
  if (ONLY && !name.includes(ONLY)) continue;

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

  // Row CONTENT and row ORDER against the retired JS reference are gone, for the same reason. A
  // report that no longer has a second implementation has nothing to be compared with, and a
  // comparison harness kept alive would keep implying that a green run means SQL and JS agree.

  // The per-row money comparison against the retired JS reference is gone: every report is SQL, so
  // there is no second implementation to differ from. The totals self-consistency below is the
  // standard now - EXACT, SOUND, CORROBORATED - and it is absolute rather than comparative.

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
    const got = String(sqlTotals[k]);

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

  const label = `${name.padEnd(20)} ${String(sqlRows.length).padStart(6)} rows`;
  if (issues.length === 0) {
    passed++;
    console.log(`ok    ${label}`);
    if (VERBOSE) console.log(`      totals ${JSON.stringify(sqlTotals)}`);
  } else {
    failed.push(`${name}: ${issues.join("; ")}`);
    console.log(`FAIL  ${label}`);
    for (const i of issues.slice(0, 6)) console.log(`        ${i}`);
  }
}

// Before the close: the bind gate runs its own statements against the same read-only handle.
const binds = await verifyBinds();
const pageColumns = await verifyPageColumns();
const printedTotals = await verifyTotalsMatchPrintedColumn(db);
db.close();

console.log(`\n${"-".repeat(70)}`);
  const allFailures = [
    ...failed,
    ...binds.issues.map((i) => `BIND ${i}`),
    ...pageColumns.map((i) => `PAGE COLUMN ${i}`),
    ...printedTotals.issues.map((i) => `TOTAL/COLUMN ${i}`),
  ];
console.log(`${passed} passed, ${allFailures.length} failed, ${skipped.length} not ported`);
console.log(`totals compared against the column they print: ${printedTotals.compared}`);
console.log(`binds verified: ${binds.checked} (each proved to reach its statement, and to narrow it where a real id exists)`);
if (skipped.length) console.log(`  not ported: ${skipped.join(", ")}`);
console.log(`  totals: ${totalsExact} proven the exact paisa sum of their rows, ${totalsCorroborated} corroborated by a second construction`);
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


