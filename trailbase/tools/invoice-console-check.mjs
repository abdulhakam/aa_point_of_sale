/**
 * The invoice console's keyboard surface, driven with real keystrokes in a real browser.
 *
 *   node trailbase/tools/invoice-console-check.mjs [--base http://127.0.0.1:4000]
 *        [--cookie "auth_token=…"] [--email …] [--password …] [--chrome <path>] [--port N]
 *
 * The console (`<aa-invoice-view>` on `GET /invoices/new?type=N`) is one keyboard-first surface: a
 * number picker, then a booker -> party -> date walk, then a line item field, with the `0` / `000` /
 * `999` codes and `up`. Reading `invoice-view.js` and believing it is the failure mode this vault
 * keeps recording (a keyboard layer that has never received a keystroke is a claim, not a feature), so
 * this launches headless Chrome and drives it with `Input.dispatchKeyEvent` — the same real events a
 * keyboard sends — asserting the DOM after each.
 *
 * It is READ-ONLY: it walks the header to the date field but never submits the create, opens the
 * advanced-search and payment dialogs but never submits them, and only moves focus with `up`. Nothing
 * is written to the depot. `--cookie` (like `refdb-check.mjs`) lets it run against a depot whose admin
 * password is not the scaffold default.
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
const COOKIE = arg("--cookie", "");
const CHROME = arg("--chrome", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
const PORT = Number(arg("--port", "9358"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

/** An OPEN sale invoice with at least two lines, for the 000 / 999 / up scenarios (read-only). */
let openInvoice = null;
try {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(join(HERE, "..", "traildepot", "data", "main.db"), { readOnly: true });
  const row = db.prepare(
    'SELECT i."id" AS id FROM invoices i WHERE i."completed"=0 AND i."deleted"=0 AND i."type"=1 ' +
      'AND (SELECT COUNT(*) FROM transactions t WHERE t."invoice"=i."id" AND t."deleted"=0) >= 2 ' +
      'ORDER BY i."id" DESC LIMIT 1'
  ).get();
  if (row) openInvoice = { id: Buffer.from(row.id).toString("base64url") };
} catch (e) { console.error(`could not read the depot (open-invoice scenarios will be skipped): ${e.message}`); }

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); }
  static async attach(port) {
    let target = null;
    for (let i = 0; i < 80 && !target; i++) {
      try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); target = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl); } catch { /* not up */ }
      if (!target) await sleep(250);
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
  async goto(path, waitFor) {
    await this.send("Page.navigate", { url: BASE + path });
    for (let i = 0; i < 160; i++) { const at = await this.ev("location.pathname").catch(() => null); if (at === path.split("?")[0]) break; await sleep(100); }
    for (let i = 0; i < 160; i++) { if (await this.ev(waitFor).catch(() => false)) break; await sleep(100); }
    await sleep(300);
  }
}

async function enter(cdp) {
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await sleep(250);
}
async function arrowUp(cdp) {
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowUp", code: "ArrowUp", windowsVirtualKeyCode: 38, nativeVirtualKeyCode: 38 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowUp", code: "ArrowUp", windowsVirtualKeyCode: 38, nativeVirtualKeyCode: 38 });
  await sleep(200);
}
async function typeText(cdp, text) {
  for (const ch of text) {
    const vk = ch.charCodeAt(0);
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: ch, code: "Digit" + ch, text: ch, unmodifiedText: ch, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: ch, code: "Digit" + ch, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
    await sleep(60);
  }
  await sleep(120);
}

/** Which control has focus, described enough to assert against. */
const FOCUS = `(function(){var e=document.activeElement;if(!e)return null;var ac=e.closest&&e.closest('.ac');return {tag:e.tagName,name:e.name||null,id:e.id||null,cls:String(e.className||''),inAc:!!ac,acFor:ac?(ac.querySelector('select')&&ac.querySelector('select').name):null};})()`;
const focusName = (f) => !f ? "none" : (f.inAc ? `ac:${f.acFor}` : (f.name || f.id || f.tag));

const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "ivc-"))}`, "--headless=new", "--no-first-run", "--disable-gpu", "--window-size=1500,1000", "about:blank"], { stdio: "ignore" });

try {
  const cdp = await CDP.attach(PORT);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  if (COOKIE) {
    await cdp.send("Network.enable");
    const eq = COOKIE.indexOf("=");
    await cdp.send("Network.setCookie", { name: eq > -1 ? COOKIE.slice(0, eq) : "auth_token", value: eq > -1 ? COOKIE.slice(eq + 1) : COOKIE, url: BASE + "/", httpOnly: true });
  } else {
    await cdp.goto("/login", "!!document.querySelector('form.login')");
    await cdp.ev(`(function(){var f=document.querySelector("form.login");f.querySelector('input[name="email"]').value=${JSON.stringify(EMAIL)};f.querySelector('input[type="password"]').value=${JSON.stringify(PASSWORD)};f.querySelector('button[type="submit"]').click();})()`);
    for (let i = 0; i < 80; i++) { const at = await cdp.ev("location.pathname").catch(() => null); if (at && !at.includes("login")) break; await sleep(150); }
  }

  /* ── A. the NEW walk: picker -> booker -> party -> date (no submit) ─────────────────────────── */
  await cdp.goto("/invoices/new?type=1", "!!document.querySelector('aa-invoice-view[data-state=\"pick\"] [data-console-picker] .ac-input')");
  const startFocus = await cdp.ev(FOCUS);
  check("the console opens with focus on the invoice-# picker", !!(startFocus && startFocus.inAc && startFocus.acFor === "invoice"), focusName(startFocus));

  await enter(cdp); // starts the walk (NEW)
  const afterStart = await cdp.ev(FOCUS);
  // The booker is a native select (4 options, below autocomplete's 12-option combobox threshold), so
  // focus is either the select itself or its combobox input; accept both.
  check("Enter on NEW focuses the booker field", !!(afterStart && ((afterStart.inAc && afterStart.acFor === "booker") || afterStart.name === "booker")), focusName(afterStart));
  const enabled = await cdp.ev(`(function(){var f=document.querySelector('[data-console-create]');if(!f)return null;var d=f.querySelectorAll('select,input');var off=0;for(var i=0;i<d.length;i++){if(d[i].disabled&&d[i].type!=='hidden')off++;}return {off:off};})()`);
  check("...and the header fields are enabled for entry", !!(enabled && enabled.off === 0), JSON.stringify(enabled));

  await enter(cdp); // booker -> party
  const afterBooker = await cdp.ev(FOCUS);
  check("Enter on the booker focuses the party combobox", !!(afterBooker && afterBooker.inAc && afterBooker.acFor === "party"), focusName(afterBooker));

  await enter(cdp); // party -> date
  const afterParty = await cdp.ev(FOCUS);
  check("Enter on the party focuses the invoice date", !!(afterParty && afterParty.name === "dated"), focusName(afterParty));

  /* ── B. `0` in the empty picker exits to the dashboard ──────────────────────────────────────── */
  await cdp.goto("/invoices/new?type=1", "!!document.querySelector('aa-invoice-view [data-console-picker] .ac-input')");
  await cdp.ev(`(function(){var s=document.querySelector('[data-console-picker]');var i=s.closest('.ac').querySelector('.ac-input');i.focus();return i.value;})()`);
  await typeText(cdp, "0");
  await sleep(500);
  const pathAfterZero = await cdp.ev("location.pathname");
  check("`0` in the empty picker exits to the dashboard", pathAfterZero === "/dashboard", `at ${pathAfterZero}`);

  /* ── C/D/E. the loaded invoice: 000, 999, up ────────────────────────────────────────────────── */
  if (openInvoice) {
    await cdp.goto(`/invoices/new?type=1&invoice=${openInvoice.id}`, "!!document.querySelector('aa-invoice-view[data-state=\"open\"] [data-console-item]')");
    const canWrite = await cdp.ev("(function(){return document.querySelector('aa-invoice-view').getAttribute('data-can-write');})()");

    // C. 000 opens the advanced item search.
    const itemFocus = await cdp.ev(`(function(){var s=document.querySelector('[data-console-item]');var i=s.closest('.ac')?s.closest('.ac').querySelector('.ac-input'):s;i.focus();i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
    check("the open invoice console exposes the item field", itemFocus === true);
    await typeText(cdp, "000");
    await sleep(400);
    const searchOpen = await cdp.ev("(function(){var m=document.querySelector('#console-itemsearch');return !!(m&&m.open);})()");
    check("`000` at the item field opens the advanced item search", searchOpen === true);
    await cdp.ev("(function(){var m=document.querySelector('#console-itemsearch');if(m&&m.close)m.close();})()");
    await sleep(200);

    // D. 999 finishes: discounts, then the payment dialog.
    await cdp.ev(`(function(){var s=document.querySelector('[data-console-item]');var i=s.closest('.ac')?s.closest('.ac').querySelector('.ac-input'):s;i.focus();i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
    await typeText(cdp, "999");
    await enter(cdp);
    const d1 = await cdp.ev(FOCUS);
    check("`999` moves focus to invoice discount 1", !!(d1 && d1.name === "discount_1"), focusName(d1));
    await enter(cdp); // discount_1 -> discount_2
    const d2 = await cdp.ev(FOCUS);
    check("Enter walks discount 1 -> discount 2", !!(d2 && d2.name === "discount_2"), focusName(d2));
    await enter(cdp); // discount_2 -> discount_rs
    await enter(cdp); // discount_rs -> payment dialog
    await sleep(300);
    const payOpen = await cdp.ev("(function(){var m=document.querySelector('#console-pay');return !!(m&&m.open);})()");
    check("Enter through the discounts opens the payment dialog", payOpen === true);
    await cdp.ev("(function(){var m=document.querySelector('#console-pay');if(m&&m.close)m.close();})()");
    await sleep(200);

    // E. `up` moves between line quantities.
    const upResult = await cdp.ev(`(function(){
      var rows=document.querySelectorAll('[data-console-line]');
      if(rows.length<2) return {skip:'fewer than 2 lines'};
      function q(row){return row.querySelector('.cell[name="qty"]');}
      function other(row){var cells=row.querySelectorAll('.cell');for(var i=0;i<cells.length;i++){if(cells[i].name!=='qty')return cells[i];}return null;}
      var second=q(rows[1]); if(second) second.focus();
      return {from: second?second.name:null, hasSecondQty: !!second, hasOtherCell: !!other(rows[0])};
    })()`);
    if (upResult && !upResult.skip) {
      await arrowUp(cdp);
      const up1 = await cdp.ev(`(function(){var e=document.activeElement;var row=e.closest&&e.closest('[data-console-line]');var rows=document.querySelectorAll('[data-console-line]');return {name:e.name, isFirstRowQty: !!(row&&row===rows[0]&&e.name==='qty')};})()`);
      check("`up` on a line's qty focuses the qty of the line above", !!(up1 && up1.isFirstRowQty), JSON.stringify(up1));
      const otherUp = await cdp.ev(`(function(){var rows=document.querySelectorAll('[data-console-line]');var cells=rows[1].querySelectorAll('.cell');var el=null;for(var i=0;i<cells.length;i++){if(cells[i].name!=='qty'){el=cells[i];break;}}if(!el)return {skip:true};el.focus();return {name:el.name};})()`);
      if (otherUp && !otherUp.skip) {
        await arrowUp(cdp);
        const up2 = await cdp.ev(`(function(){var e=document.activeElement;var row=e.closest&&e.closest('[data-console-line]');var rows=document.querySelectorAll('[data-console-line]');return {name:e.name, isSecondRowQty: !!(row&&row===rows[1]&&e.name==='qty')};})()`);
        check("`up` on another cell focuses that line's qty", !!(up2 && up2.isSecondRowQty), JSON.stringify(up2));
      } else {
        check("a non-qty line cell exists for the `up` test", false, "none found");
      }
    } else {
      check("an open invoice with 2+ lines exists for the `up` test", false, upResult && upResult.skip);
    }
    console.log(`  (open invoice console canWrite=${canWrite})`);
  } else {
    console.log("  skipped: 000 / 999 / up scenarios (no open sale invoice with 2+ lines in the depot)");
  }

  console.log(`\n== ${pass} passed, ${failures.length} failed ==`);
  if (failures.length) failures.forEach((f) => console.log(`  - ${f}`));
} catch (error) {
  console.error("invoice-console-check could not run:", error.message);
  failures.push(error.message);
} finally {
  chrome.kill();
}

process.exit(failures.length ? 1 : 0);
