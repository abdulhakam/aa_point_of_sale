// Guest page registry — the declarative page manifest contract, but
// reading through the guest's (async) `fs` global instead of node:fs.
//
// A page is any folder under `pages/` with a `meta.json`; the folder path is the slug.
// `needs.tables` is derived from `needs.views` so a page cannot under-declare its data.

import * as format from "../compute/format.js";
import { viewClosure } from "../compute/views.js";
import { join, normalize } from "./paths.js";

const META = "meta.json";
const MAX_DEPTH = 6;

const toArray = (value) => (Array.isArray(value) ? value.filter((x) => typeof x === "string" && x) : []);

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

export function normalizeMeta(meta) {
  const filters = (Array.isArray(meta?.filters) ? meta.filters : []).map(normalizeFilter).filter((f) => f.name);
  const sources = filters.map((f) => f.source).filter(Boolean);
  return {
    title: typeof meta?.title === "string" && meta.title ? meta.title : "Page",
    template: typeof meta?.template === "string" && meta.template ? meta.template : "page.html",
    needs: {
      views: viewClosure(toArray(meta?.needs?.views)),
      tables: [...new Set([...toArray(meta?.needs?.tables), ...sources])],
    },
    compute: meta?.compute && typeof meta.compute === "object" ? meta.compute : null,
    requires: toArray(meta?.requires),
    filters,
    columns: Array.isArray(meta?.columns) ? meta.columns : [],
    totals: Array.isArray(meta?.totals) ? meta.totals : [],
  };
}

async function readMeta(dir) {
  let raw;
  try {
    raw = await fs.readFile(join(dir, META));
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
export async function listPages(pagesDir) {
  const out = [];
  async function walk(dir, rel, depth) {
    if (depth > MAX_DEPTH) return;
    if (rel) {
      const meta = await readMeta(dir);
      if (meta) out.push({ slug: rel, ...meta });
    }
    const entries = await fs.readdir(dir);
    for (const name of entries) {
      if (name.startsWith(".")) continue;
      await walk(join(dir, name), rel ? `${rel}/${name}` : name, depth + 1);
    }
  }
  await walk(normalize(pagesDir), "", 0);
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

/** One page by slug, or null. Anything that escapes `pagesDir` is rejected. */
export async function readPage(pagesDir, slug) {
  const clean = String(slug || "").replace(/^\/+|\/+$/g, "");
  if (!clean || clean.includes("..") || clean.includes("\\") || clean.includes("\0")) return null;
  const root = normalize(pagesDir).replace(/\/+$/, "");
  const dir = normalize(root + "/" + clean);
  if (dir !== root && !dir.startsWith(root + "/")) return null;
  const meta = await readMeta(dir);
  return meta ? { slug: clean, ...meta } : null;
}
