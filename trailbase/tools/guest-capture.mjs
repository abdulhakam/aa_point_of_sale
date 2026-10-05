/**
 * Capture the guest at the legacy reference's viewport, so the two can be compared side by side.
 *
 *   node trailbase/tools/guest-capture.mjs [--out DIR] [--only substring]
 *
 * The legacy reference ([[legacy-ui-reference-captures]]) was taken at 1600x900 on 2026-09-27, so this
 * uses the same viewport: a screenshot at a different size is not comparable, and every visual
 * difference it produced would be the viewport's fault rather than the guest's.
 *
 * Alongside each screenshot it writes a `.structure.json` — the screen's headings, tile labels, button
 * texts, table headers, form labels, rail items and a few computed metrics. Pixels say "it looks
 * different"; the structure says which label, which column, which control — the actionable half of a
 * discrepancy.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://127.0.0.1:4000");
const OUT = arg("--out", join(HERE, "..", "..", "vault", "attachments", "guest-ui"));
const ONLY = arg("--only", "");
const CHROME = arg("--chrome", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
const PORT = Number(arg("--port", "9351"));
const WIDTH = 1600, HEIGHT = 900;

/** guest route -> the legacy capture it is compared against. */
const SCREENS = [
  ["login", "/login", "01-login.png"],
  ["dashboard", "/dashboard", "02-dashboard.png"],
  ["reports", "/reports", "03-reports.png"],
  ["reports-payments", "/reports/payments?from=2024-01-01&to=2026-10-04", "04-reports-payments.png"],
  ["reports-salesreport", "/reports/salesreport?from=2024-01-01&to=2026-10-04", "06-reports-salesreport.png"],
  ["reports-paymentsbycompany", "/reports/paymentsbycompany?from=2024-01-01&to=2026-10-04", "07-reports-paymentsbycompany.png"],
  ["reports-itemsales", "/reports/itemsales?from=2024-01-01&to=2026-10-04", "08-reports-itemsales.png"],
  ["reports-profit", "/reports/profit?from=2024-01-01&to=2026-10-04", "09-reports-profit.png"],
  ["reports-stockreport", "/reports/stockreport?from=2024-01-01&to=2026-10-04", "10-reports-stockreport.png"],
  ["reports-difference", "/reports/difference?from=2024-01-01&to=2026-10-04", "12-reports-difference.png"],
  ["reports-outstanding", "/reports/outstanding?from=2024-01-01&to=2026-10-04", "13-reports-outstanding.png"],
  ["reports-dailysale", "/reports/dailysale?from=2024-01-01&to=2026-10-04", "15-reports-dailysale.png"],
  ["ledgers", "/reports/ledgers", "16-reports-ledgers.png"],
  ["ledgers-party", "/reports/ledgers/party?from=2024-01-01&to=2026-10-04", "17-ledgers-party.png"],
  ["ledgers-booker", "/reports/ledgers/booker?from=2024-01-01&to=2026-10-04", "18-ledgers-booker.png"],
  ["ledgers-area", "/reports/ledgers/area?from=2024-01-01&to=2026-10-04", "19-ledgers-area.png"],
  ["ledgers-general", "/reports/ledgers/general?from=2024-01-01&to=2026-10-04", "20-ledgers-general.png"],
  ["management", "/management", "21-management.png"],
  ["management-sections", "/management/sections", "22-management-sections.png"],
  ["management-areas", "/management/areas", "23-management-areas.png"],
  ["management-categories", "/management/companies", "24-management-categories.png"],
  ["management-parties", "/management/parties", "25-management-parties.png"],
  ["management-bookers", "/management/bookers", "26-management-bookers.png"],
  ["management-items", "/management/items", "27-management-items.png"],
  ["invoices", "/invoices", "28-invoices.png"],
  ["invoices-new", "/invoices/new", "29-invoices-purchase.png"],
  ["cashmemo", "/cashmemo", "35-cashmemo.png"],
  ["cashmemo-vouchers", "/cashmemo/vouchers", "36-cashmemo-payment-vouchers.png"],
  ["cashmemo-da", "/cashmemo/da", "38-cashmemo-da-entry.png"],
  ["cashmemo-expenses", "/cashmemo/expenses", "39-cashmemo-expenses.png"],
  ["payments", "/payments", "40-cashmemo-payments.png"],
  ["print", "/print", "34-invoices-print.png"],
];

const STRUCTURE = `(function () {
  var t = function (el) { return (el.innerText || el.textContent || "").replace(/\\s+/g, " ").trim(); };
  var css = function (el, prop) { return getComputedStyle(el)[prop]; };
  var first = function (sel) { return document.querySelector(sel); };
  var brand = first(".header-brand") || first(".brand");
  var tiles = [...document.querySelectorAll(".tile, .stat-tile, .hub-tile, .card .stat")];
  return {
    path: location.pathname + location.search,
    title: document.title,
    brand: brand ? t(brand) : null,
    rail: [...document.querySelectorAll("nav.navbar a.nav-link")].map(function (a) { return a.getAttribute("title") || t(a); }),
    railIcons: [...document.querySelectorAll("nav.navbar a.nav-link svg")].length,
    headings: [...document.querySelectorAll("h1, h2, h3")].map(function (e) { return e.tagName + " " + t(e).slice(0, 48); }),
    tileLabels: tiles.map(function (e) { return t(e).slice(0, 32); }),
    buttons: [...document.querySelectorAll("button, .btn")].map(t).filter(Boolean).slice(0, 14),
    links: [...document.querySelectorAll("main a")].map(t).filter(Boolean).slice(0, 14),
    tableHeaders: [...document.querySelectorAll("main th")].map(t).filter(Boolean).slice(0, 16),
    formLabels: [...document.querySelectorAll("main label .field span, main label span, main .field > span")].map(t).filter(Boolean).slice(0, 16),
    inputs: [...document.querySelectorAll("main input, main select, main textarea")].map(function (e) { return e.name || e.type; }).slice(0, 16),
    rowCount: document.querySelectorAll("main table tbody tr").length,
    metrics: {
      headerHeight: (function () { var h = first(".header"); return h ? Math.round(h.getBoundingClientRect().height) : null; })(),
      railWidth: (function () { var n = first("nav.navbar"); return n ? Math.round(n.getBoundingClientRect().width) : null; })(),
      bodyFont: css(document.body, "fontFamily"),
      bodySize: css(document.body, "fontSize"),
      bodyBg: css(document.body, "backgroundColor"),
      linkColor: (function () { var a = first("main a"); return a ? css(a, "color") : null; })(),
      cardBorder: (function () { var c = first(".card"); return c ? css(c, "border") : null; })(),
      tableBorder: (function () { var th = first("main th"); return th ? css(th, "borderBottom") : null; })(),
    },
  };
})()`;

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); }
  static async attach(port) {
    let target = null;
    for (let i = 0; i < 80 && !target; i++) {
      try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); target = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl); } catch { /* not up */ }
      if (!target) await new Promise((r) => setTimeout(r, 250));
    }
    if (!target) throw new Error("chrome did not expose a debuggable page");
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener("open", res, { once: true }); ws.addEventListener("error", rej, { once: true }); });
    const cdp = new CDP(ws);
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      if (m.id && cdp.waiting.has(m.id)) { const w = cdp.waiting.get(m.id); cdp.waiting.delete(m.id); m.error ? w.reject(new Error(JSON.stringify(m.error))) : w.resolve(m.result); }
    });
    return cdp;
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.waiting.has(id)) { this.waiting.delete(id); reject(new Error(`${method} timed out`)); } }, 40000);
    });
  }
  async ev(expression) {
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval failed");
    return r.result.value;
  }
  async goto(path) {
    await new Promise((r) => setTimeout(r, 900));
    await this.send("Page.navigate", { url: BASE + path });
    await new Promise((r) => setTimeout(r, 900));
  }
}

mkdirSync(OUT, { recursive: true });
const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "gc-"))}`, "--headless=new", "--no-first-run", "--disable-gpu", `--window-size=${WIDTH},${HEIGHT}`, "--force-device-scale-factor=1", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });

try {
  const cdp = await CDP.attach(PORT);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });

  await cdp.goto("/login");
  for (let i = 0; i < 60; i++) { if (await cdp.ev("!!document.querySelector('form.login')").catch(() => false)) break; await new Promise((r) => setTimeout(r, 100)); }
  await cdp.ev(`(function(){var f=document.querySelector("form.login");if(!f)return;f.querySelector('input[name="email"]').value=${JSON.stringify(arg("--email", "admin@localhost"))};f.querySelector('input[type="password"]').value=${JSON.stringify(arg("--password", "administrator-0ne"))};f.querySelector('button[type="submit"]').click();})()`);
  for (let i = 0; i < 60; i++) { const at = await cdp.ev("location.pathname").catch(() => null); if (at && !at.includes("login")) break; await new Promise((r) => setTimeout(r, 150)); }

  const index = [];
  for (const [name, route, legacy] of SCREENS) {
    if (ONLY && !name.includes(ONLY)) continue;
    await cdp.goto(route);
    for (let i = 0; i < 200; i++) { if (await cdp.ev("document.documentElement.getAttribute('data-hk-ready')==='1'").catch(() => false)) break; await new Promise((r) => setTimeout(r, 100)); }
    await new Promise((r) => setTimeout(r, 400));
    let structure = null;
    try { structure = await cdp.ev(STRUCTURE); } catch (e) { structure = { error: e.message }; }
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(shot.data, "base64"));
    writeFileSync(join(OUT, `${name}.structure.json`), JSON.stringify(structure, null, 2) + "\n");
    index.push({ name, route, legacy, rows: structure?.rowCount ?? null, headings: structure?.headings?.length ?? 0 });
    console.log(`  ${name.padEnd(28)} rows=${String(structure?.rowCount ?? "-").padStart(5)}  headings=${String(structure?.headings?.length ?? "-").padStart(3)}  vs ${legacy}`);
  }
  writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2) + "\n");
  console.log(`\n${index.length} screens captured at ${WIDTH}x${HEIGHT} into ${OUT}`);
} catch (error) {
  console.error("guest-capture could not run:", error.message);
  process.exitCode = 1;
} finally {
  chrome.kill();
}