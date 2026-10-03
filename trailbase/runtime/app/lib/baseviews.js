/**
 * The two derived reads the app still needs, as SQL.
 *
 * These replace `getViews(["counts"])` and `getViews(["itemsReport"])` — the last two calls into the
 * JavaScript view layer (`app/compute/views.js`) that had live consumers. Once the call sites in
 * `ahscripts/routes/_app/route.ts` (the dashboard, `/invoice/context`, `/inventory`) come through here,
 * nothing in the running app builds a view in JavaScript.
 *
 * They are NOT report pages, so they are not spooled: there is no manifest, no render, no totals block.
 * `sqlite.all` answers positional arrays with no column metadata, so each statement names its columns
 * here in the order it selects them, and `columnsToObjects` asserts the widths match. A statement that
 * gains or loses a column is a loud error rather than a row of shifted values — the same contract the
 * report manifests keep for the same reason.
 */

import { composeStatement } from "./spoolreports.js";

/** `app/sql/counts.sql`, in SELECT order. */
const COUNT_COLUMNS = [
  "sections",
  "areas",
  "categories",
  "parties",
  "order_bookers",
  "items",
  "purchase_invoices",
  "sale_invoices",
  "return_invoices",
  "recieving_payments",
  "sending_payments",
];

/** `app/reports/sql/items_report.sql`, in SELECT order. */
const ITEM_COLUMNS = ["id", "name", "created", "updated", "cost_price", "sale_price", "box_size_qty", "category", "qty"];

const COUNTS_SQL = "/app/sql/counts.sql";
const ITEMS_SQL = "/app/reports/sql/items_report.sql";

let countsCache = null;

/**
 * Positional rows to named objects, refusing a width mismatch.
 *
 * `trailbase_wasm::db::query` gives back `Vec<Vec<Value>>` and nothing else. If a statement gains or
 * loses a column, `Object.fromEntries` would silently pair every value after the change with the wrong
 * name — which is how a cost price becomes a category. So the widths are checked.
 */
function columnsToObjects(columns, rows) {
  return (rows || []).map((values, i) => {
    if (!Array.isArray(values) || values.length !== columns.length) {
      throw new Error(
        `row ${i} has ${Array.isArray(values) ? values.length : "?"} columns, expected ${columns.length} (${columns.join(", ")})`
      );
    }
    return Object.fromEntries(columns.map((c, j) => [c, values[j]]));
  });
}

/**
 * The dashboard tiles: eleven row counts.
 *
 * Memoised for a short window because the dashboard is the first page anyone opens and it now costs
 * eleven sub-selects rather than one probe of the tables it was going to count anyway. The window is
 * deliberately tiny — it exists to collapse a burst of requests, not to be a cache that can go stale.
 */
export async function counts() {
  const now = Date.now();
  if (countsCache && now - countsCache.at < 1000) return countsCache.value;
  const sql = String(await fs.readFile(COUNTS_SQL)).replace(/;\s*$/, "");
  const rows = await sqlite.all(sql, []);
  const value = columnsToObjects(COUNT_COLUMNS, rows)[0] || {};
  countsCache = { at: now, value };
  return value;
}

/**
 * The item rows the invoice-entry item list and the inventory screen read.
 *
 * `items_report.sql` opens with its own CTE, so it is composed onto the shared prelude by the SAME
 * helper the report statements use — not by a second copy of that rule, which is how the first attempt
 * produced `... AS (...), , item_base AS (` and a `near ","` parse error on `/inventory`.
 */
export async function itemsReport() {
  const compose = await composeStatement(await fs.readFile(ITEMS_SQL));
  const rows = await sqlite.all(compose.replace(/;\s*$/, ""), []);
  return columnsToObjects(ITEM_COLUMNS, rows);
}

/** Drop the memoised counts. Called on commit, so a new invoice moves the tiles immediately. */
export function invalidate() {
  countsCache = null;
}
