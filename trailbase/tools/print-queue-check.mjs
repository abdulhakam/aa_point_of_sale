/**
 * Drive the print QUEUE in a real browser and assert the legacy flow works end to end.
 *
 * The queue is browser-local (`localStorage["print-queue"]`) and the queue page is a server render
 * driven by `?ids=`, so "the routes answer 200" (route-snapshot) and "the pages render" (guest-smoke)
 * both pass while the thing the operator actually does — add two invoices, see them in the rail, print
 * them, clear them — is unverified. This closes that gap the same way `hotkey-check.mjs` does: real
 * headless Chrome over CDP with real clicks, no dependency (node 24's WebSocket + Chrome's endpoint).
 *
 *   node trailbase/tools/print-queue-check.mjs [--base http://127.0.0.1:4000] [--keep-open]
 *
 * Needs a running, seeded server (the dev server on :4000 is fine).
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(n);
const BASE = arg("--base", "http://127.0.0.1:4000");
const EMAIL = arg("--email", "admin@localhost");
const PASSWORD = arg("--password", "administrator-0ne");
const CHROME = arg("--chrome", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
const PORT = Number(arg("--port", "9334"));
const KEEP = has("--keep-open");
const PROFILE = mkdtempSync(join(tmpdir(), "pq-check-"));

let pass = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

/* ────────────────────────────────────────────────────────────────────── a very small CDP client */
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); this.logs = []; }
  static async attach(port) {
    let target = null;
    for (let attempt = 0; attempt < 60 && !target; attempt++) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        target = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      } catch { /* not up yet */ }
      if (!target) await new Promise((r) => setTimeout(r, 250));
    }
    if (!target) throw new Error("chrome did not expose a debuggable page");
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
    const cdp = new CDP(ws);
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && cdp.waiting.has(msg.id)) {
        const { resolve, reject } = cdp.waiting.get(msg.id);
        cdp.waiting.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method === "Runtime.consoleAPICalled" || msg.method === "Runtime.exceptionThrown") {
        cdp.logs.push(JSON.stringify(msg.params).slice(0, 300));
      }
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
  async evaluate(expression) {
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "evaluate failed");
    return r.result.value;
  }
  async waitFor(selector, timeoutMs = 8000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.evaluate(`!!document.querySelector(${JSON.stringify(selector)})`).catch(() => false)) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  }
  /** Wait until location.pathname equals `path` (or starts with it when `prefix`). */
  async waitForPath(path, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const at = await this.evaluate("location.pathname").catch(() => null);
      if (at === path) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  }
  async goto(path) {
    await this.send("Page.navigate", { url: BASE + path });
    for (let i = 0; i < 100; i++) {
      const at = await this.evaluate("location.pathname").catch(() => null);
      if (at === path) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    for (let i = 0; i < 80; i++) {
      const ready = await this.evaluate("document.readyState").catch(() => "");
      if (ready === "interactive" || ready === "complete") { await new Promise((r) => setTimeout(r, 150)); break; }
      await new Promise((r) => setTimeout(r, 100));
    }
    // Wait for the print-queue layer itself. The picker's controls are in the initial HTML, so
    // `readyState` is not enough: a `change` dispatched before this file has run does nothing.
    for (let i = 0; i < 40; i++) {
      if (await this.evaluate(`document.documentElement.getAttribute("data-pq-ready") === "1"`).catch(() => false)) break;
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  async click(selector) {
    return this.evaluate(`(function () {
      var el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return "missing";
      el.click();
      return "clicked";
    })()`);
  }
  queue() { return this.evaluate(`localStorage.getItem("print-queue")`); }
}

/* ─────────────────────────────────────────────────────────────────────────────────────── the run */
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  "--headless=new",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-gpu",
  "--window-size=1400,900",
  "about:blank",
], { stdio: "ignore" });

let cdp;
let phase = "attach";
try {
  cdp = await CDP.attach(PORT);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  phase = "login";
  await cdp.goto("/login");
  if (await cdp.waitFor('form.login input[name="email"]', 4000)) {
    await cdp.evaluate(`(function () {
      var f = document.querySelector("form.login");
      f.querySelector('input[name="email"]').value = ${JSON.stringify(EMAIL)};
      f.querySelector('input[type="password"]').value = ${JSON.stringify(PASSWORD)};
      f.querySelector('button[type="submit"]').click();
    })()`);
  }
  for (let i = 0; i < 40; i++) {
    const at = await cdp.evaluate("location.pathname").catch(() => null);
    if (at && !at.includes("login")) break;
    await new Promise((r) => setTimeout(r, 150));
  }
  check("authenticated", !String(await cdp.evaluate("location.pathname")).includes("login"));

  /* ── the picker, and two real invoices to queue ─────────────────────────────────────────────── */
  phase = "picker";
  await cdp.goto("/print");
  await cdp.evaluate(`localStorage.removeItem("print-queue")`);
  check("picker renders the legacy controls",
    (await cdp.waitFor("[data-print-invoice]")) &&
    (await cdp.evaluate(`!!document.querySelector("[data-print-type]")`)) &&
    (await cdp.evaluate(`!!document.querySelector("[data-print-queue]")`)) &&
    (await cdp.evaluate(`!!document.querySelector("[data-pq-goto]")`)));

  const invs = await cdp.evaluate(`[...document.querySelectorAll("[data-print-invoice] option")].map(function (o) { return { id: o.value, no: o.textContent.trim() }; }).slice(0, 2)`);
  check("picker lists invoices to choose from", invs.length === 2, JSON.stringify(invs));
  const [invA, invB] = invs;
  if (!invA || !invB) throw new Error("need two invoices in the depot for this check");

  /* ── live preview on selection ──────────────────────────────────────────────────────────────── */
  await cdp.evaluate(`(function () {
    var s = document.querySelector("[data-print-invoice]");
    s.value = ${JSON.stringify(invA.id)};
    s.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  const frameSrc = await cdp.evaluate(`(document.querySelector("[data-print-frame]")||{}).src || ""`);
  check("choosing an invoice previews it", frameSrc.includes("/invoices/") && frameSrc.endsWith("/view"), frameSrc);
  const openHref = await cdp.evaluate(`(function () { var a = document.querySelector("[data-print-open]"); return a && !a.hidden ? a.getAttribute("href") : ""; })()`);
  check("choosing an invoice enables 'Open in new tab'", openHref.includes(invA.id) && openHref.endsWith("/view"), openHref);

  /* ── Add to Print Queue, twice on the same sheet (dedupe) ───────────────────────────────────── */
  phase = "add";
  await cdp.goto("/invoices/" + invA.id + "/view");
  check("sheet has the legacy actions",
    (await cdp.evaluate(`!!document.querySelector("[data-pq-add]")`)) &&
    (await cdp.evaluate(`!!document.querySelector("[data-print]")`)));
  await cdp.click("[data-pq-add]");
  await new Promise((r) => setTimeout(r, 150));
  await cdp.click("[data-pq-add]");
  await new Promise((r) => setTimeout(r, 150));
  const afterOne = JSON.parse((await cdp.queue()) || "[]");
  check("adding the same invoice twice queues it once", afterOne.length === 1 && afterOne[0].id === invA.id, await cdp.queue());

  await cdp.goto("/invoices/" + invB.id + "/view");
  await cdp.click("[data-pq-add]");
  await new Promise((r) => setTimeout(r, 150));
  const afterTwo = JSON.parse((await cdp.queue()) || "[]");
  check("adding a second invoice queues it", afterTwo.length === 2, await cdp.queue());

  /* ── the rail shows the queue ───────────────────────────────────────────────────────────────── */
  phase = "rail";
  await cdp.goto("/print");
  const rail = await cdp.evaluate(`document.querySelectorAll("[data-print-queue] .pq-item").length`);
  check("the picker rail shows the queued invoices", rail === 2, `${rail} items`);

  /* ── Print Invoices opens the queue page with both sheets ───────────────────────────────────── */
  phase = "queue";
  await cdp.click("[data-pq-goto]");
  await cdp.waitForPath("/print/queue");
  await cdp.evaluate("document.readyState");
  await new Promise((r) => setTimeout(r, 400));
  const docs = await cdp.evaluate(`document.querySelectorAll("[data-invoice-doc]").length`);
  const idsParam = await cdp.evaluate(`new URLSearchParams(location.search).get("ids") || ""`);
  check("Print Invoices renders one A5 sheet per queued invoice", docs === 2, `${docs} docs; url=${idsParam}`);
  check("the queue page is A5", (await cdp.evaluate(`document.body.getAttribute("data-paper")`)) === "a5");

  /* ── remove one, then clear ─────────────────────────────────────────────────────────────────── */
  phase = "remove";
  await cdp.click("[data-pq-remove]");
  await cdp.waitForPath("/print/queue");
  await new Promise((r) => setTimeout(r, 400));
  const afterRemove = JSON.parse((await cdp.queue()) || "[]");
  check("removing a sheet drops it from the queue", afterRemove.length === 1, await cdp.queue());

  phase = "clear";
  await cdp.click("[data-pq-clear]");
  await cdp.waitForPath("/print/queue");
  await new Promise((r) => setTimeout(r, 400));
  check("Clear Queue empties the browser queue", (await cdp.queue()) === "[]" || (await cdp.queue()) === null, await cdp.queue());
  check("an empty queue page says so", await cdp.evaluate(`/Nothing in queue/.test(document.body.textContent)`));
} catch (error) {
  failures.push(`phase ${phase} threw: ${error.message}`);
  console.log(`FAIL  phase ${phase} threw: ${error.message}`);
} finally {
  if (!KEEP) {
    try { chrome.kill(); } catch { /* best effort */ }
    try { rmSync(PROFILE, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

console.log(`\n== ${pass}/${pass + failures.length} checks passed ==`);
if (failures.length) { console.log(failures.map((f) => "  - " + f).join("\n")); process.exit(1); }
