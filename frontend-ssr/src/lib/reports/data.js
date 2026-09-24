import { relId } from "../uuid.js";

/**
 * Base tables read from the TrailBase record APIs. TrailBase holds the data and
 * the enumeration vocabularies; everything derived is computed here.
 */
export const TABLES = [
  "party_types",
  "invoice_types",
  "payment_types",
  "sections",
  "categories",
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

/** Columns that are foreign keys (enum codes or record ids) — read as `{id}`. */
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
  categories: ["deleted"],
  companies: ["deleted"],
  areas: ["deleted"],
  parties: ["deleted"],
  order_bookers: ["deleted"],
  invoices: ["completed", "deleted"],
  transactions: ["deleted"],
  payments: ["paid"],
};

function normalizeRow(table, row) {
  const out = { ...row };
  for (const col of RELATIONS[table] ?? []) out[col] = relId(row[col]);
  for (const col of BOOLEANS[table] ?? []) out[col] = row[col] === true || row[col] === 1 ? 1 : 0;
  return out;
}

/** Read every base table (in parallel) and normalise relation columns. */
export async function fetchBase(tb, token) {
  const pairs = await Promise.all(TABLES.map(async (table) => [table, await tb.listAll(table, { token })]));
  const base = {};
  for (const [table, rows] of pairs) base[table] = normalizeRows(table, rows);
  return base;
}

/** Apply `normalizeRow` to a whole list (used by the management screens too). */
export function normalizeRows(table, rows) {
  return rows.map((row) => normalizeRow(table, row));
}
