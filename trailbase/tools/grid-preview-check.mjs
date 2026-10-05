/**
 * The invoice grid's live preview, asserted in a real browser.
 *
 *   node trailbase/tools/grid-preview-check.mjs [--base http://127.0.0.1:4000]
 *
 * Why this exists: `guest-smoke.mjs` creates invoices with discounts and never opens the grid, and
 * `hotkey-check.mjs` only arrived on 2026-10-04. So for the whole life of `client-side-live-recalculation`
 * **nothing was asserting that the browser preview agrees with the server**, and two defects lived in that
 * gap until a latency measurement happened to read the code next to it:
 *
 *   - `[data-sum]` was looked up with `grid.querySelector`, but it sits ABOVE the grid element
 *     (`grid.html:64` against `:73`), so the invoice total was never written — a recalculated line beside
 *     a frozen invoice total;
 *   - the invoice-level discounts came from `data-d1`/`data-d2` attributes rendered at load, and
 *     `discount_rs` was hardcoded to `0`, so the Discount %, Discount 2 % and Discount Rs fields did
 *     nothing to the preview.
 *
 * This asserts the three blast radii and the cross-check the decision actually demands: the preview's
 * number must equal the server's number for the same invoice.
 *
 * Nothing is saved. Keys are typed and never submitted.
 */

import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://127.0.0.1:4000");
const EMAIL = arg("--email", "admin@localhost");
const PASSWORD = arg("--password", "administrator-0ne");
const CHROME = arg("--chrome", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
const PORT = Number(arg("--port", "9343"));

let pass = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

/** The heaviest invoice in the depot, so this runs against a real worst case rather than a fixture. */
let heaviest = null;
try {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(join(HERE, "..", "traildepot", "data", "main.db"), { readOnly: true });
  const top = db.prepare("select invoice, count(*) c from transactions where invoice is not null group by invoice order by c desc limit 1").get();
  const inv = db.prepare("select id from invoices where id=?").get(Buffer.from(top.invoice));
  heaviest = { id: Buffer.from(inv.id).toString("base64url"), lines: top.c };
} catch (e) { console.error(`could not read the depot: ${e.message}`); process.exit(2); }

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
  async goto(path) {
    await this.send("Page.navigate", { url: BASE + path });
    for (let i = 0; i < 140; i++) { const at = await this.ev("location.pathname").catch(() => null); if (at === path) break; await new Promise((r) => setTimeout(r, 100)); }
    for (let i = 0; i < 140; i++) { if (await this.ev("document.documentElement.getAttribute('data-hk-ready')==='1'").catch(() => false)) break; await new Promise((r) => setTimeout(r, 100)); }
    await new Promise((r) => setTimeout(r, 400));
  }
}

/** Set a field's value and fire the event a keystroke would, in one round trip. */
const SET = (selector, value) => `(function () {
  var el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return null;
  var before = el.value;
  el.value = ${JSON.stringify(value)};
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return before;
})()`;

const READ = `(function () {
  var g = document.querySelector("[data-grid]");
  var header = document.querySelector('form[action$="/header"]');
  return {
    lines: g ? g.querySelectorAll("tbody tr[data-line]").length : 0,
    amount: (g ? g.querySelector("[data-amount]") : {}).textContent,
    statTotal: (document.querySelector("[data-sum]") || {}).textContent,
    headerD1: header ? (header.querySelector('[name="discount_1"]') || {}).value : null,
    headerDrs: header ? (header.querySelector('[name="discount_rs"]') || {}).value : null,
  };
})()`;

const num = (s) => Number(String(s ?? "").replace(/,/g, ""));

const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "gp-"))}`, "--headless=new", "--no-first-run", "--disable-gpu", "--window-size=1400,900", "about:blank"], { stdio: "ignore" });

try {
  const cdp = await CDP.attach(PORT);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  await cdp.goto("/login");
  for (let i = 0; i < 60; i++) { if (await cdp.ev("!!document.querySelector('form.login')").catch(() => false)) break; await new Promise((r) => setTimeout(r, 100)); }
  await cdp.ev(`(function(){var f=document.querySelector("form.login");if(!f)return;f.querySelector('input[name="email"]').value=${JSON.stringify(EMAIL)};f.querySelector('input[type="password"]').value=${JSON.stringify(PASSWORD)};f.querySelector('button[type="submit"]').click();})()`);
  for (let i = 0; i < 60; i++) { const at = await cdp.ev("location.pathname").catch(() => null); if (at && !at.includes("login")) break; await new Promise((r) => setTimeout(r, 150)); }

  const GRID = `/invoices/${heaviest.id}/grid`;
  await cdp.goto(GRID);
  const initial = await cdp.ev(READ);
  console.log(`heaviest invoice: ${heaviest.lines} lines, id ${heaviest.id}`);
  console.log(`grid reports ${initial.lines} line rows, editable total ${initial.statTotal}\n`);

  check("the grid has lines to work on", initial.lines > 0, `${initial.lines}`);
  check("the grid is editable, so the preview is live", initial.statTotal != null);
  check("the server-rendered total is already non-zero", num(initial.statTotal) > 0, String(initial.statTotal));

  /* ── 1. a LINE edit moves the line and the invoice total ──────────────────────────────────── */
  const qtySel = '[data-grid] tbody tr[data-line] input[name="qty"]';
  const qtyBefore = await cdp.ev(`(function(){var e=document.querySelector(${JSON.stringify(qtySel)});return e?Number(e.value):0;})()`);
  await cdp.ev(SET(qtySel, String((qtyBefore || 1) + 7)));
  await new Promise((r) => setTimeout(r, 250));
  const afterLine = await cdp.ev(READ);
  check("a line edit moves that line's amount", num(afterLine.amount) !== num(initial.amount), `${initial.amount} -> ${afterLine.amount}`);
  check("a line edit moves the INVOICE TOTAL", num(afterLine.statTotal) !== num(initial.statTotal), `${initial.statTotal} -> ${afterLine.statTotal}`);
  check("...and the total moved UP, because the quantity went up", num(afterLine.statTotal) > num(initial.statTotal), `${initial.statTotal} -> ${afterLine.statTotal}`);

  /* ── 2. an invoice-level Discount % moves every line's net, by the right factor ─────────── */
  await cdp.ev(SET('form[action$="/header"] [name="discount_1"]', "10"));
  await new Promise((r) => setTimeout(r, 250));
  const afterD1 = await cdp.ev(READ);
  const expected = num(afterLine.amount) * 0.9;
  check("an invoice-level Discount % moves the line amount", num(afterD1.amount) !== num(afterLine.amount), `${afterLine.amount} -> ${afterD1.amount}`);
  check("...by exactly the discount", Math.abs(num(afterD1.amount) - expected) < 0.02, `expected ~${expected.toFixed(2)}, got ${afterD1.amount}`);
  check("...and moves the invoice total too", num(afterD1.statTotal) !== num(afterLine.statTotal), `${afterLine.statTotal} -> ${afterD1.statTotal}`);

  /* ── 3. an invoice-level Discount Rs moves the TOTAL and no line ──────────────────────────── */
  // The delta is (new − previous), NOT the new value. This invoice already carries `discount_rs`
  // 34.99 from the legacy data, so setting the field to 100 is a reduction of 65.01. Asserting
  // "the total drops by exactly 100" is wrong and would have been a failing test that looked like a
  // product bug — which is the failure mode this vault records more than once.
  const beforeDrs = await cdp.ev(READ);
  const amountBeforeDrs = beforeDrs.amount;
  const totalBeforeDrs = num(beforeDrs.statTotal);
  const drsBefore = num(beforeDrs.headerDrs);
  await cdp.ev(SET('form[action$="/header"] [name="discount_rs"]', "100"));
  await new Promise((r) => setTimeout(r, 250));
  const afterDrs = await cdp.ev(READ);
  const delta = 100 - drsBefore;
  check("an invoice-level Discount Rs leaves every LINE amount alone", num(afterDrs.amount) === num(amountBeforeDrs), `${amountBeforeDrs} -> ${afterDrs.amount}`);
  check(
    `...and takes exactly the change (${drsBefore} -> 100, so ${delta}) off the invoice total`,
    Math.abs(totalBeforeDrs - delta - num(afterDrs.statTotal)) < 0.02,
    `${totalBeforeDrs} - ${delta} = ${(totalBeforeDrs - delta).toFixed(2)}, got ${afterDrs.statTotal}`
  );

  /* ── 4. the cross-check the decision demands: the preview must EQUAL the server's number ───── */
  // `[data-sum]` is server-rendered as `{{ invoice.totalText }}` and the client overwrites it on init.
  // Loading once with scripting disabled captures the server's own arithmetic; loading again with
  // scripting enabled captures the browser's. They must agree to the paisa, which is exactly the
  // promise `client-side-live-recalculation` makes and which nothing asserted until now.
  await cdp.send("Emulation.setScriptExecutionDisabled", { value: true });
  await cdp.goto(GRID);
  const serverTotal = await cdp.ev(`(function () { var c = document.querySelector("[data-sum]"); return c ? c.textContent.trim() : null; })()`);
  await cdp.send("Emulation.setScriptExecutionDisabled", { value: false });
  await cdp.goto(GRID);
  const clientTotal = await cdp.ev(`(function () { var c = document.querySelector("[data-sum]"); return c ? c.textContent.trim() : null; })()`);
  check("the server renders a total for this invoice", num(serverTotal) > 0, String(serverTotal));
  check("the browser computes the SAME total as the server", Math.abs(num(serverTotal) - num(clientTotal)) < 0.005, `server ${serverTotal} vs client ${clientTotal}`);

  const reloaded = await cdp.ev(READ);
  check("the preview does not drift across a reload", num(reloaded.statTotal) === num(clientTotal), `${clientTotal} then ${reloaded.statTotal}`);

  console.log(`\n== ${pass} passed, ${failures.length} failed ==`);
  if (failures.length) failures.forEach((f) => console.log(`  - ${f}`));
} catch (error) {
  console.error("grid-preview-check could not run:", error.message);
  failures.push(error.message);
} finally {
  chrome.kill();
}

process.exit(failures.length ? 1 : 0);