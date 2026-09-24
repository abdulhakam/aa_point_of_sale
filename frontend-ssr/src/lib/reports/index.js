import { fetchBase } from "./data.js";
import { buildViews } from "./views.js";
import { REPORTS, runReport } from "./reports.js";
import { createPool } from "./pool.js";

/**
 * Report service.
 *
 *  - The base tables and their derived views are read once and cached for
 *    `cacheTtlMs`; a management write invalidates the cache.
 *  - Each report request is dispatched to a worker thread with only the view
 *    arrays that report declares, so aggregation runs off the request thread.
 *  - If the pool cannot start, the same pure function runs in-process.
 */
export function createReportService({ tb, cacheTtlMs = 60000, poolSize = 0, logger = console } = {}) {
  let cache = null;
  let inflight = null;
  const pool = poolSize > 0 ? createPool(poolSize) : null;
  if (pool) logger.info?.(`[reports] worker pool started with ${pool.size} thread(s)`);

  const build = async (token) => {
    const base = await fetchBase(tb, token);
    const views = buildViews(base);
    return { views, base, at: Date.now() };
  };

  async function getViews(token, { force = false } = {}) {
    if (!force && cache && Date.now() - cache.at < cacheTtlMs) return cache;
    if (inflight) return inflight;
    inflight = build(token)
      .then((entry) => {
        cache = entry;
        return entry;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  }

  function invalidate() {
    cache = null;
  }

  async function run(name, token, filters) {
    const spec = REPORTS[name];
    if (!spec) throw new Error(`Unknown report: ${name}`);
    const { views } = await getViews(token);
    const ctx = {};
    for (const key of spec.inputs) ctx[key] = views[key];
    if (pool) {
      try {
        return await pool.run("report", { name, ctx, filters });
      } catch (error) {
        logger.warn?.(`[reports] worker failed for ${name}, falling back in-process: ${error.message}`);
      }
    }
    return runReport(name, ctx, filters);
  }

  return {
    getViews,
    invalidate,
    run,
    stats: () => (pool ? pool.stats() : { workers: 0, idle: 0, queued: 0, inFlight: 0 }),
    close: () => pool?.close(),
  };
}
