// Spool-backed reports: run a report's SQL in SQLite and hand the renderer an address.
//
// The contract, end to end:
//
//   JS   compose the SQL, call `sqlite.spool`, get back `{ key, rows, bytes, queryMs, writeMs }`
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

/* ------------------------------------------------------------------ the money rule */

/**
 * `round2` rebuilt from CAST, exactly as `prelude.sql` and `compute/format.js` define it.
 *
 * Guest SQLite has no `floor`, so this is `floor(((v + EPSILON) * 100) + 0.5) / 100` written as
 * `CAST(z AS INTEGER) - (CASE WHEN z < 0 AND z <> CAST(z AS INTEGER) THEN 1 ELSE 0 END)`. It is the
 * same template `tools/regen-round2.mjs` writes into the SQL files — one rule, one spelling.
 */
const EPS = "2.220446049250313e-16";
const round2 = (e) => {
  // z = ((v + EPSILON) * 100) + 0.5 — the value floor() would have received.
  const z = `(((${e}) + ${EPS}) * 100) + 0.5`;
  return `(CAST(${z} AS INTEGER) - (CASE WHEN ${z} < 0 AND ${z} <> CAST(${z} AS INTEGER) THEN 1 ELSE 0 END)) / 100.0`;
};

/** `num(v).toFixed(2)` in SQL: printf with an explicit width, so trailing zeroes survive. */
const money = (e) => `printf('%.2f', ${e})`;

/* ---------------------------------------------------------- the totals expressions */

/**
 * The raw per-row expressions several totals share, named once.
 *
 * `paymentsTotals` (compute/reports.js:63-67) buckets on the RAW row fields, which is why
 * `payments.sql` carries `paid`, `type_code` and `party_type` alongside the display columns.
 */
const PAY = {
  recieving:        "SUM((CASE WHEN type_code = 1 AND paid = 0 THEN amount ELSE 0 END))",
  recieved:         "SUM((CASE WHEN type_code = 1 AND paid = 1 THEN amount ELSE 0 END))",
  sending:          "SUM((CASE WHEN type_code = 0 AND paid = 0 THEN amount ELSE 0 END))",
  sent:             "SUM((CASE WHEN type_code = 0 AND paid = 1 THEN amount ELSE 0 END))",
  recievingReturns: "SUM((CASE WHEN type_code = 2 THEN (CASE WHEN party_type = 0 THEN amount ELSE 0 END) ELSE 0 END))",
  sendingReturns:   "SUM((CASE WHEN type_code = 2 THEN (CASE WHEN party_type = 0 THEN 0 ELSE amount END) ELSE 0 END))",
  invoiceTotal:     "SUM((CASE WHEN paid = 1 THEN 0 ELSE amount END))",
  totalPaid:        "SUM((CASE WHEN paid = 1 THEN amount ELSE 0 END))",
};
/** `salesTotals` (reports.js:86-89) does NOT gate returns on the party type — a different rule. */
const SALES = {
  recieving:        "SUM((CASE WHEN type_code = 1 AND paid = 0 THEN amount ELSE 0 END))",
  recieved:         "SUM((CASE WHEN type_code = 1 AND paid = 1 THEN amount ELSE 0 END))",
  recievingReturns: "SUM((CASE WHEN type_code = 2 THEN amount ELSE 0 END))",
};
/** `reportPaymentsByCompany` (reports.js:185-188) buckets on the LABEL, i.e. `type_code = 2`. */
const BYCOMPANY = {
  invoiceTotal:     "SUM((CASE WHEN paid = 1 OR type_code = 2 THEN 0 ELSE amount END))",
  totalPaid:        "SUM((CASE WHEN paid = 1 THEN amount ELSE 0 END))",
  recievingReturns: "SUM((CASE WHEN type_code = 2 THEN amount ELSE 0 END))",
};
/** `reportItemSales` (reports.js:267-268): the label is "sale" for exactly `type_code = 1`. */
const ITEMSALES = {
  sale:    "SUM((CASE WHEN type_code = 1 THEN final_amount ELSE 0 END))",
  returns: "SUM((CASE WHEN type_code = 1 THEN 0 ELSE final_amount END))",
};

/**
 * Column manifests, in the exact SELECT order of the statement.
 *
 * Kept adjacent to the SQL rather than parsed out of it: `query` returns no column names, and
 * parsing a SELECT list reliably (comments, dotted fields, aliases, subqueries) is far more
 * fragile than stating the order once. The host rejects a width mismatch, so a forgotten column
 * fails loudly instead of silently shifting every value.
 *
 * `totals` is the per-report AGGREGATE over the statement's own output — see `totalsSql`. It is
 * expressed as a spec rather than a second SQL file so the totals cannot drift from the rows they
 * summarise: they are computed over the very same statement, wrapped in parentheses.
 */
const REPORTS = {
  "ledgers/booker": {
    sql: "ledger_booker.sql",
    cols: ["id", "date", "entry", "credit", "creditText", "debit", "debitText", "party", "booker", "invoice", "invoiceId"],
    totals: {
      sums: {
        // reportLedgerBooker (reports.js:361-363): credit and debit are each round2'd, and the
        // balance is round2 OF THOSE ROUNDED VALUES — not of the raw sums.
        credit:  round2("SUM(credit)"),
        debit:   round2("SUM(debit)"),
        balance: round2(`${round2("SUM(credit)")} - ${round2("SUM(debit)")}`),
      },
    },
  },
  // profit and itemsales consume the SAME rows (`transactionsRows`, reports.js:247) and differ only
  // in their totals, so they share one statement. `type_code` is carried so each report's totals
  // CASE reads the raw invoice type rather than re-parsing the display label.
  profit: {
    sql: "transactions.sql",
    cols: ["id", "date", "type", "booker", "invoiceNo", "invoiceId", "party", "company", "area",
      "section", "item", "itemId", "price", "qty", "qtyText", "scheme", "net_amount",
      "net_amountText", "final_amount", "final_amountText", "profit", "profitText", "type_code"],
    // reportProfit (reports.js:259-261): `type === "sale" ? profit : -profit`, then round2.
    totals: { sums: { profit: round2("SUM((CASE WHEN type_code = 1 THEN profit ELSE -profit END))") } },
  },
  itemsales: {
    sql: "transactions.sql",
    cols: ["id", "date", "type", "booker", "invoiceNo", "invoiceId", "party", "company", "area",
      "section", "item", "itemId", "price", "qty", "qtyText", "scheme", "net_amount",
      "net_amountText", "final_amount", "final_amountText", "profit", "profitText", "type_code"],
    totals: {
      sums: {
        sale:    round2(ITEMSALES.sale),
        returns: round2(ITEMSALES.returns),
        // `round2(sale - returns)` over the two ROUNDED sub-totals (reports.js:271).
        total:   round2(`${round2(ITEMSALES.sale)} - ${round2(ITEMSALES.returns)}`),
      },
    },
  },
  // payments and salesreport share one statement; `:salesOnly` selects the sales restriction
  // (reports.js:146). One file, so their row sets cannot drift.
  payments: {
    sql: "payments.sql",
    cols: ["id", "date", "type", "invoice", "invoiceId", "area", "section", "party", "booker",
      "amount", "amountText", "description", "paid", "type_code", "party_type"],
    totals: {
      sums: {
        recieving:        PAY.recieving,
        recieved:         PAY.recieved,
        sending:          PAY.sending,
        sent:             PAY.sent,
        recievingReturns: PAY.recievingReturns,
        sendingReturns:   PAY.sendingReturns,
        invoiceTotal:     PAY.invoiceTotal,
        totalPaid:        PAY.totalPaid,
        // The three NET figures are `num(a - b - c).toFixed(2)` in the JS (reports.js:77-79) —
        // no explicit round2, so no round2 here either.
        totalRecieving: `${PAY.recieving} - ${PAY.recieved} - ${PAY.recievingReturns}`,
        totalSending:   `${PAY.sending} - ${PAY.sent} - ${PAY.sendingReturns}`,
        total:          `${PAY.invoiceTotal} - ${PAY.totalPaid}`,
      },
    },
  },
  salesreport: {
    sql: "payments.sql",
    // "unpaid recieving/return only" — reports.js:146. A report CONSTANT, not a user filter: the
    // page never sends it, and omitting it leaves the statement unrestricted so only the row count
    // differs, which reads as a real defect rather than a missing bind.
    salesOnly: "1",
    cols: ["id", "date", "type", "invoice", "invoiceId", "area", "section", "party", "booker",
      "amount", "amountText", "description", "paid", "type_code", "party_type"],
    totals: {
      sums: {
        recieving:        SALES.recieving,
        recieved:         SALES.recieved,
        recievingReturns: SALES.recievingReturns,
        totalRecieving:   `${SALES.recieving} - ${SALES.recieved} - ${SALES.recievingReturns}`,
        total:            `${SALES.recieving} - ${SALES.recieved} - ${SALES.recievingReturns}`,
      },
    },
  },
  // stockreport and difference share one statement; `:agg` picks the quantity aggregate.
  stockreport: {
    sql: "items.sql",
    cols: ["id", "company", "name", "cost_price", "sale_price", "qty", "box_size_qty", "qtyText", "costText", "stock_amount", "stockAmountText", "tone"],
    // Which quantity aggregate the shared `items.sql` reads: the signed stock movement.
    agg: "stock",
    totals: { sums: { stockAmount: round2("SUM(stock_amount)") } },
  },
  difference: {
    sql: "items.sql",
    // …and the difference-party aggregate. Same file, one aggregate apart.
    agg: "difference",
    cols: ["id", "company", "name", "cost_price", "sale_price", "qty", "box_size_qty", "qtyText", "costText", "stock_amount", "stockAmountText", "tone"],
    // `totals: () => []` in the page metadata: the report has NO totals, only the row count.
    totals: { sums: {} },
  },
  "ledgers/party": {
    sql: "ledger_party.sql",
    // `paymentDate` is carried for the totals alone: the report's single total is the LAST row's
    // balance, and the row order is `date`, then `payment_date ASC, id DESC` (ledger_party.sql).
    // `date` alone cannot express it — every row shares one import date on this depot — so the
    // payment date has to be visible to the ORDER BY that picks the row.
    cols: ["id", "date", "entry", "credit", "creditText", "debit", "debitText", "balance",
      "balanceText", "party", "booker", "invoice", "invoiceId", "paymentDate"],
    totals: {
      // The LAST row in the report's own order, so every key is reversed: `ORDER BY … ASC LIMIT 1`
      // would return the FIRST row — 4750.00 against the JS 2460.00, with every per-row value
      // correct. `id ASC` is what pairs with `payment_date DESC`: the report's order is
      // `payment_date ASC, id DESC`, so its last row is the greatest payment date and, among those,
      // the SMALLEST id.
      order: "date DESC, paymentDate DESC, id ASC",
      pick: { balance: "balance" },
    },
  },
  "ledgers/area": {
    sql: "ledger_area.sql",
    cols: ["id", "party", "credit", "debit", "balance", "creditText", "debitText", "balanceText", "credit_raw", "debit_raw"],
    // reportLedgerArea (reports.js:395-399) sums the ROUNDED per-row values, in row order.
    totals: {
      sums: {
        credit:  round2("SUM(credit)"),
        debit:   round2("SUM(debit)"),
        balance: round2("SUM(balance)"),
      },
    },
  },
  productsale: {
    sql: "productsale.sql",
    cols: ["id", "name", "units", "amount", "box_size_qty", "box", "amountText", "qtyText"],
    totals: { sums: { amount: round2("SUM(amount)") } },
  },
  outstanding: {
    sql: "outstanding.sql",
    cols: ["id", "party_name", "invoice_nos", "invoice_total", "paid_total", "balance", "invoice_totalText", "paid_totalText", "balanceText", "booker_id", "area_id", "section_id", "invoice_raw", "paid_raw", "return_raw"],
    totals: {
      sums: {
        invoice: round2("SUM(invoice_total)"),
        paid:    round2("SUM(paid_total)"),
        balance: round2("SUM(balance)"),
      },
    },
  },
  dailysale: {
    sql: "dailysale.sql",
    cols: ["id", "invoiceNo", "party", "area", "booker", "total", "totalText", "party_id", "area_id", "booker_id"],
    totals: { sums: { total: round2("SUM(total)") } },
  },
  "ledgers/general": {
    sql: "ledger_general.sql",
    cols: ["id", "date", "invoiceNo", "description", "transactionType", "accountType",
      "recievable", "recievableText", "payable", "payableText", "cash", "cashText",
      "stock", "stockText", "tone"],
    totals: {
      // The opening figures are the FILTER's, not the data's (reports.js:404-407), so they are
      // CAST from the bound text and added to each total exactly as `round2(open + sum)` does.
      opening: true,
      sums: {
        recievable: round2("SUM(recievable) + CAST(:openingRecievables AS REAL)"),
        payable:    round2("SUM(payable) + CAST(:openingPayables AS REAL)"),
        cash:       round2("SUM(cash) + CAST(:openingCash AS REAL)"),
      },
      // reports.js:458: the journal's `stock` column is structurally always zero (prelude.sql), so
      // this total is a CONSTANT in the JS and stays one here.
      consts: { stock: "'0.00'" },
    },
  },
  paymentsbycompany: {
    sql: "payments_by_company.sql",
    cols: ["id", "date", "type", "invoice", "originalInvoice", "area", "section", "company",
      "party", "booker", "amount", "amountText", "paid", "description", "type_code"],
    totals: {
      sums: {
        invoiceTotal:     BYCOMPANY.invoiceTotal,
        recievingReturns: BYCOMPANY.recievingReturns,
        totalPaid:        BYCOMPANY.totalPaid,
        total:            round2(`${round2(BYCOMPANY.invoiceTotal)} - ${round2(BYCOMPANY.totalPaid)} - ${round2(BYCOMPANY.recievingReturns)}`),
      },
    },
  },
};

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

/** The composed statement for a report: the shared prelude plus the report's own body. */
async function sqlFor(name) {
  const spec = REPORTS[name];
  if (!spec) throw new Error(`No spooled report: ${name}`);
  if (!sqlCache.has(name)) {
    const body = String(await fs.readFile(`${DIR}/${spec.sql}`)).trim();
    // The body continues the prelude's WITH clause. Two shapes exist:
    //   - it opens with its own CTEs, `name AS (...)` ... then a SELECT. Join them with a comma.
    //   - it contributes only a final SELECT (ledger_booker.sql). No comma, or the prelude's last
    //     CTE ends up dangling: `... AS (...), SELECT` -> `near "SELECT"`.
    //
    // The CTE marker may sit after the header comments AND blank lines. The strip below allows
    // whitespace between them, because requiring adjacency left a `, name AS (` unstripped whenever a
    // blank line separated the comment block — and the report then failed to parse with the same
    // `near "SELECT"` as a missing comma, pointing at the wrong cause.
    const withoutLeadComment = body.replace(/^((?:\s*--[^\n]*\n)+)\s*/, "$1");
    const opensWithCte = /^\s*,?\s*[\w$]+\s+AS\s*\(/.test(withoutLeadComment);
    sqlCache.set(name, (await prelude()) + (opensWithCte ? ",\n" : "\n") + (opensWithCte
      ? body.replace(/^((?:\s*--[^\n]*\n)+)\s*,\s*/, "$1")
      : body));
  }
  return { spec, sql: sqlCache.get(name) };
}

/** The report's OWN body (not the prelude) — enough to discover its named parameters. */
async function sqlText(name) {
  const spec = REPORTS[name];
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
  const f = filters || {};
  const text = (v) => (v === undefined || v === null ? "" : String(v));
  const id = (v) => (v === undefined || v === null || v === "" ? "" : `blob:${v}`);
  const spec = REPORTS[name];

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
  const spec = REPORTS[name];
  if (!spec) throw new Error(`No spooled report: ${name}`);
  const body = await sqlText(name);
  // Comments are stripped first: prose that mentions something like `api::value_to_json` would
  // otherwise contribute a phantom parameter name.
  return [...new Set([...body.replace(/--[^\n]*/g, "").matchAll(/:([a-z_][a-z0-9_]*)/gi)].map((m) => m[1]))];
}

/* ----------------------------------------------------------------------- totals */

/** The totals manifest, in the order `totalsSql` emits the columns. */
function totalsCols(spec) {
  const t = spec.totals || {};
  return ["rowCount", ...Object.keys(t.sums || {}), ...Object.keys(t.pick || {}), ...Object.keys(t.consts || {})];
}

/**
 * The totals statement: ONE row of scalars, aggregating the report's OWN statement.
 *
 * It wraps the statement rather than restating it:
 *
 *     SELECT COUNT(*) AS rowCount, printf('%.2f', SUM(credit)) AS credit
 *     FROM ( <the report statement> ) AS t
 *
 * so a total can never be computed over a different row set from the one the report prints — which
 * is the failure a copied-out second file would invite, and it is invisible in the row data.
 *
 * Cost, measured on this depot over all 14 reports: the aggregate pass is within noise of a bare
 * `COUNT(*)` over the same statement (5,401 ms vs 5,320 ms for the whole set), because it reads the
 * same CTEs and never materialises a row. Two passes is not two times the cost.
 *
 * `pick` reports instead of aggregating — one row chosen by `order`. The count comes from
 * `COUNT(*) OVER ()`, which SQLite evaluates over the whole set BEFORE `ORDER BY`/`LIMIT`, so the
 * pick and the count come from one pass.
 */
async function totalsSql(name) {
  if (totalsCache.has(name)) return totalsCache.get(name);
  const { sql, spec } = await sqlFor(name);
  const t = spec.totals || {};

  const cols = [];
  cols.push("COUNT(*) AS rowCount");
  for (const [key, expr] of Object.entries(t.sums || {})) cols.push(`${money(expr)} AS ${key}`);
  for (const [key, col] of Object.entries(t.pick || {})) {
    // With an `order`, the value is the picked ROW's column, read from the materialised CTE — and
    // `COALESCE` covers a party whose window matched nothing, which is where the JS default "0.00"
    // (reports.js:350) comes from.
    const expr = t.order ? `(SELECT ${col} FROM totals_src ORDER BY ${t.order} LIMIT 1)` : `COALESCE(${col}, 0)`;
    cols.push(`${money(`COALESCE(${expr}, 0)`)} AS ${key}`);
  }
  for (const [key, literal] of Object.entries(t.consts || {})) cols.push(`${literal} AS ${key}`);

  const from = [`FROM ( ${sql.replace(/;\s*$/, "")} ) AS t`];
  if (t.opening) {
    // The openings are bound, and a bound parameter's INDEX is the order it appears in the SQL
    // TEXT — which for a FROM-clause subquery is AFTER the report's own parameters. Putting them in
    // a second FROM entry is therefore load-bearing: writing them in the SELECT list would give them
    // the low indices and silently shift every filter bind by three.
    from.push("CROSS JOIN (SELECT CAST(:openingRecievables AS REAL) AS r, CAST(:openingPayables AS REAL) AS p, CAST(:openingCash AS REAL) AS c) AS o");
  }

  let out;
  if (t.order) {
    // The report's statement is materialised ONCE into a CTE and then read twice — once to count, once
    // to pick the row. Two references force materialisation, so this is still a single pass over the
    // data even though the text appears once.
    //
    // It is `SELECT * FROM ( … )`, NOT a bare nested `WITH … AS ( <report> )`: the report body carries
    // the whole prelude, and SQLite re-evaluated that inner WITH per reference instead of materialising
    // it (8.5 s against 0.2 s for the `SELECT *` form, same result).
    //
    // And it is a CTE, not `COUNT(*) OVER ()`: the guest's SQLite rejects the window function outright —
    // the statement fails to PREPARE, which is why the page died in 8 ms rather than after a query.
    out = `WITH totals_src AS (SELECT * FROM ( ${sql.replace(/;\s*$/, "")} ) AS t)\n`
      + `SELECT\n  COUNT(*) AS rowCount,\n  ${cols.slice(1).join(",\n  ")}\nFROM totals_src`;
  } else {
    out = `SELECT\n  ${cols.join(",\n  ")}\n${from.join("\n")}`;
  }
  totalsCache.set(name, out);
  return out;
}

/**
 * The totals statement's binds.
 *
 * The report's own binds come FIRST because the report statement is textually first (it is the
 * wrapped subquery); the openings follow, matching the CROSS JOIN's position.
 */
async function totalsParams(name, filters) {
  const { spec } = await sqlFor(name);
  const binds = await params(name, filters);
  if (!spec.totals || !spec.totals.opening) return binds;
  const f = filters || {};
  const text = (v) => (v === undefined || v === null ? "" : String(v));
  return binds.concat([text(f.openingRecievables), text(f.openingPayables), text(f.openingCash)]);
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

export function names() {
  return Object.keys(REPORTS);
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

/** The totals statement and manifest, for the parity gate. */
export async function totalsParts(name, filters) {
  const { spec } = await sqlFor(name);
  return { sql: await totalsSql(name), cols: totalsCols(spec), binds: await totalsParams(name, filters) };
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
  if (!spec.totals || !spec.totals.opening) return unboundParams(name);
  return [...await unboundParams(name), "openingRecievables", "openingPayables", "openingCash"];
}
