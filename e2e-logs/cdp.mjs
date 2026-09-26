// Minimal Chrome DevTools Protocol driver (no dependencies).
// Discovers the running Chrome from its DevToolsActivePort file, connects to the
// browser-level websocket, and drives a single persistent page target.
//
// Usage:
//   node cdp.mjs list
//   node cdp.mjs open <url>
//   node cdp.mjs goto <url>
//   node cdp.mjs eval <expr | @file>
//   node cdp.mjs shot <outfile>
//   node cdp.mjs targets
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const PROFILE = process.env.CDP_PROFILE || path.join(os.homedir(), "AppData", "Local", "Google", "Chrome", "User Data", "DevToolsActivePort");
const HEADLESS = !!process.env.CDP_HTTP;
const STATE = path.join(ROOT, "e2e-logs", HEADLESS ? "cdp-target-headless.txt" : "cdp-target.txt");

async function browserWs() {
  if (process.env.CDP_HTTP) {
    const r = await fetch(process.env.CDP_HTTP.replace(/\/+$/, "") + "/json/version");
    return (await r.json()).webSocketDebuggerUrl;
  }
  const raw = fs.readFileSync(PROFILE, "utf8").split(/\r?\n/);
  return `ws://127.0.0.1:${raw[0].trim()}${raw[1].trim()}`;
}

let nextId = 0;
const pending = new Map();

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => reject(new Error("ws connect timeout")), 10000);
    ws.addEventListener("open", () => { clearTimeout(timer); resolve(ws); });
    ws.addEventListener("error", (e) => { clearTimeout(timer); reject(new Error("ws error: " + (e.message || "unknown"))); });
    ws.addEventListener("message", (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }
      if (m.id && pending.has(m.id)) {
        const { resolve, reject } = pending.get(m.id);
        pending.delete(m.id);
        if (m.error) reject(new Error(m.method + " " + JSON.stringify(m.error)));
        else resolve(m.result);
      }
    });
  });
}

function rpc(ws, method, params = {}, sessionId) {
  const id = ++nextId;
  const msg = { id, method, params };
  if (sessionId) msg.sessionId = sessionId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify(msg));
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); reject(new Error("timeout: " + method)); }
    }, 120000);
  });
}

function savedTarget() {
  try { return fs.readFileSync(STATE, "utf8").trim(); } catch { return ""; }
}
function saveTarget(id) { fs.writeFileSync(STATE, id, "utf8"); }

async function attach(ws, targetId) {
  const { sessionId } = await rpc(ws, "Target.attachToTarget", { targetId, flatten: true });
  return sessionId;
}

async function evaluate(ws, sessionId, expression) {
  const r = await rpc(ws, "Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true, userGesture: true,
  }, sessionId);
  if (r.exceptionDetails) throw new Error("page exception: " + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const ws = await connect(await browserWs());
  try {
    if (cmd === "targets") {
      const r = await rpc(ws, "Target.getTargets");
      for (const t of r.targetInfos) console.log(t.type, "|", t.targetId, "|", t.url.slice(0, 100));
      return;
    }
    if (cmd === "list") {
      const r = await rpc(ws, "Target.getTargets");
      for (const t of r.targetInfos.filter((t) => t.type === "page")) console.log(t.targetId, "|", t.title, "|", t.url.slice(0, 100));
      return;
    }
    if (cmd === "open" || cmd === "new") {
      const { targetId } = await rpc(ws, "Target.createTarget", { url: args[0], newWindow: false });
      saveTarget(targetId);
      const sessionId = await attach(ws, targetId);
      await rpc(ws, "Page.enable", {}, sessionId);
      console.log("opened targetId=" + targetId);
      return;
    }
    // everything else needs the saved target
    const targetId = savedTarget();
    if (!targetId) throw new Error("no saved target; run `open <url>` first");
    const sessionId = await attach(ws, targetId);
    if (cmd === "goto") {
      await rpc(ws, "Page.enable", {}, sessionId);
      await rpc(ws, "Page.navigate", { url: args[0] }, sessionId);
      console.log("navigated to " + args[0]);
      return;
    }
    if (cmd === "eval") {
      let expr = args[0];
      if (expr.startsWith("@")) expr = fs.readFileSync(expr.slice(1), "utf8");
      else expr = args.join(" ");
      const value = await evaluate(ws, sessionId, expr);
      console.log(typeof value === "string" ? value : JSON.stringify(value, null, 2));
      return;
    }
    if (cmd === "shot") {
      const r = await rpc(ws, "Page.captureScreenshot", { format: "png" }, sessionId);
      fs.writeFileSync(args[0], Buffer.from(r.data, "base64"));
      console.log("wrote " + args[0]);
      return;
    }
    throw new Error("unknown command: " + cmd);
  } finally {
    ws.close();
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error("CDP ERROR: " + e.message); process.exit(1); });
