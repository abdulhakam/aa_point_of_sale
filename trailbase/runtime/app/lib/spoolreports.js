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
const PAY = {
  recieving:        "CASE WHEN type_code = 1 AND paid = 0 THEN amount ELSE 0 END",
  recieved:         "CASE WHEN type_code = 1 AND paid = 1 THEN amount ELSE 0 END",
  sending:          "CASE WHEN type_code = 0 AND paid = 0 THEN amount ELSE 0 END",
  sent:             "CASE WHEN type_code = 0 AND paid = 1 THEN amount ELSE 0 END",
  recievingReturns: "CASE WHEN type_code = 2 THEN (CASE WHEN party_type = 0 THEN amount ELSE 0 END) ELSE 0 END",
  sendingReturns:   "CASE WHEN type_code = 2 THEN (CASE WHEN party_type = 0 THEN 0 ELSE amount END) ELSE 0 END",
  invoiceTotal:     "CASE WHEN paid = 1 THEN 0 ELSE amount END",
  totalPaid:        "CASE WHEN paid = 1 THEN amount ELSE 0 END",
};
/** `salesTotals` (reports.js:86-89) does NOT gate returns on the party type — a different rule. */
const SALES = {
  recieving:        "CASE WHEN type_code = 1 AND paid = 0 THEN amount ELSE 0 END",
  recieved:         "CASE WHEN type_code = 1 AND paid = 1 THEN amount ELSE 0 END",
  recievingReturns: "CASE WHEN type_code = 2 THEN amount ELSE 0 END",
};
/** `reportPaymentsByCompany` (reports.js:185-188) buckets on the LABEL, i.e. `type_code = 2`. */
const BYCOMPANY = {
  invoiceTotal:     "CASE WHEN paid = 1 OR type_code = 2 THEN 0 ELSE amount END",
  totalPaid:        "CASE WHEN paid = 1 THEN amount ELSE 0 END",
  recievingReturns: "CASE WHEN type_code = 2 THEN amount ELSE 0 END",
};
/** `reportItemSales` (reports.js:267-268): the label is "sale" for exactly `type_code = 1`. */
const ITEMSALES = {
  sale:    "CASE WHEN type_code = 1 THEN final_amount ELSE 0 END",
  returns: "CASE WHEN type_code = 1 THEN 0 ELSE final_amount END",
};

/**
 * Column manifests, in the exact SELECT order of the statement.
 *
 * Kept adjacent to the SQL rather than parsed out of it: `query` returns no column names, and
 * parsing a SELECT list reliably (comments, dotted fields, aliases, subqueries) is far more
 * fragile than stating the order once. The host rejects a width mismatch, so a forgotten column
 * fails loudly instead of silently shifting every value.
 *
 * `totals` is the per-report aggregate over the statement's own output — see `totalsSql`. It is
 * expressed as a spec rather than a second SQL file so the totals cannot drift from the rows they
 * summarise: they are computed over the very same statement.
 *
 * A totals spec has two shapes:
 *
 *   `cents` + `derived` — the normal one. `cents` is a map of per-row expressions, each producing a
 *     **2 dp amount**; the builder sums them as integer **paisas** and never as floats. `derived` is a
 *     map of functions over those paisa sums, which is how `total` is defined without repeating
 *     `invoiceTotal - totalPaid` and without a nested rounding of a nested rounding. A `consts` entry
 *     is a literal paisa amount.
 *
 *   `order` + `pick` — for the one report whose total is a ROW rather than a sum. See `ledgers/party`.
 */
const REPORTS = {
  "ledgers/booker": {
    sql: "ledger_booker.sql",
    cols: ["id", "date", "entry", "credit", "creditText", "debit", "debitText", "party", "booker", "invoice", "invoiceId"],
    totals: {
      // reportLedgerBooker (reports.js:361-363): credit and debit are each round2'd, and the balance is
      // round2 OF THOSE ROUNDED VALUES. In paisas that is just `credit - debit` — the two roundings
      // were correcting a float sum, and there is no float sum left to correct. The nesting the float
      // form needed (`round2(round2(a) - round2(b))`) collapses to one subtraction of integers.
      cents: { credit: "credit", debit: "debit" },
      derived: { balance: { op: "-", terms: ["credit", "debit"] } },
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
    // reportProfit (reports.js:259-261): `type === "sale" ? profit : -profit`. `toCents` rounds half
    // the half-up rule like any other value.
    totals: { cents: { profit: "CASE WHEN type_code = 1 THEN profit ELSE -profit END" } },
  },
  itemsales: {
    sql: "transactions.sql",
    cols: ["id", "date", "type", "booker", "invoiceNo", "invoiceId", "party", "company", "area",
      "section", "item", "itemId", "price", "qty", "qtyText", "scheme", "net_amount",
      "net_amountText", "final_amount", "final_amountText", "profit", "profitText", "type_code"],
    totals: {
      cents: { sale: ITEMSALES.sale, returns: ITEMSALES.returns },
      // `round2(sale - returns)` over the two ROUNDED sub-totals (reports.js:271) — one subtraction
      // of paisa sums.
      derived: { total: { op: "-", terms: ["sale", "returns"] } },
    },
  },
  // payments and salesreport share one statement; `:salesOnly` selects the sales restriction
  // (reports.js:146). One file, so their row sets cannot drift.
  payments: {
    sql: "payments.sql",
    cols: ["id", "date", "type", "invoice", "invoiceId", "area", "section", "party", "booker",
      "amount", "amountText", "description", "paid", "type_code", "party_type"],
    totals: {
      cents: { ...PAY },
      // The three NET figures are `num(a - b - c).toFixed(2)` in the JS (reports.js:77-79). Over paisa
      // sums that is plain integer subtraction, with no rounding left to do.
      derived: {
        totalRecieving: { op: "-", terms: ["recieving", "recieved", "recievingReturns"] },
        totalSending:   { op: "-", terms: ["sending", "sent", "sendingReturns"] },
        total:          { op: "-", terms: ["invoiceTotal", "totalPaid"] },
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
      cents: { ...SALES },
      derived: {
        totalRecieving: { op: "-", terms: ["recieving", "recieved", "recievingReturns"] },
        total:          { op: "-", terms: ["recieving", "recieved", "recievingReturns"] },
      },
    },
  },
  // stockreport and difference share one statement; `:agg` picks the quantity aggregate.
  stockreport: {
    sql: "items.sql",
    cols: ["id", "company", "name", "cost_price", "sale_price", "qty", "box_size_qty", "qtyText", "costText", "stock_amount", "stockAmountText", "tone"],
    // Which quantity aggregate the shared `items.sql` reads: the signed stock movement.
    agg: "stock",
    totals: { cents: { stockAmount: "stock_amount" } },
  },
  difference: {
    sql: "items.sql",
    // …and the difference-party aggregate. Same file, one aggregate apart.
    agg: "difference",
    cols: ["id", "company", "name", "cost_price", "sale_price", "qty", "box_size_qty", "qtyText", "costText", "stock_amount", "stockAmountText", "tone"],
    // `totals: () => []` in the page metadata: the report has NO totals, only the row count.
    totals: {},
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
      //
      // This is the ONE total that is a row rather than a sum, so it is read straight from the row's
      // own `balance` column — already 2 dp by the money rule, so there is nothing to accumulate and
      // nothing to convert.
      order: "date DESC, paymentDate DESC, id ASC",
      pick: { balance: "balance" },
    },
  },
  "ledgers/area": {
    sql: "ledger_area.sql",
    cols: ["id", "party", "credit", "debit", "balance", "creditText", "debitText", "balanceText", "credit_raw", "debit_raw"],
    // reportLedgerArea (reports.js:395-399) sums the ROUNDED per-row values, in row order. Summing
    // the ROUNDED values is exactly summing their paisas.
    totals: { cents: { credit: "credit", debit: "debit", balance: "balance" } },
  },
  productsale: {
    sql: "productsale.sql",
    cols: ["id", "name", "units", "amount", "box_size_qty", "box", "amountText", "qtyText"],
    totals: { cents: { amount: "amount" } },
  },
  outstanding: {
    sql: "outstanding.sql",
    cols: ["id", "party_name", "invoice_nos", "invoice_total", "paid_total", "balance", "invoice_totalText", "paid_totalText", "balanceText", "booker_id", "area_id", "section_id", "invoice_raw", "paid_raw", "return_raw"],
    totals: { cents: { invoice: "invoice_total", paid: "paid_total", balance: "balance" } },
  },
  dailysale: {
    sql: "dailysale.sql",
    cols: ["id", "invoiceNo", "party", "area", "booker", "total", "totalText", "party_id", "area_id", "booker_id"],
    totals: { cents: { total: "total" } },
  },
  "ledgers/general": {
    sql: "ledger_general.sql",
    cols: ["id", "date", "invoiceNo", "description", "transactionType", "accountType",
      "recievable", "recievableText", "payable", "payableText", "cash", "cashText",
      "stock", "stockText", "tone"],
    totals: {
      // The opening figures are the FILTER's, not the data's (reports.js:404-407), so they are
      // converted from the bound text into paisas and added to the sum in the SAME unit.
      //
      // Their bind POSITION is load-bearing. A bound parameter's index is the order it appears in the
      // SQL TEXT, so they must sit in a clause that comes AFTER the report's own parameters — which
      // is why the builder puts them in a second SELECT layer over the materialised report rows, not
      // in the outer SELECT list. Written in the outer list they would take the low indices and shift
      // every filter bind by three, and nothing would say so.
      openings: { openR: ":openingRecievables", openP: ":openingPayables", openC: ":openingCash" },
      cents: { recievable: "recievable", payable: "payable", cash: "cash" },
      derived: {
        recievable: { op: "+", terms: ["recievable", "openR"] },
        payable:    { op: "+", terms: ["payable", "openP"] },
        cash:       { op: "+", terms: ["cash", "openC"] },
      },
      // reports.js:458: the journal's `stock` column is structurally always zero (prelude.sql), so
      // this total is a CONSTANT in the JS and stays one here. Zero PAISAS, not zero rupees: the
      // builder divides by 100 on the way out.
      consts: { stock: "0" },
    },
  },
  paymentsbycompany: {
    sql: "payments_by_company.sql",
    cols: ["id", "date", "type", "invoice", "originalInvoice", "area", "section", "company",
      "party", "booker", "amount", "amountText", "paid", "description", "type_code"],
    totals: {
      cents: { ...BYCOMPANY },
      // `round2(invoiceTotal - totalPaid - recievingReturns)` (reports.js:188) over three ROUNDED
      // sub-totals. Three paisa sums, subtracted.
      derived: {
        total: { op: "-", terms: ["invoiceTotal", "totalPaid", "recievingReturns"] },
      },
    },
  },
};


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
export function totalsSpec(name) {
  const spec = REPORTS[name];
  if (!spec) throw new Error(`No spooled report: ${name}`);
  return spec.totals || {};
}
