// Definitive parity test: for each report, read the page's applied filters,
// replay them as query params on the legacy route, then compare rows + totals.
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
    const td = tr.querySelector('td'); return td ? td.textContent.trim() : null;
  }).filter(Boolean);
  const pageTotals = Array.from(document.querySelectorAll('[data-total-key]')).map((e) => e.textContent.trim());
  return JSON.stringify({ rowsMeta, bodyRows: document.querySelectorAll('table.data tbody tr').length,
    pageStatus: t('[data-page-status]'), totals: totalsPairs.concat(pageTotals) });
})()`;

async function waitReady(ws, sid) {
  const d = Date.now() + 45000;
  while (Date.now() < d) { if ((await ev(ws, sid, "document.readyState")) === "complete") break; await sleep(250); }
  await sleep(500);
  if (await ev(ws, sid, "!!document.querySelector('[data-page-status]')")) {
    const d2 = Date.now() + 90000;
    while (Date.now() < d2) {
      const s = await ev(ws, sid, "(document.querySelector('[data-page-status]')||{}).textContent || ''");
      if (s && !/Fetching|Loading/i.test(s)) break;
      await sleep(400);
    }
  }
}

async function main() {
  const lines = fs.readFileSync(process.argv[2], "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const ws = await connect(wsUrl());
  const targetId = fs.readFileSync(STATE, "utf8").trim();
  const { sessionId } = await rpc(ws, "Target.attachToTarget", { targetId, flatten: true });
  await rpc(ws, "Page.enable", {}, sessionId); await rpc(ws, "Runtime.enable", {}, sessionId);
  await rpc(ws, "Log.enable", {}, sessionId); await rpc(ws, "Network.enable", {}, sessionId);

  let pass = 0, fail = 0;
  for (const line of lines) {
    const [legacyPath, pagePath, autoField] = line.split("\t");
    events = [];
    await rpc(ws, "Page.navigate", { url: BASE + pagePath }, sessionId);
    await waitReady(ws, sessionId);
    if (autoField) {
      const chosen = await ev(ws, sessionId, `(() => { const sel = document.querySelector('[data-filter][name="${autoField}"]'); if (!sel) return null; const opt = Array.from(sel.options).find((o) => o.value); if (!opt) return null; sel.value = opt.value; const f = document.querySelector('form[data-page-filters]'); f.requestSubmit(); return opt.value + ' ' + opt.textContent; })()`);
      console.log(`      auto-selected ${autoField}: ${chosen}`);
      await waitReady(ws, sessionId);
    }
    const filtersJson = await ev(ws, sessionId, `JSON.stringify(Object.fromEntries(Array.from(document.querySelectorAll('[data-filter]')).map((e) => [e.name, e.type === 'checkbox' ? (e.checked ? 'on' : '') : e.value])))`);
    const b = JSON.parse((await ev(ws, sessionId, PROBE)) || "{}");
    const filters = JSON.parse(filtersJson || "{}");
    const qsParams = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v !== "" && v !== null && v !== undefined) qsParams.set(k, v);
    const legacyUrl = BASE + legacyPath + (qsParams.toString() ? "?" + qsParams.toString() : "");
    await rpc(ws, "Page.navigate", { url: legacyUrl }, sessionId);
    await waitReady(ws, sessionId);
    const a = JSON.parse((await ev(ws, sessionId, PROBE)) || "{}");

    const norm = (arr) => (arr || []).flatMap((v) => String(v).split("/")).map((s) => s.trim()).filter((s) => s && s !== "0" && s !== "0.00").sort();
    const aRows = a.rowsMeta ? Number(a.rowsMeta.replace(/,/g, "")) : a.bodyRows;
    const bRows = (b.pageStatus || "").match(/([\d,]+) row/) ? Number(b.pageStatus.match(/([\d,]+) row/)[1].replace(/,/g, "")) : b.bodyRows;
    const aT = norm(a.totals), bT = norm(b.totals);
    const rowsOk = aRows === bRows;
    const totalsOk = JSON.stringify(aT) === JSON.stringify(bT);
    const ok = rowsOk && totalsOk;
    ok ? pass++ : fail++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${legacyPath}`);
    console.log(`      filters applied on legacy: ${qsParams.toString() || "(none)"}`);
    console.log(`      rows legacy=${aRows} page=${bRows} ${rowsOk ? "ok" : "<<< ROW MISMATCH"}`);
    console.log(`      totals legacy: ${JSON.stringify(a.totals)}`);
    console.log(`      totals page:   ${JSON.stringify(b.totals)}  ${totalsOk ? "ok" : "<<< TOTAL MISMATCH"}`);
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  ws.close();
}
main().then(() => process.exit(0)).catch((e) => { console.error("ERROR: " + e.message); process.exit(1); });
