import { parentPort } from "node:worker_threads";
import { runReport } from "./reports.js";
import { buildViews } from "./views.js";

/**
 * Report worker. Runs CPU-bound aggregation off the request thread so several
 * report requests can be computed in parallel.
 */

parentPort.on("message", ({ id, mode, payload }) => {
  try {
    let result;
    if (mode === "report") {
      result = runReport(payload.name, payload.ctx, payload.filters);
    } else if (mode === "views") {
      result = buildViews(payload.base);
    } else if (mode === "ping") {
      result = "pong";
    } else {
      throw new Error(`Unknown mode: ${mode}`);
    }
    parentPort.postMessage({ id, ok: true, result });
  } catch (error) {
    parentPort.postMessage({ id, ok: false, error: String(error?.message ?? error), stack: error?.stack });
  }
});
