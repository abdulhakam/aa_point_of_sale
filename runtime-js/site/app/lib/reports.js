// Guest report service.
//
// The Node service keeps a warm snapshot of *all* views, refreshed off the request path. The
// guest is an interpreter (see vault: ~1M ops/s, ~20s call deadline), so building every view
// per request is too slow. Instead this builds lazily: only the `viewClosure` a request needs,
// reading only the base tables those views read, and merges the result into a cached snapshot.
// `invalidate()` drops the snapshot (management writes call it).

import { TABLES, readTables } from "./data.js";
import { buildView, viewClosure, tablesForViews, viewsAffectedBy, VIEW_ORDER } from "../compute/views.js";
import { REPORTS, runReport } from "../compute/reports.js";
import { relId } from "../compute/ids.js";
import { rows as sqlViewRows } from "./sqlviews.js";

/**
 * Views whose scan/join work can run in SQL instead of JS ([[convert-base-views-not-derivations]]).
 *
 * **Off by default.** The SQL views are verified against the JS ([[legacy-sql-views-differ-from-js-views]])
 * but SQLite does not guarantee the scan order feeding an aggregate, so its `SUM` accumulates
 * floats differently from the JS's fixed-order `+=`. The derived reports then drift by ~1e-12 and
 * *flakily* (the differential passes on some runs, fails on others). Until the accumulation is made
 * deterministic — or the float-sensitive aggregates stay in JS (`sql+js`) — the JS path is the
 * parity-safe default and this switch stays off.
 */
const USE_SQL_VIEWS = true;

const SQL_VIEWS = USE_SQL_VIEWS
  ? { transactionView: "transaction_view", invoiceView: "invoice_view" }
  : {};

/**
 * Views where SQL supplies the rows but one column must be assembled in JS because SQL cannot
 * express it.
 *
 * Empty on purpose: `paymentsView` was tried here (SQL rows + a JS `company` array) and broke
 * parity (differential 9–12/14, flaky) — the legacy `payments_view` differs from the JS in more
 * than `company`, as the equivalence gate warned ([[legacy-sql-views-differ-from-js-views]]). Only
 * views the gate proves byte-identical are converted.
 */
const HYBRID_SQL_VIEWS = {};

/** Attach `company` (array, as the JS view does) from the booker's link table. */
function augmentPaymentsView(rows) {
  const byBooker = new Map();
  for (const link of state.base.order_booker_companies ?? []) {
    const booker = relId(link.order_booker);
    if (!byBooker.has(booker)) byBooker.set(booker, []);
    byBooker.get(booker).push(relId(link.company));
  }
  for (const row of rows) {
    row.company = row.booker && byBooker.has(row.booker) ? byBooker.get(row.booker) : [];
  }
  return rows;
}

async function buildOne(name, built) {
  const sqlName = SQL_VIEWS[name];
  if (sqlName) {
    try {
      return await sqlViewRows(sqlName);
    } catch (error) {
      console.log(`[sqlview] ${name} failed, using JS: ${error}`);
    }
  }
  const hybridName = HYBRID_SQL_VIEWS[name];
  if (hybridName) {
    try {
      return augmentPaymentsView(await sqlViewRows(hybridName));
    } catch (error) {
      console.log(`[sqlview] ${name} (hybrid) failed, using JS: ${error}`);
    }
  }
  return buildView(name, state.base, built);
}

const state = {
  base: {},
  views: {},
  version: 0,
  built: [], // view names currently materialised
  fingerprints: null, // table -> `${count}:${newest updated}`
  refreshedAt: null,
  lastRefresh: null,
  // Report results are cached in the KV store. The key includes a per-process nonce so a restart
  // never serves a stale entry, and the snapshot version so a rebuild/invalidate makes new keys.
  nonce: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
  cacheHits: 0,
  cacheMisses: 0,
};

const cacheKey = (name, filters) => `rpt:${state.nonce}:${state.version}:${name}:${JSON.stringify(filters)}`;

/** A cheap change probe per table: row count and newest `updated`.
 *
 * Link tables have no `updated` column, so those fall back to a count-only fingerprint (a row
 * added/removed still changes it). */
async function probeFingerprints(db) {
  const out = {};
  for (const table of TABLES) {
    try {
      const rows = await db.all(`SELECT COUNT(*) AS n, COALESCE(MAX("updated"), '') AS newest FROM "${table}"`, []);
      out[table] = `${rows[0][0]}:${rows[0][1]}`;
    } catch {
      const rows = await db.all(`SELECT COUNT(*) AS n FROM "${table}"`, []);
      out[table] = `${rows[0][0]}:`;
    }
  }
  return out;
}

/** Base tables a set of views needs materialised: none for pure-SQL views, the link table for a
 * hybrid's augment, and the declared tables for JS views. */
function baseTablesFor(views) {
  const out = new Set();
  for (const name of views) {
    if (SQL_VIEWS[name]) continue;
    if (HYBRID_SQL_VIEWS[name]) {
      out.add("order_booker_companies");
      continue;
    }
    for (const table of tablesForViews([name])) out.add(table);
  }
  return [...out];
}

/** The view arrays a report needs, per its registry `inputs`. */
export function viewsForReport(name) {
  const spec = REPORTS[name];
  if (!spec) throw new Error(`Unknown report: ${name}`);
  return spec.inputs;
}

/**
 * Make sure the given views (and their view dependencies) are built, reading only the base
 * tables they need. Returns the snapshot.
 */
export async function getViews(names) {
  const requested = (names && names.length ? names : VIEW_ORDER);
  const need = viewClosure(requested);
  const missingViews = need.filter((name) => state.views[name] === undefined);
  if (missingViews.length) {
    // Pure-SQL views read the database themselves; hybrid views need only the link table their
    // JS augment reads; JS views need their declared base tables.
    const tables = baseTablesFor(missingViews).filter((table) => state.base[table] === undefined);
    if (tables.length) {
      const rows = await readTables(tables);
      for (const table of tables) state.base[table] = rows[table];
    }
    // `viewClosure` is already in VIEW_ORDER order, so a view sees fresh dependencies.
    const built = {};
    for (const name of need) {
      built[name] = state.views[name] !== undefined ? state.views[name] : await buildOne(name, built);
    }
    for (const name of need) state.views[name] = built[name];
    state.built = Object.keys(state.views);
    state.version++;
  }
  return state;
}

/** Drop everything; the next getViews() re-reads from the database. Bumps the version so cached
 * report results (whose keys include it) cannot be served. */
export function invalidate() {
  state.base = {};
  state.views = {};
  state.built = [];
  state.version++;
}

/**
 * Fingerprint refresh: probe every table (`count:newest updated`), then re-read only the tables
 * that changed and rebuild only the views affected by them. With nothing materialised yet
 * (e.g. after a `full` invalidate) it builds the whole set, so the snapshot is ready afterwards —
 * matching the Node service, which refreshes off the request path.
 */
export async function refresh(db) {
  const next = await probeFingerprints(db);
  const changed = TABLES.filter((table) => !state.fingerprints || state.fingerprints[table] !== next[table]);
  state.fingerprints = next;
  state.refreshedAt = Date.now();

  const hadSnapshot = state.built.length > 0;
  const affected = [...viewsAffectedBy(changed)];
  const dirty = new Set(
    hadSnapshot ? affected.filter((name) => state.views[name] !== undefined) : VIEW_ORDER
  );
  if (dirty.size === 0) {
    state.lastRefresh = { changed, rebuilt: [] };
    return state;
  }

  const toRead = baseTablesFor([...dirty]).filter((table) => state.base[table] === undefined || changed.includes(table));
  if (toRead.length) {
    const rows = await readTables(toRead);
    for (const table of toRead) state.base[table] = rows[table];
  }
  const rebuilt = { ...state.views };
  for (const name of VIEW_ORDER) {
    if (!dirty.has(name)) continue;
    rebuilt[name] = await buildOne(name, rebuilt);
  }
  state.views = rebuilt;
  state.built = Object.keys(state.views);
  state.version++;
  state.lastRefresh = { changed, rebuilt: [...dirty] };
  return state;
}

export async function run(name, filters) {
  const spec = REPORTS[name];
  if (!spec) throw new Error(`Unknown report: ${name}`);

  const key = cacheKey(name, filters);
  try {
    const cached = await kv.get(key);
    if (cached) {
      state.cacheHits++;
      return JSON.parse(cached);
    }
  } catch {
    // A KV failure must not fail the report.
  }

  const current = await getViews(spec.inputs);
  const ctx = {};
  for (const input of spec.inputs) ctx[input] = current.views[input];
  const result = runReport(name, ctx, filters);

  try {
    await kv.set(key, JSON.stringify(result));
    state.cacheMisses++;
  } catch {
    // best effort
  }
  return result;
}

/** Base tables a page needs, read on demand (used by the page data endpoint). */
export async function ensureTables(tables) {
  const missing = (tables || []).filter((table) => state.base[table] === undefined);
  if (missing.length) {
    const rows = await readTables(missing);
    for (const table of missing) state.base[table] = rows[table];
  }
  return state;
}

export function baseTable(name) {
  return state.base[name] || [];
}

export function status() {
  const rows = state.built.reduce((n, name) => n + ((state.base[name] || []).length), 0);
  const baseRows = Object.keys(state.base).reduce((n, name) => n + ((state.base[name] || []).length), 0);
  return {
    ready: state.built.length > 0,
    build: state.version,
    at: null,
    phase: "idle",
    tables: Object.keys(state.base).length,
    views: state.built.length,
    rows: baseRows || rows,
    cachedReports: state.cacheHits + state.cacheMisses,
    reportCacheHits: state.cacheHits,
    reportCacheMisses: state.cacheMisses,
    intervalMs: 0,
    fingerprints: state.fingerprints ? Object.keys(state.fingerprints).length : 0,
    refreshedAt: state.refreshedAt,
    lastRefresh: state.lastRefresh,
    // Shape compatibility with the Node service's `status()` (which reports a worker pool).
    workers: 1,
    idle: 1,
    queued: 0,
    inFlight: 0,
  };
}
