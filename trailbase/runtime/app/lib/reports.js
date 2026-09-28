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
 * **Off in the shipped code.** It was briefly enabled (the 2 dp money rule removed the float
 * flake), then turned off again in commit 5ccebd8: the SQL base views diverge on *fresh* invoices
 * (a sale invoice with an empty `dated`, which invoice entry creates) — `ledgers/party`/`itemsales`
 * error and `dailysale`/`itemsales`/`profit` row counts differ. The earlier float-accumulation
 * concern (SQLite's unordered `SUM` vs the JS fixed-order `+=`, ~1e-12 drift) was handled by the
 * 2 dp rule, but it is the fresh-invoice divergence that keeps this off. Re-enable only once the
 * equivalence gate covers fresh/partial invoices ([[legacy-sql-views-differ-from-js-views]],
 * [[convert-base-views-not-derivations]]).
 */
const USE_SQL_VIEWS = false;

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

/* --------------------------------------------------- materialised snapshot (shared across threads)
 *
 * The host keeps the QuickJS context in a `thread_local` (see `host/src/runtime.rs`), so each of
 * the runtime threads has its own `state` and its own view snapshot. Building the heavy views per
 * thread, on the request path, is what pushes a report past the ~20 s call deadline. To share one
 * build across every thread, the built view rows are persisted to SQLite (`mview` / `mview_meta`)
 * and a thread with nothing materialised hydrates from there. The build itself runs off the request
 * path — the minutely `/jobs/reconcile` job calls `refresh` — so a request only reads.
 *
 * This is a generic capability: the view rows are stored as JSON, whatever shape a view has, so it
 * serves any app, not just this report set.
 */
const MVIEW = true;
const MVIEW_TABLE = "mview";
const MVIEW_META = "mview_meta";
let mviewEnsured = false;
let mviewProbe = { at: 0, fingerprint: null, map: null };

const fpString = (fp) => JSON.stringify(Object.keys(fp).sort().map((key) => [key, fp[key]]));

async function ensureMviewTables() {
  if (mviewEnsured) return;
  await sqlite.execute(`CREATE TABLE IF NOT EXISTS ${MVIEW_TABLE} (name TEXT PRIMARY KEY, data TEXT)`);
  await sqlite.execute(`CREATE TABLE IF NOT EXISTS ${MVIEW_META} (k TEXT PRIMARY KEY, v TEXT)`);
  mviewEnsured = true;
}

/** Persist every materialised view as one JSON blob per view, plus the fingerprint/version.
 *
 * Upsert, not replace: a build may materialise only the views one report needed, and a later build
 * adds the rest. Views built under an earlier fingerprint stay valid as long as their source tables
 * did not change, which is exactly what the affected-view rebuild guarantees.
 */
async function persistViews(fingerprint) {
  await ensureMviewTables();
  for (const name of Object.keys(state.views)) {
    if (state.views[name] === undefined) continue;
    await sqlite.execute(`INSERT OR REPLACE INTO ${MVIEW_TABLE}(name,data) VALUES(?,?)`, [name, JSON.stringify(state.views[name])]);
  }
  await sqlite.execute(`INSERT OR REPLACE INTO ${MVIEW_META}(k,v) VALUES('fingerprint',?)`, [fingerprint]);
  await sqlite.execute(`INSERT OR REPLACE INTO ${MVIEW_META}(k,v) VALUES('version',?)`, [String(state.version)]);
}

async function persistedMeta() {
  await ensureMviewTables();
  const rows = await sqlite.all(`SELECT k,v FROM ${MVIEW_META}`);
  const out = {};
  for (const row of rows) out[String(row[0])] = String(row[1]);
  return out;
}

async function loadPersisted() {
  await ensureMviewTables();
  const rows = await sqlite.all(`SELECT name,data FROM ${MVIEW_TABLE}`);
  const views = {};
  for (const row of rows) {
    try {
      views[String(row[0])] = JSON.parse(String(row[1]));
    } catch {
      // A corrupt blob is skipped; the view is rebuilt as missing.
    }
  }
  return views;
}

/** Read a single materialised view, or undefined when it is not in the store. */
async function loadPersistedView(name) {
  await ensureMviewTables();
  const rows = await sqlite.all(`SELECT data FROM ${MVIEW_TABLE} WHERE name = ?`, [name]);
  if (!rows.length) return undefined;
  try {
    return JSON.parse(String(rows[0][0]));
  } catch {
    return undefined;
  }
}

/** A cheap change probe per table: row count and newest `updated`.
 *
 * Link tables have no `updated` column, so those fall back to a count-only fingerprint (a row
 * added/removed still changes it). */
async function probeFingerprints() {
  const out = {};
  for (const table of TABLES) {
    try {
      const rows = await sqlite.all(`SELECT COUNT(*) AS n, COALESCE(MAX("updated"), '') AS newest FROM "${table}"`, []);
      out[table] = `${rows[0][0]}:${rows[0][1]}`;
    } catch {
      const rows = await sqlite.all(`SELECT COUNT(*) AS n FROM "${table}"`, []);
      out[table] = `${rows[0][0]}:`;
    }
  }
  return out;
}

/** The fingerprint as a string, memoised ~1.5 s so a request does not probe 17 tables repeatedly. */
async function currentFingerprint() {
  const now = Date.now();
  if (!mviewProbe.fingerprint || now - mviewProbe.at > 1500) {
    const map = await probeFingerprints();
    mviewProbe = { at: now, fingerprint: fpString(map), map };
  }
  return mviewProbe.fingerprint;
}

/** Public: the live data fingerprint, for callers that cache derived output (e.g. rendered pages). */
export async function fingerprint() {
  return currentFingerprint();
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
 *
 * Hydration is per view and lazy: when another runtime thread has persisted a fresh snapshot, only
 * the views this request needs are read back from SQLite — not the whole snapshot — so a small
 * report never pays for the large views it does not use.
 */
export async function getViews(names) {
  const requested = (names && names.length ? names : VIEW_ORDER);
  const need = viewClosure(requested);

  let missingViews = need.filter((name) => state.views[name] === undefined);
  if (missingViews.length && MVIEW && state.built.length === 0) {
    // Is the persisted snapshot current? If so, read only the missing views needed here.
    try {
      const meta = await persistedMeta();
      if (meta.fingerprint && meta.fingerprint === (await currentFingerprint())) {
        if (mviewProbe.map) state.fingerprints = mviewProbe.map;
        const hydrated = [];
        for (const name of missingViews) {
          const view = await loadPersistedView(name);
          if (view !== undefined) {
            state.views[name] = view;
            hydrated.push(name);
          }
        }
        if (hydrated.length) console.log(`[mview] hydrate ${hydrated.length}/${need.length} views`);
      }
    } catch {
      // Fall through and build.
    }
    missingViews = need.filter((name) => state.views[name] === undefined);
  }

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
    state.version++;
    // Publish the build so the other runtime threads hydrate instead of rebuilding.
    if (MVIEW) {
      try {
        await persistViews(await currentFingerprint());
        console.log(`[mview] persist ${Object.keys(state.views).length} views`);
      } catch {
        // Persistence is best effort; the in-memory snapshot still serves this thread.
      }
    }
  }
  state.built = Object.keys(state.views);
  return state;
}

/** Drop everything; the next getViews() re-reads from the database. Bumps the version so cached
 * report results (whose keys include it) cannot be served. */
export function invalidate() {
  state.base = {};
  state.views = {};
  state.built = [];
  state.version++;
  mviewProbe = { at: 0, fingerprint: null, map: null };
}

/**
 * Fingerprint refresh: probe every table (`count:newest updated`), then re-read only the tables
 * that changed and rebuild only the views affected by them. With nothing materialised yet
 * (e.g. after a `full` invalidate) it builds the whole set, so the snapshot is ready afterwards —
 * matching the Node service, which refreshes off the request path.
 */
export async function refresh(db) {
  const next = await probeFingerprints();
  const nextFp = fpString(next);

  // If this thread has nothing but the persisted snapshot already matches the live data, adopt it
  // and stop — the snapshot was built elsewhere (the job thread) and there is nothing to rebuild.
  if (MVIEW && state.built.length === 0) {
    try {
      const meta = await persistedMeta();
      if (meta.fingerprint && meta.fingerprint === nextFp) {
        const views = await loadPersisted();
        if (Object.keys(views).length) {
          state.views = views;
          state.built = Object.keys(views);
          state.version = (Number(meta.version) || 0) + 1;
          state.fingerprints = next;
          state.refreshedAt = Date.now();
          state.lastRefresh = { changed: [], rebuilt: [], hydrated: true };
          mviewProbe = { at: Date.now(), fingerprint: nextFp };
          return state;
        }
      }
    } catch {
      // Fall through and build.
    }
  }

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
  if (MVIEW) {
    try {
      await persistViews(fpString(next));
    } catch {
      // Best effort; the in-memory snapshot still serves this thread.
    }
  }
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
