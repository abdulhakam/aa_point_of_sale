/**
 * refdb — the IndexedDB reference cache, driven in a real browser.
 *
 *   node trailbase/tools/refdb-check.mjs [--base http://127.0.0.1:4000]
 *
 * What it asserts, and why each one is the thing that can silently break:
 *
 *   1. the cache loads and holds the server's lists (a cache that is empty makes every dropdown look
 *      server-rendered and "works" — until a create needs it);
 *   2. every `select[data-ref]` is repopulated from IndexedDB, with the same option count the server
 *      rendered (so the swap is invisible);
 *   3. the item options keep their `data-price`/`data-cost`/`data-box`, because app.js fills an invoice
 *      line from them on change — losing them turns a price into 0, silently;
 *   4. a row inserted with `__AA_REFDB__.upsert` appears in an **already open** combobox without
 *      closing/reopening it, which is the whole point of the store;
 *   5. no page script error is raised on load.
 *
 * Nothing is written to the server: the only insert is a client-side IndexedDB row, removed again
 * before the check ends.
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://127.0.0.1:4000");
const EMAIL = arg("--email", "admin@localhost");
const PASSWORD = arg("--password", "administrator-0ne");
const CHROME = arg("--chrome", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
const PORT = Number(arg("--port", "9356"));

let pass = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); this.errors = []; }
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
      if (m.id && cdp.waiting.has(m.id)) { const w = cdp.waiting.get(m.id); cdp.waiting.delete(m.id); m.error ? w.reject(new Error(JSON.stringify(m.error))) : w.resolve(m.result); return; }
      if (m.method === "Runtime.exceptionThrown") cdp.errors.push(String(m.params.exceptionDetails.exception?.description ?? "").slice(0, 200));
      if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") cdp.errors.push(m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 200));
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
    await new Promise((r) => setTimeout(r, 400));
    await this.send("Page.navigate", { url: BASE + path });
    await new Promise((r) => setTimeout(r, 1200));
  }
}

const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "refdb-"))}`, "--headless=new", "--no-first-run", "--disable-gpu", "--window-size=1500,950", "about:blank"], { stdio: "ignore" });

try {
  const cdp = await CDP.attach(PORT);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  await cdp.goto("/login");
  for (let i = 0; i < 60; i++) { if (await cdp.ev("!!document.querySelector('form.login')").catch(() => false)) break; await new Promise((r) => setTimeout(r, 100)); }
  await cdp.ev(`(function(){var f=document.querySelector("form.login");f.querySelector('input[name="email"]').value=${JSON.stringify(EMAIL)};f.querySelector('input[type="password"]').value=${JSON.stringify(PASSWORD)};f.querySelector('button[type="submit"]').click();})()`);
  for (let i = 0; i < 60; i++) { const at = await cdp.ev("location.pathname").catch(() => null); if (at && !at.includes("login")) break; await new Promise((r) => setTimeout(r, 150)); }

  // An existing invoice's screen has a party combobox, a booker combobox and item comboboxes — every
  // shape the store serves, including the item options whose data attributes app.js reads. (The
  // *new-invoice start form* has only a party + area; the item select lives on the invoice itself.)
  // `/invoices` is the legacy five-tile hub now; the list is at `/invoices/all`, and its rows are
  // where an invoice id to open lives ([[ui-parity-discrepancies-2026-10-08]]).
  await cdp.goto("/invoices/all");
  const invoiceHref = await cdp.ev(`(function(){
    var links = document.querySelectorAll('a[href^="/invoices/"]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      if (/^\\/invoices\\/[^\\/?]+$/.test(href) && !/^\\/invoices\\/(new|all)$/.test(href)) return href; // an invoice id, not /invoices/new or /invoices/all
    }
    return null;
  })()`);
  if (!invoiceHref) throw new Error("no invoice link found on /invoices");
  await cdp.goto(invoiceHref);
  await cdp.ev("(window.__AA_REFDB__ ? window.__AA_REFDB__.ready : Promise.resolve(null)).then(function(){ return true; })");
  for (let i = 0; i < 80; i++) {
    const ready = await cdp.ev("!!(window.__AA_REFDB__ && window.__AA_REFDB__.get('parties').length)").catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  const cached = await cdp.ev(`(function(){
    var r = window.__AA_REFDB__;
    return { parties: r.get('parties').length, items: r.get('items').length, bookers: r.get('bookers').length };
  })()`);
  console.log(`  cache: parties=${cached.parties} items=${cached.items} bookers=${cached.bookers}`);
  check("the reference cache holds the party list", cached.parties > 0, JSON.stringify(cached));
  check("the reference cache holds the item list", cached.items > 0, JSON.stringify(cached));

  // 2. Every annotated select has been repopulated from the store: option count matches the store.
  const repop = await cdp.ev(`(function(){
    var out = [];
    var selects = document.querySelectorAll("select[data-ref]");
    for (var i = 0; i < selects.length; i++) {
      var s = selects[i];
      var n = [...s.options].filter(function(o){ return o.value !== ""; }).length;
      var key = window.__AA_REFDB__.refKey(s.getAttribute("data-ref"));
      var store = window.__AA_REFDB__.get(key).length;
      out.push({ name: s.name, ref: s.getAttribute("data-ref"), options: n, store: store, equal: n === store });
    }
    return out;
  })()`);
  console.log("  repopulated: " + repop.map((s) => `${s.name}=${s.options}/${s.store}`).join(", "));
  check("every annotated select is populated from the store", repop.length > 0 && repop.every((s) => s.equal && s.store > 0), JSON.stringify(repop.filter((s) => !s.equal)));

  // 3. Item options kept the data attributes app.js needs to fill a line.
  const itemAttrs = await cdp.ev(`(function(){
    var s = document.querySelector('select[data-ref="items"]');
    if (!s) return null;
    var withPrice = [...s.options].filter(function(o){ return o.value !== "" && o.dataset.price !== undefined; }).length;
    return { total: [...s.options].filter(function(o){ return o.value !== ""; }).length, withPrice: withPrice };
  })()`);
  check("item options keep their data-price after repopulation", !!itemAttrs && itemAttrs.total > 0 && itemAttrs.withPrice === itemAttrs.total, JSON.stringify(itemAttrs));

  // 4. Live insert into an OPEN combobox: open the party list, upsert a row, and it must appear in
  //    the open list without a re-focus and without closing.
  await cdp.ev(`(function(){var s=document.querySelector('select[name="party"]');var w=s.closest('.ac');w.querySelector('.ac-input').focus();s.closest('.ac').querySelector('.ac-input').dispatchEvent(new Event('focus'));})()`);
  await new Promise((r) => setTimeout(r, 200));
  const opened = await cdp.ev(`(function(){var w=document.querySelector('select[name="party"]').closest('.ac');return !w.querySelector('.ac-list').hidden;})()`);
  check("the party combobox list is open before the insert", opened === true, String(opened));

  const injected = await cdp.ev(`(function(){
    return window.__AA_REFDB__.upsert('parties', { id: 'REFDBTEST0000000000000000', name: 'ZZZ Refdb Check Party', type: 0 }).then(function(){
      var s = document.querySelector('select[name="party"]');
      var w = s.closest('.ac');
      var labels = [...w.querySelectorAll('.ac-option')].map(function(li){ return li.textContent; });
      return { inSelect: !!s.querySelector('option[value="REFDBTEST0000000000000000"]'),
               inOpenList: labels.indexOf('ZZZ Refdb Check Party') !== -1,
               stillOpen: !w.querySelector('.ac-list').hidden };
    });
  })()`);
  check("upsert adds the row to the select", !!injected && injected.inSelect === true, JSON.stringify(injected));
  check("the new row appears in the already-open list without reopening", !!injected && injected.inOpenList === true, JSON.stringify(injected));
  check("the list is still open after the insert", !!injected && injected.stillOpen === true, JSON.stringify(injected));

  // Clean up the client-side row so no later load sees it.
  await cdp.ev("window.__AA_REFDB__.remove('parties', 'REFDBTEST0000000000000000')");

  // 4b. The cache is actually REUSED: this is the second same-version page load, so refdb must have
  //     hydrated from IndexedDB, not re-fetched. (A guard that never matched made every load re-fetch.)
  const source = await cdp.ev(`document.documentElement.getAttribute('data-refdb-source')`);
  await cdp.goto(invoiceHref);
  for (let i = 0; i < 60; i++) { if (await cdp.ev("document.documentElement.getAttribute('data-refdb-source')").catch(() => null)) break; await new Promise((r) => setTimeout(r, 100)); }
  const source2 = await cdp.ev(`document.documentElement.getAttribute('data-refdb-source')`);
  check("a same-version page load reuses the IndexedDB cache", source2 === "cache", `first=${source} second=${source2}`);

  // 5. The no-reload create is wired: the panel buttons carry the hook, the script is served, and the
  //    create endpoint validates before writing. The happy path is exercised against a throw-away
  //    depot, not the operator's data, so it is not submitted here.
  const qc = await cdp.ev(`(function(){
    return { buttons: document.querySelectorAll('[data-qc-create]').length,
             script: !!document.querySelector('script[src$="refdb-create.js"]') };
  })()`);
  check("the quick-create panels expose the no-reload create hook", qc.buttons >= 1 && qc.script, JSON.stringify(qc));

  const badStatus = await cdp.ev(`fetch('/quick-create', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'kind=party', credentials: 'same-origin' }).then(function (r) { return r.status; })`);
  check("POST /quick-create refuses an empty name without writing", badStatus === 400, "status=" + badStatus);

  check("no page script error was raised", cdp.errors.length === 0, cdp.errors.join(" | "));
} catch (error) {
  failures.push(`harness: ${error.message}`);
  console.log(`FAIL  harness — ${error.message}`);
} finally {
  chrome.kill();
}

console.log(`\n${pass} passed, ${failures.length} failed`);
if (failures.length) { for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
