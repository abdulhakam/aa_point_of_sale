// Paired legacy-route vs declarative-page comparison (row counts + totals).
// Usage: node compare.mjs <pairs-file>   (lines: /reports/x<TAB>/p/reports/x)
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const STATE = path.join(ROOT, "e2e-logs", "cdp-target.txt");
const PROFILE = path.join(os.homedir(), "AppData", "Local", "Google", "Chrome", "User Data", "DevToolsActivePort");
const BASE = "http://127.0.0.1:3100";

function wsUrl() { const r = fs.readFileSync(PROFILE, "utf8").split(/\r?\n/); return `ws://127.0.0.1:${r[0].trim()}${r[1].trim()}`; }
let nextId = 0; const pending = new Map(); let events = [];
function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", () => reject(new Error("ws error")));
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
      else if (m.method) events.push(m);
    });
  });
}
function rpc(ws, method, params = {}, sid) { const id = ++nextId; const msg = { id, method, params }; if (sid) msg.sessionId = sid;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify(msg)); setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error("timeout " + method)); } }, 60000); }); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function ev(ws, sid, expr) { const r = await rpc(ws, "Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) return null; return r.result.value; }

const PROBE = `(() => {
  const t = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim().replace(/\\s+/g, ' ') : null; };
  const meta = t('.report-meta');
  const rowsMeta = meta && (meta.match(/Rows:\\s*([\\d,]+)/) || [])[1] || null;
  const totalsPairs = Array.from(document.querySelectorAll('.totals-table tr')).map((tr) => {
    const th = tr.querySelector('th'), td = tr.querySelector('td');
    return th && td ? th.textContent.trim() + '=' + td.textContent.trim() : null;
  }).filter(Boolean);
  const pageTotals = Array.from(document.querySelectorAll('[data-total-key]')).map((e) => e.getAttribute('data-total-key') + '=' + e.textContent.trim());
  return JSON.stringify({
    heading: t('h1.page-title') || t('h1'),
    bodyRows: document.querySelectorAll('table.data tbody tr').length,
    rowsMeta, pageStatus: t('[data-page-status]'),
    totalsPairs: totalsPairs.slice(0, 10), pageTotals: pageTotals.slice(0, 10),
  });
})()`;

async function measure(ws, sid, url) {
  events = [];
  await rpc(ws, "Page.navigate", { url }, sid);
  const d = Date.now() + 45000;
  while (Date.now() < d) { if ((await ev(ws, sid, "document.readyState")) === "complete") break; await sleep(250); }
  await sleep(600);
  if (await ev(ws, sid, "!!document.querySelector('[data-page-status]')")) {
    const d2 = Date.now() + 90000;
    while (Date.now() < d2) {
      const s = await ev(ws, sid, "(document.querySelector('[data-page-status]')||{}).textContent || ''");
      if (s && !/Fetching|Loading/i.test(s)) break;
      await sleep(400);
    }
  }
  const p = JSON.parse((await ev(ws, sid, PROBE)) || "{}");
  p.errs = events.filter((e) => e.method === "Runtime.exceptionThrown" || (e.method === "Log.entryAdded" && e.params.entry.level === "error")).length;
  return p;
}

async function main() {
  const lines = fs.readFileSync(process.argv[2], "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const ws = await connect(wsUrl());
  const targetId = fs.readFileSync(STATE, "utf8").trim();
  const { sessionId } = await rpc(ws, "Target.attachToTarget", { targetId, flatten: true });
  await rpc(ws, "Page.enable", {}, sessionId); await rpc(ws, "Runtime.enable", {}, sessionId);
  await rpc(ws, "Log.enable", {}, sessionId); await rpc(ws, "Network.enable", {}, sessionId);

  for (const line of lines) {
    const [legacy, pageUrl] = line.split("\t");
    const a = await measure(ws, sessionId, BASE + legacy);
    const b = await measure(ws, sessionId, BASE + pageUrl);
    const aRows = a.rowsMeta ? Number(a.rowsMeta.replace(/,/g, "")) : a.bodyRows;
    const bRows = (b.pageStatus || "").match(/([\d,]+) row/) ? Number(b.pageStatus.match(/([\d,]+) row/)[1].replace(/,/g, "")) : b.bodyRows;
    const sameRows = aRows === bRows;
    console.log(`== ${legacy}  vs  ${pageUrl}`);
    console.log(`   rows: legacy=${aRows} page=${bRows} ${sameRows ? "MATCH" : "*** DIFFER ***"}`);
    console.log(`   legacy totals: ${JSON.stringify(a.totalsPairs)}`);
    console.log(`   page   totals: ${JSON.stringify(b.pageTotals)}`);
    console.log(`   errors: legacy=${a.errs} page=${b.errs}  pageStatus='${b.pageStatus}'`);
  }
  ws.close();
}
main().then(() => process.exit(0)).catch((e) => { console.error("ERROR: " + e.message); process.exit(1); });
