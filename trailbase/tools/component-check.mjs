/**
 * The native component library, asserted in a real browser.
 *
 *   node trailbase/tools/component-check.mjs [--base http://127.0.0.1:4000]
 *
 * Covers the four components shipped 2026-10-09 (vault/tasks/tb-0037-component-library.md):
 *
 *   - `<aa-money>` — an amount normalises to 2 dp on blur, a **rate keeps its stored precision**
 *     (the historical-precision footgun: a legacy price of 1375/12 is `114.583333`, and rounding the
 *     editable input rewrites the ledger on save — [[client-side-live-recalculation]]), and a rate is
 *     `step="any"` so the no-JS plain submit is not blocked by a `stepMismatch`;
 *   - `<aa-entity-form>` — an empty `required` submit shows an inline error and does NOT navigate, and
 *     the submit control is disabled while a request is in flight;
 *   - `<aa-flash>` — the banner is present and auto-dismisses;
 *   - `<aa-invoice-entry>` — choosing an item on the entry screen fills the line's price.
 *
 * Nothing is saved: fields are typed and blurred, forms are never submitted with valid data.
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
const PORT = Number(arg("--port", "9344"));

let pass = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

/** An editable invoice with lines, for the grid rate test; and an open invoice for the entry test. */
let heaviest = null;
let openInvoice = null;
try {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(join(HERE, "..", "traildepot", "data", "main.db"), { readOnly: true });
  const top = db.prepare("select invoice, count(*) c from transactions where invoice is not null and deleted=0 group by invoice order by c desc limit 1").get();
  const h = db.prepare("select id from invoices where id=?").get(Buffer.from(top.invoice));
  heaviest = { id: Buffer.from(h.id).toString("base64url"), lines: top.c };
  const open = db.prepare("select id from invoices where completed=0 and deleted=0 and exists(select 1 from transactions t where t.invoice=invoices.id and t.deleted=0) order by id limit 1").get();
  if (open) openInvoice = { id: Buffer.from(open.id).toString("base64url") };
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
    for (let i = 0; i < 140; i++) { const at = await this.ev("location.pathname").catch(() => null); if (at === path.split("?")[0]) break; await new Promise((r) => setTimeout(r, 100)); }
    for (let i = 0; i < 140; i++) { if (await this.ev("document.documentElement.getAttribute('data-hk-ready')==='1'").catch(() => false)) break; await new Promise((r) => setTimeout(r, 100)); }
    await new Promise((r) => setTimeout(r, 400));
  }
}

/** Set a field's value, fire `input` then `blur` (what `<aa-money>` normalises on), and read it back. */
const typeBlurRead = (selector, value) => `(function () {
  var el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return null;
  el.value = ${JSON.stringify(value)};
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("blur", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return el.value;
})()`;

const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "cc-"))}`, "--headless=new", "--no-first-run", "--disable-gpu", "--window-size=1400,900", "about:blank"], { stdio: "ignore" });

try {
  const cdp = await CDP.attach(PORT);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  await cdp.goto("/login");
  for (let i = 0; i < 60; i++) { if (await cdp.ev("!!document.querySelector('form.login')").catch(() => false)) break; await new Promise((r) => setTimeout(r, 100)); }
  await cdp.ev(`(function(){var f=document.querySelector("form.login");if(!f)return;f.querySelector('input[name="email"]').value=${JSON.stringify(EMAIL)};f.querySelector('input[type="password"]').value=${JSON.stringify(PASSWORD)};f.querySelector('button[type="submit"]').click();})()`);
  for (let i = 0; i < 60; i++) { const at = await cdp.ev("location.pathname").catch(() => null); if (at && !at.includes("login")) break; await new Promise((r) => setTimeout(r, 150)); }
  check("authenticated for the run", !String(await cdp.ev("location.pathname")).includes("login"));

  /* ── 1. <aa-money> amount: normalise to 2 dp ─────────────────────────────────────────────── */
  await cdp.goto("/payments/new");
  check("<aa-money> is defined", await cdp.ev("!!customElements.get('aa-money')"));
  const amountOut = await cdp.ev(typeBlurRead('input[name="amount"]', "1.5"));
  check("an amount input normalises to 2 dp on blur", amountOut === "1.50", `got ${JSON.stringify(amountOut)}`);
  const wholeOut = await cdp.ev(typeBlurRead('input[name="amount"]', "7"));
  check("...and a whole number gains its decimals", wholeOut === "7.00", `got ${JSON.stringify(wholeOut)}`);

  /* ── 2. <aa-money rate>: keep precision, and step="any" ──────────────────────────────────── */
  const GRID = `/invoices/${heaviest.id}/grid`;
  await cdp.goto(GRID);
  // ⚠️ The heaviest invoice's first line price must be the legacy rate the depot actually holds.
  const storedRate = await cdp.ev(`(function(){var e=document.querySelector('[data-grid] tbody tr[data-line] input[name="price"]');return e?e.value:null;})()`);
  console.log(`grid: ${heaviest.lines} lines, first stored price=${JSON.stringify(storedRate)}`);
  const rateOut = await cdp.ev(typeBlurRead('[data-grid] tbody tr[data-line] input[name="price"]', "114.583333"));
  check("a rate input keeps its stored precision on blur (not 114.58)", rateOut === "114.583333", `got ${JSON.stringify(rateOut)}`);
  const step = await cdp.ev(`(function(){var e=document.querySelector('[data-grid] tbody tr[data-line] input[name="price"]');return e?e.getAttribute("step"):null;})()`);
  check("a rate input is step=any, so a legacy rate is not a stepMismatch", step === "any", `got ${JSON.stringify(step)}`);
  const amountStep = await cdp.ev(`(function(){var e=document.querySelector('[data-grid] tbody tr[data-line] input[name="discount_rs"]');return e?e.getAttribute("step"):null;})()`);
  check("an amount input keeps step=0.01 (cents stepper)", amountStep === "0.01", `got ${JSON.stringify(amountStep)}`);
  const amtOut = await cdp.ev(typeBlurRead('[data-grid] tbody tr[data-line] input[name="discount_rs"]', "12.5"));
  check("an amount inside the grid normalises to 2 dp too", amtOut === "12.50", `got ${JSON.stringify(amtOut)}`);

  /* ── 3. <aa-entity-form>: inline validation, no navigation ───────────────────────────────── */
  await cdp.goto("/management/sections?new=1");
  check("<aa-entity-form> is defined", await cdp.ev("!!customElements.get('aa-entity-form')"));
  const urlBefore = await cdp.ev("location.href");
  await cdp.ev(`(function(){var f=document.querySelector("aa-entity-form form");if(!f)return;var n=f.querySelector('input[name="name"]');if(n)n.value="";f.querySelector('button[type="submit"]').click();})()`);
  await new Promise((r) => setTimeout(r, 400));
  const err = await cdp.ev(`(function(){var e=document.querySelector("aa-entity-form .field-error");return e?e.textContent.trim():null;})()`);
  check("an empty required submit shows an inline error", !!err, `got ${JSON.stringify(err)}`);
  const urlAfter = await cdp.ev("location.href");
  check("...and does not navigate or submit", urlAfter === urlBefore, `${urlBefore} -> ${urlAfter}`);

  /* ── 4. <aa-entity-form>: disabled during flight ─────────────────────────────────────────── */
  const busy = await cdp.ev(`(function(){
    var host=document.querySelector("aa-entity-form"), f=host&&host.querySelector("form");
    if(!f) return null;
    var b=f.querySelector('button[type="submit"]');
    f.dispatchEvent(new CustomEvent("htmx:beforeRequest",{bubbles:true,detail:{elt:f}}));
    var during=b.disabled;
    f.dispatchEvent(new CustomEvent("htmx:afterRequest",{bubbles:true,detail:{elt:f}}));
    return { during: during, after: b.disabled };
  })()`);
  check("the submit control is disabled while a request is in flight", busy && busy.during === true, `got ${JSON.stringify(busy)}`);
  check("...and is enabled again once the request settles", busy && busy.after === false, `got ${JSON.stringify(busy)}`);

  /* ── 5. <aa-flash>: present, then auto-dismissed ─────────────────────────────────────────── */
  await cdp.goto("/management/sections?status=ok&message=Component+check");
  check("<aa-flash> is defined", await cdp.ev("!!customElements.get('aa-flash')"));
  check("the flash banner is rendered inside <aa-flash>", await cdp.ev("!!document.querySelector('aa-flash .flash')"));
  let gone = false;
  for (let i = 0; i < 60; i++) { if (!(await cdp.ev("!!document.querySelector('aa-flash .flash')").catch(() => false))) { gone = true; break; } await new Promise((r) => setTimeout(r, 200)); }
  check("...and it auto-dismisses", gone);

  /* ── 6. <aa-invoice-entry>: item fills the price ─────────────────────────────────────────── */
  if (openInvoice) {
    await cdp.goto(`/invoices/${openInvoice.id}`);
    check("<aa-invoice-entry> is defined", await cdp.ev("!!customElements.get('aa-invoice-entry')"));
    const desc = await cdp.ev("(function(){var e=document.querySelector('aa-invoice-entry');return e?{type:e.invoiceType,canWrite:e.canWrite}:null;})()");
    check("...and exposes the server's type descriptor", desc && desc.type !== null && typeof desc.canWrite === "boolean", JSON.stringify(desc));
    const filled = await cdp.ev(`(function(){
      var sel=document.querySelector('aa-invoice-entry form select[name="item"]');
      if(!sel) return null;
      var opt=null; for(var i=0;i<sel.options.length;i++){ if(sel.options[i].dataset && sel.options[i].dataset.price){ opt=sel.options[i]; break; } }
      if(!opt) return "no priced option";
      var form=sel.closest("form"), price=form&&form.querySelector('input[name="price"]');
      if(price) price.value="0";
      sel.value=opt.value; sel.dispatchEvent(new Event("change",{bubbles:true}));
      return { optionPrice: opt.dataset.price, price: price?price.value:null };
    })()`);
    check("choosing an item fills the line price from the item's own", filled && filled.price === filled.optionPrice, JSON.stringify(filled));
  } else {
    check("an open invoice exists for the entry test", false, "none found in the depot");
  }

  console.log(`\n== ${pass} passed, ${failures.length} failed ==`);
  if (failures.length) failures.forEach((f) => console.log(`  - ${f}`));
} catch (error) {
  console.error("component-check could not run:", error.message);
  failures.push(error.message);
} finally {
  chrome.kill();
}

process.exit(failures.length ? 1 : 0);
