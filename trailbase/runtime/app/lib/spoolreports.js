// Spool-backed reports: run a report's SQL in SQLite and hand the renderer an address.
//
// THIS IS THE ONLY REPORT IMPLEMENTATION. Every report is the SQL under
// `reports/sql/reports/*.sql`; the JavaScript engine that used to sit beside it is deleted, and
// there is no `useJs` escape hatch to reach a second implementation.
//
// A note on the `reports.js:NN` references in the comments below. They point at
// `app/compute/reports.js`, the retired JavaScript engine, which no longer exists in the tree. Those
// comments are kept deliberately: they record WHY a statement buckets on a raw field, or rounds a
// sub-total before subtracting, or excludes a party type — the kind of thing that is otherwise
// re-litigated every time someone reads the SQL. The reference is to history, not to a live file:
//
//   git show 04cd42b:trailbase/runtime/app/compute/reports.js
//
// The standard for a report is no longer "agrees with that engine". `tools/verify-spool-reports.mjs`
// checks each total is EXACT (the integer paisa sum of the rows it reports), SOUND (a derived total
// equals {op, terms} over this file's own totals, at paisa resolution) or CORROBORATED (a second,
// independently written paisa construction agrees).
//
// The contract, end to end:
//
//   JS   compose the SQL, call `sql.spool`, get back `{ key, rows, bytes, queryMs, writeMs }`
//   Rust run the statement, serialise every row to JSONL, write it to the KV store  (spool.rs)
//   Rust read the key back and splice the rows into the context                     (render.rs)
//   JS   never sees a row
//
// A report is therefore three things: a `.sql` file under `reports/sql/reports/`, a column manifest
// here, and a totals spec. The manifest is required, not optional — `trailbase_wasm::db::query`
// returns positional `Vec<Vec<Value>>` with no column metadata, so the names are a contract the
// host asserts against the row width. A drifted manifest is a loud error, never a mislabelled row.
//
// Compare `sqlviews.js`, which is the other SQL path: it brings every row *into* JS. That is
// correct for a view other views build on, and wrong for a report's final projection.
//
// `fs` is a host global (see `api/fs.rs`), not an import — same as every other `app/lib` module.

const DIR = "/app/reports/sql/reports";
const PRELUDE = "/app/reports/sql/prelude.sql";
const PAGES_DIR = "/app/pages";

/* ------------------------------------------------------------------ the money rule */

/**
 * `v` as an exact integer number of **paisas**. This is the whole of the money arithmetic here.
 *
 * Every total is accumulated in these integers and divided by 100 exactly once, on the way out, so no
 * sum is ever a float sum of two-decimal amounts. That is the accuracy that matters: a float `SUM` of
 * 26,099 amounts accumulates representation error whose size depends on the order SQLite happens to add
 * in, which is not a property of the data. On this depot exactly one party in 872 has a group sum
 * sitting on a half-paisa, and the float form put the area-ledger credit total a paisa away from the
 * true figure — reproducibly, and for no reason a bookkeeper could name
 * ([[report-parity-flakes-on-float-arithmetic]]).
 *
 * The tie rule is **half up** — the accounting convention, and the same one the prelude's `round2`
 * already applies per row. It is chosen on merit, not to agree with anything.
 *
 * The correction below is not optional. A bare `CAST(z AS INTEGER)` truncates TOWARD ZERO, so for
 * `z = v + 0.5 < 0` it rounds up where half-up rounds down: `-0.6 + 0.5 = -0.1` truncates to `0`, and
 * half-up of `-0.6` is `-1`. Subtracting one when `z` is negative and non-integral restores `floor`,
 * and `floor(v + 0.5)` IS half-up for every `v`. This is the same template as the prelude's `round2`
 * and `tools/regen-round2.mjs`, minus the `/100.0` — one money rule, one spelling.
 *
 * On the values the money rule already guarantees — the 2 dp projections — the tie cannot occur at
 * all, so this only decides genuinely sub-paisa inputs such as the general ledger's raw account
 * columns. The general ledger is the one report where it changes a total, and it changes it by a
 * paisa against a rule that rounds the other way.
 *
 * `v` appears twice, once for the value and once for its sign, which is why a bucket is written as a
 * bare column expression and the conversion wraps it.
 */
const toCents = (e) => {
  const z = `((${e}) * 100) + 0.5`;
  return `(CAST(${z} AS INTEGER) - (CASE WHEN (${z}) < 0 AND (${z}) <> CAST(${z} AS INTEGER) THEN 1 ELSE 0 END))`;
};

/**
 * The ALTERNATE paisa conversion, for the parity gate only. Never used by the app.
 *
 * `CAST(ROUND(x * 100) AS INTEGER)` is a different construction for the same integer, which is what
 * lets the gate corroborate a bucket it cannot reduce from rows in JS — a `CASE` bucket like
 * `SUM(CASE WHEN paid = 1 THEN amount ELSE 0 END)`. The gate requires the two constructions to agree
 * before it accepts a total, so a one-paisa disagreement with the float-accumulating JS reference is
 * attributable rather than assumed.
 *
 * `ROUND` is available in node:sqlite and NOT in the guest, which is why this cannot be the live form.
 */
const toCentsAlt = (e) => `CAST(ROUND((${e}) * 100) AS INTEGER)`;

/** `num(v).toFixed(2)` in SQL: printf with an explicit width, so trailing zeroes survive. */
const money = (e) => `printf('%.2f', ${e})`;

/* ---------------------------------------------------------- the totals expressions */

/**
 * The raw per-row expressions several totals share, named once.
 *
 * `paymentsTotals` (compute/reports.js:63-67) buckets on the RAW row fields, which is why
 * `payments.sql` carries `paid`, `type_code` and `party_type` alongside the display columns.
 */
/**
 * The report registry — built from the page manifests, not written out here.
 *
 * Every report page's `meta.json` now carries a `spool` block:
 *
 *   ```json
 *   "compute": { "report": "paymentsbycompany" },
 *   "spool": {
 *     "sql":   "payments_by_company.sql",              // under reports/sql/reports/
 *     "binds": { "salesOnly": "1" },                  // report CONSTANTS, not user filters
 *     "row":   ["id", "date", ...],                   // SELECT order — a contract with the host
 *     "totals": { "cents": { ... }, "derived": { ... } }
 *   }
 *   ```
 *
 * `row` is required, not optional: `trailbase_wasm::db::query` returns positional
 * `Vec<Vec<Value>>` with no column metadata, so these names are the contract the host asserts
 * against the row width. A drifted manifest is a loud error, never a mislabelled row.
 *
 * The field names below are the ones the rest of this file already used (`cols` for `row`,
 * `salesOnly` promoted out of `binds`), so nothing downstream had to change.
 *
 * The shared SQL fragments that used to live here as `PAY`/`SALES`/`BYCOMPANY`/`ITEMSALES`
 * constants are gone: each manifest now carries its own `totals.cents`, already spread. That is the
 * duplication this task exists to remove — four reports shared `payments.sql`, and three of them
 * shared its totals buckets, which is exactly the sort of fact that drifts when it lives in two places.
 */
let REPORTS = {};
let LOADED = false;

/** `spool` block -> the registry entry, or null when the page is not a spooled report. */
function registryEntry(key, meta) {
  const spool = meta && meta.spool;
  if (!spool) return null;
  if (!spool.sql || !Array.isArray(spool.row)) {
    throw new Error(`manifest "${key}" declares compute.report but its spool block needs sql and row`);
  }
  return {
    sql: spool.sql,
    cols: spool.row,
    totals: spool.totals,
    // Report CONSTANTS the statement binds but the caller never sends. They describe the report, not
    // the user's query. `salesOnly` is `salesreport`'s "unpaid recieving/return only"; `agg` is how
    // `stockreport` and `difference` share one statement and still differ — omitting it leaves the
    // statement unrestricted so only the ROW COUNT changes, which reads as a data defect rather than a
    // missing bind. That is exactly how `difference` broke when this loader was written without it.
    salesOnly: spool.binds && spool.binds.salesOnly,
    agg: spool.binds && spool.binds.agg,
  };
}

/**
 * Build the registry from the page manifests.
 *
 * This module reads the manifests itself, through the host `fs` global it already uses for the `.sql`
 * files, rather than being handed them. Injecting them looked tidier — `route.ts` already had a
 * `reportPages()` to hand — and it is **wrong**: it put a load-order requirement between two modules
 * for no benefit, and the failure mode when the order is wrong is total (every route 500s at module
 * load, with the real cause 20 lines away in a 200,000-line server log).
 *
 * `fs` is injected the same way in Node: `tools/verify-spool-reports.mjs` sets `globalThis.fs` before
 * importing this file, so the gate still runs the shipping loader rather than a copy.
 */
async function loadRegistry() {
  const out = {};
  const walk = async (dir) => {
    let entries;
    try {
      entries = await fs.readdir(dir);
    } catch {
      return; // unreadable, or not a directory — a stray file under pages/ must not abort the walk
    }
    for (const name of entries) {
      if (name.startsWith(".")) continue;
      await walk(dir + "/" + name);
      let raw;
      try {
        raw = await fs.readFile(dir + "/" + name + "/meta.json");
      } catch {
        continue; // not a page
      }
      let meta;
      try {
        meta = JSON.parse(raw);
      } catch {
        continue; // a malformed manifest is reported by the page route, not here
      }
      const key = meta && meta.compute && meta.compute.report;
      if (!key) continue;
      const entry = registryEntry(key, meta);
      if (entry) out[key] = entry;
    }
  };
  await walk(PAGES_DIR);
  return out;
}

/**
 * The registry, loaded on first use and then held.
 *
 * Manifests are not re-read per request: the guest caches loaded modules on `globalThis`, so a change
 * to a `meta.json` needs the same server restart every other `app/` edit needs anyway.
 */
async function registry() {
  if (!LOADED) {
    REPORTS = await loadRegistry();
    LOADED = true;
    if (!Object.keys(REPORTS).length) {
      throw new Error(
        `no report manifests under ${PAGES_DIR} — the registry is empty and every report would 404`
      );
    }
  }
  return REPORTS;
}

/**
 * Adopt a registry directly, bypassing the manifest walk. For tests that want a specific registry.
 */
export function bindManifests(pagesByReportKey) {
  const next = {};
  for (const [key, meta] of Object.entries(pagesByReportKey || {})) {
    const entry = registryEntry(key, meta);
    if (entry) next[key] = entry;
  }
  if (!Object.keys(next).length) {
    throw new Error("bindManifests received no report manifests — the registry would be empty");
  }
  REPORTS = next;
  LOADED = true;
  return next;
}


/**
 * The registry entry for a report.
 *
 * "Not loaded yet" cannot be distinguished from "no such report" synchronously, so every caller
 * awaits `registry()` first and this only has to reject the second case — a missing `spool` block,
 * which is a real authoring mistake and must be loud rather than a silent 404.
 */
function specFor(name) {
  const spec = REPORTS[name];
  if (!spec) {
    throw new Error(`no spool block for report "${name}" — its meta.json needs a spool block`);
  }
  return spec;
}

/* ----------------------------------------------------------------------- totals */

/**
 * The totals manifest, in the order `totalsSql` emits the columns.
 *
 * A `derived` key SHADOWS a `cents` key of the same name rather than adding to it — that is how the
 * general ledger reports `recievable` as the opening plus the sum, not as two columns. The order is
 * otherwise not cosmetic: a derived key reads the paisa sums its dependencies produced, so those
 * must already be named.
 */
function totalsCols(spec) {
  const t = spec.totals || {};
  const derived = Object.keys(t.derived || {});
  return [
    "rowCount",
    ...Object.keys(t.cents || {}).filter((k) => !derived.includes(k)),
    ...derived,
    ...Object.keys(t.consts || {}),
    ...Object.keys(t.pick || {}),
  ];
}

/** The one alias a paisa quantity gets inside the statement, e.g. `recieving` -> `recieving_c`. */
const cent = (name) => `${name}_c`;

/**
 * The report's own statement, materialised ONCE as `totals_src`.
 *
 * The wrap is what makes a total trustworthy: it is computed over the very statement the page renders,
 * so a total can never describe a different row set — the failure a copied-out second file invites,
 * and one that is invisible in the row data.
 *
 * Cost, measured on this depot over all 14 reports: the aggregate pass is within noise of a bare
 * `COUNT(*)` over the same statement (5,401 ms against 5,320 ms for the whole set), because it reads
 * the same CTEs and never materialises a row. Two passes is not two times the cost.
 *
 * It is `SELECT * FROM ( … )`, NOT a bare nested `WITH … AS ( <report> )`. The report body carries the
 * whole prelude, and SQLite re-evaluated that inner `WITH` per reference instead of materialising it:
 * 8.5 s against 0.2 s, same answer.
 *
 * `ordered: false` drops the report's own trailing `ORDER BY`, for the aggregate shape ONLY. An
 * aggregate sums `SUM(CAST(x * 100 ± 0.5 AS INTEGER))` — INTEGER paisas — so the order rows arrive in
 * cannot change a total, and the sort is pure cost: on `paymentsbycompany` it was 121 ms of a 518 ms
 * pass (24%), because the statement sorts the whole 13,862-row fan-out to keep 3 sums. The `pick`
 * shape keeps it: its `ORDER BY … LIMIT 1` re-orders anyway, but its statement is the one the ledger
 * pages are read from, and there is no measurement here to say the sort is free.
 *
 * `String.replace` returns a new string, so the cached page statement in `sqlCache` is untouched —
 * stripping the sort for the totals pass cannot leak into the rows the page renders.
 */
const source = (sql, { ordered = true } = {}) => {
  const statement = sql.replace(/;\s*$/, "");
  // The newline after the strip is REQUIRED, not tidiness: every report's `ORDER BY` is preceded by
  // a `--` comment block, so a statement that now ends inside that comment would swallow the closing
  // `) AS t)` into it and the statement would not parse (`near "tiers": syntax error`).
  const body = ordered ? statement : `${statement.replace(/\nORDER BY[\s\S]*$/, "")}\n`;
  return `WITH totals_src AS (SELECT * FROM ( ${body} ) AS t)`;
};

/** The `pick` shape: one row, chosen by `order`, with the count over the whole set. */
function pickSql(t, sql) {
  const values = Object.entries(t.pick)
    .map(([key, col]) => {
      // `COALESCE` covers a party whose window matched nothing, which is where the JS default "0.00"
      // (reports.js:350) comes from.
      const row = `(SELECT ${col} FROM totals_src ORDER BY ${t.order} LIMIT 1)`;
      return `${money(`COALESCE(${row}, 0)`)} AS ${key}`;
    });
  return `${source(sql)}\nSELECT\n  COUNT(*) AS rowCount,\n  ${values.join(",\n  ")}\nFROM totals_src`;
}

/**
 * The aggregate shape, in TWO layers.
 *
 *   WITH totals_src AS ( <the report statement> ),
 *        tiers     AS (SELECT SUM(<paisas>) AS recieving_c, … , <openings> FROM totals_src)
 *   SELECT COUNT(*) AS rowCount,
 *          printf('%.2f', s.totalRecieving_c / 100.0) AS totalRecieving, …
 *   FROM (SELECT recieving_c - recieved_c - recievingReturns_c AS totalRecieving_c, … FROM tiers) AS s
 *
 * `tiers` is where every amount becomes a paisa. `SUM(CAST(x * 100 ± 0.5 AS INTEGER))` accumulates
 * **integers**, so a total is the exact sum of the rows behind it rather than a float sum of
 * two-decimal values whose value depends on addition order.
 *
 * The second layer exists so a derived total reads its dependencies' paisa sums instead of restating
 * them: `totalRecieving` is evaluated once, from `recieving_c - recieved_c - recievingReturns_c`, so
 * each bucket is summed once and the arithmetic between them is integer. The float form needed
 * `round2(round2(a) - round2(b))` here; paisas need one subtraction.
 *
 * Division by 100 happens once, on the way out, through `printf('%.2f', …)` — which also keeps the
 * trailing zeroes a money field must have.
 */
function aggregateSql(t, sql, toPaisas = toCents) {
  // The openings are bound, and they must be converted in the layer that comes AFTER the report's own
  // parameters in the SQL TEXT — a bound parameter's index is its position in the text. See the note
  // in the registry.
  const openNames = Object.keys(t.openings || {});
  const openCols = openNames.map((name) => `${toCents(`CAST(${t.openings[name]} AS REAL)`)} AS ${cent(name)}`);

  const tiers = Object.entries(t.cents || {}).map(([key, expr]) => `SUM(${toPaisas(expr)}) AS ${cent(key)}`);
  // The count lives in `tiers` too, and for the same reason: `tiers` is an AGGREGATE, so it produces
  // one row, and `COUNT(*)` in the outer SELECT would therefore have counted the tiers row and
  // answered 1 for every report. Carrying it out of the layer that actually saw the rows is the fix.
  const tierCols = ["COUNT(*) AS rowCount", ...tiers, ...openCols];

  // `refs` is what a `derived` key is built from: the paisa ALIAS in `tiers`, never the per-row
  // expression. Handing it the raw expression instead produced a `derived` that re-evaluated the CASE
  // per row in the second layer — the sum was then a float sum again, which is the thing paisas exist
  // to avoid.
  //
  // The references are QUALIFIED with `tiers.`. Unqualified, the general ledger's
  // `recievable_c + openR_c AS recievable_c` was self-referential: SQLite resolved `recievable_c` to
  // the alias being defined, the value came back NULL, and every total on that report read 0.00.
  //
  // A `derived` value is DATA (`{ op, terms }`), not a function, so the parity gate can evaluate the
  // same definition over the SQL's own paisa values and check it holds. A function returning SQL text
  // could only be checked by asking SQLite whether it agrees with itself.
  const refs = {};
  for (const key of Object.keys(t.cents || {})) refs[key] = `tiers.${cent(key)}`;
  for (const name of openNames) refs[name] = `tiers.${cent(name)}`;
  for (const [key, def] of Object.entries(t.derived || {})) {
    refs[key] = `(${def.terms.map((t) => refs[t]).join(` ${def.op} `)})`;
  }

  // The reported keys, in manifest order: the cents that are not shadowed, then derived, then consts.
  const derivedKeys = Object.keys(t.derived || {});
  const carried = Object.keys(t.cents || {}).filter((k) => !derivedKeys.includes(k));
  const reported = [...carried, ...derivedKeys, ...Object.keys(t.consts || {})];

  // The second layer is what the outer select reads, so it must NAME every reported key. A plain cents
  // key is passed through under its own alias; a derived key is computed from the paisa sums; a const
  // is a literal paisa amount. Naming only the derived keys left the plain ones as `no such column`
  // on `s`, which is the whole reason this layer exists rather than selecting `tiers` directly.
  const secondLayer = [
    ...carried.map((key) => `tiers.${cent(key)} AS ${cent(key)}`),
    ...derivedKeys.map((key) => `${refs[key]} AS ${cent(key)}`),
    ...Object.entries(t.consts || {}).map(([key, paisas]) => `${paisas} AS ${cent(key)}`),
  ];

  // `rowCount` is an integer, so it is read straight through — `printf` is for money, and `tiers` is
  // the layer that actually counted rows.
  const values = ["s.rowCount AS rowCount",
    ...reported.map((key) => `${money(`s.${cent(key)} / 100.0`)} AS ${key}`)];

  const from = secondLayer.length
    // `rowCount` is carried through the second layer, or the outer select's `s.rowCount` is a name the
    // subquery never produced.
    ? `FROM (SELECT\n    rowCount,\n    ${secondLayer.join(",\n    ")}\n  FROM tiers) AS s`
    : "FROM tiers AS s";
  // `source(sql)` is CALLED here. `${source}` would interpolate the function itself, and
  // `String(fn)` is its source text — so the statement would have begun with `(sql) => \`WITH …` and
  // every totals query would have failed to parse with `near "("`.
  const withClause = `${source(sql, { ordered: false })}${tierCols.length
    ? `,\n  tiers AS (SELECT\n    ${tierCols.join(",\n    ")}\n  FROM totals_src)`
    : ""}`;

  return `${withClause}\nSELECT\n  ${values.join(",\n  ")}\n${from}`;
}

/**
 * The totals statement: ONE row, in the same unit the report's money rule already guarantees.
 *
 * See [[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]] for why it wraps the
 * report rather than restating it, and why the two shapes exist.
 */
async function totalsSql(name, alt) {
  // The `alt` flag selects the gate-only alternate paisa conversion, so its two statements are
  // cached apart.
  const cacheKey = alt ? `${name}:alt` : name;
  if (totalsCache.has(cacheKey)) return totalsCache.get(cacheKey);
  const { sql, spec } = await sqlFor(name);
  const t = spec.totals || {};
  const out = t.order || t.pick ? pickSql(t, sql) : aggregateSql(t, sql, alt ? toCentsAlt : toCents);
  totalsCache.set(cacheKey, out);
  return out;
}

/**
 * The totals statement's binds.
 *
 * The report's own binds come FIRST because the report statement is textually first (it is the
 * materialised `totals_src`); the openings follow, in the order `totalsParams` was given them, which
 * is the order `totalsSql` wrote them into the `tiers` layer.
 */
async function totalsParams(name, filters) {
  const { spec } = await sqlFor(name);
  const binds = await params(name, filters);
  const openings = (spec.totals || {}).openings || {};
  if (!Object.keys(openings).length) return binds;
  const f = filters || {};
  const text = (v) => (v === undefined || v === null ? "" : String(v));
  return binds.concat(Object.values(openings).map((p) => text(f[p.replace(/^:/, "")])));
}


const sqlCache = new Map();
const totalsCache = new Map();
let preludeCache = null;

/**
 * The shared view chain, composed in front of every report.
 *
 * Without this, each of the reports would carry its own copy of `payments_view` and the invoice money
 * chain — where they would drift apart, silently, and a rounding fix would have to be applied a dozen
 * times. Composed once, there is one copy to verify (`tools/verify-prelude.mjs`).
 *
 * The prelude ends with a CTE list and no statement. Reports come in two shapes:
 *   - they open with their own CTEs (`name AS (...)` … then a SELECT) — the prelude's last CTE needs
 *     a trailing COMMA to join them;
 *   - they contribute only a final SELECT (`ledger_booker.sql`) — a trailing comma there leaves
 *     `..., SELECT` and SQLite fails with `near "SELECT"`.
 * So the comma is added per report, not baked into the prelude.
 */
async function prelude() {
  if (preludeCache === null) {
    preludeCache = String(await fs.readFile(PRELUDE)).replace(/;\s*$/, "").trimEnd();
  }
  return preludeCache;
}

/**
 * The base tables a report's own composed statement reads.
 *
 * This replaces `tablesForViews(manifest.needs.views)`, which asked a hand-written provenance map in
 * `compute/views.js` which base tables a named view needed. That map described a world where reports
 * read derived views; they now read base tables through the prelude, so the honest answer is "whatever
 * this statement names" — which is both accurate and self-maintaining, where the map was neither once
 * the reports stopped using it.
 *
 * CTE names are excluded, so `stock_deltas` does not read as a table. `FROM (` (a subquery) matches
 * nothing, because the pattern requires a word character.
 *
 * Used only by `/bench/report`, which measures what a component split would have to acquire. That is a
 * benchmark question, not a correctness one.
 */
export async function tablesForReport(name) {
  const { sql } = await sqlFor(name);
  // Strip comments before scanning. The prelude documents its own provenance in prose, and a
  // "-- … FROM the … AS (…" line parses as perfectly good SQL: the first version of this read the
  // statement unstripped and answered `[…, sections, the, transactions_report]`.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
  const composed = strip(sql);

  // CTE names come from the COMPOSED statement, because most of them are defined in the prelude.
  const ctes = new Set();
  for (const m of composed.matchAll(/(?:^|[,\s])([\w$]+)\s+AS\s*\(/g)) ctes.add(m[1]);

  // The base tables come from the report's OWN body, not the composed statement — and that distinction
  // is the whole point. The prelude is shared, so scanning the composed statement reports the prelude's
  // table set for EVERY report (all ten answers came back identical: areas, companies, expenses,
  // invoices, items, order_bookers, parties, payments, sections, transactions). That is true and
  // useless: `/bench/report` exists to measure what a report costs BEYOND the common query, which is a
  // per-report property. So this is the report's own extra acquisition, with prelude-defined CTEs
  // filtered out so `FROM stock_deltas` does not read as a table.
  const own = strip(String(await fs.readFile(`${DIR}/${specFor(name).sql}`)));
  const tables = new Set();
  for (const m of own.matchAll(/\b(?:FROM|JOIN)\s+([\w$]+)/gi)) {
    if (!ctes.has(m[1])) tables.add(m[1]);
  }
  return [...tables].sort();
}

/**
 * Compose a statement onto the shared prelude.
 *
 * Exported because `app/lib/baseviews.js` needs the same composition for `items_report.sql`, and a
 * second copy of this rule is a second copy that can be subtly wrong — the failure it guards against is
 * a `near "SELECT"` parse error that points at the wrong line. One implementation, two callers.
 */
export async function composeStatement(body) {
  const text = String(body).trim();
  const withoutLeadComment = text.replace(/^((?:\s*--[^\n]*\n)+)\s*/, "$1");
  const opensWithCte = /^\s*,?\s*[\w$]+\s+AS\s*\(/.test(withoutLeadComment);
  return (await prelude()) + (opensWithCte ? ",\n" : "\n") + (opensWithCte
    ? text.replace(/^((?:\s*--[^\n]*\n)+)\s*,\s*/, "$1")
    : text);
}

/** The composed statement for a report: the shared prelude plus the report's own body. */
async function sqlFor(name) {
  await registry();
  const spec = specFor(name);
  if (!spec) throw new Error(`No spooled report: ${name}`);
  if (!sqlCache.has(name)) {
    sqlCache.set(name, await composeStatement(await fs.readFile(`${DIR}/${spec.sql}`)));
  }
  return { spec, sql: sqlCache.get(name) };
}

/** The report's OWN body (not the prelude) — enough to discover its named parameters. */
async function sqlText(name) {
  await registry();
  const spec = specFor(name);
  return String(await fs.readFile(`${DIR}/${spec.sql}`));
}

/** Drop the cached SQL, so an edit is picked up without a restart. */
export function invalidate() {
  sqlCache.clear();
  totalsCache.clear();
  preludeCache = null;
}

/**
 * Filter values -> bind parameters.
 *
 * Ids are base64url strings (that is how the host hands a BLOB to JS) but are BLOBs in the database,
 * so they are passed with the `blob:` prefix that `spool::bind_param` decodes back to a real BLOB.
 * Passing one as a bare string compares TEXT against BLOB and matches nothing, which reads as "the
 * filter returns no rows" rather than as a type error.
 *
 * THE LIST MUST COVER EVERY PARAMETER THE STATEMENT DECLARES. Each report binds its own set — a
 * shared statement declares the union (`transactions.sql` alone declares booker, party, area,
 * section, item, company, invoice, from, to). A parameter that is declared but NOT bound arrives as
 * NULL, so `(:party = '' OR ...)` is never true and the whole report returns zero rows — which looks
 * like a broken date filter rather than a missing bind.
 *
 * `unboundParams(name)` asserts this, so a new filter in a statement cannot be added without its
 * bind.
 */
async function params(name, filters) {
  await registry();
  const f = filters || {};
  const text = (v) => (v === undefined || v === null ? "" : String(v));
  const id = (v) => (v === undefined || v === null || v === "" ? "" : `blob:${v}`);
  const spec = specFor(name);

  const values = {
    booker: id(f.booker),
    party: id(f.party),
    area: id(f.area),
    section: id(f.section),
    item: id(f.item),
    company: id(f.company),
    // `invoice` is the ONE filter that matches two different things, so it needs TWO binds.
    // `paymentFilters` (reports.js:124) is `r.invoice === f.invoice || String(r.invoiceNo) === f.invoice`:
    // the first half compares an invoice ID (a BLOB, so `blob:`) and the second a NUMBER rendered as text
    // (so a plain string). One bind cannot be both: passing the blob form makes the number comparison
    // compare against raw bytes and match nothing, and passing the text form makes the id comparison
    // compare TEXT against BLOB and match nothing. The two branches were both dead until this split.
    invoiceId: id(f.invoice),
    invoiceNo: text(f.invoice),
    from: text(f.from),
    to: text(f.to),
    // `payments` filters on the raw payment type code (reports.js:127), which arrives as TEXT from a
    // query string and is CAST in the statement.
    type: text(f.type),
    // Report-constant parameters, from the REGISTRY rather than the caller's filter: they describe
    // the report, not the user's query. `salesreport` is "unpaid recieving/return only"
    // (reports.js:146); `difference`/`stockreport` differ only in which aggregate they read.
    // Omitting them leaves the statement unrestricted so only the ROW COUNT differs, which reads
    // as a real defect rather than as a missing bind.
    salesOnly: text(spec?.salesOnly),
    agg: text(spec?.agg),
    // `ledgers/general` openings. Declared by its TOTALS statement only — see `totalsParams`.
    openingRecievables: text(f.openingRecievables),
    openingPayables:    text(f.openingPayables),
    openingCash:        text(f.openingCash),
  };

  const ordered = (await unboundParams(name)).map((k) => {
    if (!(k in values)) throw new Error(`no bind for report parameter "${k}" (${name})`);
    return values[k];
  });
  return ordered;
}

/**
 * The named parameters a report's statement declares, read from the SQL itself.
 *
 * Async because it reads the statement off disk — and `params` awaits it, so the ORDER of the binds
 * always matches the statement's own declaration order. Binding positionally by hand would silently
 * permute the values the first time a report declared its filters in a different order.
 */
async function unboundParams(name) {
  await registry();
  const spec = specFor(name);
  if (!spec) throw new Error(`No spooled report: ${name}`);
  const body = await sqlText(name);
  // Comments are stripped first: prose that mentions something like `api::value_to_json` would
  // otherwise contribute a phantom parameter name.
  return [...new Set([...body.replace(/--[^\n]*/g, "").matchAll(/:([a-z_][a-z0-9_]*)/gi)].map((m) => m[1]))];
}

/**
 * Run the totals statement and return its single row.
 *
 * It is spooled and read back through `render.json` like everything else rather than pulled in with
 * `db.get`, so there is exactly ONE way rows move between SQLite and the renderer and this path
 * cannot become a second, unreviewed one. The row is one object of formatted strings.
 */
export async function totalsFor(name, filters) {
  const { spec } = await sqlFor(name);
  const cols = totalsCols(spec);
  let handle;
  try {
    handle = await sqlite.spool(`${name}:totals`, await totalsSql(name), cols, await totalsParams(name, filters));
  } catch (e) {
    // The report name and the SQLite message, and NOT the statement: it is 40 KB of prelude, and an
    // error page has no business carrying it.
    throw new Error(`totals statement failed for ${name}: ${e && e.message ? e.message : e}`);
  }
  const parsed = JSON.parse(render.json({}, [{ field: "totals", key: handle.key }]));
  const rows = parsed.totals;
  // `COUNT(*)` always yields a row, so this is a guard rather than a normal path.
  return rows[0] ?? { rowCount: 0 };
}

/* ------------------------------------------------------------------- the reports */

/**
 * Spool a report's rows and return the handle.
 *
 * `limit` is the row cap the page renders up to; a negative or non-finite value means every row.
 * The cap is a `LIMIT` on the STATEMENT, not a slice in JS — slicing here would have to bring all
 * 60k rows into QuickJS to drop most of them, which is the cost the spool exists to remove. The full
 * count still comes from the totals statement, which is uncapped, so the page can still say
 * "showing first 1000 of N".
 */
export async function spoolRows(name, filters, limit) {
  const { sql, spec } = await sqlFor(name);
  const n = Number(limit);
  const capped = Number.isFinite(n) && n >= 0 ? `\nLIMIT ${Math.trunc(n)}` : "";
  // The statement is terminated with `;`, and `LIMIT` after a terminator is a SYNTAX ERROR
  // (`near "LIMIT"`) — so the semicolon goes before the cap is added, not after.
  const handle = await sqlite.spool(name, sql.replace(/;\s*$/, "") + capped, spec.cols, await params(name, filters));
  return handle;
}

/**
 * Render a report page: rows by address, totals and the count by value.
 *
 * `ctx` carries only what is genuinely scalar — the shell, the filter echo, the totals groups. The
 * rows are spliced into `rows` by the host, which releases the spool once the render returns, error
 * or not.
 */
export async function renderPage(name, template, ctx, filters, limit, onTiming) {
  const handle = await spoolRows(name, filters, limit);
  if (onTiming) onTiming(handle);
  return render.spooled(template, ctx || {}, [{ field: "rows", key: handle.key }]);
}

/**
 * The declarative pages' JSON body (`/p/<slug>/data`), serialised in Rust.
 *
 * The payload's `result.rows` is the whole report, so the envelope and the key go to the host and
 * the finished JSON comes back as one string. `result.totals` is built here from the scalar totals
 * row, because the browser reads it by key (`data-total-key` in `partials/page_body.html`).
 */
export async function jsonPayload(name, filters, payload, totals, meta, onTiming) {
  const next = { ...payload, result: { totals: totals || {}, meta: meta || {} } };
  if (!name) return JSON.stringify(next);
  const handle = await spoolRows(name, filters, -1);
  if (onTiming) onTiming(handle);
  return render.json(next, [{ field: "result.rows", key: handle.key }]);
}

/** The report keys, sorted. Async because the registry is built from the manifests on first use. */
export async function names() {
  return Object.keys(await registry()).sort();
}

/**
 * The raw statement, manifest and bind values for a report.
 *
 * Exposed for the `/bench/spool?arm=rows` baseline, which runs the identical SQL through
 * `db.all` so the two arms differ only in transport. Not a way to render a report — the templates
 * expect the display strings the SQL projects, and a caller that re-zips columns in JS has
 * reintroduced exactly what the spool removes.
 */
export async function parts(name, filters) {
  const { sql, spec } = await sqlFor(name);
  return { file: spec.sql, sql, cols: spec.cols, binds: await params(name, filters) };
}

/** The totals statement and manifest, for the parity gate. `alt` picks the alternate conversion. */
export async function totalsParts(name, filters, alt) {
  const { spec } = await sqlFor(name);
  return { sql: await totalsSql(name, alt), cols: totalsCols(spec), binds: await totalsParams(name, filters) };
}

/**
 * The named parameters a statement declares, in declaration order.
 *
 * Exposed so the parity gate can bind the statements this module produces by NAME. The guest binds
 * positionally in this order, so a harness that binds any other way is not testing what ships.
 */
export function parameters(name) {
  return unboundParams(name);
}

/** The same, for the totals statement — the report's parameters plus any openings. */
export async function totalsParameters(name) {
  const { spec } = await sqlFor(name);
  if (!Object.keys((spec.totals || {}).openings || {}).length) return unboundParams(name);
  return [...await unboundParams(name), ...Object.values(spec.totals.openings).map((p) => p.replace(/^:/, ""))];
}

/**
 * The report's totals spec, for the parity gate to check the paisa arithmetic INDEPENDENTLY.
 *
 * For a bucket that is a bare column, the exact total is computable in the gate from the rows it
 * already has — `sum(Math.round(x * 100)) / 100` in integer JS arithmetic. That makes the gate able to
 * say which side of a difference is right, instead of only that they differ.
 */
export async function totalsSpec(name) {
  await registry();
  const spec = specFor(name);
  if (!spec) throw new Error(`No spooled report: ${name}`);
  return spec.totals || {};
}
