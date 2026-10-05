/**
 * What the browser actually spends time on, per keystroke, on the real imported database.
 *
 *   node trailbase/tools/client-cost.mjs [--base http://127.0.0.1:4000] [--json out.json]
 *
 * The premise for minimising client-side JavaScript is that it adds latency. That is a claim, and this
 * measures it: every figure below is the wall-clock cost of ONE `input` event dispatched into the real
 * page, timed with `performance.now()` around the dispatch — which is exactly the work the user waits
 * for while holding a key down.
 *
 * Measured on the migrated whole database (8,927 invoices, 23,413 transactions, 942 parties) and on the
 * heaviest invoice in it, so the numbers are the numbers a shop would feel.
 *
 * Nothing here writes. Keys are typed into forms and never submitted — this is the same discipline as
 * `hotkey-check.mjs`, which had to neutralise a click precisely because the obvious way to test it would
 * have written a row ([[route-snapshot-was-snapshotting-redirects]]).
 */

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://127.0.0.1:4000");
const EMAIL = arg("--email", "admin@localhost");
const PASSWORD = arg("--password", "administrator-0ne");
const CHROME = arg("--chrome", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
const PORT = Number(arg("--port", "9340"));
const JSON_OUT = arg("--json", "");
const REPEAT = Number(arg("--repeat", "5"));

/** The heaviest invoice in the depot, so the grid is measured on a real worst case. */
let heaviest = { id: null, lines: 0 };
try {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(join(HERE, "..", "traildepot", "data", "main.db"), { readOnly: true });
  const top = db.prepare("select invoice, count(*) c from transactions where invoice is not null group by invoice order by c desc limit 1").get();
  const inv = db.prepare("select id from invoices where id=?").get(Buffer.from(top.invoice));
  heaviest = { id: Buffer.from(inv.id).toString("base64url"), lines: top.c };
} catch { /* the measurement runs anyway, just not on a known-worst invoice */ }

/* ─────────────────────────────────────────────────────────────────────── the same small CDP client */

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
      setTimeout(() => { if (this.waiting.has(id)) { this.waiting.delete(id); reject(new Error(`${method} timed out`)); } }, 30000);
    });
  }
  async ev(expression) {
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval failed");
    return r.result.value;
  }
  async type(text) {
    const base = { key: text, code: `Key${text.toUpperCase()}`, windowsVirtualKeyCode: text.toUpperCase().charCodeAt(0), nativeVirtualKeyCode: text.toUpperCase().charCodeAt(0) };
    await this.send("Input.dispatchKeyEvent", { type: "keyDown", ...base, text });
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
    await new Promise((r) => setTimeout(r, 25));
  }
  async goto(path) {
    await this.send("Page.navigate", { url: BASE + path });
    for (let i = 0; i < 120; i++) { const at = await this.ev("location.pathname").catch(() => null); if (at === path) break; await new Promise((r) => setTimeout(r, 100)); }
    for (let i = 0; i < 120; i++) { if (await this.ev("document.documentElement.getAttribute('data-hk-ready')==='1'").catch(() => false)) break; await new Promise((r) => setTimeout(r, 100)); }
    await new Promise((r) => setTimeout(r, 250));
  }
}

/* ────────────────────────────────────────────────────── the timing probe, installed in the page */

/**
 * Times a listener's own work, not the event's round trip. `dispatchEvent` runs the listener
 * synchronously, so the window between the two `performance.now()` reads IS the handler.
 */
const TIME_INPUT = (selector, needle, times) => `(function () {
  var el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return null;
  var runs = [];
  for (var i = 0; i < ${times}; i++) {
    el.value = ${JSON.stringify(needle)} + i;
    var t0 = performance.now();
    el.dispatchEvent(new Event("input", { bubbles: true }));
    runs.push(performance.now() - t0);
  }
  runs.sort(function (a, b) { return a - b; });
  return { best: runs[0], median: runs[Math.floor(runs.length / 2)], worst: runs[runs.length - 1] };
})()`;

const results = [];
function record(name, page, scale, probe) {
  if (!probe) { results.push({ name, page, scale, error: "selector not present" }); console.log(`  ${name.padEnd(38)} no target on ${page}`); return; }
  results.push({ name, page, scale, ...probe });
  const ms = (v) => `${v.toFixed(2)}ms`;
  console.log(`  ${name.padEnd(38)} best ${ms(probe.best).padStart(9)}  median ${ms(probe.median).padStart(9)}  worst ${ms(probe.worst).padStart(9)}   ${scale}`);
}

const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "cc-"))}`, "--headless=new", "--no-first-run", "--disable-gpu", "--window-size=1400,900", "about:blank"], { stdio: "ignore" });

try {
  const cdp = await CDP.attach(PORT);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  await cdp.goto("/login");
  if (await cdp.waitFor?.("form.login")) { /* older clients */ }
  for (let i = 0; i < 60; i++) { if (await cdp.ev("!!document.querySelector('form.login')").catch(() => false)) break; await new Promise((r) => setTimeout(r, 100)); }
  await cdp.ev(`(function(){var f=document.querySelector("form.login");if(!f)return;f.querySelector('input[name="email"]').value=${JSON.stringify(EMAIL)};f.querySelector('input[type="password"]').value=${JSON.stringify(PASSWORD)};f.querySelector('button[type="submit"]').click();})()`);
  for (let i = 0; i < 60; i++) { const at = await cdp.ev("location.pathname").catch(() => null); if (at && !at.includes("login")) break; await new Promise((r) => setTimeout(r, 150)); }

  /* ── 1. the management table filter, over every row ────────────────────────────────────────── */
  await cdp.goto("/management/parties");
  const partyRows = await cdp.ev("document.querySelectorAll('#mgmt-table tbody tr').length");
  record("table filter, one keystroke", "/management/parties", `${partyRows} rows`, await cdp.ev(TIME_INPUT("[data-table-filter]", "zzq", REPEAT)));

  /* ── 2. the same filter, with the needle that matches nothing vs the empty needle ───────────── */
  record("table filter, empty needle", "/management/parties", `${partyRows} rows`, await cdp.ev(TIME_INPUT("[data-table-filter]", "", REPEAT)));

  /* ── 3. the searchable <select> over the item list ──────────────────────────────────────────── */
  // The grid page is `/invoices/<id>/grid` — `route.ts:1685`. `/invoices/<id>` is the read view and has no
  // grid, so measuring there finds nothing and reports a scale of zero, which reads like "free".
  if (heaviest.id) {
    await cdp.goto(`/invoices/${heaviest.id}/grid`);
    const itemOptions = await cdp.ev(`(function(){var s=document.querySelector('[data-grid] select[name="item"]');return s?s.options.length:0;})()`);
    record("select filter, one keystroke", "/invoices/<id>/grid", `${itemOptions} options`, itemOptions ? await cdp.ev(TIME_INPUT(".select-filter", "a", REPEAT)) : null);
  } else {
    record("select filter, one keystroke", "/invoices/new", "unknown", null);
  }

  /* ── 4. the invoice grid recalculation ──────────────────────────────────────────────────────── */
  if (heaviest.id) {
    const gridRows = await cdp.ev("document.querySelectorAll('[data-grid] tbody tr[data-line]').length");
    const editable = await cdp.ev("document.querySelector('[data-grid]').getAttribute('data-editable')");
    const qtyName = await cdp.ev(`(function(){var r=document.querySelector('[data-grid] tbody tr[data-line] input[name="qty"]');return r?r.name:null;})()`);
    if (qtyName) {
      await cdp.ev(`(function(){var r=document.querySelector('[data-grid] tbody tr[data-line] input[name="qty"]');if(r)r.focus();})()`);
      const before = await cdp.ev("(document.querySelector('[data-grid] tbody tr[data-line] input[name=\"qty\"]')||{}).value");
      await cdp.type("5");
      const after = await cdp.ev("(document.querySelector('[data-grid] tbody tr[data-line] input[name=\"qty\"]')||{}).value");
      record("invoice grid recalc, one keystroke", "/invoices/<id>/grid", `${gridRows} lines, editable=${editable}`, await cdp.ev(TIME_INPUT(`[data-grid] tbody tr[data-line] input[name="qty"]`, "7", REPEAT)));
      console.log(`     (typed into the first qty cell: ${before} -> ${after}; nothing submitted)`);
    } else {
      record("invoice grid recalc, one keystroke", "/invoices/<id>/grid", `${gridRows} lines, editable=${editable}`, null);
    }
  }

  /* ── 5. the keyboard cursor on a long table — innerText forces layout, per row, per press ───── */
  await cdp.goto("/management/parties");
  const cursorCost = await cdp.ev(`(function () {
    var rows = [...document.querySelectorAll("main table tbody tr")];
    var runs = [];
    for (var i = 0; i < ${REPEAT}; i++) {
      var el = document.querySelector("tr.hk-row") || rows[0];
      var t0 = performance.now();
      // What paintRow does per press: read every cell's innerText, which forces a layout flush.
      var parts = [...el.cells].map(function (c) { return (c.innerText || c.textContent || "").replace(/\\s+/g, " ").trim(); });
      runs.push(performance.now() - t0);
    }
    runs.sort(function (a, b) { return a - b; });
    return { best: runs[0], median: runs[Math.floor(runs.length / 2)], worst: runs[runs.length - 1] };
  })()`);
  record("row cursor label, one press", "/management/parties", `${partyRows} rows`, cursorCost);

  console.log(`\nworst single-keystroke cost: ${Math.max(...results.filter((r) => r.median != null).map((r) => r.median)).toFixed(2)}ms`);
  if (JSON_OUT) { writeFileSync(JSON_OUT, JSON.stringify({ base: BASE, heaviest, results }, null, 2) + "\n"); console.log(`wrote ${JSON_OUT}`); }
} catch (error) {
  console.error("client-cost could not run:", error.message);
  process.exitCode = 1;
} finally {
  chrome.kill();
}