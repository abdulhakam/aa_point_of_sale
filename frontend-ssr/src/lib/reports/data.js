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

/** Read the given base tables (in parallel) and normalise relation columns. */
export async function fetchTables(tb, token, tables) {
  const pairs = await Promise.all(tables.map(async (table) => [table, await tb.listAll(table, { token })]));
  const out = {};
  for (const [table, rows] of pairs) out[table] = normalizeRows(table, rows);
  return out;
}

/** Apply `normalizeRow` to a whole list (used by the management screens too). */
export function normalizeRows(table, rows) {
  return rows.map((row) => normalizeRow(table, row));
}

/* ------------------------------------------------------------- change probe */

/**
 * Cheap per-table fingerprint: the row count and the newest `updated` value.
 * Every base table carries `updated`, maintained by an AFTER UPDATE trigger, and
 * TrailBase's uuid_v7 ids are time-sortable, so any insert, delete or in-place
 * update moves one of these two — a single `limit=1&count=true` request per table
 * is enough to tell whether the table needs re-reading at all.
 */
export function newestUpdated(rows) {
  let max = "";
  for (const row of rows) {
    const u = String(row.updated ?? "");
    if (u > max) max = u;
  }
  return max || null;
}

export const signatureOfRows = (rows) => ({ count: rows.length, newest: newestUpdated(rows) });

export const signatureChanged = (before, after) =>
  !before || !after || before.count !== after.count || before.newest !== after.newest;

/**
 * One request per table for the current fingerprint. `order=-updated` is
 * optimistic: on a server that rejects that ordering the probe degrades to a
 * count-only fingerprint, which still catches inserts and deletes.
 */
export async function probeTables(tb, token, tables = TABLES) {
  const entries = await Promise.all(
    tables.map(async (table) => {
      try {
        const page = await tb.listPage(table, { token, limit: 1, order: "-updated", count: true });
        const row = page.records[0];
        return [table, { count: page.totalCount ?? null, newest: row ? String(row.updated ?? "") || null : null }];
      } catch {
        const page = await tb.listPage(table, { token, limit: 1, count: true });
        return [table, { count: page.totalCount ?? null, newest: null }];
      }
    })
  );
  return Object.fromEntries(entries);
}
