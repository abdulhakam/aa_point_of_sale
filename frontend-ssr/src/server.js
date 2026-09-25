import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, workerCount } from "./config.js";
import { createTrailBase } from "./lib/trailbase.js";
import { createRenderer } from "./lib/render.js";
import { createReportService } from "./lib/reports/index.js";
import { REPORTS } from "../compute/reports.js";
import { sessionMiddleware, requireAuth } from "./lib/auth.js";
import { trailbaseErrorHandler } from "./lib/http.js";
import { authRoutes } from "./routes/auth.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { reportRoutes, REPORT_PAGES, parseFilters } from "./routes/reports.js";
import { managementRoutes } from "./routes/management.js";
import { pluginRoutes } from "./routes/plugins.js";
import { pageRoutes } from "./routes/pages.js";

export function createApp() {
  const app = express();
  const tb = createTrailBase(config.trailbaseUrl);
  const render = createRenderer({ viewsDir: config.viewsDir, pagesDir: config.pagesDir, appName: config.appName });
  // Reports the background job pre-renders after a rebuild, each with the filters
  // its screen opens on, so the first visit after a change is already cached.
  const warm = Object.keys(REPORT_PAGES)
    .filter((key) => REPORTS[key] && !REPORT_PAGES[key].requires)
    .map((key) => ({ name: key, filters: parseFilters(REPORT_PAGES[key], {}) }));
  const reports = createReportService({
    tb,
    refreshIntervalMs: config.refreshIntervalMs,
    poolSize: workerCount(),
    warm,
  });

  app.disable("x-powered-by");
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(cookieParser());
  // Revalidate on every load: these are a handful of small files, and an
  // unchanged file costs a 304 — worth it so runtime edits are picked up.
  app.use("/static", express.static(config.publicDir, { maxAge: 0 }));
  app.use(sessionMiddleware({ tb, config }));
  // The refresh job runs between requests, so it needs a token to read with.
  app.use((req, res, next) => {
    reports.rememberToken(req.token);
    next();
  });
  // The shared, environment-neutral compute modules — byte-for-byte the same files
  // Node imports, served so the browser runtime can run them in a worker.
  app.use("/compute", requireAuth, express.static(config.computeDir));

  const ctx = { config, tb, render, reports };
  app.use(authRoutes(ctx));
  app.use(dashboardRoutes(ctx));
  app.use(reportRoutes(ctx));
  app.use(managementRoutes(ctx));
  app.use(pluginRoutes(ctx));
  // The declarative page host: `pages/<slug>/{meta.json,page.html}`.
  app.use(pageRoutes(ctx));
  // Plugin pages are plain static files, behind the same login as the app.
  app.use("/plugins", requireAuth, express.static(config.pluginsDir, { index: "index.html" }));

  app.get("/healthz", (req, res) => res.json({ ok: true, workers: reports.stats() }));
  app.use((req, res) => res.status(404).send("Not found"));
  app.use(trailbaseErrorHandler({ render, appName: config.appName }));

  app.locals.reports = reports;
  return app;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const app = createApp();
  const server = app.listen(config.port, config.host, () => {
    console.log(`[frontend-ssr] listening on http://${config.host}:${config.port}`);
    console.log(`[frontend-ssr] TrailBase at ${config.trailbaseUrl}; worker threads: ${workerCount()}`);
  });
  app.locals.reports.start();
  const shutdown = async () => {
    server.close();
    await app.locals.reports?.close?.();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
