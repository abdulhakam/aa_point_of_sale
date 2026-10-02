// refs — the reference lists behind every filter dropdown and every management picker.
//
// The DEFINITION of what refs is lives in `app/sql/refs.sql`: nine (key, table) pairs. This module
// runs that file, reads each table through `readTable`, and caches the result against the live data
// fingerprint.
//
// It replaces `compute/views.js`'s `buildRefs` plus the `VIEW_DEPS.refs` entry, which between them
// named the same nine tables twice. `buildRefs` is the last thing `compute/views.js` is used for
// besides `counts`, so this is step 1 of [[tb-0032-manifest-first-refactor]].
//
// WHY IT IS NOT ONE HAND-WRITTEN STATEMENT PER TABLE. The nine tables have different column counts,
// so `SELECT *` branches cannot be UNION ALL'd, and listing each table's columns would duplicate
// `pragma_table_info` and drift the first time a migration adds one. Reading through the shared
// `readTable` means the normalisation — BLOB ids base64'd, relation columns mapped, booleans as
// 0/1, ordered `id DESC` — is identical to every other read in the guest by construction, not by
// agreement.
//
// `readTable` has no `deleted` filter, so a soft-deleted row is in refs. That is pre-existing
// behaviour, kept deliberately here: this module replaces the source of refs, it does not redefine
// what refs contains. If soft-deleted rows should be hidden from dropdowns, that is a change to
// `readTable`'s callers or a filter in `refs.sql`, and it needs deciding on its own evidence.

import { readTable } from "./data.js";

const REFS_SQL = "/app/sql/refs.sql";

/** (ref_key, table_name) pairs. Parsed from the .sql file so the file stays the only place. */
function parsePairs(rows) {
  const pairs = [];
  for (const row of rows ?? []) {
    // The bridge returns rows positionally for `SELECT <cols>`, but an object row is accepted too:
    // this statement is hand-written rather than derived from a column list, so it must not depend
    // on which shape the bridge chose. Getting this wrong yields an EMPTY refs object rather than an
    // error, which is the worst failure mode a reference list can have.
    const key = Array.isArray(row) ? row[0] : row?.ref_key;
    const table = Array.isArray(row) ? row[1] : row?.table_name;
    const k = key === null || key === undefined ? "" : String(key);
    const t = table === null || table === undefined ? "" : String(table);
    if (k && t) pairs.push([k, t]);
  }
  return pairs;
}

/** The raw rows the statement returned, for the equivalence check. Not used on the request path. */
export async function rawPairs() {
  const sql = String(await fs.readFile(REFS_SQL)).trim().replace(/;\s*$/, "");
  return await sqlite.all(sql, []);
}

let cached = null;
let cachedFor = null;

/**
 * The live refs object: every key is always an array, even when empty.
 *
 * Cached on the data fingerprint, so a management write (which moves it) rebuilds on the next read.
 * `invalidate()` is not needed here: the fingerprint is the same signal `getViews` uses, and reading
 * it is one indexed row.
 */
export async function refs(fingerprint) {
  if (cached && cachedFor === fingerprint) return cached;
  const pairs = parsePairs(await fs.readFile(REFS_SQL).then((sql) => sqlite.all(stripTrailingSemicolon(sql), [])));
  const out = {};
  for (const [key, table] of pairs) out[key] = await readTable(table);
  cached = out;
  cachedFor = fingerprint;
  return out;
}

/** Drop the cache. Called on a management write, alongside the view service's own invalidate. */
export function invalidate() {
  cached = null;
  cachedFor = null;
}

/** A stable shape summary, for the equivalence check. Order-insensitive, counts plus first/last id. */
export function shape(value) {
  const out = {};
  for (const key of Object.keys(value ?? {}).sort()) {
    const rows = value[key] ?? [];
    out[key] = {
      n: rows.length,
      firstId: rows.length ? String(rows[0].id ?? "") : null,
      lastId: rows.length ? String(rows[rows.length - 1].id ?? "") : null,
    };
  }
  return out;
}

const stripTrailingSemicolon = (sql) => String(sql).trim().replace(/;\s*$/, "");