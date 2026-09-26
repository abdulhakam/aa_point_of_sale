// Drives every report/page URL in the running Chrome and reports render state + errors.
// Usage: node drive-pages.mjs <urls-file>
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const STATE = path.join(ROOT, "e2e-logs", "cdp-target.txt");
const PROFILE = path.join(os.homedir(), "AppData", "Local", "Google", "Chrome", "User Data", "DevToolsActivePort");
const BASE = "http://127.0.0.1:3100";

function wsUrl() {
  const r = fs.readFileSync(PROFILE, "utf8").split(/\r?\n/);
  return `ws://127.0.0.1:${r[0].trim()}${r[1].trim()}`;
}

let nextId = 0;
const pending = new Map();
let events = [];
function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", () => reject(new Error("ws error")));
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        const p = pending.get(m.id); pending.delete(m.id);
        m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
      } else if (m.method) events.push(m);
    });
  });
}
function rpc(ws, method, params = {}, sessionId) {
  const id = ++nextId;
  const msg = { id, method, params };
  if (sessionId) msg.sessionId = sessionId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify(msg));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error("timeout " + method)); } }, 60000);
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function ev(ws, sid, expr) {
  const r = await rpc(ws, "Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }, sid);
  if (r.exceptionDetails) return { __error: r.exceptionDetails.exception?.description || r.exceptionDetails.text };
  return r.result.value;
}

const PROBE = `(() => {
  const t = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim().replace(/\\s+/g, ' ') : null; };
  const headers = Array.from(document.querySelectorAll('table.data thead th')).map((e) => e.textContent.trim());
  const bodyRows = document.querySelectorAll('table.data tbody tr').length;
  const emptyCell = !!document.querySelector('td.empty');
  const meta = t('.report-meta');
  const rowsMeta = meta && (meta.match(/Rows:\\s*([\\d,]+)/) || [])[1] || null;
  const totals = Array.from(document.querySelectorAll('[data-total-key]')).map((e) => e.textContent.trim()).filter((x) => x !== '—');
  const status = t('[data-page-status]');
  return JSON.stringify({
    title: document.title,
    heading: t('h1.page-title') || t('h1') || t('h2'),
    headers: headers.length,
    bodyRows, emptyCell, rowsMeta,
    notice: t('.notice'),
    status,
    error: t('.flash.error, .flash.warn'),
    totals: totals.slice(0, 6),
    textLen: document.body.innerText.length,
  });
})()`;

async function main() {
  const urls = fs.readFileSync(process.argv[2], "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const ws = await connect(wsUrl());
  const targetId = fs.readFileSync(STATE, "utf8").trim();
  const { sessionId } = await rpc(ws, "Target.attachToTarget", { targetId, flatten: true });
  await rpc(ws, "Page.enable", {}, sessionId);
  await rpc(ws, "Runtime.enable", {}, sessionId);
  await rpc(ws, "Network.enable", {}, sessionId);
  await rpc(ws, "Log.enable", {}, sessionId);

  const results = [];
  for (const u of urls) {
    const url = u.startsWith("http") ? u : BASE + u;
    events = [];
    let navError = null;
    try {
      await rpc(ws, "Page.navigate", { url }, sessionId);
      const d = Date.now() + 45000;
      while (Date.now() < d) {
        const rs = await ev(ws, sessionId, "document.readyState");
        if (rs === "complete") break;
        await sleep(300);
      }
      await sleep(700);
      const hasStatus = await ev(ws, sessionId, "(!!document.querySelector('[data-page-status]'))");
      if (hasStatus) {
        const d2 = Date.now() + 90000;
        while (Date.now() < d2) {
          const s = await ev(ws, sessionId, "(document.querySelector('[data-page-status]')||{}).textContent || ''");
          if (s && !/Fetching|Loading/i.test(s)) break;
          await sleep(500);
        }
      }
    } catch (e) { navError = e.message; }
    const probe = await ev(ws, sessionId, PROBE).catch((e) => ({ __error: e.message }));
    const errs = events.filter((e) =>
      (e.method === "Runtime.exceptionThrown") ||
      (e.method === "Log.entryAdded" && e.params.entry.level === "error") ||
      (e.method === "Network.loadingFailed" && !/favicon/.test(JSON.stringify(e.params)))
    ).map((e) => e.method + " " + JSON.stringify(e.params).slice(0, 200));
    const rec = { url: u, navError, status: "?", errs };
    if (probe && !probe.__error) Object.assign(rec, JSON.parse(probe));
    else rec.probeError = probe && probe.__error;
    results.push(rec);
    console.log("== " + u);
    console.log("   " + JSON.stringify(rec));
  }

  console.log("\n===== SUMMARY =====");
  let ok = 0;
  for (const r of results) {
    const failed = r.navError || r.error || (r.status && /error|fail/i.test(r.status)) || (r.probeError) || (r.errs && r.errs.length);
    if (!failed) ok++;
    console.log((failed ? "FAIL " : "OK   ") + r.url + (r.rowsMeta ? " rows=" + r.rowsMeta : "") + (r.bodyRows ? " tr=" + r.bodyRows : "") + (r.totals && r.totals.length ? " totals=" + r.totals.join(",") : "") + (r.notice ? " notice='" + r.notice + "'" : ""));
    if (r.errs && r.errs.length) r.errs.forEach((e) => console.log("        ERR " + e));
    if (r.error) console.log("        FLASH " + r.error);
  }
  console.log(`\n${ok}/${results.length} URLs loaded cleanly`);
  ws.close();
}

main().then(() => process.exit(0)).catch((e) => { console.error("DRIVER ERROR: " + e.message); process.exit(1); });
