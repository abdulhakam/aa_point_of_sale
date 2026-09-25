import "dotenv/config";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(here, "..");

const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export const config = {
  trailbaseUrl: (process.env.TRAILBASE_URL || "http://127.0.0.1:4000").replace(/\/+$/, ""),
  host: process.env.HOST || "127.0.0.1",
  port: num(process.env.PORT, 3100),
  sessionSecret: process.env.SESSION_SECRET || "dev-insecure-secret-change-me",
  appName: process.env.APP_NAME || "AA Point of Sale",
  cacheTtlMs: num(process.env.CACHE_TTL_SECONDS, 60) * 1000,
  viewsDir: path.join(rootDir, "views"),
  publicDir: path.join(rootDir, "public"),
  pluginsDir: path.join(rootDir, "plugins"),
};

/** Worker threads for report aggregation: explicit setting, else CPUs - 1 (min 1). */
export const workerCount = () =>
  num(process.env.WORKER_THREADS, 0) > 0
    ? num(process.env.WORKER_THREADS, 1)
    : Math.max(1, os.cpus().length - 1);
