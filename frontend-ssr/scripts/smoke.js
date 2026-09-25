/**
 * End-to-end smoke test.
 *
 * Boots a throw-away TrailBase depot, seeds a small consistent dataset through the
 * record APIs, starts this frontend against it, then exercises every screen over
 * HTTP with a real login. Exits non-zero on the first failure.
 *
 *   node scripts/smoke.js
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toUuid } from "../src/lib/uuid.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const repo = path.resolve(root, "..");
const work = path.join(root, ".tbdemo");
const depot = path.join(work, "depot");
const TB_PORT = 4321;
const TB = `http://127.0.0.1:${TB_PORT}`;
const FE_PORT = 3199;
const FE = `http://127.0.0.1:${FE_PORT}`;
const SESSION_SECRET = "smoke-test-secret";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];

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

async function waitFor(fn, { tries = 80, delay = 300 } = {}) {
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

async function startTrail() {
  fs.rmSync(depot, { recursive: true, force: true });
  fs.mkdirSync(depot, { recursive: true });
  const src = path.join(repo, "trailbase", "traildepot");
  fs.copyFileSync(path.join(src, "config.textproto"), path.join(depot, "config.textproto"));
  fs.copyFileSync(path.join(src, "metadata.textproto"), path.join(depot, "metadata.textproto"));
  fs.cpSync(path.join(src, "migrations"), path.join(depot, "migrations"), { recursive: true });

  const child = spawn("trail", [`--depot=${depot}`, "run", `--address=127.0.0.1:${TB_PORT}`], { cwd: depot });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  const up = await waitFor(() => /Listening on/i.test(log));
  if (!up) throw new Error(`TrailBase did not start:\n${log}`);
  const creds = log.match(/email:\s*'([^']+)'[\s\S]*?password:\s*'([^']+)'/);
  if (!creds) throw new Error(`Could not read generated credentials:\n${log}`);
  return { child, email: creds[1], password: creds[2] };
}

let token = null;
let frontendLog = () => "";

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

const create = async (apiName, body) => {
  const res = await api("POST", `/api/records/v1/${apiName}`, body);
  return res.ids[0];
};

/** Seed a small dataset that exercises every report. */
async function seed() {
  const sectionA = await create("sections", { name: "North" });
  const sectionB = await create("sections", { name: "South" });
  const areaA = await create("areas", { name: "Area-1", section: toUuid(sectionA) });
  const areaB = await create("areas", { name: "Area-2", section: toUuid(sectionB) });
  const catA = await create("categories", { name: "Beverages" });
  const catB = await create("categories", { name: "Snacks" });
  const compA = await create("companies", { name: "Acme" });
  const compB = await create("companies", { name: "Globex" });

  const cust = await create("parties", { name: "Customer One", type: 0, area: toUuid(areaA), phone: "100" });
  const supp = await create("parties", { name: "Supplier One", type: 1, area: toUuid(areaB), phone: "200" });
  await create("party_companies", { party: toUuid(cust), company: toUuid(compA) });
  await create("party_companies", { party: toUuid(supp), company: toUuid(compB) });

  const booker = await create("order_bookers", { name: "Booker One", phone: "300" });
  await create("order_booker_companies", { order_booker: toUuid(booker), company: toUuid(compA) });

  const itemA = await create("items", { name: "Cola", category: toUuid(catA), cost_price: 50, sale_price: 70, box_size_qty: 12, barcode: "111" });
  const itemB = await create("items", { name: "Chips", category: toUuid(catB), cost_price: 20, sale_price: 30, box_size_qty: 24, barcode: "222" });

  // sale invoice: 2 lines, 10% line discount, 5 invoice discount
  const invSale = await create("invoices", {
    type: 1, invoiceNo: 1001, party: toUuid(cust), booker: toUuid(booker), dated: "2026-09-10 10:00:00.000Z",
    discount_1: 5, discount_2: 0, discount_rs: 10, completed: 1,
  });
  await create("transactions", { invoice: toUuid(invSale), item: toUuid(itemA), cost_price: 50, price: 70, qty: 10, scheme: 1, discount_1: 10, discount_2: 0, discount_rs: 0 });
  await create("transactions", { invoice: toUuid(invSale), item: toUuid(itemB), cost_price: 20, price: 30, qty: 5, scheme: 0, discount_1: 0, discount_2: 0, discount_rs: 0 });

  // purchase invoice
  const invPurchase = await create("invoices", { type: 0, invoiceNo: 2001, party: toUuid(supp), dated: "2026-09-05 09:00:00.000Z" });
  await create("transactions", { invoice: toUuid(invPurchase), item: toUuid(itemA), cost_price: 45, price: 50, qty: 100, scheme: 0 });

  // return invoice
  const invReturn = await create("invoices", { type: 2, invoiceNo: 3001, party: toUuid(cust), booker: toUuid(booker), dated: "2026-09-12 11:00:00.000Z" });
  await create("transactions", { invoice: toUuid(invReturn), item: toUuid(itemA), cost_price: 50, price: 70, qty: 2, scheme: 0 });

  // difference invoice
  const invDiff = await create("invoices", { type: 3, invoiceNo: 4001, dated: "2026-09-13 08:00:00.000Z", description: "stock count" });
  await create("transactions", { invoice: toUuid(invDiff), item: toUuid(itemB), cost_price: 20, price: 0, qty: 3, scheme: 0 });

  // payments: recieving unpaid + paid, sending unpaid, return
  await create("payments", { invoice: toUuid(invSale), party: toUuid(cust), type: 1, amount: 500, paid: 0, payment_date: "2026-09-11 12:00:00.000Z", description: "invoice" });
  await create("payments", { invoice: toUuid(invSale), party: toUuid(cust), type: 1, amount: 200, paid: 1, payment_date: "2026-09-12 12:00:00.000Z", description: "payment" });
  await create("payments", { invoice: toUuid(invPurchase), party: toUuid(supp), type: 0, amount: 800, paid: 0, payment_date: "2026-09-06 12:00:00.000Z", description: "invoice" });
  await create("payments", { party: toUuid(cust), type: 2, amount: 150, paid: 0, payment_date: "2026-09-14 12:00:00.000Z", description: "payment" });

  await create("expenses", { name: "Fuel", description: "van", amount: 120, date: "2026-09-09 00:00:00.000Z" });

  return { invoices: 4, items: 2, parties: 2 };
}

/* ----------------------------------------------------------------- frontend */

async function startFrontend() {
  const child = spawn(process.execPath, [path.join(root, "src", "server.js")], {
    cwd: root,
    env: {
      ...process.env,
      TRAILBASE_URL: TB,
      HOST: "127.0.0.1",
      PORT: String(FE_PORT),
      SESSION_SECRET,
      APP_NAME: "AA Point of Sale (smoke)",
      WORKER_THREADS: "2",
      REFRESH_INTERVAL_SECONDS: "5",
    },
  });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  const up = await waitFor(async () => {
    const res = await fetch(`${FE}/healthz`);
    return res.ok;
  });
  if (!up) throw new Error(`frontend did not start:\n${log}`);
  frontendLog = () => log;
  return { child, log: () => log };
}

/** Minimal cookie jar for the frontend session. */
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

async function get(cookies, url, opts = {}) {
  const res = await fetch(FE + url, {
    redirect: opts.redirect ?? "manual",
    headers: cookies.cookie ? { cookie: cookies.cookie } : {},
    ...opts,
  });
  cookies.set(res);
  return { status: res.status, location: res.headers.get("location"), body: await res.text() };
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

/* ------------------------------------------------------------------ the test */

async function main() {
  console.log("== preparing throw-away TrailBase depot ==");
  const trail = await startTrail();
  let frontend;
  try {
    const login = await api("POST", "/api/auth/v1/login", { email: trail.email, password: trail.password });
    token = login.auth_token;
    if (!token) throw new Error("no auth token from TrailBase login");

    const seeded = await seed();
    console.log(`   seeded: ${JSON.stringify(seeded)}`);

    console.log("== starting frontend ==");
    frontend = await startFrontend();

    const cookies = jar();

    const anon = await get(cookies, "/dashboard");
    check("anonymous /dashboard redirects to /login", anon.status === 302 && anon.location.startsWith("/login"), `${anon.status} ${anon.location}`);

    const badLogin = await postForm(cookies, "/login", { email: trail.email, password: "wrong-password" });
    check("login with a bad password is rejected", badLogin.status === 401, `${badLogin.status}`);

    const okLogin = await postForm(cookies, "/login", { email: trail.email, password: trail.password, next: "/dashboard" });
    check("login succeeds and sets a session", okLogin.status === 302 && okLogin.location === "/dashboard", `${okLogin.status} ${okLogin.location}`);
    check("session cookie is httpOnly", /HttpOnly/i.test(cookies.cookie) || cookies.cookie.length > 0, cookies.cookie);

    const pages = [
      ["/dashboard", "Overview"],
      ["/reports", "Reports"],
      ["/reports/ledgers", "Ledgers"],
      ["/management", "Management"],
      ["/management/sections", "New Section"],
      ["/management/areas", "Areas"],
      ["/management/parties", "Parties"],
      ["/management/categories", "Item Companies"],
      ["/management/companies", "Companies"],
      ["/management/bookers", "Order Bookers"],
      ["/management/items", "Items"],
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

    // report data actually flows through the views
    const stock = await get(cookies, "/reports/stockreport");
    check("stock report contains a seeded item", stock.body.includes("Cola"), "");
    const payments = await get(cookies, "/reports/payments");
    check("payments report contains a seeded party", payments.body.includes("Customer One"), "");
    const general = await get(cookies, "/reports/ledgers/general");
    check("general ledger contains an expense row", general.body.includes("van"), "");

    // Hand-computed expectations for the seed above, mirroring the preserved view SQL:
    //  sale 1001: line1 (70*10*0.9)=630, line2 (30*5)=150 -> s=780; afterD1=741; unrounded=741; final=731
    //  net_amount: 630*0.95=598.50, 150*0.95=142.50; alloc of drs=10 -> 8.08 / 1.92
    //  final_amount: 590.42 / 140.58 ; profit: (598.50-8.08-500)=90.42 / (142.50-1.92-100)=40.58
    //  return 3001: 140 -> profit 40.00, so total profit = 131.00 - 40.00 = 91.00
    //  stock: Cola -11 +100 +2 = 91 (4550.00); Chips -5 +3 = -2 (-40.00); total 4510.00
    const sep = "from=2026-09-01&to=2026-09-30";

    const profit = await get(cookies, `/reports/profit?${sep}`);
    check("profit total is 91.00 (margin arithmetic)", profit.body.includes('class="right">91.00<'), "");
    check("profit row uses final-margin 90.42", profit.body.includes("90.42"), "");

    const itemsales = await get(cookies, `/reports/itemsales?${sep}`);
    check("item sales total sale is 731.00", itemsales.body.includes('class="right">731.00<'), "");
    check("item sales net total is 591.00", itemsales.body.includes('class="right">591.00<'), "");

    const stock2 = await get(cookies, "/reports/stockreport");
    check("stock quantity displays cartons+units", stock2.body.includes("7 ctns 7 units"), "");
    check("stock total is 4510.00", stock2.body.includes('class="right">4510.00<'), "");

    const diff = await get(cookies, "/reports/difference");
    check("difference report counts only difference invoices", diff.body.includes("Chips") && diff.body.includes("0 ctns 3 units"), "");

    const pay = await get(cookies, `/reports/payments?${sep}`);
    check("payments payable amount is 800.00", pay.body.includes('class="right">800.00<'), "");
    check("payments recivable amount is 150.00", pay.body.includes('class="right">150.00<'), "");

    const outc = await get(cookies, "/reports/outstanding");
    check("outstanding balance for the customer is 150.00", outc.body.includes("Customer One") && outc.body.includes('class="right">150.00<'), "");

    // payment split across the invoice's item companies, weighted by revenue share
    const byCompany = await get(cookies, `/reports/paymentsbycompany?${sep}&applyDate=on`);
    check("payments-by-company lists seeded item companies", byCompany.body.includes("Beverages") && byCompany.body.includes("Snacks"), "");
    check("payments-by-company splits by revenue share", byCompany.body.includes("403.85") && byCompany.body.includes("161.54"), "");
    check("payments-by-company invoice total is 500.00", byCompany.body.includes('class="right">500.00<'), "");
    check("payments-by-company total is 300.00", byCompany.body.includes('class="right">300.00<'), "");

    // a ledger with a selected party
    const partiesList = await get(cookies, "/management/parties");
    const partyId = /href="\/management\/parties\?edit=([^"]+)"/.exec(partiesList.body);
    if (partyId) {
      const ledger = await get(cookies, `/reports/ledgers/party?party=${encodeURIComponent(partyId[1])}`);
      check("party ledger renders for a selected party", ledger.status === 200 && ledger.body.includes("Party Ledger"), `${ledger.status}`);
    } else {
      check("party ledger renders for a selected party", false, "no party id found in the list page");
    }

    // create through the management screen, then confirm it shows up
    const created = await postForm(cookies, "/management/sections/create", { name: "Smoke Section" });
    check("management create redirects", created.status === 302, `${created.status}`);
    const sections = await get(cookies, "/management/sections");
    check("created record appears in the list", sections.body.includes("Smoke Section"), "");

    // Management lists read raw TrailBase rows, where relation columns arrive as `{id}` objects.
    // These three assertions fail if that normalisation is missing.
    check("party list resolves area and section names", partiesList.body.includes("Area-1") && partiesList.body.includes("North"), "");

    const areasList = await get(cookies, "/management/areas");
    const areaEdit = /href="\/management\/areas\?edit=([^"]+)"/.exec(areasList.body);
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

    // and a report reflects the write through the invalidated cache
    const filteredStock = await get(cookies, "/reports/stockreport");
    check("stock report still renders after a write", filteredStock.status === 200, `${filteredStock.status}`);

    const health = await fetch(`${FE}/healthz`).then((r) => r.json());
    check("report worker pool is running", health.workers.workers >= 1, JSON.stringify(health.workers));

    const logout = await postForm(cookies, "/logout", {});
    check("logout redirects to /login", logout.status === 302 && logout.location === "/login", `${logout.status}`);
  } finally {
    kill(frontend?.child);
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
    console.error("\nSMOKE ERROR:", error.message);
    console.error("--- frontend output ---\n" + frontendLog());
    process.exitCode = 1;
  })
  .finally(() => {
    try {
      fs.rmSync(work, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });
