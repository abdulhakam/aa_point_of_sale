// Guest data layer: read the base tables straight from the depot SQLite database.
//
// The Node app reads the same tables through TrailBase's record APIs; here the guest has
// direct SQL, so rows are read with explicit column names (from `pragma_table_info`) and
// normalised the same way (`relId` for relation columns, 0/1 for booleans).
//
// NOTE: `id`/FK columns are BLOB uuid_v7; the bridge base64-encodes them, so every id in
// this app is a base64 string and all cross-references stay consistent.

import { relId } from "../compute/ids.js";

export const TABLES = [
  "party_types",
  "invoice_types",
  "payment_types",
  "sections",
  // The legacy `categories` collection IS the company list and maps onto `companies`
  // directly. There is no separate categories table -- see
  // migrations/main/U1790300400__map_pocketbase_categories_to_companies.sql.
  "companies",
  "areas",
  "parties",
  "order_bookers",
  "items",
  "expenses",
  "party_companies",
  "order_booker_companies",
  "invoices",
  "invoices_return_reference",
  "transactions",
  "payments",
];

const RELATIONS = {
  areas: ["section"],
  parties: ["type", "area"],
  items: ["category"],
  invoices: ["type", "party", "booker", "invoice_maker"],
  invoices_return_reference: ["original_invoices"],
  transactions: ["invoice", "item"],
  payments: ["invoice", "party", "paid_to", "type"],
  party_companies: ["party", "company"],
  order_booker_companies: ["order_booker", "company"],
};

const BOOLEANS = {
  companies: ["deleted"],
  areas: ["deleted"],
  parties: ["deleted"],
  order_bookers: ["deleted"],
  invoices: ["completed", "deleted"],
  transactions: ["deleted"],
  payments: ["paid"],
};

export function normalizeRow(table, row) {
  const out = { ...row };
  for (const col of RELATIONS[table] ?? []) out[col] = relId(row[col]);
  for (const col of BOOLEANS[table] ?? []) out[col] = row[col] === true || row[col] === 1 ? 1 : 0;
  return out;
}

export function normalizeRows(table, rows) {
  return rows.map((row) => normalizeRow(table, row));
}

const quoteIdent = (name) => '"' + String(name).replace(/"/g, '""') + '"';

// cache: table -> column names (the schema is fixed for the depot's lifetime)
const COLUMNS = {};

async function columnsOf(table) {
  if (COLUMNS[table]) return COLUMNS[table];
  const info = await sqlite.all("SELECT name FROM pragma_table_info(?)", [table]);
  const cols = (info ?? []).map((row) => row[0]);
  COLUMNS[table] = cols;
  return cols;
}

/** Read one base table as objects, normalised.
 *
 * Ordered `-id`, which is the TrailBase record API's default order (uuid_v7 ids are
 * time-sortable). The Node app reads its base tables through those APIs, and row order is
 * load-bearing: the report calculators sort some views but not all, and float accumulation
 * follows input order, so the guest must present the same order to get the same output.
 */
export async function readTable(table) {
  const cols = await columnsOf(table);
  if (!cols.length) return [];
  const sql = `SELECT ${cols.map(quoteIdent).join(", ")} FROM ${quoteIdent(table)} ORDER BY "id" DESC`;
  const raw = await sqlite.all(sql, []);
  const rows = (raw ?? []).map((values) => {
    const obj = {};
    for (let i = 0; i < cols.length; i++) obj[cols[i]] = values[i];
    return obj;
  });
  return normalizeRows(table, rows);
}

/** The invoice ids the current read admitted, so the child tables are filtered against the same set. */
let committedInvoices = new Set();

/**
 * Whether a row belongs to a COMMITTED invoice, i.e. is in the books.
 *
 * A draft is not (vault/decisions/invoice-lifecycle-draft-open-append-only.md), so it must not
 * reach a report. Filtering here — at the one place every base table is read — means all 14 report
 * pages inherit the predicate from a single change, rather than each view builder having to
 * remember it and a missed one silently publishing a half-entered invoice.
 *
 * `transactions` and `payments` are judged by their invoice, because neither carries a status. A
 * payment with no invoice is a standalone DA voucher and is always its own fact.
 */
function isCommitted(table, row) {
  if (table === "invoices") return row.status !== "draft";
  if (table === "transactions" || table === "payments") {
    if (row.invoice === null || row.invoice === undefined) return true;
    return committedInvoices.has(String(row.invoice));
  }
  return true;
}

/**
 * The open invoice ids, read as a two-column projection.
 *
 * Always read, even when the caller asked for a subset, because a `transactions` or `payments` row
 * is only classifiable against this set. It is a projection rather than `readTable("invoices")` so
 * the incremental refresh keeps its speed: the expensive tables (23k transactions, 26k payments)
 * are still read only when they change, and this costs one small scan of 9k two-column rows.
 */
async function readCommittedInvoiceIds() {
  const raw = await sqlite.all('SELECT "id", "status" FROM "invoices"', []);
  const set = new Set();
  for (const row of raw ?? []) {
    // A row with a NULL status predates the lifecycle migration, or came through the record API
    // without the column; `completed` is the fallback so it stays in the books rather than
    // silently disappearing from every report.
    const status = row[1] !== null && row[1] !== undefined ? String(row[1]) : "open";
    if (status !== "draft") set.add(String(row[0]));
  }
  return set;
}

/** Read every base table (or the given subset), with drafts excluded. */
export async function readTables(tables = TABLES) {
  const out = {};
  // `invoices` is judged by its own column and needs no set; the child tables are classified
  // against the set, so it is only read when one of them is actually requested.
  const needsInvoiceSet = tables.includes("transactions") || tables.includes("payments");
  if (needsInvoiceSet) committedInvoices = await readCommittedInvoiceIds();
  for (const table of tables) {
    const rows = await readTable(table);
    out[table] =
      table === "invoices" || needsInvoiceSet ? rows.filter((row) => isCommitted(table, row)) : rows;
  }
  return out;
}
