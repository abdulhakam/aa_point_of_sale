/**
 * The client page cache, asserted in a real browser.
 *
 *   node trailbase/tools/pagecache-check.mjs [--base http://127.0.0.1:4000]
 *
 * Covers `public/js/pagecache.js` (vault/decisions/guest-page-cache.md): a repeat boosted navigation
 * to a page whose `(code revision, data version)` has not moved is served from IndexedDB with NO
 * request; a write clears the cache so the next nav re-fetches; and `/data/version` is the probe.
 *
 * The one write it performs (a section create) is deleted again — net zero.
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
const PORT = Number(arg("--port", "9351"));

let pass = 0; const fails = [];
const ok = (n, c, d) => { if (c) { pass++; console.log(`PASS  ${n}`); } else { fails.push(n); console.log(`FAIL  ${n}${d ? ` — ${d}` : ""}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); }
  static async attach(port) {
    let target = null;
    for (let i = 0; i < 80 && !target; i++) {
      try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); target = l.find((t) => t.type === "page" && t.webSocketDebuggerUrl); } catch { /* not up */ }
      if (!target) await sleep(250);
    }
    if (!target) throw new Error("chrome did not expose a debuggable page");
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener("open", res, { once: true }); ws.addEventListener("error", rej, { once: true }); });
    const cdp = new CDP(ws);
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      if (m.id && cdp.waiting.has(m.id)) { const w = cdp.waiting.get(m.id); cdp.waiting.delete(m.id); m.error ? w.reject(new Error(JSON.stringify(m.error))) : w.resolve(m.result); }
      else if (m.method === "Page.javascriptDialogOpening") { ws.send(JSON.stringify({ id: ++cdp.id, method: "Page.handleJavaScriptDialog", params: { accept: true } })); }
    });
    return cdp;
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.waiting.has(id)) { this.waiting.delete(id); reject(new Error(method + " timed out")); } }, 30000);
    });
  }
  async ev(expression) {
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval failed");
    return r.result.value;
  }
  async goto(path) {
    await this.send("Page.navigate", { url: BASE + path });
    const clean = path.split("?")[0];
    for (let i = 0; i < 160; i++) { const at = await this.ev("location.pathname").catch(() => null); if (at === clean) break; await sleep(100); }
    for (let i = 0; i < 160; i++) { if (await this.ev("typeof window.__AA_PAGECACHE__ === 'object' && !!window.__AA_PAGECACHE__").catch(() => false)) break; await sleep(100); }
    await sleep(300);
  }
  async clickNav(href) {
    await this.ev(`(function(){var a=document.querySelector('a[href=${JSON.stringify(href)}]');if(a){a.click();return true;}return false;})()`);
    const clean = href.split("?")[0];
    for (let i = 0; i < 160; i++) { const at = await this.ev("location.pathname").catch(() => null); if (at === clean) break; await sleep(100); }
    await sleep(500);
  }
}

const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "pc-"))}`, "--headless=new", "--no-first-run", "--disable-gpu", "--window-size=1400,900", "about:blank"], { stdio: "ignore" });

const ARM_SPY = `(function(){ window.__xhrs=[]; if(!XMLHttpRequest.prototype.__aaPatched){ XMLHttpRequest.prototype.__aaPatched=true; var o=XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open=function(m,u){ try{var p;try{p=new URL(String(u),location.href).pathname;}catch(e){p=String(u);}window.__xhrs.push(String(m).toUpperCase()+' '+p);}catch(e){} return o.apply(this,arguments); }; } })()`;
const XHR_TO = (path) => `(function(){return (window.__xhrs||[]).filter(function(x){return x.split(' ')[1]===${JSON.stringify(path)};}).length;})()`;

try {
  const cdp = await CDP.attach(PORT);
  await cdp.send("Page.enable"); await cdp.send("Runtime.enable");

  await cdp.goto("/login");
  await cdp.ev(`(function(){var f=document.querySelector("form.login");if(!f)return;f.querySelector('input[name="email"]').value=${JSON.stringify(EMAIL)};f.querySelector('input[type="password"]').value=${JSON.stringify(PASSWORD)};f.querySelector('button[type="submit"]').click();})()`);
  for (let i = 0; i < 80; i++) { const at = await cdp.ev("location.pathname").catch(() => null); if (at && !at.includes("login")) break; await sleep(150); }
  ok("authenticated", !String(await cdp.ev("location.pathname")).includes("login"));

  await cdp.goto("/dashboard");
  // The page meta's data version is often empty (dataVersionIfWarm); the cache seeds it from
  // /data/version, so wait for the key to become available.
  let key = null;
  for (let i = 0; i < 40; i++) { key = await cdp.ev("window.__AA_PAGECACHE__ ? window.__AA_PAGECACHE__.keyFor('/reports') : null").catch(() => null); if (key) break; await sleep(150); }
  ok("the page cache is ready and exposes its API", await cdp.ev("!!window.__AA_PAGECACHE__ && document.documentElement.getAttribute('data-pagecache')==='ready'"));
  ok("a cache key carries (cache-rev | identity | data-version | path)", typeof key === "string" && key.split("|").length === 4 && key.indexOf("/reports") >= 0 && key.indexOf("@") >= 0, String(key));

  // The loading spinner: htmx puts its request class on `#aa-loading` (named by `hx-indicator` on
  // <body>) for the duration of a request. Capture it at `htmx:beforeSend`, which fires after htmx has
  // added the class and before the send.
  await cdp.ev(`(function(){window.__ind=null;document.body.addEventListener("htmx:beforeSend",function(){var e=document.getElementById("aa-loading");window.__ind=!!e&&e.classList.contains("htmx-request");},true);})()`);
  await cdp.clickNav("/cashmemo"); // an uncached page: a real request
  let ind = false;
  for (let i = 0; i < 30; i++) { ind = await cdp.ev("window.__ind").catch(() => false); if (ind) break; await sleep(50); }
  ok("the loading spinner is shown during a request", ind === true, String(ind));
  await sleep(400);
  ok("...and hidden once the request settles", !(await cdp.ev("(function(){var e=document.getElementById('aa-loading');return !!e&&e.classList.contains('htmx-request');})()")));
  ok("...and the spinner markup exists in the shell", await cdp.ev("!!document.querySelector('#aa-loading .aa-spinner')"));

  // First visit: a MISS (real request), which stores the fragment.
  await cdp.clickNav("/reports");
  ok("first nav to /reports lands on it", (await cdp.ev("location.pathname")) === "/reports");
  let sizeAfterFirst = 0;
  for (let i = 0; i < 50; i++) { sizeAfterFirst = await cdp.ev("window.__AA_PAGECACHE__.size()").catch(() => 0); if (sizeAfterFirst >= 1) break; await sleep(150); }
  ok("the visited page is now cached", sizeAfterFirst >= 1, `size=${sizeAfterFirst}`);

  // Second visit: a HIT — no request for the page.
  await cdp.clickNav("/invoices");
  ok("nav to /invoices lands on it", (await cdp.ev("location.pathname")) === "/invoices");
  await cdp.ev(ARM_SPY);
  await cdp.clickNav("/reports");
  ok("returning to /reports lands on it", (await cdp.ev("location.pathname")) === "/reports");
  const reqs = await cdp.ev(XHR_TO("/reports"));
  ok("...and NO request was made for the cached page", reqs === 0, `xhr to /reports = ${reqs}`);
  ok("...and the cached page actually rendered", await cdp.ev(`(function(){var m=document.getElementById('app-main');return !!m && m.innerText.trim().length>0;})()`));
  ok("...and its nav survived as a boosted link (htmx.process ran)", await cdp.ev(`!!document.querySelector('#app-main a[hx-boost], #app-main a[href]')`));

  // A write clears the cache.
  await cdp.goto("/management/sections?new=1");
  const sizeBeforeWrite = await cdp.ev("window.__AA_PAGECACHE__.size()");
  const secName = "PC-" + Date.now().toString(36);
  await cdp.ev(`(function(){var f=document.querySelector("aa-entity-form form");f.querySelector('input[name="name"]').value=${JSON.stringify(secName)};f.querySelector('button[type="submit"]').click();})()`);
  await sleep(2500);
  const sizeAfterWrite = await cdp.ev("window.__AA_PAGECACHE__.size()");
  ok("a successful write clears the cache", sizeAfterWrite === 0, `before=${sizeBeforeWrite} after=${sizeAfterWrite}`);
  ok("the write itself succeeded (row present)", await cdp.ev(`document.body.innerText.includes(${JSON.stringify(secName)})`));

  // cleanup: delete the row we made (net zero)
  await cdp.ev(`(function(){var rows=document.querySelectorAll("#mgmt-table tbody tr");for(var i=0;i<rows.length;i++){if(rows[i].innerText.includes(${JSON.stringify(secName)})){var b=rows[i].querySelector('form[action$="/delete"] button');if(b){b.click();return true;}}}return false;})()`);
  await sleep(1200);
  ok("cleanup: the created row is gone (net zero)", !(await cdp.ev(`document.body.innerText.includes(${JSON.stringify(secName)})`)));

  // /data/version is the probe: shape + auth-gated.
  const ver = await cdp.ev(`fetch('/data/version',{headers:{'X-Requested-With':'XMLHttpRequest'},credentials:'same-origin'}).then(function(r){return r.json();}).then(function(j){return {version:j.version, hasVer:j.version!==undefined};}).catch(function(e){return {error:String(e)};})`);
  ok("GET /data/version returns the data version", ver && ver.hasVer, JSON.stringify(ver));

  console.log(`\n== pagecache: ${pass} passed, ${fails.length} failed ==`);
  if (fails.length) fails.forEach((f) => console.log("  - " + f));
} catch (error) {
  console.error("pagecache-check could not run:", error.message);
  fails.push(error.message);
} finally {
  chrome.kill();
}

process.exit(fails.length ? 1 : 0);
