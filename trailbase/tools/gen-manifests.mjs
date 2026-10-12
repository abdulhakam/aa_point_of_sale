// One-shot generator, run ONCE to migrate the definitions out of `report-pages.js` and into the
// manifests. That module no longer exists in the tree — this migration is what removed it — so the
// source is the pre-migration copy committed at HEAD, extracted to `tools/_report-pages-source.js`.
//
// The manifest format is extended to carry what only the JS could express:
//   - `view`      — a template override (the general ledger)
//   - `openings`  — the three opening-balance inputs
//   - `totals`    — a flat list, or `totalsGroups[]` for the grouped totals tables
//   - `totals.join` — a composed value (`"invoice / paid / balance"`) instead of one key
//   - `hub`       — the tile title/tone/icon/order for the reports and ledgers index
//   - `default`   — a date WINDOW (`{"fn": "monthStart"}`), resolved per request rather than frozen
//
// Two divergences between the JS and the hand-written manifests are corrected here, both
// established by measurement on 2026-10-01 (see
// vault/issues/report-page-definitions-duplicated-and-already-divergent.md):
//   1. `payments` "Payable Amount" must be `totalSending` (the net of the three rows printed
//      above it), not `total` (invoiceTotal - totalPaid, an unrelated quantity).
//   2. `itemsales` / `stock` must source the company select from `companies`, not the empty
//      `categories` table.
//
// Re-run:  git show HEAD:trailbase/runtime/ahscripts/lib/report-pages.js > tools/_src/runtime/ahscripts/lib/report-pages.js
//           node trailbase/tools/gen-manifests.mjs

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { REPORT_PAGES, REPORT_INDEX, LEDGER_INDEX } from "./_src/runtime/ahscripts/lib/report-pages.js";

const PAGES = "runtime/ahscripts/pages";

/**
 * Report key -> manifest folder.
 *
 * The ledgers live under pages/ledgers/, the rest under reports/. The stock report is the one
 * key whose /p slug is not the report key: the route is `/reports/stockreport` but the page
 * folder is `reports/stock`, so the slug is mapped rather than derived.
 */
const FOLDER = { stockreport: "reports/stock" };
const folderOf = (key) => FOLDER[key] || (key.startsWith("ledgers/") ? "ledgers" : "reports") + "/" + key.replace(/^ledgers\//, "");

/** `cls` in the JS ("right" / "wrap") becomes the boolean flags the manifest already used. */
const columnOf = (c) => {
  const out = { key: c.key, label: c.label };
  if (c.cls === "right") out.right = true;
  if (c.cls === "wrap") out.wrap = true;
  return out;
};

/**
 * A filter, with its default.
 *
 * `REPORT_PAGES` carried defaults in a SEPARATE `defaults` object keyed by field name, and called
 * the date helper at MODULE LOAD — so `def.defaults.from` is already a resolved `"2026-10-01"`. The
 * manifest format wants `{"fn": "monthStart"}` instead, so the default is re-evaluated when the page
 * is served and a manifest stays a date WINDOW rather than a date frozen at generation time.
 *
 * The function is recovered by evaluating each candidate and matching the value. That is deliberate
 * and safe: a default that matches no helper is reported rather than guessed at, and falls back to
 * the literal so nothing is silently lost.
 */
/**
 * Recover the date helper a `REPORT_PAGES` default came from.
 *
 * Matching by VALUE does not work: on the first of a month `today()`, `monthStart()` and so on can
 * all return the same string, and the migration ran on 2026-10-01, so every `to` default matched
 * whichever candidate was tried first. The result was a ledger whose "to" silently became a whole
 * month — a wrong window, from a method that looked right.
 *
 * So the function is captured at DEFINITION time instead. `REPORT_PAGES` evaluated the helpers in
 * its own object literal; the recovered source keeps that text, and the names are read out of it
 * before the module is ever imported. The literal is the authority, not its value today.
 */
const SOURCE = readFileSync(new URL("./_src/runtime/ahscripts/lib/report-pages.js", import.meta.url), "utf8");

/** For each report key, the `{"from": fnName, "to": fnName}` its defaults object used. */
const DEFAULT_SOURCE = (() => {
  const out = {};
  // Each entry begins at `  <key>: {` (unquoted, or quoted for the `ledgers/…` keys) and runs to
  // the next entry, so the body is sliced out per key and the helper names read from that body.
  const entry = /^\s{2}"?([A-Za-z0-9/_]+)"?:\s*\{/gm;
  const starts = [];
  let m;
  while ((m = entry.exec(SOURCE)) !== null) starts.push({ key: m[1], at: m.index });
  for (let i = 0; i < starts.length; i++) {
    const body = SOURCE.slice(starts[i].at, i + 1 < starts.length ? starts[i + 1].at : SOURCE.length);
    const defaults = /defaults:\s*\{([^}]*)\}/.exec(body);
    if (!defaults) continue;
    const found = {};
    for (const f of defaults[1].matchAll(/(\w+):\s*(\w+)\(\)/g)) found[f[1]] = f[2];
    out[starts[i].key] = found;
  }
  return out;
})();

const HELPER = (name) => ({ fn: name });

function defaultOf(key, field, defaults) {
  const value = defaults?.[field.name];
  if (value === undefined || value === null || value === "") return undefined;
  if (field.type === "check") return value === true || value === "on";

  const named = DEFAULT_SOURCE[key]?.[field.name];
  if (named && /^(monthStart|today|yearStart)$/.test(named)) return HELPER(named);

  // A default that is not one of the three date helpers: keep the literal so it is not lost.
  if (typeof value === "string") {
    console.log(`  note: ${key}.${field.name} default "${value}" is a literal, not a date helper`);
    return value;
  }
  return undefined;
}

const filterOf = (key, f, defaults) => {
  const out = { name: f.name, label: f.label, type: f.type };
  if (f.source) out.source = f.source;
  const value = defaultOf(key, f, defaults);
  if (value !== undefined) out.default = value;
  return out;
};

/**
 * The totals, in the manifest's shape.
 *
 * The JS totals are functions of the totals object, so each is a list of groups of
 * `{label, value}`. Every value is `totals[key]` except the outstanding ledger's composed
 * string, which becomes an explicit `join`. A single group collapses to a flat `totals` list,
 * which is what the manifests already use.
 */
const totalsOf = (fn, key) => {
  // The functions are pure, so they can be evaluated against a PROBE of distinctive strings and
  // the labels read back out. That keeps the generator honest: a label whose value is not a bare
  // `t.<key>` is reported rather than guessed at.
  const probe = new Proxy({}, { get: (_t, k) => `\u0000${String(k)}\u0000` });
  const groups = fn ? fn(probe) : [];
  const norm = groups.map((g) =>
    g.rows.map((r) => {
      const m = /^\u0000([A-Za-z0-9_]+)\u0000$/.exec(String(r.value));
      if (m) return { label: r.label, key: m[1] };
      // The one composed value: the outstanding ledger prints three figures in one row.
      const parts = String(r.value).split(/\u0000([A-Za-z0-9_]+)\u0000/);
      const join = parts.filter((p) => p !== "");
      return join.length > 1 ? { label: r.label, join } : { label: r.label, key: String(r.value) };
    })
  );
  if (norm.length === 0) return undefined;
  if (norm.length === 1) return { totals: norm[0] };
  return { totalsGroups: norm };
};

/** The hub tile: title/tone/icon and the position in that hub, so the index needs no second list. */
const hubOf = (key) => {
  const all = [...REPORT_INDEX, ...LEDGER_INDEX];
  const at = all.findIndex((t) => t.target === key);
  if (at < 0) return null;
  const tile = all[at];
  const ledger = key.startsWith("ledgers/");
  const order = ledger ? LEDGER_INDEX.findIndex((t) => t.target === key) : REPORT_INDEX.findIndex((t) => t.target === key);
  return {
    title: tile.title,
    target: tile.target,
    tone: tile.tone,
    icon: tile.icon,
    hub: ledger ? "ledgers" : "reports",
    // The `ledgers` tile in REPORT_INDEX is a link to the ledger hub, not a report, so the reports
    // index is offset by the reports that precede it.
    order: order < 0 ? 99 : order,
  };
};

let written = 0;
for (const [key, def] of Object.entries(REPORT_PAGES)) {
  const dir = `${PAGES}/${folderOf(key)}`;
  mkdirSync(dir, { recursive: true });

  // Start from the existing manifest so `needs` and `compute` — which belong to the /p data
  // endpoint and are not expressible in REPORT_PAGES — survive the regeneration.
  let needs = { views: [], tables: [] };
  let compute = { report: key };
  try {
    const prior = JSON.parse(readFileSync(`${dir}/meta.json`, "utf8"));
    if (prior.needs) needs = prior.needs;
    if (prior.compute) compute = prior.compute;
  } catch {
    /* no prior manifest: keep the empty shell */
  }

  const meta = {
    title: def.title,
    template: "page.html",
    ...(def.view ? { view: def.view } : {}),
    ...(def.openings ? { openings: true } : {}),
    hub: hubOf(key),
    needs,
    compute,
    filters: def.fields.map((f) => filterOf(key, f, def.defaults || {})),
    columns: def.columns.map(columnOf),
    ...(def.requires ? { requires: def.requires } : {}),
    ...totalsOf(def.totals, key),
  };

  // The two measured corrections.
  //
  // 1. payments "Payable Amount": the JS reads `t.total`, which is `invoiceTotal - totalPaid` —
  //    an unrelated quantity that does not equal the three rows printed above it. The sales
  //    group proves the rule the purchase group must follow
  //    (`recieving - recieved - returns = totalRecieving`), so the payable figure is
  //    `sending - sent - returns = totalSending`. See
  //    vault/issues/report-page-definitions-duplicated-and-already-divergent.md.
  if (key === "payments") {
    const groups = meta.totalsGroups || (meta.totals ? [meta.totals] : []);
    for (const g of groups) {
      const payable = g.find((r) => r.label === "Payable Amount");
      if (payable && payable.key === "total") {
        payable.key = "totalSending";
        console.log(`  corrected: payments "Payable Amount" total -> totalSending`);
      }
    }
  }

  // 2. itemsales / stock: the company select must read `companies`. `categories` is an EMPTY
  //    table, so sourcing it there renders a filter with zero options.
  for (const f of meta.filters) {
    if (f.source === "categories") {
      f.source = "companies";
      console.log(`  corrected: ${key} source categories -> companies`);
    }
  }

  // Any select whose source is not a table the refs snapshot carries is a dead control.
  const REAL = new Set([
    "parties", "areas", "sections", "order_bookers", "companies", "items",
    "party_types", "invoice_types", "payment_types",
  ]);
  for (const f of meta.filters) {
    if (f.type === "select" && !REAL.has(f.source)) {
      console.log(`  WARNING: ${key} filter ${f.name} sources ${f.source}, which filterOptions does not know`);
    }
  }

  writeFileSync(`${dir}/meta.json`, JSON.stringify(meta, null, 2) + "\n");
  written++;
  console.log(`wrote ${dir}/meta.json`);
}

console.log(`\n${written} manifests written from REPORT_PAGES.`);
console.log(`The hub index now comes from each manifest's "hub" block; REPORT_INDEX/LEDGER_INDEX`);
console.log(`become derived and can go with REPORT_PAGES.`);
