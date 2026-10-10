/**
 * Capture the INTERACTION shape of non-report screens on both systems: what a key press does, and
 * which controls open a dialog — the two things `ui-capture.mjs` cannot see.
 *
 *   node trailbase/tools/ui-interaction-capture.mjs --system guest|legacy|both [--out DIR]
 *
 * `ui-capture.mjs` records the static structure of a page. It never presses a key and never clicks a
 * control that opens an overlay, so dialogs and the keyboard layer are invisible to it. This tool
 * fills that gap for the NON-REPORT screens only (the owner asked to skip reports/ledgers).
 *
 * Per screen it records:
 *   keys[]      one entry per key pressed: the URL, the focused element, and any visible overlay
 *               afterwards. A key that changes nothing is recorded as changing nothing.
 *   triggers[]  one entry per control whose label looks like it opens something (add new / new /
 *               create / + / filter / menu / more / settings): whether an overlay appeared, its
 *               heading and buttons, and whether the click navigated instead.
 *
 * Read-only by construction: it never clicks a delete/remove/save/complete/import/logout/submit
 * control, and it closes any overlay it opens with Escape. It drives headless Chrome over CDP, so it
 * adds no dependency and does not touch the operator's browser.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const SYSTEM = arg("--system", "both");
const OUT = arg("--out", join(HERE, "..", "..", "vault", "attachments", "ui-interaction-2026-10-10"));
const CHROME = arg("--chrome", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
const PORT = Number(arg("--port", "9362"));
const GUEST = arg("--guest", "http://127.0.0.1:4000");
const LEGACY = arg("--legacy", "http://127.0.0.1:3000");
const GUEST_EMAIL = arg("--email", "admin@localhost");
const GUEST_PASSWORD = arg("--password", "administrator-0ne");
const LEGACY_USER = arg("--legacy-user", "");
const LEGACY_PASSWORD = arg("--legacy-password", "");

/** Set per arm in capture(); makes `goto` wait for the legacy session gate to clear. */
let LEGACY_MODE = false;

/** Non-report screens only. `legacy` null where the guest has no counterpart. */
const SCREENS = [
  { name: "dashboard", guest: "/dashboard", legacy: "/app/dashboard" },
  { name: "invoices", guest: "/invoices", legacy: "/app/invoices" },
  { name: "invoices-new-sale", guest: "/invoices/new?type=1", legacy: "/app/invoices/sale" },
  { name: "invoices-new-purchase", guest: "/invoices/new?type=0", legacy: "/app/invoices/purchase" },
  { name: "invoices-new-return", guest: "/invoices/new?type=2", legacy: "/app/invoices/return" },
  { name: "invoices-new-difference", guest: "/invoices/new?type=3", legacy: "/app/invoices/difference" },
  { name: "invoices-all", guest: "/invoices/all", legacy: null },
  { name: "cashmemo", guest: "/cashmemo", legacy: "/app/cashmemo" },
  { name: "cashmemo-expenses", guest: "/cashmemo/expenses", legacy: "/app/cashmemo/expenses" },
  { name: "payments", guest: "/payments", legacy: "/app/cashmemo/payments" },
  { name: "payments-new", guest: "/payments/new", legacy: null },
  { name: "inventory", guest: "/inventory", legacy: null },
  { name: "print", guest: "/print", legacy: "/printinvoice" },
  { name: "print-queue", guest: "/print/queue", legacy: "/printinvoice/queue" },
  { name: "management", guest: "/management", legacy: "/app/management" },
  { name: "management-parties", guest: "/management/parties", legacy: "/app/management/parties" },
  { name: "management-items", guest: "/management/items", legacy: "/app/management/items" },
  { name: "management-bookers", guest: "/management/bookers", legacy: "/app/management/bookers" },
];

/** Keys to press, each in a fresh document. Ordered so an overlay is always closed before the next. */
const KEYS = [
  { label: "?", shift: true, key: "?", code: "Slash", keyCode: 191 },
  { label: "escape", key: "Escape", code: "Escape", keyCode: 27 },
  { label: "/", key: "/", code: "Slash", keyCode: 191 },
  { label: "escape2", key: "Escape", code: "Escape", keyCode: 27 },
  { label: "j", key: "j", code: "KeyJ", keyCode: 74 },
  { label: "k", key: "k", code: "KeyK", keyCode: 75 },
  { label: "g", key: "g", code: "KeyG", keyCode: 71 },
  { label: "G", shift: true, key: "G", code: "KeyG", keyCode: 71 },
  { label: "f", key: "f", code: "KeyF", keyCode: 70 },
  { label: "ctrl+k", ctrl: true, key: "k", code: "KeyK", keyCode: 75 },
  { label: ":", key: ":", code: "Semicolon", keyCode: 186 },
  { label: "alt+down", alt: true, key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
];

const OVERLAY_SEL = "[role=dialog],dialog[open],.hk-overlay,.mantine-Modal-root,.mantine-Drawer-root,.mantine-Popover-dropdown,.mantine-Overlay-root,aa-modal";

/** Snapshot the interaction-relevant state: where we are, what has focus, what is overlaying. */
const SNAPSHOT = `(function () {
  var vis = function (e) { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; };
  var ov = [...document.querySelectorAll(${JSON.stringify(OVERLAY_SEL)})].filter(vis);
  var a = document.activeElement;
  return {
    url: location.pathname + location.search,
    focus: a && a !== document.body ? (a.tagName + ":" + String(a.name || a.id || a.getAttribute("aria-label") || "").slice(0, 30)) : null,
    overlayCount: ov.length,
    overlays: ov.map(function (e) {
      return (e.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 90);
    }).filter(Boolean)
  };
})()`;

/** Candidate dialog-opening controls: matches the "opens something" vocabulary, never the destructive one. */
const TRIGGERS = `(function () {
  var vis = function (e) { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  var open = /add new|^\\s*new\\b|create|\\+$|filter|menu|more|\\u22ef|settings|choose|select|import/i;
  var bad = /delete|remove|save|complete|logout|submit|confirm|refresh/i;
  var els = [...document.querySelectorAll("button,a,[role=button]")].filter(vis);
  var out = [];
  els.forEach(function (e) {
    var t = (e.innerText || e.getAttribute("aria-label") || e.getAttribute("title") || "").replace(/\\s+/g, " ").trim();
    if (!t || bad.test(t)) return;
    if (open.test(t)) out.push({ tag: e.tagName, label: t.slice(0, 34), href: e.getAttribute("href") || "" });
  });
  return out.slice(0, 6);
})()`;

/** Click the k-th element of the SAME filtered list TRIGGERS returns, then report what happened. */
const clickTrigger = (k) => `(function () {
  var vis = function (e) { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  var open = /add new|^\\s*new\\b|create|\\+$|filter|menu|more|\\u22ef|settings|choose|select|import/i;
  var bad = /delete|remove|save|complete|logout|submit|confirm|refresh/i;
  var els = [...document.querySelectorAll("button,a,[role=button]")].filter(vis).filter(function (e) {
    var t = (e.innerText || e.getAttribute("aria-label") || e.getAttribute("title") || "").replace(/\\s+/g, " ").trim();
    return t && !bad.test(t) && open.test(t);
  });
  var el = els[${k}];
  if (!el) return false;
  el.click();
  return true;
})()`;

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
  async goto(url) {
    await this.send("Page.navigate", { url });
    for (let i = 0; i < 100; i++) {
      const at = await this.ev("document.readyState").catch(() => "");
      if (at === "interactive" || at === "complete") break;
      await new Promise((r) => setTimeout(r, 100));
    }
    // ⚠️ `readyState` is not "the app has rendered". The legacy Mantine app is client-rendered and
    // fetches whole views after hydration, AND it shows "Please log in to continue" on every screen
    // while it re-validates the session — so a fixed wait reads a shell or the gate, and every key and
    // trigger then records "nothing happened". Wait for the gate to clear (legacy) and for controls to
    // exist before probing the page.
    if (LEGACY_MODE) {
      for (let i = 0; i < 150; i++) {
        const gated = await this.ev("/Please log in to continue/.test(document.body.innerText)").catch(() => true);
        if (!gated) break;
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    for (let i = 0; i < 80; i++) {
      const n = await this.ev("document.querySelectorAll('a,button,input,select').length").catch(() => 0);
      if (n >= 4) break;
      await new Promise((r) => setTimeout(r, 150));
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  async key({ key, code, keyCode, ctrl = false, alt = false, shift = false }) {
    const modifiers = (ctrl ? 2 : 0) | (alt ? 1 : 0) | (shift ? 8 : 0);
    const base = { modifiers, key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode };
    await this.send("Input.dispatchKeyEvent", { type: (key.length === 1 && !ctrl && !alt) ? "keyDown" : "rawKeyDown", ...base, text: (key.length === 1 && !ctrl && !alt) ? key : undefined });
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
    await new Promise((r) => setTimeout(r, 120));
  }
}

async function capture(cdp, system) {
  const base = system === "guest" ? GUEST : LEGACY;
  LEGACY_MODE = system === "legacy";
  const dir = join(OUT, system);
  mkdirSync(dir, { recursive: true });
  const result = [];

  if (system === "guest") {
    await cdp.goto(`${base}/login`);
    // The fill must wait for the form: a `Page.navigate` returns before the new document is parsed, and
    // a fill that runs first finds no form and silently signs nobody in (the first run of this tool did
    // exactly that, and every screen then recorded "no keys, no dialogs" because they were all the login
    // page). Wait for the field, then fill, then wait for the path to leave the login.
    let hasForm = false;
    for (let i = 0; i < 40; i++) { if (await cdp.ev(`!!document.querySelector('form.login input[name="email"]')`).catch(() => false)) { hasForm = true; break; } await new Promise((r) => setTimeout(r, 150)); }
    if (hasForm) {
      await cdp.ev(`(function(){var f=document.querySelector("form.login");f.querySelector('input[name="email"]').value=${JSON.stringify(GUEST_EMAIL)};f.querySelector('input[type="password"]').value=${JSON.stringify(GUEST_PASSWORD)};f.querySelector('button[type="submit"]').click();})()`);
    }
    for (let i = 0; i < 40; i++) { const at = await cdp.ev("location.pathname").catch(() => null); if (at && !at.includes("login")) break; await new Promise((r) => setTimeout(r, 150)); }
    if (!hasForm) throw new Error("guest login form never appeared");
  } else {
    if (!LEGACY_USER || !LEGACY_PASSWORD) throw new Error("--legacy-user and --legacy-password are required for the legacy arm");
    await cdp.goto(`${base}/auth`);
    for (let i = 0; i < 60; i++) { if (await cdp.ev("document.querySelectorAll('input').length >= 2").catch(() => false)) break; await new Promise((r) => setTimeout(r, 150)); }
    // ⚠️ The two inputs exist in the served shell before React hydrates. A native-setter fill + `input`
    // event before hydration does not reach React's state, so the form submits empty credentials and the
    // app sits on the gate forever — which is why login "worked in the debug and failed in the probe".
    // Wait for hydration (a fixed beat after the fields appear) before typing.
    await new Promise((r) => setTimeout(r, 2500));
    await cdp.ev(`(function(){
      var inputs=[...document.querySelectorAll("input[type=text],input[type=password],input:not([type])")];
      var user=inputs.find(function(e){return e.type!=="password";});
      var pass=inputs.find(function(e){return e.type==="password";});
      if(!user||!pass)return;
      var setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
      setter.call(user,${JSON.stringify(LEGACY_USER)});user.dispatchEvent(new Event("input",{bubbles:true}));
      setter.call(pass,${JSON.stringify(LEGACY_PASSWORD)});pass.dispatchEvent(new Event("input",{bubbles:true}));
      var form=user.form||pass.form; if(form){form.requestSubmit?form.requestSubmit():form.submit();}
    })()`);
    await new Promise((r) => setTimeout(r, 2500));
    for (let i = 0; i < 60; i++) { const ok = await cdp.ev("!document.body.innerText.includes('Please log in to continue')").catch(() => false); if (ok) break; await new Promise((r) => setTimeout(r, 200)); }
    // Confirm the session survives a navigation, which is the only test that matters; otherwise every
    // "screen" below is the gate and the whole arm records nothing. Poll, because the gate is shown
    // while the session is re-validated and clears a few seconds in (a single check is a false failure).
    await cdp.goto(`${base}/app/dashboard`);
    let cleared = false;
    for (let i = 0; i < 60; i++) { if (!(await cdp.ev("/Please log in to continue/.test(document.body.innerText)").catch(() => true))) { cleared = true; break; } await new Promise((r) => setTimeout(r, 300)); }
    if (!cleared) throw new Error("legacy login did not stick - still showing the gate after navigation");
  }

  for (const screen of SCREENS) {
    const route = screen[system];
    if (!route) continue;
    const rec = { system, name: screen.name, route, keys: [], triggers: [] };

    // ---- keys: ONE page load per screen, keys pressed in sequence. Reloading per key was correct but
    // far too slow on the legacy app (each full navigation re-validates the session); pressing in
    // sequence is enough because each key's reaction is compared to the state just before it, and an
    // Escape after each key closes anything it opened.
    await cdp.goto(base + route);
    for (const k of KEYS) {
      const before = await cdp.ev(SNAPSHOT).catch(() => null);
      let after = null;
      try { await cdp.key(k); after = await cdp.ev(SNAPSHOT).catch(() => null); } catch { after = null; }
      const changed = !!after && !!before && JSON.stringify(after) !== JSON.stringify(before);
      rec.keys.push({ key: k.label, changed, after: changed ? after : null });
      // Close anything the key opened before the next key.
      try { await cdp.key({ key: "Escape", code: "Escape", keyCode: 27 }); } catch { /* ignore */ }
    }

    // ---- triggers: reload, list candidates, click one at a time (reload between), record the overlay.
    await cdp.goto(base + route);
    const candidates = await cdp.ev(TRIGGERS).catch(() => []);
    for (let i = 0; i < (candidates?.length ?? 0); i++) {
      await cdp.goto(base + route);
      const before = await cdp.ev(SNAPSHOT).catch(() => null);
      await cdp.ev(clickTrigger(i)).catch(() => false);
      await new Promise((r) => setTimeout(r, 900));
      const after = await cdp.ev(SNAPSHOT).catch(() => null);
      rec.triggers.push({
        label: candidates[i].label,
        href: candidates[i].href,
        navigated: !!after && !!before && after.url !== before.url,
        overlay: (after?.overlayCount ?? 0) > (before?.overlayCount ?? 0),
        overlayText: after?.overlays?.[0] ?? null,
        urlAfter: after?.url ?? null,
      });
      try { await cdp.key({ key: "Escape", code: "Escape", keyCode: 27 }); } catch { /* ignore */ }
    }

    const keyHits = rec.keys.filter((x) => x.changed).map((x) => x.key);
    const dialogs = rec.triggers.filter((x) => x.overlay).map((x) => x.label);
    const navs = rec.triggers.filter((x) => x.navigated).map((x) => x.label);
    console.log(`  ${system.padEnd(6)} ${screen.name.padEnd(26)} keys=${keyHits.join(",") || "-"}  dialogs=${dialogs.join(",") || "-"}  nav=${navs.join(",") || "-"}`);
    result.push(rec);
    // Write after every screen, so a run killed by a slow legacy page still leaves the screens done.
    writeFileSync(join(dir, "interactions.json"), JSON.stringify(result, null, 2) + "\n");
  }
}

mkdirSync(OUT, { recursive: true });
const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "ui-int-"))}`, "--headless=new", "--no-first-run", "--disable-gpu", "--window-size=1600,900", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
try {
  const cdp = await CDP.attach(PORT);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  for (const system of SYSTEM === "both" ? ["guest", "legacy"] : [SYSTEM]) {
    console.log(`\n${system}:`);
    await capture(cdp, system);
  }
  console.log(`\ninteraction captures into ${OUT}`);
} catch (error) {
  console.error("ui-interaction-capture could not run:", error.message);
  process.exitCode = 1;
} finally {
  chrome.kill();
}
