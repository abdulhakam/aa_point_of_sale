import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, workerCount } from "./config.js";
import { createTrailBase } from "./lib/trailbase.js";
import { createRenderer } from "./lib/render.js";
import { createReportService } from "./lib/reports/index.js";
import { sessionMiddleware, requireAuth } from "./lib/auth.js";
import { trailbaseErrorHandler } from "./lib/http.js";
import { authRoutes } from "./routes/auth.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { reportRoutes } from "./routes/reports.js";
import { managementRoutes } from "./routes/management.js";
import { pluginRoutes } from "./routes/plugins.js";

export function createApp() {
  const app = express();
  const tb = createTrailBase(config.trailbaseUrl);
  const render = createRenderer({ viewsDir: config.viewsDir, appName: config.appName });
  const reports = createReportService({
    tb,
    cacheTtlMs: config.cacheTtlMs,
    poolSize: workerCount(),
  });

  app.disable("x-powered-by");
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(cookieParser());
  app.use("/static", express.static(config.publicDir, { maxAge: "1h" }));
  app.use(sessionMiddleware({ tb, config }));

  const ctx = { config, tb, render, reports };
  app.use(authRoutes(ctx));
  app.use(dashboardRoutes(ctx));
  app.use(reportRoutes(ctx));
  app.use(managementRoutes(ctx));
  app.use(pluginRoutes(ctx));
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
  const shutdown = async () => {
    server.close();
    await app.locals.reports?.close?.();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
