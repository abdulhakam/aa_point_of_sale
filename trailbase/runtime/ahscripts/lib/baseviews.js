/**
 * The one derived read the app still needs, as SQL.
 *
 * This replaces `getViews(["itemsReport"])` — the last call into the JavaScript view layer
 * (`app/compute/views.js`) that had a live consumer. Once the call sites in `ahscripts/routes/_app/route.ts`
 * (`/invoice/context`, `/inventory`) come through here, nothing in the running app builds a view in
 * JavaScript.
 *
 * It is NOT a report page, so it is not spooled: there is no manifest, no render, no totals block.
 * `sqlite.all` answers positional arrays with no column metadata, so the statement names its columns
 * here in the order it selects them, and `columnsToObjects` asserts the widths match. A statement that
 * gains or loses a column is a loud error rather than a row of shifted values — the same contract the
 * report manifests keep for the same reason.
 *
 * ⚠️ The `counts` view was removed 2026-10-11 with the rest of the dashboard "Overview" card: the
 * `/dashboard` route no longer computes it (see that route's comment), which left `counts()` and
 * `app/sql/counts.sql` with no caller. The eleven row counts are gone from the product, not deferred.
 */

import { composeStatement } from "./spoolreports.js";

/** `app/reports/sql/items_report.sql`, in SELECT order. */
const ITEM_COLUMNS = ["id", "name", "created", "updated", "cost_price", "sale_price", "box_size_qty", "category", "qty"];

const ITEMS_SQL = "/ahscripts/reports/sql/items_report.sql";

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
