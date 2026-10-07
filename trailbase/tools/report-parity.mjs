/**
 * Browser-driven report + print parity capture, both systems, real pages in headless Chrome.
 *
 *   node trailbase/tools/report-parity.mjs [--out DIR] [--from 2001-01-01] [--to 2026-10-06]
 *     [--legacy-token-file FILE] [--only substring] [--reports|--print]
 *
 * Unlike `report-sweep.mjs` (which replays HTTP), this loads the ACTUAL pages and measures how long a
 * person waits to see rendered rows, then screenshots both apps for the same date window. The guest
 * gets the window as a query string; the legacy app has no URL persistence, so its Mantine DateInput
 * is typed into after load.
 *
 * The legacy arm needs a PocketBase session. It is seeded from a token JSON file (the operator's own
 * session), so no password is stored here.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(n);
const OUT = arg("--out", join(HERE, "..", "..", "vault", "attachments", "report-parity-2026-10-06"));
const FROM = arg("--from", "2001-01-01");
const TO = arg("--to", "2026-10-06");
const ONLY = arg("--only", "");
const CHROME = arg("--chrome", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
const PORT = Number(arg("--port", "9360"));
const WIDTH = 1600, HEIGHT = 1000;
const GUEST = arg("--guest", "http://127.0.0.1:4000");
const LEGACY = arg("--legacy", "http://127.0.0.1:3000");
const EMAIL = arg("--email", "admin@localhost");
const PASSWORD = arg("--password", "administrator-0ne");
const TOKEN_FILE = arg("--legacy-token-file", "");
const SAMPLE_INVOICE_GUEST = arg("--guest-invoice", "AaERlVsadRmvOsm8ACCaYw");
const SAMPLE_INVOICE_LEGACY = arg("--legacy-invoice", "pos000000008606");

const LEGACY_LEGACYFROM = "January 1, 2001"; // any date before the data; parsed loosely by Mantine

const REPORTS = [
  { name: "payments", guest: "/reports/payments", legacy: "/app/reports/payments" },
  { name: "salesreport", guest: "/reports/salesreport", legacy: "/app/reports/salesreport" },
  { name: "paymentsbycompany", guest: "/reports/paymentsbycompany", legacy: "/app/reports/paymentsbycompany" },
  { name: "itemsales", guest: "/reports/itemsales", legacy: "/app/reports/transactions/unified" },
  { name: "productsale", guest: "/reports/productsale", legacy: "/app/reports/productsale" },
  { name: "profit", guest: "/reports/profit", legacy: "/app/reports/profit" },
  { name: "stockreport", guest: "/reports/stockreport", legacy: "/app/reports/stockreport" },
  { name: "difference", guest: "/reports/difference", legacy: "/app/reports/difference" },
  { name: "outstanding", guest: "/reports/outstanding", legacy: "/app/reports/outstanding" },
  { name: "dailysale", guest: "/reports/dailysale", legacy: "/app/reports/dailysale" },
  { name: "ledgers-party", guest: "/reports/ledgers/party", legacy: "/app/reports/ledgers/party" },
  { name: "ledgers-booker", guest: "/reports/ledgers/booker", legacy: "/app/reports/ledgers/booker" },
  { name: "ledgers-area", guest: "/reports/ledgers/area", legacy: "/app/reports/ledgers/area" },
  { name: "ledgers-general", guest: "/reports/ledgers/general", legacy: "/app/reports/ledgers/general" },
];

const STRUCTURE = `(function () {
  var txt = function (el) { return (el.innerText || el.textContent || "").replace(/\\s+/g, " ").trim(); };
  var vis = function (el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  var take = function (l, n) { return l.filter(Boolean).slice(0, n); };
  var main = document.querySelector("main, [role=main], .mantine-AppShell-main") || document.body;
  return {
    url: location.pathname + location.search,
    title: document.title,
    status500: /something went wrong|500|internal error|deadline|timed out/i.test(document.body.innerText) && document.querySelectorAll("tbody tr").length === 0,
    headings: take([...document.querySelectorAll("h1,h2,h3,h4")].filter(vis).map(function (e) { return e.tagName + " " + txt(e).slice(0, 48); }), 12),
    tableHeaders: take([...document.querySelectorAll("thead th, thead td, th")].filter(vis).map(txt), 24),
    rowCount: document.querySelectorAll("tbody tr").length,
    firstRow: (function () { var r = document.querySelector("tbody tr"); return r ? txt(r).slice(0, 220) : ""; })(),
    totals: take([...document.querySelectorAll(".report-meta, .report-opening, [data-total], tfoot tr, .stat-value")].filter(vis).map(function (e) { return txt(e).slice(0, 140); }), 12),
    text: main ? txt(main).slice(0, 4000) : "",
  };
})()`;

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); this.inflight = 0; this.seen = 0; }
  static async attach(port) {
    let target = null;
    for (let i = 0; i < 80 && !target; i++) {
      try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); target = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl); } catch {}
      if (!target) await new Promise((r) => setTimeout(r, 250));
    }
    if (!target) throw new Error("chrome did not expose a debuggable page");
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener("open", res, { once: true }); ws.addEventListener("error", rej, { once: true }); });
    const cdp = new CDP(ws);
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      if (m.id && cdp.waiting.has(m.id)) { const w = cdp.waiting.get(m.id); cdp.waiting.delete(m.id); m.error ? w.reject(new Error(JSON.stringify(m.error))) : w.resolve(m.result); return; }
      if (m.method === "Network.requestWillBeSent") { cdp.inflight++; cdp.seen++; }
      else if (m.method === "Network.loadingFinished" || m.method === "Network.loadingFailed") cdp.inflight = Math.max(0, cdp.inflight - 1);
    });
    return cdp;
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.waiting.has(id)) { this.waiting.delete(id); reject(new Error(`${method} timed out`)); } }, 45000);
    });
  }
  async ev(expression) {
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval failed");
    return r.result.value;
  }
  async goto(url) { await this.send("Page.navigate", { url }); }
  async keys(text, enter = true) {
    await this.send("Input.insertText", { text });
    if (enter) { await this.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); await this.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); }
  }
}

// A "settled" page is one whose in-flight request count has been zero for `quietMs`, after at least
// `minRequests`. The legacy app fetches whole views, so its budget is minutes.
async function settle(cdp, { quietMs = 2500, budgetMs = 60000, minRequests = 1 } = {}) {
  const start = Date.now(), deadline = start + budgetMs;
  let quietSince = null;
  while (Date.now() < deadline) {
    if (cdp.inflight === 0 && cdp.seen >= minRequests) {
      if (quietSince === null) quietSince = Date.now();
      if (Date.now() - quietSince >= quietMs) return { settled: true, requests: cdp.seen, waitedMs: Date.now() - start };
    } else quietSince = null;
    await new Promise((r) => setTimeout(r, 250));
  }
  return { settled: false, requests: cdp.seen, waitedMs: budgetMs };
}

const index = [];
async function snap(cdp, system, name, label) {
  let structure = null;
  try { structure = await cdp.ev(STRUCTURE); } catch (e) { structure = { error: e.message }; }
  // Viewport only, on purpose: a legacy report renders tens of thousands of rows, so a full-page
  // capture would be a multi-hundred-thousand-pixel image. The top of the report is what is compared.
  const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, system, `${name}.png`), Buffer.from(shot.data, "base64"));
  writeFileSync(join(OUT, system, `${name}.json`), JSON.stringify(structure, null, 2) + "\n");
  console.log(`  ${system.padEnd(7)} ${name.padEnd(20)} rows=${String(structure?.rowCount ?? "-").padStart(6)} th=${String(structure?.tableHeaders?.length ?? "-").padStart(3)} ${label}`);
}

mkdirSync(join(OUT, "guest"), { recursive: true });
mkdirSync(join(OUT, "legacy"), { recursive: true });
const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "rp-"))}`, "--headless=new", "--no-first-run", "--disable-gpu", `--window-size=${WIDTH},${HEIGHT}`, "--force-device-scale-factor=1", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });

async function waitFor(cdp, expr, tries = 80, step = 200) {
  for (let i = 0; i < tries; i++) { const ok = await cdp.ev(expr).catch(() => false); if (ok) return true; await new Promise((r) => setTimeout(r, step)); }
  return false;
}

try {
  const cdp = await CDP.attach(PORT);
  await cdp.send("Page.enable"); await cdp.send("Runtime.enable"); await cdp.send("Network.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });

  const doReports = !has("--print");
  const doPrint = !has("--reports");

  if (doReports) {
    console.log("guest reports:");
    await cdp.goto(`${GUEST}/login`);
    await waitFor(cdp, "!!document.querySelector('form.login')");
    await cdp.ev(`(function(){var f=document.querySelector("form.login");f.querySelector('input[name="email"]').value=${JSON.stringify(EMAIL)};f.querySelector('input[type="password"]').value=${JSON.stringify(PASSWORD)};f.querySelector('button[type="submit"]').click();})()`);
    await waitFor(cdp, "location.pathname && !location.pathname.includes('login')");
    // Warm every report once so the comparison is not measuring the very first cold SQLite hit.
    for (const r of REPORTS) { if (ONLY && !r.name.includes(ONLY)) continue; cdp.inflight = 0; cdp.seen = 0; await cdp.goto(`${GUEST}${r.guest}?from=${FROM}&to=${TO}`); await settle(cdp, { budgetMs: 60000 }); }
    for (const r of REPORTS) {
      if (ONLY && !r.name.includes(ONLY)) continue;
      cdp.inflight = 0; cdp.seen = 0;
      const t0 = Date.now();
      await cdp.goto(`${GUEST}${r.guest}?from=${FROM}&to=${TO}`);
      await waitFor(cdp, "document.documentElement.getAttribute('data-hk-ready')==='1'", 120);
      let q = await settle(cdp, { budgetMs: 60000 });
      let ms = Date.now() - t0;
      let st = await cdp.ev(STRUCTURE).catch(() => ({}));
      if (st && st.rowCount === 0 && st.tableHeaders && st.tableHeaders.length === 0) { // one warm retry
        cdp.inflight = 0; cdp.seen = 0; await cdp.goto(`${GUEST}${r.guest}?from=${FROM}&to=${TO}`); q = await settle(cdp, { budgetMs: 60000 }); ms = Date.now() - t0;
      }
      await snap(cdp, "guest", r.name, `${(ms / 1000).toFixed(1)}s settled=${q.settled} req=${q.requests}`);
      index.push({ system: "guest", name: r.name, url: `${GUEST}${r.guest}`, ms, settled: q.settled, requests: q.requests });
    }

    console.log("legacy reports:");
    if (!TOKEN_FILE || !existsSync(TOKEN_FILE)) throw new Error("--legacy-token-file is required for the legacy arm");
    const token = readFileSync(TOKEN_FILE, "utf8").trim();
    await cdp.goto(`${LEGACY}/app/dashboard`);
    await cdp.ev(`localStorage.setItem('pocketbase_auth', ${JSON.stringify(token)})`);
    for (const r of REPORTS) {
      if (ONLY && !r.name.includes(ONLY)) continue;
      cdp.inflight = 0; cdp.seen = 0;
      const t0 = Date.now();
      await cdp.goto(`${LEGACY}${r.legacy}`);
      // Reports differ: most have Mantine DateInputs, some (difference, stock) have none. Wait for
      // either a date filter or the table itself, then set the window only when there is one.
      await waitFor(cdp, "document.querySelectorAll('input.mantine-DateInput-input').length>=1 || document.querySelectorAll('thead th, thead td').length>=1", 160, 300);
      const hadDate = await cdp.ev("document.querySelectorAll('input.mantine-DateInput-input').length>=1").catch(() => false);
      if (hadDate) {
        // Type the full-ledger lower bound into the first DateInput (Mantine commits on Enter).
        await cdp.ev(`(function(){var e=document.querySelector('input.mantine-DateInput-input');e.focus();e.select();})()`);
        await cdp.keys(LEGACY_LEGACYFROM, true);
      }
      const q = await settle(cdp, { budgetMs: 480000, quietMs: 3000 });
      const ms = Date.now() - t0;
      await snap(cdp, "legacy", r.name, `${(ms / 1000).toFixed(1)}s settled=${q.settled} req=${q.requests}`);
      index.push({ system: "legacy", name: r.name, url: `${LEGACY}${r.legacy}`, ms, settled: q.settled, requests: q.requests });
    }
  }

  if (doPrint) {
    console.log("print preview:");
    // Guest print preview: the standalone document in print mode (`?print=1` drops the nav, A5).
    cdp.inflight = 0; cdp.seen = 0;
    let t0 = Date.now();
    const guestPrint = `${GUEST}/invoices/${SAMPLE_INVOICE_GUEST}/view?print=1&paper=a5`;
    await cdp.goto(guestPrint);
    await settle(cdp, { budgetMs: 60000 });
    await snap(cdp, "guest", "print-invoice", `${((Date.now() - t0) / 1000).toFixed(1)}s`);
    index.push({ system: "guest", name: "print-invoice", url: guestPrint, ms: Date.now() - t0 });

    // "View Invoice" on /app/invoices/printinvoice opens a new tab at /app/invoices/print?invoiceId=<pbId>,
    // which is the real print preview. Going straight to that URL is the same page without the form.
    cdp.inflight = 0; cdp.seen = 0;
    t0 = Date.now();
    await cdp.goto(`${LEGACY}/app/invoices/print?invoiceId=${SAMPLE_INVOICE_LEGACY}`);
    const q = await settle(cdp, { budgetMs: 120000 });
    await snap(cdp, "legacy", "print-invoice", `${((Date.now() - t0) / 1000).toFixed(1)}s settled=${q.settled}`);
    index.push({ system: "legacy", name: "print-invoice", url: `${LEGACY}/app/invoices/print?invoiceId=${SAMPLE_INVOICE_LEGACY}`, ms: Date.now() - t0 });
  }

  writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2) + "\n");
  console.log(`\nwrote ${index.length} captures to ${OUT}`);
} catch (e) {
  console.error("report-parity failed:", e.message);
  writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2) + "\n");
  process.exitCode = 1;
} finally {
  chrome.kill();
}
