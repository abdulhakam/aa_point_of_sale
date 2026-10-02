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



/**
 * Read every base table (or the given subset).
 *
 * There is no draft filter here. An invoice is in the books the moment it is saved and stays
 * editable afterwards (vault/decisions/no-draft-invoices-published-on-save.md), so every row of
 * every table is in the books — including a `transactions` or `payments` row whose invoice is
 * missing, which stands on its own as a fact.
 */
export async function readTables(tables = TABLES) {
  const out = {};
  for (const table of tables) out[table] = await readTable(table);
  return out;
}
