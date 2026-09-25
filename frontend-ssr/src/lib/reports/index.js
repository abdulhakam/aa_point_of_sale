import { TABLES, fetchTables, probeTables, signatureChanged, signatureOfRows } from "./data.js";
import { buildSelectedViews, viewsAffectedBy } from "../../../compute/views.js";
import { REPORTS, runReport } from "../../../compute/reports.js";
import { createPool } from "./pool.js";

/**
 * Report service.
 *
 * A snapshot of the base tables and their derived views is held in memory and
 * kept fresh by a background job. Reading TrailBase is cheap, so the job spends
 * CPU only when something actually changed:
 *
 *  1. probe — one request per table for a fingerprint (row count + newest
 *     `updated`); tables whose fingerprint did not move are left alone;
 *  2. fetch — only the changed tables, each read whole;
 *  3. process — only the views those tables feed (`viewsAffectedBy`);
 *  4. render — only the reports that read a rebuilt view, pre-rendered for their
 *     default filters and cached.
 *
 * A management write calls `invalidate(tables)`, which marks just those tables
 * and triggers the same job immediately, so the next request sees the write.
 * Report results are cached per (report, filters) until a rebuilt view can affect
 * them. Report aggregation runs on worker threads; if the pool cannot start, the
 * same pure function runs in-process.
 */

const cacheKey = (name, filters) => `${name}\u0000${JSON.stringify(filters, Object.keys(filters).sort())}`;
const MAX_CACHED_REPORTS = 200;

export function createReportService({ tb, refreshIntervalMs = 60000, poolSize = 0, warm = [], logger = console } = {}) {
  const pool = poolSize > 0 ? createPool(poolSize) : null;
  if (pool) logger.info?.(`[reports] worker pool started with ${pool.size} thread(s)`);

  let base = {};
  let views = null;
  let signatures = {};
  let ready = false;
  let builds = 0; // increments on every successful rebuild — the snapshot's identity
  let dirty = null; // Set<string> | null — tables changed since the last build
  let version = 0; // bumped by invalidate(); a commit clears `dirty` only if it saw this version
  let lastToken = null;
  let inflight = null;
  let timer = null;
  const reportCache = new Map();

  let job = {
    phase: "idle",
    startedAt: null,
    finishedAt: null,
    lastCheckedAt: null,
    lastRunAt: null,
    durationMs: null,
    changed: [],
    rebuiltViews: [],
    rebuiltReports: [],
    error: null,
  };
  const setJob = (patch) => {
    job = { ...job, ...patch };
  };

  const snapshot = () => ({ views, base, at: job.lastRunAt, ready, version: builds });
  const needsRefresh = () => !ready || dirty !== null;

  function rememberToken(token) {
    if (token) lastToken = token;
  }

  function put(name, filters, result) {
    reportCache.set(cacheKey(name, filters), result);
    while (reportCache.size > MAX_CACHED_REPORTS) reportCache.delete(reportCache.keys().next().value);
  }

  async function compute(name, currentViews, filters) {
    const spec = REPORTS[name];
    if (!spec) throw new Error(`Unknown report: ${name}`);
    const ctx = {};
    for (const key of spec.inputs) ctx[key] = currentViews[key];
    if (pool) {
      try {
        return await pool.run("report", { name, ctx, filters });
      } catch (error) {
        logger.warn?.(`[reports] worker failed for ${name}, falling back in-process: ${error.message}`);
      }
    }
    return runReport(name, ctx, filters);
  }

  /** The refresh job. Single-flight through `inflight`. */
  async function doRefresh() {
    const token = lastToken;
    if (!token) return null;
    const v0 = version;
    const started = Date.now();
    // `changed`/`rebuiltViews`/`rebuiltReports` describe the last rebuild until this
    // run replaces them, so an idle indicator can still report what last happened.
    setJob({ phase: "fetch", startedAt: started, error: null });

    const known = dirty;
    let probes = null;
    let changed;
    if (known) {
      changed = TABLES.filter((table) => known.has(table));
    } else {
      probes = await probeTables(tb, token);
      changed = ready ? TABLES.filter((table) => signatureChanged(signatures[table], probes[table])) : TABLES.slice();
    }

    if (!changed.length) {
      // Nothing moved: no fetch, no rebuild, no re-render.
      if (probes) signatures = { ...signatures, ...probes };
      if (version === v0) dirty = null;
      setJob({ phase: "idle", lastCheckedAt: Date.now(), durationMs: Date.now() - started });
      return snapshot();
    }

    // 1. fetch — only the tables whose fingerprint moved, each read whole.
    const rows = await fetchTables(tb, token, changed);

    // 2. process — only the views those tables feed.
    const affected = viewsAffectedBy(changed);
    setJob({ phase: "process", changed: changed.slice(), rebuiltViews: [...affected] });
    const nextBase = { ...base, ...rows };
    views = buildSelectedViews(nextBase, views, affected);
    base = nextBase;

    // 3. commit — publish the snapshot *before* pre-rendering, so a request that
    // arrives during the render phase reads fresh views instead of waiting.
    const nextSignatures = { ...signatures, ...(probes ?? {}) };
    for (const table of changed) nextSignatures[table] = signatureOfRows(rows[table]);
    signatures = nextSignatures;
    ready = true;
    builds++;
    if (version === v0) dirty = null;
    setJob({ phase: "idle", finishedAt: Date.now(), lastCheckedAt: Date.now(), lastRunAt: Date.now(), durationMs: Date.now() - started });

    // 4. render — background; nothing waits on it.
    const staleReports = new Set(
      Object.entries(REPORTS)
        .filter(([, spec]) => spec.inputs.some((input) => affected.has(input)))
        .map(([name]) => name)
    );
    for (const key of [...reportCache.keys()]) {
      if (staleReports.has(key.slice(0, key.indexOf("\u0000")))) reportCache.delete(key);
    }
    preRender(staleReports);
    return snapshot();
  }

  /** Re-render the affected reports' default views into the cache. Off the critical path. */
  async function preRender(staleReports) {
    const started = Date.now();
    setJob({ phase: "render", rebuiltReports: [...staleReports] });
    const rendered = [];
    try {
      for (const entry of warm) {
        if (!staleReports.has(entry.name)) continue;
        try {
          put(entry.name, entry.filters, await compute(entry.name, views, entry.filters));
          rendered.push(entry.name);
        } catch (error) {
          logger.warn?.(`[reports] could not pre-render ${entry.name}: ${error.message}`);
        }
      }
    } finally {
      setJob({ phase: "idle", finishedAt: Date.now(), lastCheckedAt: Date.now(), rebuiltReports: rendered, durationMs: Date.now() - started });
    }
  }

  function refresh() {
    if (inflight) return inflight;
    inflight = doRefresh()
      .catch((error) => {
        setJob({ phase: "error", error: String(error?.message ?? error), finishedAt: Date.now() });
        logger.warn?.(`[reports] refresh failed: ${error.message}`);
        return null;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  }

  async function ensureFresh(token) {
    if (token) lastToken = token;
    let result = null;
    // A write can land mid-refresh; the version guard keeps `dirty` set, so give it
    // one more pass. Bounded, so a stream of writes cannot spin here forever.
    for (let attempt = 0; attempt < 3 && needsRefresh(); attempt++) result = await refresh();
    if (result?.views) return result;
    if (views) return snapshot();
    throw new Error("report data is not available yet");
  }

  async function getViews(token) {
    return ensureFresh(token);
  }

  async function run(name, token, filters) {
    if (!REPORTS[name]) throw new Error(`Unknown report: ${name}`);
    const key = cacheKey(name, filters);
    if (reportCache.has(key)) return reportCache.get(key);
    const { views: current } = await ensureFresh(token);
    const result = await compute(name, current, filters);
    put(name, filters, result);
    return result;
  }

  /** A write happened: re-read these tables (or all of them) before the next read. */
  function invalidate(tables) {
    reportCache.clear();
    version++;
    if (tables && tables.length) {
      if (!dirty) dirty = new Set();
      for (const table of tables) if (TABLES.includes(table)) dirty.add(table);
    } else {
      dirty = new Set(TABLES);
    }
    if (lastToken) refresh();
  }

  function start() {
    if (timer || !(refreshIntervalMs > 0)) return;
    timer = setInterval(() => {
      if (lastToken) refresh();
    }, refreshIntervalMs);
    if (timer.unref) timer.unref();
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function status() {
    return {
      ...job,
      ready,
      build: builds,
      tables: TABLES.length,
      rows: TABLES.reduce((n, table) => n + (base[table]?.length ?? 0), 0),
      cachedReports: reportCache.size,
      intervalMs: refreshIntervalMs,
      nextRunAt: timer && (job.lastCheckedAt ?? job.lastRunAt) ? (job.lastCheckedAt ?? job.lastRunAt) + refreshIntervalMs : null,
    };
  }

  return {
    getViews,
    run,
    invalidate,
    rememberToken,
    start,
    stop,
    status,
    refresh,
    stats: () =>
      pool ? { ...pool.stats(), phase: job.phase } : { workers: 0, idle: 0, queued: 0, inFlight: 0, phase: job.phase },
    close: () => {
      stop();
      return pool?.close();
    },
  };
}
