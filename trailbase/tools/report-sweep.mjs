/**
 * Whole-database report sweep across BOTH systems, for one date range, and one comparable table.
 *
 *   node trailbase/tools/report-sweep.mjs --from 2024-01-01 --to 2026-10-04 [--legacy] [--guest]
 *     [--json out.json] [--only <substring>]
 *
 * Why one tool and not two: a performance comparison is only worth anything if both arms are measured
 * the same way and against the same rows, and keeping them in one file is what stops the two arms
 * from quietly drifting into different definitions of "how long the report took".
 *
 * **The legacy arm replays what the compiled bundle actually does.** The legacy app's source was
 * deleted, so the per-report data acquisition was read out of
 * `legacyforparity/standalone/.next/server/app/app/reports/**\/page.js`: each report calls
 * `useAPI().fullList({collection, expand, filter})`, which is the PocketBase JS SDK's
 * `getFullList` — it pages the REST API at `perPage=200` **with no server-side date filter** and
 * concatenates the pages, and the screen then filters the dates in JavaScript. So the cost of a
 * legacy report is the cost of fetching every row of every view it touches, and that is what this
 * measures. `expand` is included because it is in the real call and it costs real time.
 *
 * **The guest arm measures the two requests a guest report page makes**: the server-rendered HTML and
 * its `/p/<slug>/data` payload, both with the date range pushed into SQL.
 *
 * A number here is a **cold** measurement unless stated: each request runs once, in order, with no
 * warm-up, so the first report pays for SQLite's page cache and the guest's first request also pays
 * for the fingerprint refresh. `--repeat` runs each arm N times and reports the best.
 */

import { writeFileSync } from "node:fs";

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i > -1 ? process.argv[i + 1] : d;
};
const has = (n) => process.argv.includes(n);

const FROM = arg("--from", "2024-01-01");
const TO = arg("--to", new Date().toISOString().slice(0, 10));
const ONLY = arg("--only", "");
const REPEAT = Number(arg("--repeat", "1"));
const JSON_OUT = arg("--json", "");
const PB = arg("--pb-base", "http://127.0.0.1:8090");
const GUEST = arg("--guest-base", "http://127.0.0.1:4000");
const EMAIL = arg("--email", "admin@localhost");
const PASSWORD = arg("--password", "administrator-0ne");

/* ------------------------------------------------------------------ the legacy arm's input */

/**
 * Read out of the compiled legacy report bundles, one entry per screen. `collection` is the
 * PocketBase view or table; `expand` is the relation list the real call passes. The guest's route is
 * the equivalent screen where one exists, so the two columns of the output line up.
 */
const LEGACY = [
  { screen: "Unified Payments Report", guest: "/reports/payments", fetches: [
    { collection: "payments_view", expand: "invoice,party,area,section,booker" },
    { collection: "parties", expand: "area,area.section" },
    { collection: "areas", expand: "section" },
    { collection: "sections", expand: "" },
    { collection: "order_bookers", expand: "" },
    { collection: "invoices", expand: "" },
  ] },
  { screen: "Payments, area-wise", guest: null, fetches: [
    { collection: "payments_view", expand: "invoice,party,area,section,booker" },
    { collection: "parties", expand: "area,area.section" },
    { collection: "areas", expand: "section" },
    { collection: "sections", expand: "" },
    { collection: "order_bookers", expand: "" },
    { collection: "invoices", expand: "" },
  ] },
  { screen: "Sales Report", guest: "/reports/salesreport", fetches: [
    { collection: "payments_view", expand: "invoice,party,area,section,booker" },
    { collection: "parties", expand: "area,area.section" },
    { collection: "areas", expand: "section" },
    { collection: "sections", expand: "" },
    { collection: "order_bookers", expand: "" },
    { collection: "invoices", expand: "" },
  ] },
  { screen: "Payments By Company", guest: "/reports/paymentsbycompany", fetches: [
    { collection: "areas", expand: "" },
    { collection: "sections", expand: "" },
    { collection: "categories", expand: "" },
    { collection: "parties", expand: "" },
    { collection: "order_bookers", expand: "" },
    { collection: "invoice_view", expand: "", filter: `type != 'purchase'` },
    { collection: "payments_invoices_report", expand: "area,section,company,party,booker,original_invoice" },
  ] },
  { screen: "Item Sales Report", guest: "/reports/itemsales", fetches: [
    { collection: "invoice_view", expand: "", filter: `type = "sale" || type = "return"` },
    { collection: "transactions_report", expand: "item,company,party,party.area,party.area.section,booker" },
  ] },
  { screen: "Profit Report", guest: "/reports/profit", fetches: [
    { collection: "invoice_view", expand: "", filter: `type = "sale" || type = "return"` },
    { collection: "transactions_report", expand: "item,company,party,party.area,party.area.section,booker" },
  ] },
  { screen: "Product Sale Report", guest: "/reports/productsale", fetches: [
    { collection: "transaction_view", expand: "item,invoice,invoice.party,invoice.party.area,invoice.party.area.section" },
    { collection: "areas", expand: "section" },
    { collection: "order_bookers", expand: "" },
    { collection: "items", expand: "category" },
  ] },
  { screen: "Daily Sale Report", guest: "/reports/dailysale", fetches: [
    { collection: "invoice_view", expand: "party,party.area,party.area.section,booker" },
    { collection: "areas", expand: "section" },
    { collection: "order_bookers", expand: "" },
  ] },
  { screen: "Stock Report", guest: "/reports/stockreport", slug: "stock", fetches: [
    { collection: "items_report", expand: "category" },
    { collection: "categories", expand: "" },
  ] },
  { screen: "Difference Report", guest: "/reports/difference", fetches: [
    { collection: "items_difference_report", expand: "category" },
    { collection: "categories", expand: "" },
  ] },
  { screen: "Outstanding Payments", guest: "/reports/outstanding", fetches: [
    { collection: "payments_view", expand: "invoice,party,area,section,booker" },
    { collection: "areas", expand: "section" },
    { collection: "payments_view", expand: "invoice,party,booker" },
  ] },
  { screen: "Party Ledger", guest: "/reports/ledgers/party", slug: "ledgers/party", fetches: [
    { collection: "ledger_party", expand: "invoice,party" },
  ] },
  { screen: "Booker Ledger", guest: "/reports/ledgers/booker", slug: "ledgers/booker", fetches: [
    { collection: "ledger_booker", expand: "invoice,party,invoice.booker" },
  ] },
  { screen: "Area Ledger", guest: "/reports/ledgers/area", slug: "ledgers/area", fetches: [
    { collection: "areas", expand: "" },
    { collection: "sections", expand: "" },
    { collection: "ledger_area", expand: "invoice,party" },
  ] },
  { screen: "General Ledger", guest: "/reports/ledgers/general", slug: "ledgers/general", fetches: [
    { collection: "ledger_journal", expand: "" },
  ] },
  { screen: "Item transactions report", guest: null, fetches: [
    { collection: "transaction_view", expand: "item" },
  ] },
];

/* ------------------------------------------------------------------------- the two arms */

/** `getFullList` pages at 200. Paging at any other size would not be the legacy app's behaviour. */
const LEGACY_PER_PAGE = 200;

async function legacyFullList(collection, expand, filter) {
  const qs = new URLSearchParams({ page: "1", perPage: String(LEGACY_PER_PAGE), sort: "-created" });
  if (expand) qs.set("expand", expand);
  // PocketBase parses single-quoted strings. The compiled bundle carries a double-quoted literal
  // (`type = "sale" || type = "return"`), which this server answers 400 — and then a timeout — so the
  // quotes are normalised here rather than transcribed differently, keeping the replay identical to
  // what the app asks for.
  if (filter) qs.set("filter", filter.split('"').join("'"));
  const first = await fetch(`${PB}/api/collections/${collection}/records?${qs}`);
  if (!first.ok) throw new Error(`${collection}: HTTP ${first.status}`);
  let body = await first.json();
  let rows = body.items.length, bytes = JSON.stringify(body).length;
  const total = body.totalItems, pages = body.totalPages;
  for (let p = 2; p <= pages; p++) {
    qs.set("page", String(p));
    const r = await fetch(`${PB}/api/collections/${collection}/records?${qs}`);
    if (!r.ok) throw new Error(`${collection} page ${p}: HTTP ${r.status}`);
    const b = await r.json();
    rows += b.items.length;
    bytes += JSON.stringify(b).length;
  }
  return { rows, total, pages, bytes };
}

async function legacyArm() {
  const out = [];
  for (const screen of LEGACY) {
    if (ONLY && !`${screen.screen} ${screen.guest ?? ""}`.toLowerCase().includes(ONLY.toLowerCase())) continue;
    const t0 = Date.now();
    let rows = 0, bytes = 0, requests = 0, failed = null;
    const per = [];
    for (const f of screen.fetches) {
      const t1 = Date.now();
      try {
        const r = await legacyFullList(f.collection, f.expand, f.filter);
        rows += r.rows; bytes += r.bytes; requests += r.pages;
        per.push(`${f.collection}=${((Date.now() - t1) / 1000).toFixed(1)}s/${r.rows}r/${r.pages}p`);
      } catch (e) {
        failed = e.message;
        per.push(`${f.collection}=FAILED(${e.message})`);
        break;
      }
    }
    out.push({ screen: screen.screen, guest: screen.guest, seconds: (Date.now() - t0) / 1000, rows, bytes, requests, failed, per });
    console.log(`  legacy  ${screen.screen.padEnd(26)} ${fmt(out.at(-1).seconds).padStart(9)}  ${String(rows).padStart(7)} rows  ${String(requests).padStart(4)} req  ${failed ?? ""}`);
  }
  return out;
}

let cookie = "";
async function guestLogin() {
  const res = await fetch(`${GUEST}/api/auth/v1/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email_or_username: EMAIL, password: PASSWORD }),
    redirect: "manual",
  });
  const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  cookie = set.map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error(`guest login returned ${res.status} and set no cookie`);
}

const q = (p) => `${p}${p.includes("?") ? "&" : "?"}from=${FROM}&to=${TO}`;

async function guestArm() {
  await guestLogin();
  const out = [];
  const pages = LEGACY.filter((s) => s.guest);
  for (const screen of pages) {
    // The page slug is the folder under `app/pages`, which is NOT the route path: `/reports/stockreport`
// is the page `reports/stock`, and `/reports/ledgers/party` is the page `ledgers/party`. Both live
// under `pages/`, so the data URL is `/p/<folder>/data`. Deriving it from the route and getting this
// wrong returns a 404 that looks like a missing data endpoint rather than a wrong slug — which is why
// the `slug:` overrides exist above rather than a cleverer rule here.
const slug = screen.slug ?? screen.guest.replace(/^\/reports\//, "");
    if (ONLY && !`${screen.screen} ${screen.guest}`.toLowerCase().includes(ONLY.toLowerCase())) continue;
    const t0 = Date.now();
    let html = null, data = null, note = "";
    try {
      const h = await fetch(`${GUEST}${q(screen.guest)}`, { headers: { cookie } });
      html = { status: h.status, ms: Date.now() - t0, bytes: Number(h.headers.get("content-length") ?? (await h.text()).length) };
      const t1 = Date.now();
      const dataPath = slug.startsWith("ledgers/") ? slug : `reports/${slug}`;
const d = await fetch(`${GUEST}${q(`/p/${dataPath}/data`)}`, { headers: { cookie } });
      const text = await d.text();
      data = { status: d.status, ms: Date.now() - t1, bytes: text.length };
      try {
        const j = JSON.parse(text);
        data.rows = Array.isArray(j.result?.rows) ? j.result.rows.length : (Array.isArray(j.result) ? j.result.length : null);
        data.slug = j.slug;
      } catch {
        note = "data not json";
      }
    } catch (e) {
      note = e.message;
    }
    const total = ((Date.now() - t0) / 1000);
    out.push({ screen: screen.screen, guest: screen.guest, seconds: total, html, data, note });
    const cs = s => (s == null ? "-" : s >= 1000 ? `${(s / 1000).toFixed(2)}s` : `${s}ms`);
    console.log(`  guest   ${screen.screen.padEnd(26)} ${fmt(total).padStart(9)}  html ${String(html?.status ?? "-").padStart(3)} ${cs(html?.ms).padStart(7)} ${String(html?.bytes ?? "-").padStart(8)}b   data ${String(data?.status ?? "-").padStart(3)} ${cs(data?.ms).padStart(7)} ${String(data?.bytes ?? "-").padStart(8)}b rows=${data?.rows ?? "-"} ${note}`);
  }
  return out;
}

const fmt = (s) => (s >= 60 ? `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, "0")}s` : `${s.toFixed(1)}s`);

/* --------------------------------------------------------------------------------- run it */

console.log(`date range ${FROM} .. ${TO}   repeat=${REPEAT}`);
console.log(`legacy  : ${PB} (fullList replay: every row of every view, perPage=${LEGACY_PER_PAGE}, no server-side date filter)`);
console.log(`guest   : ${GUEST} (server-rendered page + /p/<slug>/data, dates pushed into SQL)\n`);

const result = { from: FROM, to: TO, legacy: [], guest: [] };
for (let i = 0; i < REPEAT; i++) {
  if (has("--legacy") || !has("--guest")) {
    console.log(`legacy pass ${i + 1}:`);
    result.legacy = await legacyArm();
    console.log("");
  }
  if (has("--guest") || !has("--legacy")) {
    console.log(`guest pass ${i + 1}:`);
    result.guest = await guestArm();
    console.log("");
  }
}

const worstL = result.legacy.filter((r) => !r.failed).sort((a, b) => b.seconds - a.seconds)[0];
const worstG = result.guest.slice().sort((a, b) => b.seconds - a.seconds)[0];
console.log(`legacy worst: ${worstL ? `${worstL.screen} ${fmt(worstL.seconds)}` : "n/a"}`);
console.log(`guest  worst: ${worstG ? `${worstG.screen} ${fmt(worstG.seconds)}` : "n/a"}`);
if (worstL && worstG) console.log(`ratio        : ${(worstL.seconds / worstG.seconds).toFixed(1)}x on the slowest screen of each`);

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify(result, null, 2) + "\n");
  console.log(`\nwrote ${JSON_OUT}`);
}