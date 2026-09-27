// Render parity harness: Node `minijinja-js` (the current app renderer) vs the Rust
// `minijinja` renderer inside the runtime-js guest.
//
//   node frontend-ssr/scripts/render-parity.mjs [rustBaseUrl]
//
// Renders every views/ and pages/ template with a fixture context through both engines and
// diffs the HTML, then renders a filter matrix through both. Exit code 1 on any mismatch.
//
// Requires the runtime-js depot serving with the repo templates copied to <depot>/app/views|pages
// and the `__render` route in place.

import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

import { createRenderer } from "../src/lib/render.js";

const here = dirname(fileURLToPath(import.meta.url));
const ssrRoot = resolve(here, "..");
const viewsDir = join(ssrRoot, "views");
const pagesDir = join(ssrRoot, "pages");
const rustBase = process.argv[2] ?? "http://127.0.0.1:4002";

const APP_NAME = "AA Point of Sale";

const renderer = createRenderer({ viewsDir, pagesDir, appName: APP_NAME });

// One superset context that satisfies every key used across the templates.
const ctx = {
  appName: APP_NAME,
  user: { name: "Admin", email: "admin@localhost" },
  active: "reports",
  title: "Profit Report",
  flash: { kind: "ok", message: "Saved" },
  nav: {},

  basePath: "/reports/profit",
  def: {
    title: "Profit Report",
    fields: [
      { type: "date", label: "From", name: "from" },
      { type: "select", label: "Company", name: "company", source: "categories" },
      { type: "check", label: "Hide Zero", name: "hideZero" },
      { type: "text", label: "Search", name: "q" },
    ],
    columns: [
      { key: "item", label: "Item", cls: "", right: false, align: "" },
      { key: "profit", label: "Profit", cls: "right", right: true, align: "right" },
    ],
  },
  filters: {
    from: "2026-09-01",
    company: "2",
    hideZero: true,
    q: "abc",
    openingRecievables: "0",
    openingPayables: "0",
    openingCash: "0",
  },
  options: {
    categories: [
      { value: "1", label: "Alpha" },
      { value: "2", label: "Beta" },
    ],
  },
  missing: [],
  rows: [
    { item: "Widget", profit: "9.50", tone: "", cells: { item: "Widget", profit: "9.50" } },
    { item: "Gadget", profit: "20.00", tone: "warn", cells: { item: "Gadget", profit: "20.00" } },
  ],
  columns: [
    { key: "item", label: "Item", cls: "", right: false, align: "" },
    { key: "profit", label: "Profit", cls: "right", right: true, align: "right" },
  ],
  meta: {
    title: "Profit Report",
    from: "2026-09-01",
    to: "2026-09-30",
    filters: [
      { name: "from", label: "From", type: "date", value: "2026-09-01" },
      { name: "company", label: "Company", type: "select", value: "2" },
      { name: "hideZero", label: "Hide Zero", type: "check", value: "on" },
    ],
    columns: [
      { key: "item", label: "Item", right: false },
      { key: "profit", label: "Profit", right: true },
    ],
    totals: [{ keys: ["profit"], key: "profit", label: "Total Profit" }],
  },
  metaJson: '{"slug":"reports/profit"}',
  appliedLabels: [
    { label: "From", value: "2026-09-01" },
    { label: "Company", value: "Beta" },
  ],
  totalsGroups: [{ rows: [{ label: "Total Profit", value: "29.50" }] }],
  opening: { recievableText: "100.00", payableText: "50.00", cashText: "25.00" },

  shortcuts: [
    { tone: "blue", target: "dashboard", title: "Dashboard" },
    { tone: "gray", target: "reports", title: "Reports" },
  ],
  tiles: [
    { value: "3", label: "Items" },
    { value: "5", label: "Parties" },
    { tone: "blue", target: "reports/profit", title: "Profit" },
  ],

  entities: [
    { key: "items", label: "Items" },
    { key: "parties", label: "Parties" },
  ],
  entity: { label: "Items", singular: "Item" },
  entityKey: "items",
  editRow: { id: "row-1" },
  fields: [
    {
      type: "select",
      label: "Category",
      name: "category",
      multiple: false,
      required: true,
      options: [{ value: "1", label: "Alpha", selected: true }],
    },
    { type: "text", label: "Name", name: "name", inputType: "text", value: "Widget", step: "0.01", required: false },
  ],

  expired: true,
  error: "Bad credentials",
  next: "/dashboard",
  email: "admin@localhost",

  pages: [
    {
      slug: "reports/profit",
      title: "Profit Report",
      needs: { tables: ["transactions"], views: ["transactionsReport"] },
      compute: { report: "profit" },
    },
  ],
  plugins: [
    {
      hasPage: true,
      route: "/plugins/import-from-v1/",
      title: "Import from V1",
      description: "Copy a PocketBase v1 database into this depot.",
      author: "AA",
      license: "MIT",
      tags: ["migration", "v1"],
    },
  ],
};

function walkHtml(root, base = root) {
  const out = [];
  for (const name of readdirSync(root).sort()) {
    const full = join(root, name);
    if (statSync(full).isDirectory()) out.push(...walkHtml(full, base));
    else if (name.endsWith(".html")) out.push(relative(base, full).replace(/\\/g, "/"));
  }
  return out;
}

async function rustRender(payload) {
  const res = await fetch(`${rustBase}/__render`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`rust render HTTP ${res.status}`);
  const json = await res.json();
  if (json.body == null) throw new Error(`rust render returned ${JSON.stringify(json).slice(0, 200)}`);
  return json.body;
}

function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return n;
}

let pass = 0;
const failures = [];

async function compare(label, golden, actual) {
  if (golden === actual) {
    pass++;
    return;
  }
  const at = firstDiff(golden, actual);
  failures.push(label);
  const dir = join(tmpdir(), "render-parity");
  mkdirSync(dir, { recursive: true });
  const safe = label.replace(/[^a-z0-9._-]/gi, "_");
  writeFileSync(join(dir, `${safe}.golden.html`), golden);
  writeFileSync(join(dir, `${safe}.actual.html`), actual);
  console.log(`FAIL ${label} (first diff at char ${at})`);
  console.log(`  golden: ${JSON.stringify(golden.slice(Math.max(0, at - 30), at + 60))}`);
  console.log(`  actual: ${JSON.stringify(actual.slice(Math.max(0, at - 30), at + 60))}`);
}

const templates = [
  ...walkHtml(viewsDir).map((n) => ({ name: n, kind: "view" })),
  ...walkHtml(pagesDir).map((n) => ({ name: n, kind: "page" })),
];

console.log(`render parity: ${templates.length} templates, Rust at ${rustBase}`);
for (const t of templates) {
  let golden, actual;
  try {
    golden = renderer.render(t.name, ctx);
  } catch (e) {
    golden = `node-error: ${e}`;
  }
  try {
    actual = await rustRender({ name: t.name, ctx });
  } catch (e) {
    actual = `rust-error: ${e}`;
  }
  await compare(`${t.kind}:${t.name}`, golden, actual);
}

// Filter matrix, one line per filter, rendered inline through both engines.
const filterCases = [
  ["money", "money=[{{ -12.5|money }}][{{ '3.1'|money }}][{{ ''|money }}][{{ missing|money }}]"],
  ["num", "num=[{{ 5|num }}][{{ 5.5|num }}][{{ '7.25'|num }}]"],
  ["round", "round=[{{ 1.2345|round }}][{{ 1.2345|round(3) }}][{{ 2|round(0) }}]"],
  ["qty", "qty=[{{ 7|qty(6) }}][{{ 1|qty(6) }}][{{ 0|qty(0) }}][{{ -7|qty(6) }}]"],
  ["date", "date=[{{ when|date }}][{{ 'x'|date }}]"],
  ["datefmt", "datefmt=[{{ when|datefmt }}][{{ '2026-01-05'|datefmt }}]"],
  ["upper", "upper=[{{ 'aBc'|upper }}]"],
  ["lower", "lower=[{{ 'AbC'|lower }}]"],
  ["json", "json=[{{ obj|json }}][{{ ord|json }}]"],
  ["yesno", "yesno=[{{ t|yesno }}][{{ f|yesno }}][{{ missing|yesno }}]"],
];
// minijinja-js hands `| json` a ctx proxy and serializes it as `{}`; the app works around
// this by pre-serializing `metaJson`. Rust serializes correctly, so this divergence is
// expected and in Rust's favour.
const KNOWN_DIVERGENT = new Map([
  ["json", "minijinja-js yields {} for ctx objects (known); Rust serializes correctly"],
]);

const filterCtx = {
  when: "2026-09-24 16:17:32.436Z",
  obj: { a: 1, b: [1, 2] },
  ord: { z: 1, a: 2 },
  t: true,
  f: false,
};

const divergent = [];
console.log("--- filters ---");
for (const [name, src] of filterCases) {
  let g, a;
  try {
    g = renderer.renderString(src, filterCtx);
  } catch (e) {
    g = `node-error: ${e}`;
  }
  try {
    a = await rustRender({ src, ctx: filterCtx });
  } catch (e) {
    a = `rust-error: ${e}`;
  }
  if (g === a) {
    pass++;
    console.log(`ok   ${a.trimEnd()}`);
  } else if (KNOWN_DIVERGENT.has(name)) {
    divergent.push(name);
    console.log(`divergent ${name} (${KNOWN_DIVERGENT.get(name)})`);
    console.log(`  node: ${g.trimEnd()}`);
    console.log(`  rust: ${a.trimEnd()}`);
  } else {
    await compare(`filter:${name}`, g, a);
  }
}

const total = templates.length + filterCases.length;
console.log(`\n== render parity: ${pass}/${total} match (${divergent.length} known divergent) ==`);
if (divergent.length) console.log(`known divergence: ${divergent.join(", ")} (Rust more correct; see comment)`);
if (failures.length) {
  console.log(`mismatches: ${failures.join(", ")}`);
  console.log(`(golden/actual dumped under ${join(tmpdir(), "render-parity")})`);
  process.exit(1);
}
