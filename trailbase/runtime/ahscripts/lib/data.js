// Guest data layer: read the base tables straight from the depot SQLite database.
//
// The Node app reads the same tables through TrailBase's record APIs; here the guest has
// direct SQL, so rows are read with explicit column names (from `pragma_table_info`) and
// normalised the same way (`relId` for relation columns, 0/1 for booleans).
//
// NOTE: `id`/FK columns are BLOB uuid_v7; the bridge base64-encodes them, so every id in
// this app is a base64 string and all cross-references stay consistent.
//
// The schema contract itself — `TABLES`, `RELATIONS`, `BOOLEANS` — is `/ahscripts/manifests/schema.json`,
// generated from this module on 2026-10-03 and read back by `install()` below. It is data about the
// schema, like `app/sql/` and `migrations/`, and it was three literals in a module that has behaviour
// in it. `app()` installs it once; the exports are plain objects so `normalizeRow` stays synchronous.

let schema = { tables: [], relations: {}, booleans: {} };

/**
 * Adopt the schema manifest. Called once, from the dispatcher's `app()`.
 *
 * Throws rather than leaving the exports empty: with no schema, `readTable` returns nothing and every
 * management screen renders empty, which is not a shape worth debugging. The checks are here so a
 * manifest that names a table which does not exist is rejected at start-up rather than silently
 * producing empty relation and boolean sets for it.
 */
export function install(manifest) {
  if (!manifest || !Array.isArray(manifest.tables) || !manifest.tables.length) {
    throw new Error("schema manifest is missing or declares no tables");
  }
  const tables = manifest.tables;
  for (const [label, group] of [["relations", manifest.relations], ["booleans", manifest.booleans]]) {
    for (const table of Object.keys(group || {})) {
      if (!tables.includes(table)) {
        throw new Error(`schema manifest: ${label} names a table that is not declared: ${table}`);
      }
    }
  }
  TABLES.length = 0;
  TABLES.push(...tables);
  schema = { tables, relations: manifest.relations || {}, booleans: manifest.booleans || {} };
  return schema;
}

/** True once `install()` has run. */
export function ready() {
  return schema.tables.length > 0;
}

/** The relation (foreign-key) columns of a table, base64 by the bridge. */
export function relationsOf(table) {
  return schema.relations[table] || [];
}

/** The 0/1 boolean columns of a table. */
export function booleansOf(table) {
  return schema.booleans[table] || [];
}

import { relId } from "../compute/ids.js";

// The legacy `categories` collection IS the company list and maps onto `companies` directly. There is no
// separate categories table -- see migrations/main/U1790300400__map_pocketbase_categories_to_companies.sql.
// Populated by `install()` from `/ahscripts/manifests/schema.json`; kept as a mutable array so consumers that
// captured this binding keep working once the manifest is installed.
export const TABLES = [];

export function normalizeRow(table, row) {
  const out = { ...row };
  for (const col of relationsOf(table)) out[col] = relId(row[col]);
  for (const col of booleansOf(table)) out[col] = row[col] === true || row[col] === 1 ? 1 : 0;
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
