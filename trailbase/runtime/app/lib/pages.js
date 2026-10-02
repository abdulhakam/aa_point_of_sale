// Guest page registry — the declarative page manifest contract, but
// reading through the guest's (async) `fs` global instead of node:fs.
//
// A page is any folder under `pages/` with a `meta.json`; the folder path is the slug.
// `needs.tables` is derived from `needs.views` so a page cannot under-declare its data.
//
// THE MANIFEST IS THE ONE PAGE DEFINITION. It serves both `/p/<slug>` (the JSON data endpoint the
// browser fetches) and `/reports/<key>` (the server-rendered page), so a report cannot be defined
// twice and drift — which it did: the two copies disagreed on the payments "Payable Amount" and on
// the company filter's source table. See
// vault/issues/report-page-definitions-duplicated-and-already-divergent.md.

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
  // `{"source": "payments"}` is not a default VALUE, it names the DATA a date default must come
  // from, and that needs a SQL probe this function cannot run — it is sync and has no database. So it
  // resolves to "" here and the route fills it from `app/lib/dates.js`. Without this branch it
  // reached `String(value)` and became the literal text "[object Object]" in a date input.
  if (value && typeof value === "object" && typeof value.source === "string") return "";
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
    // Which date column this filter reads, when the manifest says so: "invoice" or "payments". It is
    // what lets a payments report default to the newest PAYMENT month instead of to whatever month
    // the newest invoice happens to be in (app/lib/dates.js).
    dateSource: typeof filter?.default?.source === "string" ? filter.default.source : null,
    value: isCheck ? (filter?.default === true || filter?.default === "on" ? "on" : "") : resolveDefault(filter?.default),
  };
}

/** One column: the JS carried a `cls` string, the manifest carries boolean `right`/`wrap`. */
function normalizeColumn(column) {
  const key = String(column?.key ?? "");
  const cls = typeof column?.cls === "string" ? column.cls : "";
  return {
    key,
    label: String(column?.label ?? key),
    cls: cls || (column?.right ? "right" : column?.wrap ? "wrap" : ""),
  };
}

/**
 * A totals entry: either `key` (one figure from the totals object) or `join` (a composed value).
 *
 * The join form exists for one case: the outstanding ledger prints `invoice / paid / balance` in a
 * single row, which the old JS expressed as a template literal. The manifest spells the same thing
 * as an array of keys and literal text, so it stays inert data.
 */
function normalizeTotal(row) {
  const label = String(row?.label ?? "");
  if (Array.isArray(row?.join) && row.join.length) {
    return { label, join: row.join.map((part) => String(part)) };
  }
  return { label, key: String(row?.key ?? "") };
}

/**
 * The totals, normalised to the shape the server-rendered report page wants: a list of GROUPS, each
 * a list of `{label, value}`. A manifest may declare a flat `totals` (one group) or
 * `totals.groups` (several, for the payments and sales totals tables).
 */
export function totalsGroups(meta) {
  const declared = Array.isArray(meta?.totalsGroups) && meta.totalsGroups.length
    ? meta.totalsGroups
    : Array.isArray(meta?.totals) && meta.totals.length
      ? [meta.totals]
      : [];
  return declared
    .map((group) => (Array.isArray(group) ? group : []).map(normalizeTotal))
    .filter((group) => group.length);
}

/** Bind a totals group to the values a report actually produced. */
export function bindTotalsGroups(groups, totals) {
  return groups.map((group) => ({
    rows: group.map((row) => ({
      label: row.label,
      value: row.join
        ? row.join.map((part) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(part) ? String(totals?.[part] ?? "") : part)).join("")
        : String(totals?.[row.key] ?? ""),
    })),
  }));
}

export function normalizeMeta(meta) {
  const filters = (Array.isArray(meta?.filters) ? meta.filters : []).map(normalizeFilter).filter((f) => f.name);
  const sources = filters.map((f) => f.source).filter(Boolean);
  return {
    title: typeof meta?.title === "string" && meta.title ? meta.title : "Page",
    template: typeof meta?.template === "string" && meta.template ? meta.template : "page.html",
    // A server-rendered report may override the shared report template (the general ledger does).
    view: typeof meta?.view === "string" && meta.view ? meta.view : null,
    // The general ledger's three opening-balance inputs are filter echoes, not query results.
    openings: meta?.openings === true,
    // The hub tile: title/tone/icon, and which index lists it.
    hub: meta?.hub && typeof meta.hub === "object" ? meta.hub : null,
    needs: {
      views: viewClosure(toArray(meta?.needs?.views)),
      tables: [...new Set([...toArray(meta?.needs?.tables), ...sources])],
    },
    // `compute.report` names the report this page presents. There is no `compute.useJs`: every
    // report is SQL, and there is no JavaScript implementation left to fall back to, so a manifest
    // cannot switch a money report's execution path.
    compute: meta?.compute && typeof meta.compute === "object"
      ? { report: String(meta.compute.report ?? "") }
      : null,
    requires: toArray(meta?.requires),
    filters,
    // `fields` is the server-rendered report template's name for the same list; both are exposed so
    // neither template has to know which host is asking.
    fields: filters,
    columns: (Array.isArray(meta?.columns) ? meta.columns : []).map(normalizeColumn).filter((c) => c.key),
    totals: totalsGroups(meta),
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

/* ------------------------------------------------------------------ the report registry */

// A page is a report when it names one in `compute.report`. That is the same field the /p data
// endpoint reads, so there is no second declaration of "which reports exist" — the spool registry
// decides what a report *is*, and the manifest says which page presents it.
function isReport(meta) {
  return !!(meta && meta.compute && typeof meta.compute.report === "string" && meta.compute.report);
}

/** Every report page, keyed by its report key (which is the `/reports/<key>` path). */
export async function reportPages(pagesDir) {
  const pages = await listPages(pagesDir);
  const out = {};
  for (const page of pages) {
    if (isReport(page)) out[page.compute.report] = page;
  }
  return out;
}

/**
 * The reports and ledgers index tiles, read from each manifest's `hub` block.
 *
 * `order` is the position in the hub, so the index keeps the deliberate legacy ordering without a
 * second list to maintain. A manifest with no `hub` block is simply not listed.
 */
export async function hubIndex(pagesDir) {
  const reports = [];
  const ledgers = [];
  for (const page of Object.values(await reportPages(pagesDir))) {
    const hub = page.hub;
    if (!hub) continue;
    const tile = {
      title: String(hub.title || page.title),
      target: String(hub.target || page.compute.report),
      tone: String(hub.tone || "gray"),
      icon: String(hub.icon || "report-money"),
      order: Number(hub.order ?? 0),
    };
    (hub.hub === "ledgers" ? ledgers : reports).push(tile);
  }
  const byOrder = (a, b) => a.order - b.order;
  return { reports: reports.sort(byOrder), ledgers: ledgers.sort(byOrder) };
}
