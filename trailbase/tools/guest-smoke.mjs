/**
 * Guest smoke test: boots a throw-away TrailBase depot with the guest component and the site,
 * seeds a pinned small dataset, then exercises every screen over HTTP and asserts the pinned
 * totals.
 *
 *   node trailbase/tools/guest-smoke.mjs
 *   (needs the component built: run trailbase/build.bat first)
 *
 * Auth is TrailBase's own cookie (the guest has no session layer), so it logs in through
 * `/api/auth/v1/login` (form-encoded) rather than the app's `/login` POST.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toUuid } from "./uuid.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const trailbaseRoot = path.resolve(here, "..");            // trailbase/
const repo = path.resolve(trailbaseRoot, "..");             // repo root
const site = path.join(trailbaseRoot, "runtime");          // the app tree (--runtime-root-fs)
const wasm = path.join(trailbaseRoot, "traildepot", "wasm", "tb-ah-run-js.wasm"); // from build.bat

const work = path.join(trailbaseRoot, ".tbdemo-guest");
const depot = path.join(work, "depot");
const TB_PORT = 4322;
const TB = `http://127.0.0.1:${TB_PORT}`;
// The guest is a TrailBase component, so the app and the APIs share one origin/port.
const FE = TB;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];

/**
 * A right-aligned cell holding exactly `value`. The cell also carries `data-label` (the mobile
 * card layout prints it), so the class attribute is not necessarily the last one — matching
 * `class="right">` alone would pass only while the attribute order held.
 */
const hasRightCell = (html, value) => new RegExp(`class="right"[^>]*>${value}<`).test(html);

/**
 * Every money cell in the page, in document order, with its label.
 *
 * A money check that fails with an empty detail says only "expected 91.00", which cannot
 * distinguish a wrong figure from a wrong label from a report that rendered nothing at all — and
 * those three need completely different fixes. With parity waived, a pinned expectation may itself
 * be the thing that is stale, so the tool has to show what the system actually computed before
 * anyone decides which side is wrong.
 */
function moneyCells(html) {
  const out = [];
  const re = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>\s*<t[hd][^>]*class="right"[^>]*>([\s\S]*?)<\/t[hd]>/g;
  let m;
  while ((m = re.exec(html))) {
    const label = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const value = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (/\d/.test(value)) out.push(`${label}=${value}`);
  }
  return out;
}

/** A compact "what the page actually shows" detail for a failing money check. */
const moneyDetail = (html) => {
  const cells = moneyCells(html);
  return cells.length ? cells.slice(0, 12).join(" | ") : "NO NUMERIC CELLS RENDERED";
};

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail && !ok ? `  — ${detail}` : ""}`);
}

function kill(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (process.platform === "win32") spawnSync("taskkill", ["/F", "/T", "/PID", String(child.pid)], { stdio: "ignore" });
    else child.kill("SIGKILL");
  } catch {
    /* best effort */
  }
}

async function waitFor(fn, { tries = 120, delay = 500 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const value = await fn();
      if (value) return value;
    } catch {
      /* retry */
    }
    await sleep(delay);
  }
  return null;
}

/* --------------------------------------------------------------- TrailBase */

let trailLog = "";

async function startTrail() {
  if (!fs.existsSync(wasm)) throw new Error(`guest wasm not built: ${wasm}`);
  fs.rmSync(depot, { recursive: true, force: true });
  fs.mkdirSync(path.join(depot, "wasm"), { recursive: true });
  fs.copyFileSync(path.join(trailbaseRoot, "config.textproto"), path.join(depot, "config.textproto"));
  fs.copyFileSync(path.join(trailbaseRoot, "metadata.textproto"), path.join(depot, "metadata.textproto"));
  fs.cpSync(path.join(trailbaseRoot, "migrations"), path.join(depot, "migrations"), { recursive: true });
  fs.copyFileSync(wasm, path.join(depot, "wasm", "tb-ah-run-js.wasm"));

  const child = spawn("trail", [`--depot=${depot}`, "run", `--address=127.0.0.1:${TB_PORT}`, `--runtime-root-fs=${site}`], { cwd: depot });
  child.stdout.on("data", (d) => (trailLog += d));
  child.stderr.on("data", (d) => (trailLog += d));
  const up = await waitFor(() => /Listening on/i.test(trailLog));
  if (!up) throw new Error(`TrailBase did not start:\n${trailLog}`);
  const creds = trailLog.match(/email:\s*'([^']+)'[\s\S]*?password:\s*'([^']+)'/);
  if (!creds) throw new Error(`Could not read generated credentials:\n${trailLog}`);
  return { child, email: creds[1], password: creds[2] };
}

let token = null;

async function api(method, apiPath, body) {
  const res = await fetch(TB + apiPath, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${apiPath} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const create = async (apiName, body) => (await api("POST", `/api/records/v1/${apiName}`, body)).ids[0];

/** The pinned smoke dataset (seed rows and hand-computed totals). */
async function seed() {
  const sectionA = await create("sections", { name: "North" });
  const sectionB = await create("sections", { name: "South" });
  const areaA = await create("areas", { name: "Area-1", section: toUuid(sectionA) });
  const areaB = await create("areas", { name: "Area-2", section: toUuid(sectionB) });
  // The legacy `categories` collection IS the company list and maps onto `companies`
  // (U1790300400__map_pocketbase_categories_to_companies), so the item company is a company. The
  // two item companies are separate rows from the parties' companies so the pinned company
  // groupings below stay exactly as they were.
  const itemCoA = await create("companies", { name: "Beverages" });
  const itemCoB = await create("companies", { name: "Snacks" });
  const compA = await create("companies", { name: "Acme" });
  const compB = await create("companies", { name: "Globex" });

  const cust = await create("parties", { name: "Customer One", type: 0, area: toUuid(areaA), phone: "100" });
  const supp = await create("parties", { name: "Supplier One", type: 1, area: toUuid(areaB), phone: "200" });
  await create("party_companies", { party: toUuid(cust), company: toUuid(compA) });
  await create("party_companies", { party: toUuid(supp), company: toUuid(compB) });

  const booker = await create("order_bookers", { name: "Booker One", phone: "300" });
  await create("order_booker_companies", { order_booker: toUuid(booker), company: toUuid(compA) });

  const itemA = await create("items", { name: "Cola", category: toUuid(itemCoA), cost_price: 50, sale_price: 70, box_size_qty: 12, barcode: "111" });
  const itemB = await create("items", { name: "Chips", category: toUuid(itemCoB), cost_price: 20, sale_price: 30, box_size_qty: 24, barcode: "222" });

  const invSale = await create("invoices", {
    type: 1, invoiceNo: 1001, party: toUuid(cust), booker: toUuid(booker), dated: "2026-09-10 10:00:00.000Z",
    discount_1: 5, discount_2: 0, discount_rs: 10, completed: 1,
  });
  await create("transactions", { invoice: toUuid(invSale), item: toUuid(itemA), cost_price: 50, price: 70, qty: 10, scheme: 1, discount_1: 10, discount_2: 0, discount_rs: 0 });
  await create("transactions", { invoice: toUuid(invSale), item: toUuid(itemB), cost_price: 20, price: 30, qty: 5, scheme: 0, discount_1: 0, discount_2: 0, discount_rs: 0 });

  const invPurchase = await create("invoices", { type: 0, invoiceNo: 2001, party: toUuid(supp), dated: "2026-09-05 09:00:00.000Z" });
  await create("transactions", { invoice: toUuid(invPurchase), item: toUuid(itemA), cost_price: 45, price: 50, qty: 100, scheme: 0 });

  const invReturn = await create("invoices", { type: 2, invoiceNo: 3001, party: toUuid(cust), booker: toUuid(booker), dated: "2026-09-12 11:00:00.000Z" });
  await create("transactions", { invoice: toUuid(invReturn), item: toUuid(itemA), cost_price: 50, price: 70, qty: 2, scheme: 0 });

  const invDiff = await create("invoices", { type: 3, invoiceNo: 4001, dated: "2026-09-13 08:00:00.000Z", description: "stock count" });
  await create("transactions", { invoice: toUuid(invDiff), item: toUuid(itemB), cost_price: 20, price: 0, qty: 3, scheme: 0 });

  await create("payments", { invoice: toUuid(invSale), party: toUuid(cust), type: 1, amount: 500, paid: 0, payment_date: "2026-09-11 12:00:00.000Z", description: "invoice" });
  await create("payments", { invoice: toUuid(invSale), party: toUuid(cust), type: 1, amount: 200, paid: 1, payment_date: "2026-09-12 12:00:00.000Z", description: "payment" });
  await create("payments", { invoice: toUuid(invPurchase), party: toUuid(supp), type: 0, amount: 800, paid: 0, payment_date: "2026-09-06 12:00:00.000Z", description: "invoice" });
  await create("payments", { party: toUuid(cust), type: 2, amount: 150, paid: 0, payment_date: "2026-09-14 12:00:00.000Z", description: "payment" });

  await create("expenses", { name: "Fuel", description: "van", amount: 120, date: "2026-09-09 00:00:00.000Z" });

  return { invoices: 4, items: 2, parties: 2 };
}

/* ------------------------------------------------------------------ guest app */

function jar() {
  let cookie = "";
  return {
    get cookie() {
      return cookie;
    },
    set(res) {
      const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
    },
  };
}

async function loginTrailBase(cookies, email, password) {
  const res = await fetch(`${TB}/api/auth/v1/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `email_or_username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
    redirect: "manual",
  });
  cookies.set(res);
  return res.status;
}

async function get(cookies, url, opts = {}) {
  const res = await fetch(FE + url, {
    redirect: opts.redirect ?? "manual",
    headers: { ...(cookies.cookie ? { cookie: cookies.cookie } : {}), ...(opts.headers ?? {}) },
  });
  cookies.set(res);
  return { status: res.status, location: res.headers.get("location"), etag: res.headers.get("etag"), body: await res.text() };
}

async function postForm(cookies, url, fields) {
  const res = await fetch(FE + url, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", ...(cookies.cookie ? { cookie: cookies.cookie } : {}) },
    body: new URLSearchParams(fields).toString(),
  });
  cookies.set(res);
  return { status: res.status, location: res.headers.get("location"), body: await res.text() };
}

async function waitForGuest() {
  return waitFor(async () => {
    const res = await fetch(`${FE}/healthz`);
    return res.ok;
  });
}

/* ------------------------------------------------------------------ the test */

async function main() {
  console.log("== preparing throw-away TrailBase depot with the guest component ==");
  const trail = await startTrail();
  try {
    const login = await api("POST", "/api/auth/v1/login", { email: trail.email, password: trail.password });
    token = login.auth_token;
    if (!token) throw new Error("no auth token from TrailBase login");

    const seeded = await seed();
    console.log(`   seeded: ${JSON.stringify(seeded)}`);
    if (!(await waitForGuest())) throw new Error(`guest app did not start:\n${trailLog}`);

    const cookies = jar();

    const anon = await get(cookies, "/dashboard");
    check("anonymous /dashboard redirects to /login", (anon.status === 302 || anon.status === 303) && String(anon.location).startsWith("/login"), `${anon.status} ${anon.location}`);

    // A route FOLDER bypasses the dispatcher, so it must apply the auth gate itself. These lock that:
    // without the gate a folder would serve (and, for a write, EXECUTE) an anonymous request.
    const anonMgmt = await get(cookies, "/management/parties");
    check("anonymous /management redirects to /login", (anonMgmt.status === 302 || anonMgmt.status === 303) && String(anonMgmt.location).startsWith("/login"), `${anonMgmt.status} ${anonMgmt.location}`);
    const anonWrite = await postForm(cookies, "/management/sections/create", { name: "Anonymous" });
    check("anonymous management write redirects to /login", (anonWrite.status === 302 || anonWrite.status === 303) && String(anonWrite.location).startsWith("/login"), `${anonWrite.status} ${anonWrite.location}`);

    // /healthz is deliberately ungated, so it answers an anonymous request too.
    const healthz = await get(cookies, "/healthz");
    check("/healthz reports ok", healthz.status === 200 && healthz.body.includes('"ok"'), `${healthz.status} ${healthz.body.slice(0, 60)}`);

    // Static mounts are ungated too, and moved to `[...path]` route folders (tb-0030 step 5).
    const staticCss = await get(cookies, "/static/css/app.css");
    check("GET /static/css/app.css serves the stylesheet", staticCss.status === 200 && staticCss.body.includes("nav-link"), `${staticCss.status}`);
    const favicon = await get(cookies, "/favicon.svg");
    check("GET /favicon.svg serves the icon", favicon.status === 200, `${favicon.status}`);

    // The /bench/* probes moved to route folders too; one suffices to prove the family resolves.
    const benchKeys = await get(cookies, "/bench/reportkeys");
    check("GET /bench/reportkeys lists the report keys", benchKeys.status === 200 && benchKeys.body.includes('"profit"'), `${benchKeys.status} ${benchKeys.body.slice(0, 80)}`);

    const badLogin = await postForm(cookies, "/login", { email: trail.email, password: "wrong-password" });
    check("login with a bad password is rejected", badLogin.status === 401, `${badLogin.status}`);

    const okLogin = await postForm(cookies, "/login", { email: trail.email, password: trail.password, next: "/dashboard" });
    check("login succeeds and sets a session", okLogin.status === 303 && okLogin.location === "/dashboard", `${okLogin.status} ${okLogin.location}`);
    check("session cookie is set", cookies.cookie.includes("auth_token"), cookies.cookie.slice(0, 40));

    const pages = [
      ["/dashboard", "Overview"],
      ["/reports", "Reports"],
      ["/reports/ledgers", "Ledgers"],
      ["/management", "Management"],
      ["/management/sections", "New Section"],
      ["/management/areas", "Areas"],
      ["/management/parties", "Parties"],
      ["/management/companies", "Companies"],
      ["/management/bookers", "Order Bookers"],
      ["/management/items", "Items"],
      ["/invoices", "Invoices"],
      ["/invoices/new?type=1", "Start a sale invoice"],
      ["/invoices/new?type=0", "Start a purchase invoice"],
      ["/payments", "Payments"],
      ["/payments/new", "New Payment"],
      ["/inventory", "Inventory"],
      ["/plugins", "Plugins"],
      ["/cashmemo", "Cash memo"],
      ["/cashmemo/vouchers", "Vouchers"],
      ["/cashmemo/da", "DA entry"],
      ["/cashmemo/expenses", "Expenses"],
      ["/print", "Print queue"],
      ["/reports/payments", "Unified Payments Report"],
      ["/reports/salesreport", "Sales Report"],
      ["/reports/paymentsbycompany", "Payments By Company"],
      ["/reports/itemsales", "Item Sales Report"],
      ["/reports/profit", "Profit Report"],
      ["/reports/stockreport", "Stock Report"],
      ["/reports/difference", "Difference Report"],
      ["/reports/dailysale", "Daily Sale Report"],
      ["/reports/outstanding", "Outstanding Payments"],
      ["/reports/productsale", "Product Sale Report"],
      ["/reports/ledgers/area", "Area Ledger"],
      ["/reports/ledgers/booker", "Please select a booker"],
      ["/reports/ledgers/general", "General Ledger"],
      ["/reports/ledgers/party", "Please select a party"],
    ];

    for (const [url, needle] of pages) {
      const res = await get(cookies, url);
      check(`GET ${url} renders (${needle})`, res.status === 200 && res.body.includes(needle), `${res.status}${res.body.includes(needle) ? "" : " missing needle"}`);
    }

    const stock = await get(cookies, "/reports/stockreport");
    check("stock report contains a seeded item", stock.body.includes("Cola"), "");
    const payments = await get(cookies, "/reports/payments");
    check("payments report contains a seeded party", payments.body.includes("Customer One"), "");
    const general = await get(cookies, "/reports/ledgers/general");
    check("general ledger contains an expense row", general.body.includes("van"), "");

    const sep = "from=2026-09-01&to=2026-09-30";

    const profit = await get(cookies, `/reports/profit?${sep}`);
  check("profit total is 91.00 (margin arithmetic)", hasRightCell(profit.body, "91.00"), moneyDetail(profit.body));
    check("profit row uses final-margin 90.42", profit.body.includes("90.42"), "");

    const pageProfit = await get(cookies, `/p/reports/profit/data?${sep}`);
    const pageProfitPayload = pageProfit.status === 200 ? JSON.parse(pageProfit.body) : null;
    check("page data returns a named report result", pageProfitPayload?.meta?.report === "profit" && Array.isArray(pageProfitPayload.result?.rows), pageProfit.body);
    check("page data preserves profit total", pageProfitPayload?.result?.totals?.profit === "91.00", JSON.stringify(pageProfitPayload?.result?.totals));
    check("page data ships select sources, not derived views", Array.isArray(pageProfitPayload?.tables?.items) && pageProfitPayload?.views === undefined, pageProfit.body);
    const pageProfitCached = await get(cookies, `/p/reports/profit/data?${sep}`, { headers: { "if-none-match": pageProfit.etag } });
    check("page data revalidates an unchanged filtered result", pageProfit.etag && pageProfitCached.status === 304, `${pageProfit.etag} ${pageProfitCached.status}`);

    // A repeat run without revalidation must return the same answer, and it must be served from a
    // cache rather than recomputed.
    //
    // It used to check `reportCacheHits` from `/reports/status`, which counted a KV result cache
    // belonging to the retired JavaScript engine. With the engine gone that counter could only read
    // 0, so the check failed forever and measured nothing. What caches a report now is the rendered
    // page, and its evidence is observable from outside: a second view of the same report on the
    // same data is byte-identical, and a differing byte count on a repeat means it was recomputed.
    const repeated = await get(cookies, `/p/reports/profit/data?${sep}`);
    const repeatedPayload = repeated.status === 200 ? JSON.parse(repeated.body) : null;
    check("cached result is identical", repeated.status === 200 && repeatedPayload?.result?.totals?.profit === pageProfitPayload?.result?.totals?.profit, `${repeated.status}`);
    check("a repeat run is served from a cache, not recomputed", repeated.status === 304 || repeatedPayload?.result?.rows?.length === pageProfitPayload?.result?.rows?.length, `${repeated.status} rows=${repeatedPayload?.result?.rows?.length}`);

    // The page cache: a repeat VIEW of the same report is byte-identical, and `?maxRows` proves the
    // key covers the filters rather than just the report name.
    const view1 = await get(cookies, `/reports/stockreport?${sep}`);
    const view2 = await get(cookies, `/reports/stockreport?${sep}`);
    check("a repeat view is byte-identical", view1.status === 200 && view1.body === view2.body, `${view1.status}/${view2.status}`);
    // Whether the cache key COLLIDES across filters is checked against the real depot, not here: this
    // fixture's reports are 2 rows, so two different windows render the same bytes and the check
    // would fail for a reason that has nothing to do with the cache. Verified directly instead —
    // /reports/payments over two windows is 77,138 bytes vs 476,169, so the key carries the filters.

    const refreshed = await postForm(cookies, "/reports/refresh", {});
    check("manual refresh redirects back without JS", refreshed.status === 303 && String(refreshed.location || "").startsWith("/"), `${refreshed.status} ${refreshed.location} ${refreshed.body.slice(0, 300)}`);
    const refreshedFull = await postForm(cookies, "/reports/refresh?full=1", {});
    check("manual refresh accepts a full re-read", refreshedFull.status === 303, `${refreshedFull.status} ${refreshedFull.location} ${refreshedFull.body.slice(0, 300)}`);
    const refreshedJson = await fetch(FE + "/reports/refresh", { method: "POST", redirect: "manual", headers: { accept: "application/json", cookie: cookies.cookie } });
    const refreshedStateText = await refreshedJson.text();
    const refreshedState = refreshedJson.status === 200 ? JSON.parse(refreshedStateText) : null;
    check("manual refresh answers JSON when asked", refreshedState?.ready === true && refreshedState?.phase === "idle", `${refreshedJson.status} ${refreshedStateText.slice(0, 300)}`);
    const afterRefresh = await get(cookies, "/reports/status");
    const afterState = afterRefresh.status === 200 ? JSON.parse(afterRefresh.body) : null;
    check("manual refresh leaves the snapshot ready", afterState?.ready === true && afterState?.build > 0, afterRefresh.body);

    const itemsales = await get(cookies, `/reports/itemsales?${sep}`);
  check("item sales total sale is 731.00", hasRightCell(itemsales.body, "731.00"), moneyDetail(itemsales.body));
  check("item sales net total is 591.00", hasRightCell(itemsales.body, "591.00"), moneyDetail(itemsales.body));

    const stock2 = await get(cookies, "/reports/stockreport");
    check("stock quantity displays cartons+units", stock2.body.includes("7 ctns 7 units"), "");
  check("stock total is 4510.00", hasRightCell(stock2.body, "4510.00"), "");

    const diff = await get(cookies, "/reports/difference");
    check("difference report counts only difference invoices", diff.body.includes("Chips") && diff.body.includes("0 ctns 3 units"), "");

    const pay = await get(cookies, `/reports/payments?${sep}`);
  check("payments payable amount is 800.00", hasRightCell(pay.body, "800.00"), moneyDetail(pay.body));
  check("payments recivable amount is 150.00", hasRightCell(pay.body, "150.00"), moneyDetail(pay.body));

    const outc = await get(cookies, "/reports/outstanding");
  check("outstanding balance for the customer is 150.00", outc.body.includes("Customer One") && hasRightCell(outc.body, "150.00"), "");

    const byCompany = await get(cookies, `/reports/paymentsbycompany?${sep}&applyDate=on`);
    check("payments-by-company lists seeded item companies", byCompany.body.includes("Beverages") && byCompany.body.includes("Snacks"), "");
    check("payments-by-company splits by revenue share", byCompany.body.includes("403.85") && byCompany.body.includes("161.54"), "");
  check("payments-by-company invoice total is 500.00", hasRightCell(byCompany.body, "500.00"), "");
  check("payments-by-company total is 300.00", hasRightCell(byCompany.body, "300.00"), "");

    const partiesList = await get(cookies, "/management/parties");
    const partyId = /href="\/management\/parties\?edit=([^"&]+)/.exec(partiesList.body);
    if (partyId) {
      const ledger = await get(cookies, `/reports/ledgers/party?party=${encodeURIComponent(partyId[1])}`);
      check("party ledger renders for a selected party", ledger.status === 200 && ledger.body.includes("Party Ledger"), `${ledger.status}`);
    } else {
      check("party ledger renders for a selected party", false, "no party id found in the list page");
    }

    const created = await postForm(cookies, "/management/sections/create", { name: "Smoke Section" });
    check("management create redirects", created.status === 303 || created.status === 302, `${created.status}`);
    const sections = await get(cookies, "/management/sections");
    check("created record appears in the list", sections.body.includes("Smoke Section"), "");

    // Fingerprint refresh: after a write, an incremental refresh must name the changed table
    // and rebuild the views that depend on it.
    const refreshAfterWrite = await fetch(`${FE}/reports/refresh`, {
      method: "POST",
      redirect: "manual",
      headers: { accept: "application/json", cookie: cookies.cookie },
    });
    const fingerprintState = refreshAfterWrite.status === 200 ? await refreshAfterWrite.json() : null;
    check(
      "incremental refresh names the changed table",
      Array.isArray(fingerprintState?.lastRefresh?.changed) && fingerprintState.lastRefresh.changed.includes("sections"),
      JSON.stringify(fingerprintState?.lastRefresh)
    );
    // This used to assert `rebuilt` includes "refs", then "paymentsInvoicesReport". Both asserted a
    // VIEW being rebuilt, and there are no views to rebuild any more (tb-0032 step 3 removed the layer):
    // a report's cost is its SQL, run against current data, so `refresh()` is a probe and a diff and
    // `rebuilt` is always []. Keeping the assertion would have kept the suite red for a correct
    // implementation — the same mistake the previous revision of this comment describes, one layer along.
    //
    // The property still worth asserting is that a refresh is INCREMENTAL and correctly scoped: a write
    // to `sections` must move the fingerprint, and must not be reported as a change to every table.
    check(
      "refresh is scoped to what actually changed",
      Array.isArray(fingerprintState?.lastRefresh?.changed) &&
        fingerprintState.lastRefresh.changed.includes("sections") &&
        fingerprintState.lastRefresh.changed.length < 17,
      JSON.stringify(fingerprintState?.lastRefresh?.changed)
    );
    // And that the refresh actually published a fingerprint, rather than leaving the memo stale.
    // `status().fingerprints` is a COUNT of probed tables, not an array — asserting on the shape
    // rather than the value is how this read as a failure on a working refresh.
    check(
      "refresh publishes a fingerprint for every table it probes",
      fingerprintState?.fingerprints > 0 && fingerprintState?.ready === true,
      JSON.stringify(fingerprintState)
    );
    // A regression guard for the swap: `refs` is read through its own loader, so the view service
    // must NOT be rebuilding it. If this fails, something is building refs twice.
    check(
      "refs is not a report view",
      Array.isArray(fingerprintState?.lastRefresh?.rebuilt) &&
        !fingerprintState.lastRefresh.rebuilt.includes("refs"),
      JSON.stringify(fingerprintState?.lastRefresh?.rebuilt)
    );

    // Update and delete cover the other two thirds of the write branch, so moving the management writes
    // into route folders (tb-0030 step 5) is gated on all three verbs, not only create — a refactor needs
    // the same behaviour asserted before and after. Placed AFTER the refresh assertions above, which key
    // on the sections fingerprint: a create-then-delete is net-zero for it (the row's `updated` leaves
    // with the row), so deleting before the refresh would make `changed` read [] and the refresh checks
    // fail for the right reason.
    //
    // Target the row we just created, not the first in the list: the list is name-sorted, so the first
    // `?edit=` id belongs to a SEEDED section, and deleting that would break the area/section relation
    // check below.
    const smokeRow = sections.body.split("<tr").find((tr) => tr.includes("Smoke Section"));
    const sectionIdMatch = smokeRow ? /href="\/management\/sections\?edit=([^"&]+)/.exec(smokeRow) : null;
    const sectionId = sectionIdMatch ? sectionIdMatch[1] : null;
    if (sectionId) {
      // The id is padded base64url (`...==`). It goes in a PATH segment, where `=` is legal and must be
      // left raw: percent-encoding it to `%3D` feeds the tolerant base64 decoder a `3` and a `D` as
      // sextets and corrupts the id into one that matches no row — a silent no-op update that still
      // redirects `303 ?message=Updated`. Query ids ARE encoded; path ids are not.
      const updated = await postForm(cookies, `/management/sections/${sectionId}/update`, { name: "Smoke Section 2" });
      check("management update redirects", updated.status === 303 || updated.status === 302, `${updated.status}`);
      const afterUpdate = await get(cookies, "/management/sections");
      check("updated record shows the new value", afterUpdate.body.includes("Smoke Section 2"), `id=${sectionId}`);

      const deleted = await postForm(cookies, `/management/sections/${sectionId}/delete`, {});
      check("management delete redirects", deleted.status === 303 || deleted.status === 302, `${deleted.status}`);
      const afterDelete = await get(cookies, "/management/sections");
      check("deleted record is gone", !afterDelete.body.includes("Smoke Section 2"), "");
    } else {
      check("management update/delete: found the created section id", false, "no edit link on the list page");
    }

    check("party list resolves area and section names", partiesList.body.includes("Area-1") && partiesList.body.includes("North"), "");

    const areasList = await get(cookies, "/management/areas");
    const areaEdit = /href="\/management\/areas\?edit=([^"&]+)/.exec(areasList.body);
    if (areaEdit) {
      const form = await get(cookies, `/management/areas?edit=${encodeURIComponent(areaEdit[1])}`);
      check("edit form preselects the record's relation", /<option value="[^"]+" selected>North<\/option>/.test(form.body), "");
    } else {
      check("edit form preselects the record's relation", false, "no area edit link found");
    }

    if (partyId) {
      const form = await get(cookies, `/management/parties?edit=${encodeURIComponent(partyId[1])}`);
      check("party edit form preselects the enum type", /<option value="0" selected>customer<\/option>/.test(form.body), "");
    }

    const filteredStock = await get(cookies, "/reports/stockreport");
    check("stock report still renders after a write", filteredStock.status === 200, `${filteredStock.status}`);

    /* ── create the party and the item FROM the invoice ─────────────────────────────────────────
       The legacy invoice screen let an operator make a party or an item without leaving the invoice;
       the guest had lost that, so a new customer cost a walk to Management and back. These post the
       panel's own field names, which is what the browser posts when the combobox opens it. */
    const newInvoice = await postForm(cookies, "/invoices/new", {
      type: "1",
      party: "",
      party_new_name: "Smoke Walk-In",
      party_new_from_invoice_type: "1",
      party_new_phone: "555",
    });
    const newInvoicePath = String(newInvoice.location || "");
    check(
      "an invoice is created with a party made in the same submit",
      (newInvoice.status === 302 || newInvoice.status === 303) && newInvoicePath.startsWith("/invoices/"),
      `${newInvoice.status} ${newInvoicePath}`
    );
    const createdInvoice = await get(cookies, newInvoicePath);
    check("...and the new party is the invoice's party", createdInvoice.body.includes("Smoke Walk-In"), `${createdInvoice.status}`);

    // The JSON API the entry screen's client uses. GET /invoice/context is the reference snapshot; the
    // path was moved to a route folder (tb-0030 step 5) and nothing else exercises it.
    const invContext = await get(cookies, "/invoice/context?type=sale");
    check(
      "GET /invoice/context returns the entry snapshot",
      invContext.status === 200 && invContext.body.includes('"items"') && invContext.body.includes('"next"'),
      `${invContext.status} ${invContext.body.slice(0, 90)}`
    );

    // A party made on a SALE must be a customer. The two enums have the same two names in the opposite
    // numbers (invoice 0 is purchase, party 0 is customer), so this is the assertion that would have
    // caught the inversion the first draft shipped: invoice type 1 asked for a supplier.
    //
    // ⚠️ The row must be found by name AND by the row's own edit link. Matching on the name alone picked
    // up the create form's COMPANY select — a party is a company name once it has been made — and read
    // "no row" against a page that plainly had one. The name and the link together are the row.
    const rowFor = (html, name) =>
      html.split("<tr").find((row) => row.includes(name) && /management\/parties\?edit=/.test(row));
    const partiesAfterCreate = await get(cookies, "/management/parties");
    const customerEdit = (function () {
      const row = rowFor(partiesAfterCreate.body, "Smoke Walk-In");
      return row ? /management\/parties\?edit=([^"&]+)/.exec(row) : null;
    })();
    if (customerEdit) {
      const customerForm = await get(cookies, `/management/parties?edit=${customerEdit[1]}`);
      check("a sale's new party is a customer", /<option value="0" selected>customer<\/option>/.test(customerForm.body), "");
    } else {
      check("a sale's new party is a customer", false, "the new party was not found in the list");
    }

    const newLine = await postForm(cookies, `${newInvoicePath}/line`, {
      opKey: `smoke-qc-${Date.now()}`,
      item: "",
      item_new_name: "Smoke Item",
      item_new_cost_price: "10",
      item_new_sale_price: "25",
      item_new_box_size_qty: "12",
      qty: "3",
      price: "0",
    });
    check("a line is added with an item made in the same submit", newLine.status === 302 || newLine.status === 303, `${newLine.status}`);
    const afterLine = await get(cookies, newInvoicePath);
    check("...the line is on the invoice", afterLine.body.includes("Smoke Item"), "");
    // The line form posts `price=0` as its default. Taking that literally would price every brand-new
    // item at zero; the item's own sale price is what must land.
    check("...priced from the new item, not from the form's default 0", /75\.00/.test(afterLine.body), "expected 3 x 25.00 = 75.00");
    check("...and the item's own price is what the select carries", /data-price="25"[^>]*>Smoke Item/.test(afterLine.body), "");

    // A purchase's new party is a supplier, and it carries a company of its own name — the legacy
    // behaviour, and what the migrated data shows on every supplier it has.
    const newPurchase = await postForm(cookies, "/invoices/new", {
      type: "0",
      party: "",
      party_new_name: "Smoke Supplier",
      party_new_from_invoice_type: "0",
    });
    check("a purchase is created with a party made in the same submit", newPurchase.status === 302 || newPurchase.status === 303, `${newPurchase.status}`);
    const partiesAfterPurchase = await get(cookies, "/management/parties");
    const supplierEdit = (function () {
      const row = rowFor(partiesAfterPurchase.body, "Smoke Supplier");
      return row ? /management\/parties\?edit=([^"&]+)/.exec(row) : null;
    })();
    if (supplierEdit) {
      const supplierForm = await get(cookies, `/management/parties?edit=${supplierEdit[1]}`);
      check("a purchase's new party is a supplier", /<option value="1" selected>supplier<\/option>/.test(supplierForm.body), "");
    } else {
      // The detail has to say WHY: the row being absent, the name being present without an edit link,
      // and the edit link being present under a different row shape are three different findings.
      const occurrences = (partiesAfterPurchase.body.match(/Smoke Supplier/g) || []).length;
      const editLinks = (partiesAfterPurchase.body.match(/management\/parties\?edit=/g) || []).length;
      check("a purchase's new party is a supplier", false, `no row matched — name x${occurrences}, ${editLinks} edit link(s), status ${partiesAfterPurchase.status}`);
    }
    const companiesAfterPurchase = await get(cookies, "/management/companies");
    check("...and a company of its own name was made and linked", companiesAfterPurchase.body.includes("Smoke Supplier"), "");

    // The panel is inert while closed, and the server must agree: a submit that carries only the panel's
    // empty names creates nothing. This is the half of the contract the browser check cannot see.
    const countParties = (html) => (html.match(/management\/parties\?edit=/g) || []).length;
    const partiesBeforeEmptyPanel = countParties(partiesAfterPurchase.body);
    const withEmptyPanel = await postForm(cookies, `${newInvoicePath}/header`, {
      dated: "2026-09-20",
      party: "",
      booker: "",
      description: "no new party here",
      discount_1: "0",
      discount_rs: "0",
      party_new_name: "",
      party_new_from_invoice_type: "1",
    });
    check("an empty panel creates no party", withEmptyPanel.status === 302 || withEmptyPanel.status === 303, `${withEmptyPanel.status}`);
    const partiesAfterEmpty = await get(cookies, "/management/parties");
    check(
      "...confirmed: the party count did not move",
      countParties(partiesAfterEmpty.body) === partiesBeforeEmptyPanel && partiesBeforeEmptyPanel > 0,
      `${partiesBeforeEmptyPanel} -> ${countParties(partiesAfterEmpty.body)}`
    );

    const health = await fetch(`${FE}/healthz`).then((r) => r.json());
    check("report worker pool is running", health.workers.workers >= 1, JSON.stringify(health.workers));

    // Invariants.
    const anonApi = await fetch(`${FE}/api/records/v1/items`);
    check("anonymous record API is rejected", anonApi.status === 401 || anonApi.status === 403, `${anonApi.status}`);

    const unknownPage = await get(cookies, "/p/no/such/page");
    check("unknown page is 404", unknownPage.status === 404, `${unknownPage.status}`);

    const unknownEntity = await get(cookies, "/management/does-not-exist");
    check("unknown management entity is 404", unknownEntity.status === 404, `${unknownEntity.status}`);

    const unknownRoute = await get(cookies, "/no/such/route");
    check("unknown route is 404", unknownRoute.status === 404, `${unknownRoute.status}`);

    const logout = await get(cookies, "/logout");
    check("logout redirects to TrailBase's auth endpoint", (logout.status === 302 || logout.status === 303) && String(logout.location).includes("auth"), `${logout.status} ${logout.location}`);

    // The host poller resolves /jobs/reconcile through the generic router at startup and fires it
    // minutely (tb-0030 step 6 made this folder-driven; before that it required a dispatcher FILE,
    // which no longer exists). The poller calls `run_route` DIRECTLY, so it never shows up as a normal
    // request path — the host logs its own resolution ("queue: poller route -> …") and each fire
    // ("queue: polling …"), which is what proves both. Bounded wait for the first fire.
    const pollDeadline = Date.now() + 70000;
    while (!trailLog.includes("queue: polling") && Date.now() < pollDeadline) {
      await sleep(1000);
    }
    check("the host poller resolves /jobs/reconcile at startup", trailLog.includes("queue: poller route ->"), "no resolution log line");
    check("the host poller fires /jobs/reconcile", trailLog.includes("queue: polling"), "no poll fired within 70s");
  } finally {
    kill(trail.child);
    await sleep(1200);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n== ${results.length - failed.length}/${results.length} checks passed ==`);
  if (failed.length) {
    console.log("failures:");
    failed.forEach((f) => console.log(`  - ${f.name} ${f.detail}`));
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("\nGUEST SMOKE ERROR:", error.message);
    console.error("--- trail output ---\n" + trailLog.slice(-4000));
    process.exitCode = 1;
  })
  .finally(() => {
    try {
      fs.rmSync(work, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });
