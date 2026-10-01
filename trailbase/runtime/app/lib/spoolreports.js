// Spool-backed reports: run a report's SQL in SQLite and hand the renderer an address.
//
// The contract, end to end:
//
//   JS   compose the SQL, call `sqlite.spool`, get back `{ key, rows, bytes, queryMs, writeMs }`
//   Rust run the statement, serialise every row to JSONL, write it to the KV store  (spool.rs)
//   Rust read the key back and splice the rows into the minijinja context        (render.rs)
//   JS   never sees a row
//
// A report is therefore two things: a `.sql` file under `reports/sql/reports/`, and a column
// manifest here. The manifest is required, not optional — `trailbase_wasm::db::query` returns
// positional `Vec<Vec<Value>>` with no column metadata, so the names are a contract the host
// asserts against the row width. A drifted manifest is a loud error, never a mislabelled amount.
//
// Compare `sqlviews.js`, which is the other SQL path: it brings every row *into* JS. That is
// correct for a view other views build on, and wrong for a report's final projection.
//
// `fs` is a host global (see `api/fs.rs`), not an import — same as every other `app/lib` module.

const DIR = "/app/reports/sql/reports";
const PRELUDE = "/app/reports/sql/prelude.sql";

/**
 * Column manifests, in the exact SELECT order of the statement.
 *
 * Kept adjacent to the SQL rather than parsed out of it: `query` returns no column names, and
 * parsing a SELECT list reliably (comments, dotted fields, aliases, subqueries) is far more
 * fragile than stating the order once. The host rejects a width mismatch, so a forgotten column
 * fails loudly instead of silently shifting every value.
 */
const REPORTS = {
  "ledgers/booker": {
    sql: "ledger_booker.sql",
    cols: ["id", "date", "entry", "credit", "creditText", "debit", "debitText", "party", "booker", "invoice", "invoiceId"],
  },
  // profit and itemsales consume the SAME rows (`transactionsRows`, reports.js:247) and differ only
  // in their totals, so they share one statement. `type_code` is carried so each report's totals
  // CASE reads the raw invoice type rather than re-parsing the display label.
  profit: {
    sql: "transactions.sql",
    cols: ["id", "date", "type", "booker", "invoiceNo", "invoiceId", "party", "company", "area",
      "section", "item", "itemId", "price", "qty", "qtyText", "scheme", "net_amount",
      "net_amountText", "final_amount", "final_amountText", "profit", "profitText", "type_code"],
  },
  itemsales: {
    sql: "transactions.sql",
    cols: ["id", "date", "type", "booker", "invoiceNo", "invoiceId", "party", "company", "area",
      "section", "item", "itemId", "price", "qty", "qtyText", "scheme", "net_amount",
      "net_amountText", "final_amount", "final_amountText", "profit", "profitText", "type_code"],
  },
  // payments and salesreport share one statement; `:salesOnly` selects the sales restriction
  // (reports.js:146). One file, so their row sets cannot drift.
  payments: {
    sql: "payments.sql",
    cols: ["id", "date", "type", "invoice", "invoiceId", "area", "section", "party", "booker",
      "amount", "amountText", "description", "paid", "type_code", "party_type"],
  },
  salesreport: {
    sql: "payments.sql",
    // "unpaid recieving/return only" — reports.js:146. A report CONSTANT, not a user filter: the
    // page never sends it, and omitting it leaves the statement unrestricted so only the row count
    // differs, which reads as a real defect rather than a missing bind.
    salesOnly: "1",
    cols: ["id", "date", "type", "invoice", "invoiceId", "area", "section", "party", "booker",
      "amount", "amountText", "description", "paid", "type_code", "party_type"],
  },
  // stockreport and difference share one statement; `:agg` picks the quantity aggregate.
  stockreport: {
    sql: "items.sql",
    cols: ["id", "company", "name", "cost_price", "sale_price", "qty", "box_size_qty", "qtyText", "costText", "stock_amount", "stockAmountText", "tone"],
    // Which quantity aggregate the shared `items.sql` reads: the signed stock movement.
    agg: "stock",
  },
  difference: {
    sql: "items.sql",
    // …and the difference-party aggregate. Same file, one aggregate apart.
    agg: "difference",
    cols: ["id", "company", "name", "cost_price", "sale_price", "qty", "box_size_qty", "qtyText", "costText", "stock_amount", "stockAmountText", "tone"],
  },
  "ledgers/party": {
    sql: "ledger_party.sql",
    cols: ["id", "date", "entry", "credit", "creditText", "debit", "debitText", "balance",
      "balanceText", "party", "booker", "invoice", "invoiceId"],
  },
  "ledgers/area": {
    sql: "ledger_area.sql",
    cols: ["id", "party", "credit", "debit", "balance", "creditText", "debitText", "balanceText", "credit_raw", "debit_raw"],
  },
  productsale: {
    sql: "productsale.sql",
    cols: ["id", "name", "units", "amount", "box_size_qty", "box", "amountText", "qtyText"],
  },
  outstanding: {
    sql: "outstanding.sql",
    cols: ["id", "party_name", "invoice_nos", "invoice_total", "paid_total", "balance", "invoice_totalText", "paid_totalText", "balanceText", "booker_id", "area_id", "section_id", "invoice_raw", "paid_raw", "return_raw"],
  },
  dailysale: {
    sql: "dailysale.sql",
    cols: ["id", "invoiceNo", "party", "area", "booker", "total", "totalText", "party_id", "area_id", "booker_id",]},
  "ledgers/general": {
    sql: "ledger_general.sql",
    cols: ["id", "date", "invoiceNo", "description", "transaction_type", "account_type",
      "recievable", "recievableText", "payable", "payableText", "cash", "cashText",
      "stock", "stockText", "tone"],
  },
  paymentsbycompany: {
    sql: "payments_by_company.sql",
    cols: ["id", "date", "type", "invoice", "originalInvoice", "area", "section", "company",
      "party", "booker", "amount", "amountText", "paid", "description", "type_code"],
  },
};

const sqlCache = new Map();
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
  preludeCache = null;
}

/**
 * Filter values -> bind parameters, in manifest order.
 *
 * Ids are base64url strings (that is how the host hands a BLOB to JS) but are BLOBs in the
 * database, so they are passed with the `blob:` prefix that `spool::bind_param` decodes back to a
 * real BLOB. Passing one as a bare string compares TEXT against BLOB and matches nothing, which
 * reads as "the filter returns no rows" rather than as a type error.
 */
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
    invoice: id(f.invoice),
    from: text(f.from),
    to: text(f.to),
    // `payments` filters on the raw payment type code (reports.js:127), which arrives as TEXT from a
    // query string and is CAST in the statement.
    type: text(f.type),
    // Report-constant parameters, from the REGISTRY rather than the caller's filter: they describe
    // the report, not the user's query. `salesreport` is "unpaid recieving/return only"
    // (reports.js:146); `difference`/`stockreport` differ only in which aggregate they read.
    // Omitting them leaves the statement unrestricted so only the ROW COUNT differs, which reads
    // as a real defect rather than a missing bind.
    salesOnly: text(spec?.salesOnly),
    agg: text(spec?.agg),
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

/**
 * Run a spooled report and render it in one step.
 *
 * `render.spooled` takes only scalar context plus the spool key, so nothing row-shaped crosses
 * back into QuickJS. The spool is released by the host once the render returns, error or not.
 *
 * Returns the HTML. `onTiming` (optional) receives the spool counters, which is how a caller
 * attributes a slow report without timing the whole page.
 */
export async function renderReport(name, template, ctx, filters, onTiming) {
  const { sql } = await sqlFor(name);
  const spec = REPORTS[name];
  const handle = await sqlite.spool(name, sql, spec.cols, await params(name, filters));
  if (onTiming) onTiming(handle);
  return render.spooled(template, ctx || {}, [{ field: "rows", key: handle.key }]);
}

/** The totals query, which is small enough that it is spooled and read back like everything else. */
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
  return { sql, cols: spec.cols, binds: await params(name, filters) };
}
