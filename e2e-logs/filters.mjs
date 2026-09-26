// Filter exercise: APPLY changed filters on the page host, replay them on the legacy route,
// compare, then RESET and confirm it returns to the default. Usage: node filters.mjs <cases-file.json>
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
    ws.addEventListener("message", (e) => { const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
      else if (m.method) events.push(m); });
  });
}
function rpc(ws, method, params = {}, sid) { const id = ++nextId; const msg = { id, method, params }; if (sid) msg.sessionId = sid;
  return new Promise((res, rej) => { pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify(msg)); setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error("timeout " + method)); } }, 60000); }); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function ev(ws, sid, expr) { const r = await rpc(ws, "Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) return null; return r.result.value; }

const PROBE = `(() => {
  const t = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim().replace(/\\s+/g, ' ') : null; };
  const meta = t('.report-meta');
  const rowsMeta = meta && (meta.match(/Rows:\\s*([\\d,]+)/) || [])[1] || null;
  const totalVals = Array.from(document.querySelectorAll('.totals-table td, [data-total-key]')).map((e) => e.textContent.trim());
  const status = t('[data-page-status]');
  return JSON.stringify({ rowsMeta, bodyRows: document.querySelectorAll('table.data tbody tr').length, status, totals: totalVals });
})()`;

async function waitReady(ws, sid) {
  const d = Date.now() + 45000;
  while (Date.now() < d) { if ((await ev(ws, sid, "document.readyState")) === "complete") break; await sleep(250); }
  await sleep(500);
  if (await ev(ws, sid, "!!document.querySelector('[data-page-status]')")) {
    const d2 = Date.now() + 90000;
    while (Date.now() < d2) { const s = await ev(ws, sid, "(document.querySelector('[data-page-status]')||{}).textContent || ''"); if (s && !/Fetching|Loading/i.test(s)) break; await sleep(300); }
  }
}
const rowsOf = (p) => p.rowsMeta ? Number(p.rowsMeta.replace(/,/g, "")) : ((p.status || "").match(/([\d,]+) row/) ? Number(p.status.match(/([\d,]+) row/)[1].replace(/,/g, "")) : p.bodyRows);
const norm = (a) => (a || []).flatMap((v) => String(v).split("/")).map((s) => s.trim()).filter((s) => s && s !== "0" && s !== "0.00").sort();

async function main() {
  const cases = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const ws = await connect(wsUrl());
  const targetId = fs.readFileSync(STATE, "utf8").trim();
  const { sessionId } = await rpc(ws, "Target.attachToTarget", { targetId, flatten: true });
  await rpc(ws, "Page.enable", {}, sessionId); await rpc(ws, "Runtime.enable", {}, sessionId);
  await rpc(ws, "Log.enable", {}, sessionId); await rpc(ws, "Network.enable", {}, sessionId);

  let pass = 0, fail = 0;
  for (const c of cases) {
    events = [];
    await rpc(ws, "Page.navigate", { url: BASE + c.page }, sessionId); await waitReady(ws, sessionId);
    const before = JSON.parse((await ev(ws, sessionId, PROBE)) || "{}");
    const applied = await ev(ws, sessionId, `(() => {
      const spec = ${JSON.stringify(c.set)};
      const out = {};
      for (const [name, val] of Object.entries(spec)) {
        const el = document.querySelector('[data-filter][name="' + name + '"]');
        if (!el) { out[name] = 'MISSING'; continue; }
        if (el.tagName === 'SELECT' && val === 'first') {
          const o = Array.from(el.options).find((x) => x.value);
          el.value = o ? o.value : ''; out[name] = 'first=' + (o ? o.textContent.trim() : '');
        } else if (el.type === 'checkbox') { el.checked = !!val; out[name] = 'check=' + el.checked; }
        else { el.value = val; out[name] = 'value=' + val; }
      }
      document.querySelector('form[data-page-filters]').requestSubmit();
      return JSON.stringify(out);
    })()`);
    await waitReady(ws, sessionId);
    const filtered = JSON.parse((await ev(ws, sessionId, PROBE)) || "{}");
    const filterVals = JSON.parse((await ev(ws, sessionId, `JSON.stringify(Object.fromEntries(Array.from(document.querySelectorAll('[data-filter]')).map((e) => [e.name, e.type === 'checkbox' ? (e.checked ? 'on' : '') : e.value])))`)) || "{}");
    const qp = new URLSearchParams();
    for (const [k, v] of Object.entries(filterVals)) if (v !== "" && v != null) qp.set(k, v);
    await rpc(ws, "Page.navigate", { url: BASE + c.legacy + (qp.toString() ? "?" + qp.toString() : "") }, sessionId); await waitReady(ws, sessionId);
    const legacy = JSON.parse((await ev(ws, sessionId, PROBE)) || "{}");
    await rpc(ws, "Page.navigate", { url: BASE + c.page }, sessionId); await waitReady(ws, sessionId);
    await ev(ws, sessionId, "document.querySelector('[data-page-reset]').click()");
    await waitReady(ws, sessionId);
    const reset = JSON.parse((await ev(ws, sessionId, PROBE)) || "{}");

    const parityRows = rowsOf(filtered) === rowsOf(legacy);
    const parityTotals = JSON.stringify(norm(filtered.totals)) === JSON.stringify(norm(legacy.totals));
    const resetOk = rowsOf(reset) === rowsOf(before);
    const changed = rowsOf(filtered) !== rowsOf(before);
    const ok = parityRows && parityTotals && resetOk;
    ok ? pass++ : fail++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.page}`);
    console.log(`      set: ${JSON.stringify(applied)}   (ui: ${JSON.stringify(filterVals)})`);
    console.log(`      rows: default=${rowsOf(before)} filtered=${rowsOf(filtered)}  legacy(filtered)=${rowsOf(legacy)}  reset=${rowsOf(reset)}`);
    console.log(`      filter changed the result: ${changed} | filtered parity: rows ${parityRows ? "ok" : "MISMATCH"} totals ${parityTotals ? "ok" : "MISMATCH"} | reset back to default: ${resetOk ? "ok" : "MISMATCH"}`);
    if (!parityTotals) { console.log(`      totals filtered: ${JSON.stringify(filtered.totals)}`); console.log(`      totals legacy:   ${JSON.stringify(legacy.totals)}`); }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  ws.close();
}
main().then(() => process.exit(0)).catch((e) => { console.error("ERROR: " + e.message); process.exit(1); });
