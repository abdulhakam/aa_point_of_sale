import fs from "node:fs";
import path from "node:path";
import * as format from "../../compute/format.js";
import { viewClosure } from "../../compute/views.js";

/**
 * The page registry.
 *
 * A page is any folder under `pages/` that contains a `meta.json`; the folder path
 * is the page's slug. Node never interprets a page beyond this manifest — it
 * renders the declared template, serves the tables the declared views read, and
 * passes everything else through to the browser runtime.
 *
 *   {
 *     "title":    "Profit Report",
 *     "template": "page.html",                 // optional, defaults to page.html
 *     "needs":    { "views": ["transactionsReport", "refs"] },
 *     "compute":  { "report": "profit" },      // optional; module defaults to the shared one
 *     "filters":  [...], "columns": [...], "totals": [...]   // passed through verbatim
 *   }
 *
 * `needs.tables` may be listed explicitly, but anything omitted is derived from
 * `needs.views`, so a page cannot under-declare the data it needs.
 */

const META = "meta.json";
const MAX_DEPTH = 6;

const toArray = (value) => (Array.isArray(value) ? value.filter((x) => typeof x === "string" && x) : []);

/**
 * A filter default is either a literal or `{ "fn": "<export of compute/format.js>" }`
 * — e.g. `{ "fn": "monthStart" }`. Resolving it keeps the manifest declarative
 * while still shipping concrete values in the server-rendered form.
 */
function resolveDefault(value) {
  if (value && typeof value === "object" && typeof value.fn === "string" && typeof format[value.fn] === "function") {
    try {
      return String(format[value.fn]());
    } catch {
      return "";
    }
  }
  return value === null || value === undefined ? "" : String(value);
}

function normalizeFilter(filter) {
  const name = String(filter?.name ?? "");
  const type = ["select", "text", "check"].includes(filter?.type) ? filter.type : "date";
  const isCheck = type === "check";
  return {
    name,
    label: String(filter?.label ?? name),
    type,
    source: type === "select" && typeof filter?.source === "string" ? filter.source : null,
    value: isCheck ? (filter?.default === true || filter?.default === "on" ? "on" : "") : resolveDefault(filter?.default),
  };
}

/** Fill in defaults and resolve the exact view/table set this page needs. */
export function normalizeMeta(meta) {
  const filters = (Array.isArray(meta?.filters) ? meta.filters : []).map(normalizeFilter).filter((f) => f.name);
  // A select's options come from a declared table, so that table is needed as data too.
  const sources = filters.map((f) => f.source).filter(Boolean);
  return {
    title: typeof meta?.title === "string" && meta.title ? meta.title : "Page",
    template: typeof meta?.template === "string" && meta.template ? meta.template : "page.html",
    needs: {
      views: viewClosure(toArray(meta?.needs?.views)),
      // Raw tables are only the ones declared (or implied by a filter source);
      // a view-based page is served ready-built views instead, which is far
      // cheaper than shipping the base tables for the browser to derive.
      tables: [...new Set([...toArray(meta?.needs?.tables), ...sources])],
    },
    compute: meta?.compute && typeof meta.compute === "object" ? meta.compute : null,
    requires: toArray(meta?.requires),
    filters,
    columns: Array.isArray(meta?.columns) ? meta.columns : [],
    totals: Array.isArray(meta?.totals) ? meta.totals : [],
  };
}

function readMeta(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
  try {
    return normalizeMeta(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Every page under `pagesDir`, slug-sorted. */
export function listPages(pagesDir) {
  const out = [];
  const walk = (dir, rel, depth) => {
    if (depth > MAX_DEPTH) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (rel && entries.some((e) => e.isFile() && e.name === META)) {
      const meta = readMeta(path.join(dir, META));
      if (meta) out.push({ slug: rel, ...meta });
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      walk(path.join(dir, entry.name), rel ? `${rel}/${entry.name}` : entry.name, depth + 1);
    }
  };
  walk(pagesDir, "", 0);
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

/** One page by slug, or null. Anything that escapes `pagesDir` is rejected. */
export function readPage(pagesDir, slug) {
  const clean = String(slug || "").replace(/^\/+|\/+$/g, "");
  if (!clean || clean.includes("..") || clean.includes("\\") || clean.includes("\0")) return null;
  const root = path.resolve(pagesDir);
  const dir = path.resolve(root, clean);
  if (dir !== root && !dir.startsWith(root + path.sep)) return null;
  const meta = readMeta(path.join(dir, META));
  return meta ? { slug: clean, ...meta } : null;
}
