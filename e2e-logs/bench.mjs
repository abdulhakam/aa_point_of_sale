// Benchmarks the legacy server-rendered route against the declarative page host on live data.
// Usage: node bench.mjs <cases-file.json>
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const STATE = path.join(ROOT, "e2e-logs", "cdp-target.txt");
const PROFILE = path.join(os.homedir(), "AppData", "Local", "Google", "Chrome", "User Data", "DevToolsActivePort");
const BASE = "http://127.0.0.1:3100";
const RUNS = 2;
const MARKER = `
  window.__readyAt = 0;
  const __t = setInterval(() => {
    const el = document.querySelector('[data-page-status]');
    if (el) {
      if (el.textContent && !/Fetching|Loading/i.test(el.textContent)) { window.__readyAt = performance.now(); clearInterval(__t); }
    } else if (document.readyState === 'complete') { window.__readyAt = performance.now(); clearInterval(__t); }
  }, 20);
  setTimeout(() => clearInterval(__t), 120000);
`;

function wsUrl() { const r = fs.readFileSync(PROFILE, "utf8").split(/\r?\n/); return `ws://127.0.0.1:${r[0].trim()}${r[1].trim()}`; }
let nextId = 0; const pending = new Map();
function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", () => reject(new Error("ws error")));
    ws.addEventListener("message", (e) => { const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
  });
}
function rpc(ws, method, params = {}, sid) { const id = ++nextId; const msg = { id, method, params }; if (sid) msg.sessionId = sid;
  return new Promise((res, rej) => { pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify(msg)); setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error("timeout " + method)); } }, 90000); }); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function ev(ws, sid, expr) { const r = await rpc(ws, "Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) return null; return r.result.value; }
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const kb = (n) => n ? (n / 1024).toFixed(0) : "0";

async function measure(ws, sid, url, isPage) {
  await rpc(ws, "Page.navigate", { url }, sid);
  const d = Date.now() + 120000;
  while (Date.now() < d) {
    const r = await ev(ws, sid, "window.__readyAt || 0");
    if (r > 0) break;
    await sleep(50);
  }
  const readyAt = await ev(ws, sid, "Math.round(window.__readyAt || 0)");
  await sleep(150);
  const nav = JSON.parse((await ev(ws, sid, `(() => { const n = performance.getEntriesByType('navigation')[0] || {}; return JSON.stringify({ ttfb: Math.round((n.responseStart||0)-(n.requestStart||0)), load: Math.round(n.loadEventEnd||0), transfer: n.transferSize||0, decoded: n.decodedBodySize||0 }); })()`)) || "{}");
  const runtime = isPage ? JSON.parse((await ev(ws, sid, "JSON.stringify(window.__page || {})")) || "{}") : {};
  const res = await ev(ws, sid, `(() => { const r = performance.getEntriesByType('resource').find((x) => x.name.includes('/data')); return r ? JSON.stringify({ transfer: r.transferSize, decoded: r.decodedBodySize, dur: Math.round(r.duration) }) : null; })()`);
  const dataRes = res ? JSON.parse(res) : {};
  const rows = isPage ? (runtime.rows || 0) : Number(((await ev(ws, sid, "(document.querySelector('.report-meta')||{}).textContent || ''")).match(/Rows:\s*([\d,]+)/) || [])[1]?.replace(/,/g, "") || 0);
  return { readyAt, nav, runtime, dataRes, rows };
}

async function main() {
  const cases = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const ws = await connect(wsUrl());
  const targetId = fs.readFileSync(STATE, "utf8").trim();
  const { sessionId } = await rpc(ws, "Target.attachToTarget", { targetId, flatten: true });
  await rpc(ws, "Page.enable", {}, sessionId); await rpc(ws, "Runtime.enable", {}, sessionId);
  await rpc(ws, "Network.enable", {}, sessionId);
  await rpc(ws, "Network.setCacheDisabled", { cacheDisabled: true }, sessionId);
  await rpc(ws, "Page.addScriptToEvaluateOnNewDocument", { source: MARKER }, sessionId);

  const out = [];
  for (const c of cases) {
    // default filters from the page, replayed on the legacy route for a same-view comparison
    await rpc(ws, "Page.navigate", { url: BASE + c.page }, sessionId); await sleep(200);
    const d = Date.now() + 60000;
    while (Date.now() < d) { if ((await ev(ws, sessionId, "document.readyState")) === "complete") break; await sleep(100); }
    const d2 = Date.now() + 90000;
    while (Date.now() < d2) { const s = await ev(ws, sessionId, "(document.querySelector('[data-page-status]')||{}).textContent || ''"); if (s && !/Fetching|Loading/i.test(s)) break; await sleep(60); }
    if (c.set) await ev(ws, sessionId, `(() => { const spec = ${JSON.stringify(c.set)}; for (const [n, v] of Object.entries(spec)) { const el = document.querySelector('[data-filter][name="' + n + '"]'); if (!el) continue; if (el.tagName === 'SELECT' && v === 'first') { const o = Array.from(el.options).find((x) => x.value); el.value = o ? o.value : ''; } else el.value = v; } document.querySelector('form[data-page-filters]').requestSubmit(); })()`);
    if (c.set) { const d3 = Date.now() + 90000; while (Date.now() < d3) { const s = await ev(ws, sessionId, "(document.querySelector('[data-page-status]')||{}).textContent || ''"); if (s && !/Fetching|Loading/i.test(s)) break; await sleep(60); } }
    const fv = JSON.parse((await ev(ws, sessionId, `JSON.stringify(Object.fromEntries(Array.from(document.querySelectorAll('[data-filter]')).map((e) => [e.name, e.type === 'checkbox' ? (e.checked ? 'on' : '') : e.value])))`)) || "{}");
    const qp = new URLSearchParams();
    for (const [k, v] of Object.entries(fv)) if (v !== "" && v != null) qp.set(k, v);
    const legacyUrl = BASE + c.legacy + (qp.toString() ? "?" + qp.toString() : "");

    const legacyRuns = [], pageRuns = [];
    for (let i = 0; i < RUNS; i++) legacyRuns.push(await measure(ws, sessionId, legacyUrl, false));
    for (let i = 0; i < RUNS; i++) pageRuns.push(await measure(ws, sessionId, BASE + c.page, true));

    const L = { ttfb: med(legacyRuns.map((r) => r.nav.ttfb)), load: med(legacyRuns.map((r) => r.nav.load)), ready: med(legacyRuns.map((r) => r.readyAt)), transfer: med(legacyRuns.map((r) => r.nav.transfer)), decoded: med(legacyRuns.map((r) => r.nav.decoded)), rows: legacyRuns[0].rows };
    const P = { e2e: med(pageRuns.map((r) => r.readyAt)), fetch: med(pageRuns.map((r) => r.runtime.fetchMs || 0)), compute: med(pageRuns.map((r) => r.runtime.computeMs || 0)), render: med(pageRuns.map((r) => r.runtime.renderMs || 0)), total: med(pageRuns.map((r) => r.runtime.totalMs || 0)), dtransfer: med(pageRuns.map((r) => r.dataRes.transfer || 0)), ddecoded: med(pageRuns.map((r) => r.dataRes.decoded || 0)), rows: pageRuns[0].rows, version: pageRuns[0].runtime.version };
    out.push({ page: c.page.replace("/p/", "/"), rows: L.rows, L, P });
    console.log(`== ${c.page.replace("/p/", "/")}  (rows=${L.rows})`);
    console.log(`   legacy : TTFB=${L.ttfb}ms  time-to-ready=${L.ready}ms | html ${kb(L.decoded)}KB decoded / ${kb(L.transfer)}KB wire`);
    console.log(`   page   : e2e=${P.e2e}ms  (server fetch=${P.fetch} client render=${P.render} compute=${P.compute}) | data ${kb(P.ddecoded)}KB decoded / ${kb(P.dtransfer)}KB wire`);
    console.log(`   rows equal: ${L.rows === P.rows ? "yes" : "NO"}`);
  }
  console.log("\n===== TOTALS (median across reports) =====");
  console.log(`legacy time-to-ready (median): ${med(out.map((r) => r.L.ready))} ms   |   page e2e (median): ${med(out.map((r) => r.P.e2e))} ms`);
  console.log(`legacy html decoded:  ${kb(med(out.map((r) => r.L.decoded)))} KB  |   page data decoded: ${kb(med(out.map((r) => r.P.ddecoded)))} KB`);
  fs.writeFileSync(path.join(ROOT, "e2e-logs", "bench-results.json"), JSON.stringify(out, null, 2));
  ws.close();
}
main().then(() => process.exit(0)).catch((e) => { console.error("ERROR: " + e.message); process.exit(1); });
