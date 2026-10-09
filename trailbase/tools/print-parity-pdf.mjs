/**
 * Print-to-PDF both systems for the same invoice and record page counts.
 *   node tools/_src/resp/print-pdf.mjs
 */
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9412;
const OUT = join(HERE, ".");
const TARGETS = [
  { name: "guest-8603-a5", url: "http://127.0.0.1:4000/invoices/AaEbPxB_eAi_W0Ukzwx2EQ/view?print=1&paper=a5" },
  { name: "legacy-8603", url: "http://127.0.0.1:3000/app/invoices/print?invoiceId=pos000000008603" },
  { name: "guest-8607-a5", url: "http://127.0.0.1:4000/invoices/AaERlVsadRmvOsm8ACCaYw/view?print=1&paper=a5" },
  { name: "legacy-8606", url: "http://127.0.0.1:3000/app/invoices/print?invoiceId=pos000000008606" },
];

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); }
  static async attach(port) {
    let target = null;
    for (let i = 0; i < 80 && !target; i++) {
      try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); target = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl); } catch {}
      if (!target) await new Promise((r) => setTimeout(r, 250));
    }
    if (!target) throw new Error("no debuggable page");
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener("open", res, { once: true }); ws.addEventListener("error", rej, { once: true }); });
    const c = new CDP(ws);
    ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && c.waiting.has(m.id)) { const w = c.waiting.get(m.id); c.waiting.delete(m.id); m.error ? w.reject(new Error(JSON.stringify(m.error))) : w.resolve(m.result); } });
    return c;
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.waiting.has(id)) { this.waiting.delete(id); reject(new Error(method + " timeout")); } }, 60000);
    });
  }
  async ev(expression) { const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval"); return r.result.value; }
}

const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "pp-"))}`, "--headless=new", "--no-first-run", "--disable-gpu", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });

try {
  const cdp = await CDP.attach(PORT);
  await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
  for (const t of TARGETS) {
    await cdp.send("Page.navigate", { url: t.url });
    await new Promise((r) => setTimeout(r, 8000));
    if (t.name.startsWith("legacy")) {
      const r = await fetch("http://127.0.0.1:8090/api/admins/auth-with-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identity: "parity@local.test", password: "parity-test-0ne" }) });
      const j = await r.json();
      await cdp.ev(`localStorage.setItem('pocketbase_auth', ${JSON.stringify(JSON.stringify({ token: j.token, model: j.admin }))})`);
      await cdp.send("Page.navigate", { url: t.url });
      await new Promise((r) => setTimeout(r, 8000));
    } else {
      await cdp.ev(`(function(){var f=document.querySelector('form.login');if(!f)return 'no form';f.querySelector('input[name=email]').value='admin@localhost';f.querySelector('input[type=password]').value='administrator-0ne';f.querySelector('button[type=submit]').click();return 'ok'})()`);
      await new Promise((r) => setTimeout(r, 6000));
      await cdp.send("Page.navigate", { url: t.url });
      await new Promise((r) => setTimeout(r, 8000));
    }
    const textLen = await cdp.ev(`document.body.innerText.length`);
    const pdf = await cdp.send("Page.printToPDF", { paperWidth: 5.83, paperHeight: 8.27, marginTop: 0.2, marginBottom: 0.2, marginLeft: 0.2, marginRight: 0.2, printBackground: true });
    writeFileSync(join(OUT, `${t.name}.pdf`), Buffer.from(pdf.data, "base64"));
    console.log(`${t.name}: pages=${pdf.pagesCount ?? "?"} bodyTextLen=${textLen}`);
  }
} catch (e) {
  console.error("print-pdf failed:", e.message);
  process.exitCode = 1;
} finally {
  chrome.kill();
}
