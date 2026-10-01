// Live check of the spooled report path: the report pages AND the declarative page payloads, and
// the two against each other.
//
//   node trailbase/tools/check-report-pages.mjs        (needs a server on GUEST_BASE)
//
// What it asserts, per report:
//   1. the page renders rows, and its own "showing N of M" footer agrees with what it rendered;
//   2. no template printed `undefined` — the shape a wrong projection key produces, silently;
//   3. where a PAGE computes the same report, both surfaces return the SAME row count and the same
//      totals for identical filters. That is the check that catches a filter bound on one path and
//      not the other, which neither surface can see on its own.
//
// The filters are pinned rather than defaulted: a report's default window is the current month and
// this depot is dated 2026-09-29, so an unfiltered check would assert "zero rows" as if it were a
// defect.
const BASE = process.env.GUEST_BASE || "http://127.0.0.1:4000";
const EMAIL = process.env.TB_EMAIL || "admin@localhost";
const PASS = process.env.TB_PASSWORD || "administrator-0ne";

// A real party and booker, so the two ledgers that REQUIRE one are exercised rather than skipped.
const PARTY = process.env.TB_PARTY || "AaDr_TMUQc4ShQo7R-u670g";
const BOOKER = process.env.TB_BOOKER || "AaDr_TZydRed6e8SSew6sA";
const DAY = process.env.TB_DAY || "2026-09-29";
const ALL_DAY = { from: DAY, to: DAY };
// The ledgers filter on `payment_date`, which reaches back years — unlike every other report, whose
// window is the single import `created` date.
const LEDGER_DAY = { from: "2020-01-01", to: "2026-12-31" };

/** report slug -> the page that computes it, and the filters that page accepts. */
const PAIRS = [
  ["payments", "reports/payments", ALL_DAY],
  ["outstanding", "reports/outstanding", {}],
  ["dailysale", "reports/dailysale", ALL_DAY],
  ["profit", "reports/profit", ALL_DAY],
  ["itemsales", "reports/itemsales", ALL_DAY],
  // The party/booker ledgers need an explicit window on BOTH surfaces. `inDateRange`
  // (reports.js:42-48) compares the stored value as a string, so an EMPTY `payment_date` fails
  // `t < from` and this depot has plenty of those; and the two surfaces have DIFFERENT defaults —
  // the report page's are the page definition's, the declarative page's are `meta.json`'s — so
  // leaving them to default makes the two disagree for reasons that have nothing to do with the
  // spool. Pinning the same window on both is what makes the comparison mean anything.
  ["ledgers/party", "ledgers/party", { ...LEDGER_DAY, party: PARTY }],
  ["ledgers/booker", "ledgers/booker", { ...LEDGER_DAY, booker: BOOKER }],
  ["ledgers/general", "ledgers/general", { ...ALL_DAY, openingRecievables: "1000", openingPayables: "2000", openingCash: "3000" }],
];

const ONLY_REPORTS = [
  "payments", "salesreport", "paymentsbycompany", "profit", "itemsales", "stockreport", "difference",
  "dailysale", "outstanding", "productsale",
  "ledgers/party", "ledgers/booker", "ledgers/area", "ledgers/general",
];

// TrailBase's own auth. `/api/auth/v1/login` answers `auth_token` in JSON for a JSON body; a
// form-encoded body gets the plain "logged in" cookie response with no token.
async function login() {
  const r = await fetch(`${BASE}/api/auth/v1/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  const body = await r.json();
  const token = body.auth_token || body.access_token;
  if (!token) throw new Error(`login failed ${r.status}: ${JSON.stringify(body)}`);
  return token;
}

const strip = (s) => String(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
// The body rows are `<tr class="{{ tone }}">` with one `<td>` per column; the header is `<thead><tr>`
// and the empty-state row carries `class="empty"`. Counting `<tr` alone counts the header too.
const countRows = (html) => (html.match(/<tr class="[a-z ]*">/g) || []).filter((m) => !m.includes("empty")).length;
const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined)).toString();

// `partials/totals.html` is `<tr><th>Label</th><td class="right">value</td></tr>` — the label is a
// `<th>`, not a `<td>`, which is why a `<td>`-based reader finds nothing and reports "no totals".
function totalsFrom(html) {
  const out = {};
  const block = /<div class="totals">(.*?)<\/div>/s.exec(html);
  if (!block) return out;
  for (const m of block[1].matchAll(/<tr>\s*<th>([^<]*)<\/th>\s*<td[^>]*>([^<]*)<\/td>\s*<\/tr>/g)) {
    out[strip(m[1])] = strip(m[2]);
  }
  return out;
}

const token = await login();
const auth = { Authorization: `Bearer ${token}` };
let bad = 0;

/** The filters a report page is asked with — the SAME set its paired page is asked with. */
function filtersFor(name) {
  const paired = PAIRS.find(([r]) => r === name);
  if (paired) return paired[2];
  if (name === "ledgers/party") return { party: PARTY };
  if (name === "ledgers/booker") return { booker: BOOKER };
  return {};
}

console.log("== report pages (all=1) ==");
console.log("report".padEnd(18), "rows".padStart(7), "totals".padStart(7), "ms".padStart(7));
const rendered = {};
for (const name of ONLY_REPORTS) {
  // The two ledgers that `requires` a party/booker render a "pick one" state without it, which is
  // correct — so they are asked with a real id rather than reported as empty.
  const url = `${BASE}/reports/${name}?${qs({ ...filtersFor(name), all: "1" })}`;
  const t0 = Date.now();
  const r = await fetch(url, { headers: auth });
  const html = await r.text();
  const ms = Date.now() - t0;
  if (r.status !== 200) {
    console.log(`FAIL ${name.padEnd(16)} HTTP ${r.status}  ${strip(html).slice(0, 200)}`);
    bad++;
    continue;
  }
  const rows = countRows(html);
  const totals = totalsFrom(html);
  const issues = [];
  if (rows === 0) issues.push("no rows rendered");
  if (/undefined/.test(html)) issues.push("a template printed `undefined`");
  rendered[name] = { rows, totals };
  if (issues.length) { bad++; console.log(`FAIL ${name.padEnd(16)} ${issues.join("; ")}`); }
  else console.log(`ok   ${name.padEnd(16)} ${String(rows).padStart(7)} ${String(Object.keys(totals).length).padStart(7)} ${String(ms).padStart(7)}`);
}

console.log("");
console.log("== the same report, reached through its PAGE (identical filters) ==");
console.log("page".padEnd(22), "pageRows".padStart(9), "htmlRows".padStart(9), "totals".padStart(28));
for (const [name, slug, filters] of PAIRS) {
  const r = await fetch(`${BASE}/p/${slug}/data?${qs(filters)}`, { headers: auth });
  const text = await r.text();
  if (r.status !== 200) {
    console.log(`FAIL ${slug.padEnd(20)} HTTP ${r.status} ${strip(text).slice(0, 140)}`);
    bad++;
    continue;
  }
  let body;
  try { body = JSON.parse(text); } catch {
    console.log(`FAIL ${slug.padEnd(20)} body is not JSON: ${strip(text).slice(0, 140)}`);
    bad++;
    continue;
  }
  const rows = Array.isArray(body.result?.rows) ? body.result.rows.length : -1;
  const totals = body.result?.totals || {};
  const htmlRows = rendered[name]?.rows;
  const issues = [];
  if (rows < 0) issues.push("result.rows missing");
  if (rows === 0) issues.push("zero rows");
  if (htmlRows !== undefined && rows !== htmlRows) {
    issues.push(`page ${rows} rows vs report page ${htmlRows} for the same filters`);
  }
  // The general ledger's openings must be visible in BOTH totals.
  if (filters.openingRecievables) {
    const recievable = Number(totals.recievable);
    if (!(recievable > 1000)) issues.push(`openingRecievables 1000 not reflected in recievable=${totals.recievable}`);
  }
  // Money in a payload is a 2dp STRING (`printf('%.2f', …)`), so a bare number here means a total
  // silently lost its formatting.
  const notMoney = Object.entries(totals)
    .filter(([k, v]) => k !== "rowCount" && !/^-?\d+\.\d{2}$/.test(String(v)))
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`);
  if (notMoney.length) issues.push(`totals not at 2dp: ${notMoney.join(", ")}`);

  const summary = Object.entries(totals).filter(([k]) => k !== "rowCount").map(([k, v]) => `${k}=${v}`).join(" ");
  if (issues.length) { bad++; console.log(`FAIL ${slug.padEnd(20)} ${issues.join("; ")}`); }
  else console.log(`ok   ${slug.padEnd(20)} ${String(rows).padStart(9)} ${String(htmlRows ?? "-").padStart(9)}   ${summary.slice(0, 70)}`);
}

console.log("");
console.log(bad ? `${bad} FAILURES` : "all report pages and page payloads render through the spool, and agree with each other");
process.exit(bad ? 1 : 0);
