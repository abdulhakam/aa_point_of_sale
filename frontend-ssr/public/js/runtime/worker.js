/**
 * Page worker.
 *
 * Runs the page's report over the views it was handed — the views are already
 * built by the server's background job, so this is pure report computation. It
 * imports the shared compute module over HTTP, the very same file Node uses, so
 * the two can never drift apart.
 */
import { REPORTS, runReport } from "/compute/reports.js";

self.addEventListener("message", (event) => {
  const { id, job } = event.data || {};
  try {
    if (!REPORTS[job.report]) throw new Error(`unknown report: ${job.report}`);
    self.postMessage({ id, ok: true, result: runReport(job.report, job.views, job.filters || {}) });
  } catch (error) {
    self.postMessage({ id, ok: false, error: String(error?.message ?? error) });
  }
});
