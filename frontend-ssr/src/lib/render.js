import fs from "node:fs";
import path from "node:path";
import { Environment } from "minijinja-js";
import { qtyDisplay, money, fmtDate, dateOnly, num } from "./format.js";

/**
 * MiniJinja renderer whose templates are loaded from the filesystem.
 *
 * `minijinja-js` renders *registered* templates (`renderTemplate`) and resolves
 * `{% include %}` / `{% extends %}` through a synchronous loader. We register a
 * loader rooted at `viewsDir` so the whole app is plain `.html` files on disk.
 *
 * NOTE: a panic inside the WASM engine corrupts the runtime for the process, so
 * templates are kept simple and `undefinedBehavior` is lenient rather than strict.
 */

const cache = new Map(); // absolute path -> { mtimeMs, source }

function readTemplate(file) {
  const hit = cache.get(file);
  if (hit) {
    try {
      const st = fs.statSync(file);
      if (st.mtimeMs === hit.mtimeMs) return hit.source;
      const source = fs.readFileSync(file, "utf8");
      cache.set(file, { mtimeMs: st.mtimeMs, source });
      return source;
    } catch {
      cache.delete(file);
    }
  }
  try {
    const st = fs.statSync(file);
    const source = fs.readFileSync(file, "utf8");
    cache.set(file, { mtimeMs: st.mtimeMs, source });
    return source;
  } catch {
    return null;
  }
}

const norm = (p) => p.replace(/\\/g, "/");

/**
 * Resolve a template name against the views root.
 *
 * Every `{% extends %}` / `{% include %}` / `{% import %}` in this app uses a
 * views-root-relative name (`layout.html`, `partials/nav.html`,
 * `reports/report.html`), so the parent's directory is deliberately ignored —
 * otherwise `reports/report.html` would look for `reports/layout.html`.
 */
const resolveName = (viewsRoot, name) => {
  const n = norm(name);
  if (n === viewsRoot || n.startsWith(viewsRoot + "/")) return n;
  return norm(path.join(viewsRoot, n.replace(/^\/+/, "")));
};

export function createRenderer({ viewsDir, appName }) {
  const env = new Environment();
  env.undefinedBehavior = "lenient";
  env.trimBlocks = true;
  env.lstripBlocks = true;

  env.addGlobal("appName", appName);

  env.addFilter("money", (v) => money(v));
  env.addFilter("num", (v) => num(v));
  env.addFilter("round", (v, d = 2) => num(v).toFixed(Number(d)));
  env.addFilter("qty", (v, box) => qtyDisplay(box, v));
  env.addFilter("date", (v) => dateOnly(v));
  env.addFilter("datefmt", (v) => fmtDate(v));
  env.addFilter("upper", (v) => String(v ?? "").toUpperCase());
  env.addFilter("lower", (v) => String(v ?? "").toLowerCase());
  env.addFilter("json", (v) => JSON.stringify(v));
  env.addFilter("yesno", (v) => (v ? "Yes" : "No"));

  const viewsRoot = norm(viewsDir);

  // Resolve every template name from the views root (see `resolveName`).
  env.setPathJoinCallback((name) => resolveName(viewsRoot, name));

  env.setLoader((name) => readTemplate(resolveName(viewsRoot, name)));

  return {
    /** Render `views/<name>` with `ctx`; returns the HTML string. */
    render(name, ctx = {}) {
      return env.renderTemplate(resolveName(viewsRoot, name), ctx);
    },
    /** Render an inline string (used for fragments/smoke checks). */
    renderString(source, ctx = {}) {
      return env.renderStr(source, ctx);
    },
    viewsDir,
  };
}
