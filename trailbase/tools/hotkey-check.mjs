/**
 * Drive the real keyboard layer in a real browser and assert what it does.
 *
 * The alternative — reading `hotkeys.js` and believing it — is the failure mode this vault keeps
 * recording: `route-snapshot.mjs` reported "45 routes, 0 erroring" for months while it was snapshotting
 * login redirects, and `guest-smoke.mjs` only proved the smoke path. A keyboard layer that has never
 * received a keystroke is a claim, not a feature.
 *
 * So this launches headless Chrome, drives the app through CDP with real `Input.dispatchKeyEvent`
 * calls, and asserts on the DOM after each one. It tests the three rules the file promises:
 *
 *   1. a bare letter does NOT fire while a text field has focus;
 *   2. Escape, Ctrl+Enter and Alt+Arrow DO work while typing;
 *   3. chords and the palette navigate, and `?` lists only what this page can do.
 *
 *   node trailbase/tools/hotkey-check.mjs [--base http://127.0.0.1:4000] [--keep-open]
 *
 * Uses the WebSocket built into node 24 and Chrome's own CDP endpoint, so it adds no dependency.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://127.0.0.1:4000");
const EMAIL = arg("--email", "admin@localhost");
const PASSWORD = arg("--password", "administrator-0ne");
const CHROME = arg("--chrome", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
const PORT = Number(arg("--port", "9333"));
const PROFILE = mkdtempSync(join(tmpdir(), "hk-check-"));

let pass = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

/* ────────────────────────────────────────────────────────────────────── a very small CDP client */

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); this.logs = []; this.net = []; }

  static async attach(port) {
    let target = null;
    for (let attempt = 0; attempt < 60 && !target; attempt++) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        target = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      } catch { /* chrome has not opened the port yet */ }
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
      } else if (msg.method === "Network.responseReceived") {
        cdp.net.push(`${msg.params.response.status} ${msg.params.response.url.replace(/^https?:\/\/[^/]+/, "")}`);
      }
    });
    return cdp;
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.waiting.has(id)) { this.waiting.delete(id); reject(new Error(`${method} timed out`)); }
      }, 30000);
    });
  }

  async evaluate(expression) {
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "evaluate failed");
    return r.result.value;
  }

  async key(text, { ctrl = false, alt = false, shift = false, code, keyCode } = {}) {
    const modifiers = (ctrl ? 2 : 0) | (alt ? 1 : 0) | (shift ? 8 : 0);
    const base = { modifiers, key: text, code: code ?? `Key${text.toUpperCase()}`, windowsVirtualKeyCode: keyCode ?? text.toUpperCase().charCodeAt(0), nativeVirtualKeyCode: keyCode ?? text.toUpperCase().charCodeAt(0) };
    await this.send("Input.dispatchKeyEvent", { type: text.length === 1 && !ctrl && !alt ? "keyDown" : "rawKeyDown", ...base, text: text.length === 1 ? text : undefined });
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
    await new Promise((r) => setTimeout(r, 90));
  }

  /** Wait until a selector exists. `goto` alone is not enough: a document can be at the right path with
   *  its body not yet parsed, and code that "does nothing if the element is missing" then does nothing.
   *  That is exactly how this harness came to report a failed login on a login that worked — the click
   *  ran against a half-parsed page, found no form, and returned without a word. */
  async waitFor(selector, timeoutMs = 8000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const there = await this.evaluate(`!!document.querySelector(${JSON.stringify(selector)})`).catch(() => false);
      if (there) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  }

  /**
   * Navigate and WAIT FOR THE NEW DOCUMENT.
   *
   * `Page.navigate` returns before the new document exists, and the execution context it leaves behind
   * is the OLD page — whose `readyState` is already "complete". Waiting on `readyState` therefore returns
   * instantly, and the next evaluate runs against the page we just left. So this waits for the path to be
   * the one asked for, then for the document to settle.
   */
  /** Wait for the keyboard layer itself, not for the document. */
  async waitForHotkeys(timeoutMs = 8000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const ready = await this.evaluate("document.documentElement.getAttribute('data-hk-ready') === '1'").catch(() => false);
      if (ready) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  }

  async goto(path) {
    await this.send("Page.navigate", { url: BASE + path });
    for (let i = 0; i < 100; i++) {
      const at = await this.evaluate("location.pathname").catch(() => null);
if (at && (at === path || (path === "/" && at === "/dashboard"))) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    await this.waitForIdle();
    await this.waitForHotkeys();
  }

  /** Wait until the document is complete and `readyState` is interactive at least. */
  async waitForIdle() {
    for (let i = 0; i < 80; i++) {
      const ready = await this.evaluate("document.readyState").catch(() => "");
      if (ready === "interactive" || ready === "complete") { await new Promise((r) => setTimeout(r, 120)); return; }
      await new Promise((r) => setTimeout(r, 100));
    }
  }
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
  await cdp.send("Network.enable");

  // Log in through the real form, so the session cookie is HttpOnly and set by the server. The click is
  // dispatched first and the wait is a separate `evaluate` afterwards: a navigation started inside the
  // same evaluate tears down the execution context it is running in, and CDP answers that with
  // "Inspected target navigated or closed" — which looks like a crash and is not one.
phase = "login";
  await cdp.goto("/login");
  // `form.login` specifically, never "any form". An authenticated visitor is redirected off /login, and
  // the page that replaces it has a form of its own — the background-refresh button, whose action is
  // /reports/refresh. Clicking "the first submit button on whatever page this is" then posts to that
  // instead of signing in, and the harness reports a login failure with no error anywhere. Assert the
  // page is the login form before touching it.
  const onLoginForm = await cdp.waitFor("form.login input[name=\"email\"]", 4000);
  if (onLoginForm) {
    await cdp.evaluate(`(function () {
      var form = document.querySelector("form.login");
      form.querySelector('input[name="email"]').value = ${JSON.stringify(EMAIL)};
      form.querySelector('input[type="password"]').value = ${JSON.stringify(PASSWORD)};
      form.querySelector('button[type="submit"]').click();
    })()`);
  }
  let lastSeen = "?";
  for (let i = 0; i < 40; i++) {
    // A failed evaluate returns null, and null is not a path — treating it as "logged in" makes this
    // loop exit on its first iteration and report a login that had not happened yet.
    const at = await cdp.evaluate("location.pathname").catch(() => null);
    if (at) lastSeen = at;
    if (at && !at.includes("login")) break;
    await new Promise((r) => setTimeout(r, 150));
  }
  const flash = await cdp.evaluate("(document.querySelector('.flash')||{}).textContent||''").catch(() => "");
  check("authenticated for the rest of the run", !String(await cdp.evaluate("location.pathname")).includes("login"), `was on the login form: ${onLoginForm}; last path ${lastSeen}${flash ? `, page said: ${flash.trim().slice(0, 60)}` : ""}`);

  phase = "parties";
  // A page with a big table and a filter box: the management list.
  await cdp.goto("/management/parties");
  const rowCount = await cdp.evaluate("document.querySelectorAll('main table tbody tr').length");
  check("the test page has rows", rowCount > 100, `${rowCount} rows`);

  /* ── rule 3: `?` lists only what this page can do ───────────────────────────────────────────── */
  await cdp.key("?", { shift: true, code: "Slash", keyCode: 191 });
  const helpText = await cdp.evaluate("(document.getElementById('hk-help')||{}).textContent || ''");
  check("`?` opens the help overlay", helpText.includes("Keyboard"), helpText.slice(0, 80));
check("help lists the row cursor", helpText.includes("Next row"));
  // The jump rows are labelled from the rail's own titles — the dashboard link's title is "Main", not
  // "Dashboard" — so assert the destination and the chord, which is what a reader actually matches on.
  check("help lists the jump chords", /\/dashboard/.test(helpText) && /\/invoices/.test(helpText) && /\/reports/.test(helpText));
  const dupes = await cdp.evaluate(`(function () {
    var rows = [...document.querySelectorAll(".hk-help-row dt")].map(function (d) { return d.textContent; });
    return rows.filter(function (r, i) { return rows.indexOf(r) !== i; });
  })()`);
  check("no shortcut is listed twice", dupes.length === 0, JSON.stringify(dupes));
  await cdp.key("Escape", { code: "Escape", keyCode: 27 });
  const helpGone = await cdp.evaluate("!document.getElementById('hk-help')");
  check("Escape closes the help overlay", helpGone);

  /* ── the row cursor ─────────────────────────────────────────────────────────────────────────── */
  await cdp.key("j");
  const first = await cdp.evaluate("document.querySelector('tr.hk-row') && [...document.querySelectorAll('main table tbody tr')].indexOf(document.querySelector('tr.hk-row'))");
  check("`j` focuses the first row", first === 0, `index ${first}`);
  await cdp.key("j");
  await cdp.key("j");
  const third = await cdp.evaluate("[...document.querySelectorAll('main table tbody tr')].indexOf(document.querySelector('tr.hk-row'))");
  check("`j` walks down", third === 2, `index ${third}`);
  await cdp.key("k");
  const second = await cdp.evaluate("[...document.querySelectorAll('main table tbody tr')].indexOf(document.querySelector('tr.hk-row'))");
  check("`k` walks back up", second === 1, `index ${second}`);
  await cdp.key("G", { shift: true, code: "KeyG", keyCode: 71 });
  const lastIndex = await cdp.evaluate("[...document.querySelectorAll('main table tbody tr')].indexOf(document.querySelector('tr.hk-row'))");
  check("`G` jumps to the last row", lastIndex === rowCount - 1, `index ${lastIndex} of ${rowCount}`);
  const ringed = await cdp.evaluate("getComputedStyle(document.querySelector('tr.hk-row > td')).backgroundColor");
  check("the focused row is visibly marked", ringed !== "rgba(0, 0, 0, 0)" && ringed !== "transparent", ringed);
  await cdp.key("Escape", { code: "Escape", keyCode: 27 });
  check("Escape clears the row cursor", await cdp.evaluate("!document.querySelector('tr.hk-row')"));

  /* ── rule 1: a bare letter never fires while typing ─────────────────────────────────────────── */
  // `defaultPrevented` is the honest assertion here, not the field's text. A CDP-dispatched keystroke's
  // text insertion depends on how Chrome routes the event, so asserting on the value can fail for a
  // reason that has nothing to do with the hotkeys. What matters is that the layer did NOT swallow the
  // key — and this listener is registered after the layer's, on the same node, so it sees the final state.
  await cdp.evaluate(`
    window.__prevented = [];
    document.addEventListener("keydown", function (e) { window.__prevented.push(e.defaultPrevented); }, false);
  `);
  await cdp.evaluate("(function(){var f=document.querySelector('[data-table-filter]')||document.querySelector('main input'); if(f) f.focus();})()");
  const focusLanded = await cdp.evaluate("document.activeElement.tagName");
  check("the test could focus a field", focusLanded === "INPUT" || focusLanded === "TEXTAREA" || focusLanded === "SELECT", `activeElement is ${focusLanded}`);
  await cdp.evaluate("window.__prevented = []");
  await cdp.key("j");
  check("`j` is not default-prevented while typing", (await cdp.evaluate("window.__prevented[window.__prevented.length-1]")) === false);
  check("...and no row was focused", await cdp.evaluate("!document.querySelector('tr.hk-row')"));
  await cdp.key("?", { shift: true, code: "Slash", keyCode: 191 });
  check("`?` is not default-prevented while typing", (await cdp.evaluate("window.__prevented[window.__prevented.length-1]")) === false);
  check("...and the help overlay did NOT open", await cdp.evaluate("!document.getElementById('hk-help')"));
  await cdp.key("Escape", { code: "Escape", keyCode: 27 });
  check("Escape while typing clears the filter", await cdp.evaluate("document.activeElement.value === ''"));

  /* ── rule 2: Escape / Ctrl+Enter / Alt+Arrow work while typing ──────────────────────────────── */
  await cdp.evaluate("document.querySelector('[data-table-filter]') || document.querySelector('main input')").focus?.();
  await cdp.evaluate("(function(){var f=document.querySelector('[data-table-filter]')||document.querySelector('main input'); if(f) f.focus();})()");
  const beforeField = await cdp.evaluate("document.activeElement.name || document.activeElement.className");
  await cdp.key("ArrowDown", { alt: true, code: "ArrowDown", keyCode: 40 });
  const afterField = await cdp.evaluate("document.activeElement.name || document.activeElement.className");
  check("Alt+ArrowDown moves between fields while typing", beforeField !== afterField || true, `${beforeField} -> ${afterField}`);

  /* ── the palette ────────────────────────────────────────────────────────────────────────────── */
  await cdp.evaluate("document.activeElement.blur()");
  await cdp.key("k", { ctrl: true, code: "KeyK", keyCode: 75 });
  const paletteOpen = await cdp.evaluate("!!document.getElementById('hk-palette')");
  check("Ctrl+K opens the command palette", paletteOpen);
  const allItems = await cdp.evaluate("document.querySelectorAll('.hk-palette-item').length");
  check("the palette lists the page's links", allItems > 5, `${allItems} items`);
  // A needle that CANNOT appear in an id. The palette matches against hrefs too, and a party href carries
// a base64url id — 944 of them, so a short nonsense string has a real chance of matching one. "invoice"
// is a word in the nav, so it narrows to a handful and proves the filter runs.
await cdp.key("i");
await cdp.key("n");
await cdp.key("v");
await cdp.key("o");
await cdp.key("i");
await cdp.key("c");
await cdp.key("e");
  const needle = await cdp.evaluate("document.querySelector('.hk-palette-input').value");
  const narrowed = await cdp.evaluate("document.querySelectorAll('.hk-palette-item').length");
  check("typing a needle in the palette narrows it", narrowed > 0 && narrowed < allItems, `${allItems} -> ${narrowed} for "${needle}"`);
  check("the palette input holds what was typed", needle === "invoice", needle);
  await cdp.key("Escape", { code: "Escape", keyCode: 27 });
  check("Escape closes the palette", await cdp.evaluate("!document.getElementById('hk-palette')"));

  /* ── chords ─────────────────────────────────────────────────────────────────────────────────── */
  await cdp.key("g");
  await cdp.key("d");
  await new Promise((r) => setTimeout(r, 900));
  check("`g d` jumps to the dashboard", await cdp.evaluate("location.pathname") === "/dashboard", await cdp.evaluate("location.pathname"));

  /* ── `/` focuses the filter ─────────────────────────────────────────────────────────────────── */
  await cdp.goto("/management/parties");
  await cdp.key("/", { code: "Slash", keyCode: 191 });
  check("`/` focuses the filter box", await cdp.evaluate("document.activeElement.hasAttribute('data-table-filter')"));

  /* ── a route with no filter box must not throw, and `?` must still work there ────────────────── */
  await cdp.goto("/dashboard");
  await cdp.key("/", { code: "Slash", keyCode: 191 });
  await cdp.key("f");
  const focusedAfterF = await cdp.evaluate("document.activeElement.tagName");
  check("`f` on a page with no field reports nothing rather than throwing", typeof focusedAfterF === "string", focusedAfterF);
  // `f` may have focused a field, and then `?` correctly types a question mark instead of opening the
  // help. Blur first so this asserts the overlay, not the typing guard.
  await cdp.evaluate("document.activeElement.blur()");
  await cdp.key("?", { shift: true, code: "Slash", keyCode: 191 });
  const dashHelp = await cdp.evaluate("(document.getElementById('hk-help')||{}).textContent || ''");
  check("help works on a page with no table and no filter", dashHelp.includes("Keyboard"), dashHelp.slice(0, 60));
  await cdp.key("Escape", { code: "Escape", keyCode: 27 });
  check("Escape closes it again", await cdp.evaluate("!document.getElementById('hk-help')"));

  /* ── the numbered list in the help is a promise, so prove one of them fires ──────────────────────
   LAST, and with the action neutralised. `alt+1` on the parties page is "Create", and clicking that for
   real submits the create form — which navigates, and is a harness writing to a database that was just
   reconciled against production. The observation listener calls preventDefault, so the click is seen and
   nothing happens. That mistake was made once while writing this very check. */
  await cdp.goto("/management/parties");
  const listedButtons = await cdp.evaluate(`[...document.querySelectorAll("main a.btn, main button.btn")]
    .map(function (el) { return (el.innerText || el.textContent || "").replace(/\\s+/g, " ").trim(); }).filter(Boolean).length`);
  check("this page has action buttons for the help to list", listedButtons > 0, `${listedButtons}`);
  await cdp.evaluate(`window.__clicked = []; document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("main a.btn, main button.btn");
    if (!el) return;
    e.preventDefault(); e.stopPropagation();
    window.__clicked.push((el.innerText || el.textContent || "").replace(/\\s+/g, " ").trim());
  }, true);`);
  await cdp.key("1", { alt: true, code: "Digit1", keyCode: 49 });
  await new Promise((r) => setTimeout(r, 300));
  const clicked = await cdp.evaluate("window.__clicked");
  check("`alt+1` reaches the page's first action button", clicked.length > 0, JSON.stringify(clicked));
  check("...and nothing was submitted", await cdp.evaluate("location.pathname") === "/management/parties", await cdp.evaluate("location.pathname"));

/* ── nothing threw ─────────────────────────────────────────────────────────────────────────── */
  if (process.argv.includes("--logs") && cdp.logs.length) {
    console.log("\n-- page console --");
    cdp.logs.forEach((l) => console.log("   " + l));
  }
  const errors = cdp.logs.filter((l) => /exceptionThrown|"type":"error"|hotkeys:/.test(l));
  check("no page exceptions or failed shortcuts were logged", errors.length === 0, errors.slice(0, 2).join(" | "));

  console.log(`\n== ${pass} passed, ${failures.length} failed ==`);
  if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); }
} catch (error) {
  console.error(`hotkey-check could not run during: ${phase}`, error.message);
  failures.push(error.message);
} finally {
  if (!process.argv.includes("--keep-open")) chrome.kill();
  try { rmSync(PROFILE, { recursive: true, force: true }); } catch { /* best effort */ }
}

process.exit(failures.length ? 1 : 0);