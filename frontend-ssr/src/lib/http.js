/** Shared HTTP/template helpers. */
import { TrailBaseError } from "./trailbase.js";

/** Render a full page with the standard context merged in. */
export function page(ctx, name, data = {}) {
  const { appName, user, active, title, flash, nav, render } = ctx;
  return render.render(name, {
    appName,
    user: user ?? null,
    active: active ?? "",
    title: title ?? appName,
    flash: flash ?? null,
    nav: nav ?? {},
    ...data,
  });
}

/**
 * Send a TrailBase failure as a readable page instead of leaking a stack trace.
 * A 403 means the session's token is no longer accepted, so send the user back
 * to the login screen.
 */
export function trailbaseErrorHandler({ render, appName }) {
  // eslint-disable-next-line no-unused-vars
  return (error, req, res, next) => {
    if (res.headersSent) return;
    if (error instanceof TrailBaseError && error.status === 403) {
      const next = encodeURIComponent(req.originalUrl || "/dashboard");
      return res.redirect(`/login?next=${next}&expired=1`);
    }
    const status = error instanceof TrailBaseError ? 502 : 500;
    const detail = error instanceof TrailBaseError ? error.body : error.message;
    console.error("[error]", error);
    res.status(status).send(
      render.renderString(
        "<!doctype html><meta charset='utf-8'><title>{{ appName }} — error</title>" +
          "<style>body{font:14px system-ui;margin:3rem;max-width:60rem}pre{background:#f5f5f5;padding:1rem;overflow:auto}</style>" +
          "<h1>{{ appName }}</h1><p><b>{{ status }}</b> — the request could not be completed.</p><pre>{{ detail }}</pre>" +
          "<p><a href='/dashboard'>Back to dashboard</a></p>",
        { appName, status, detail: String(detail).slice(0, 2000) }
      )
    );
  };
}

/** Coerce a query value to a trimmed string (or ""). */
export function qs(value) {
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value.trim() : value === undefined || value === null ? "" : String(value);
}

/** Query flags: a checkbox sends "on"/"true"/"1". */
export const qsb = (value) => ["on", "true", "1", "yes"].includes(String(qs(value)).toLowerCase());

/**
 * Wrap an async route handler so a rejected promise reaches the error
 * middleware instead of becoming an unhandled rejection (Express 4 does not
 * catch async errors on its own).
 */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
