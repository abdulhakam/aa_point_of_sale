/**
 * Capture BOTH systems at the same viewport, with the same structure extractor, so the two can be
 * compared directly rather than through a description of either.
 *
 *   node trailbase/tools/ui-capture.mjs --system guest|legacy|both [--out DIR] [--only substring]
 *
 * ⚠️ One extractor, two apps. The first version of this tool extracted the guest's own class names
 * (`.header-brand`, `nav.navbar a.nav-link`, `.tile`), which cannot match Mantine's — so a
 * "comparison" written that way would have reported every field as absent on the legacy side. The
 * extractor below is deliberately **neutral**: it asks for headings, buttons, links, table headers,
 * form labels and input names by TAG and ROLE, and for a handful of layout metrics by measurement
 * rather than by class. What it cannot know is which control is which, so it reports both systems'
 * vocabulary and lets the comparison be about the words on the screen.
 *
 * The legacy half needs a PocketBase session, so `--legacy-user` / `--legacy-password` are required
 * for it. They are NOT recorded in this file and NOT defaulted: they are passed in, and the vault points
 * at where the operator keeps them.
 *
 * Output per screen: `<name>.png` and `<name>.structure.json`. Screenshots are committed, so a diff of
 * the output directory is the visual-parity history.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const SYSTEM = arg("--system", "both");
const OUT = arg("--out", join(HERE, "..", "..", "vault", "attachments", "ui-capture"));
const ONLY = arg("--only", "");
const CHROME = arg("--chrome", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
const PORT = Number(arg("--port", arg("--system", "both") === "legacy" ? "9353" : "9352"));
const WIDTH = 1600, HEIGHT = 900;
const GUEST = arg("--guest", "http://127.0.0.1:4000");
const LEGACY = arg("--legacy", "http://127.0.0.1:3000");
const GUEST_EMAIL = arg("--email", "admin@localhost");
const GUEST_PASSWORD = arg("--password", "administrator-0ne");
const LEGACY_USER = arg("--legacy-user", "");
const LEGACY_PASSWORD = arg("--legacy-password", "");

/** Screens, with the route each SYSTEM uses. `legacy` null means the screen exists on one side only. */
const SCREENS = [
  { name: "login", guest: "/login", legacy: "/auth" },
  { name: "dashboard", guest: "/dashboard", legacy: "/app/dashboard" },
  { name: "reports", guest: "/reports", legacy: "/app/reports" },
  { name: "reports-payments", guest: "/reports/payments?from=2024-01-01&to=2026-10-04", legacy: "/app/reports/payments" },
  { name: "reports-salesreport", guest: "/reports/salesreport?from=2024-01-01&to=2026-10-04", legacy: "/app/reports/salesreport" },
  { name: "reports-paymentsbycompany", guest: "/reports/paymentsbycompany?from=2024-01-01&to=2026-10-04", legacy: "/app/reports/paymentsbycompany" },
  { name: "reports-itemsales", guest: "/reports/itemsales?from=2024-01-01&to=2026-10-04", legacy: "/app/reports/transactions/unified" },
  { name: "reports-profit", guest: "/reports/profit?from=2024-01-01&to=2026-10-04", legacy: "/app/reports/profit" },
  { name: "reports-stockreport", guest: "/reports/stockreport?from=2024-01-01&to=2026-10-04", legacy: "/app/reports/stockreport" },
  { name: "reports-difference", guest: "/reports/difference?from=2024-01-01&to=2026-10-04", legacy: "/app/reports/difference" },
  { name: "reports-outstanding", guest: "/reports/outstanding?from=2024-01-01&to=2026-10-04", legacy: "/app/reports/outstanding" },
  { name: "reports-dailysale", guest: "/reports/dailysale?from=2024-01-01&to=2026-10-04", legacy: "/app/reports/dailysale" },
  { name: "reports-ledgers", guest: "/reports/ledgers", legacy: "/app/reports/ledgers" },
  { name: "ledgers-party", guest: "/reports/ledgers/party?from=2024-01-01&to=2026-10-04", legacy: "/app/reports/ledgers/party" },
  { name: "ledgers-booker", guest: "/reports/ledgers/booker?from=2024-01-01&to=2026-10-04", legacy: "/app/reports/ledgers/booker" },
  { name: "ledgers-area", guest: "/reports/ledgers/area?from=2024-01-01&to=2026-10-04", legacy: "/app/reports/ledgers/area" },
  { name: "ledgers-general", guest: "/reports/ledgers/general?from=2024-01-01&to=2026-10-04", legacy: "/app/reports/ledgers/general" },
  { name: "management", guest: "/management", legacy: "/app/management" },
  { name: "management-sections", guest: "/management/sections", legacy: "/app/management/sections" },
  { name: "management-areas", guest: "/management/areas", legacy: "/app/management/areas" },
  { name: "management-categories", guest: "/management/companies", legacy: "/app/management/categories" },
  { name: "management-parties", guest: "/management/parties", legacy: "/app/management/parties" },
  { name: "management-bookers", guest: "/management/bookers", legacy: "/app/management/bookers" },
  { name: "management-items", guest: "/management/items", legacy: "/app/management/items" },
  { name: "invoices", guest: "/invoices", legacy: "/app/invoices" },
  { name: "cashmemo", guest: "/cashmemo", legacy: "/app/cashmemo" },
  { name: "cashmemo-expenses", guest: "/cashmemo/expenses", legacy: "/app/cashmemo/expenses" },
  { name: "cashmemo-payments", guest: "/payments", legacy: "/app/cashmemo/payments" },
];

/** Neutral: tags and roles only, so the same expression means the same thing on Mantine and on the guest. */
const STRUCTURE = `(function () {
  var txt = function (el) { return (el.innerText || el.textContent || "").replace(/\\s+/g, " ").trim(); };
  var vis = function (el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  var take = function (list, n) { return list.filter(Boolean).slice(0, n); };
  var css = function (el, p) { return el ? getComputedStyle(el)[p] : null; };
  var boxes = take([...document.querySelectorAll("main, [role=main], .mantine-AppShell-main, body > div")].filter(vis), 1)[0] || document.body;
  var clickable = take([...document.querySelectorAll("a, button, [role=button]")].filter(vis).map(txt), 24);
  var inputs = take([...document.querySelectorAll("input, select, textarea")].filter(vis).map(function (e) {
    return (e.name || e.getAttribute("aria-label") || e.placeholder || e.type || "").slice(0, 24) + ":" + e.type;
  }), 18);
  return {
    url: location.pathname + location.search,
    title: document.title,
    headings: take([...document.querySelectorAll("h1,h2,h3,h4")].filter(vis).map(function (e) { return e.tagName + " " + txt(e).slice(0, 44); }), 10),
    // Every tile-sized clickable with its label: the hub vocabulary.
    tiles: take([...document.querySelectorAll("a,button")].filter(vis).filter(function (e) {
      var r = e.getBoundingClientRect(); return r.width > 90 && r.width < 260 && r.height > 90 && r.height < 260;
    }).map(function (e) { var svg = e.querySelector("svg"); return (txt(e).slice(0, 28) || (svg ? "[icon]" : "[?]")); }), 24),
    buttons: take([...document.querySelectorAll("button, [role=button], a.btn, button[type=submit]")].filter(vis).map(txt), 16),
    links: take([...document.querySelectorAll("main a, [role=main] a")].filter(vis).map(txt), 16),
    tableHeaders: take([...document.querySelectorAll("th")].filter(vis).map(txt), 18),
    formLabels: take([...document.querySelectorAll("label")].filter(vis).map(txt)
      // A Mantine <label> wraps its whole control, so a select's label carries every option —
      // "Party all g/m super mart asif siddique g/s …" ran to 4,000 characters and buried the report.
      // The first 40 characters is the label a person reads.
      .map(function (s) { return s.slice(0, 40); }), 18),
    inputs,
    clickable,
    rowCount: document.querySelectorAll("tbody tr").length,
    thCount: document.querySelectorAll("th").length,
    metrics: {
      bodyFont: css(document.body, "fontFamily"),
      bodySize: css(document.body, "fontSize"),
      bodyBg: css(document.body, "backgroundColor"),
      linkColor: css(document.querySelector("a[href]"), "color"),
      buttonBg: css(document.querySelector("button"), "backgroundColor"),
      thTransform: css(document.querySelector("th"), "textTransform"),
      thBorder: css(document.querySelector("th"), "borderBottom"),
      tdBorder: css(document.querySelector("td"), "borderRight"),
      mainTop: boxes.getBoundingClientRect ? Math.round(boxes.getBoundingClientRect().top) : null,
    },
  };
})()`;

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.waiting = new Map();
    // In-flight request accounting, so "the page has finished" is observed rather than guessed.
    this.inflight = 0; this.seen = 0;
  }
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
      if (m.method === "Network.requestWillBeSent") { cdp.inflight++; cdp.seen++; }
      else if (m.method === "Network.loadingFinished" || m.method === "Network.loadingFailed") cdp.inflight = Math.max(0, cdp.inflight - 1);
    });
    return cdp;
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.waiting.has(id)) { this.waiting.delete(id); reject(new Error(`${method} timed out`)); } }, 45000);
    });
  }
  async ev(expression) {
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval failed");
    return r.result.value;
  }
  async goto(url) {
    await new Promise((r) => setTimeout(r, 700));
    await this.send("Page.navigate", { url });
    await new Promise((r) => setTimeout(r, 1400));
  }
}

async function waitFor(cdp, expression, tries = 80) {
  for (let i = 0; i < tries; i++) {
    const ok = await cdp.ev(expression).catch(() => false);
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

/**
 * Wait until the page has stopped asking for things.
 *
 * ⚠️ The first version waited on `document.body.innerText.length > 200`, which is true within a second
 * of a client-rendered app starting — so several legacy captures were taken while their table was still
 * empty and compared against nothing. A "0 headers on the legacy side, 7 on the guest side" line in the
 * parity report was that artefact, not a finding. The legacy app fetches whole views, so a screen can
 * spend minutes in flight; the budget is generous and the result is RECORDED, so a capture that never
 * settles is reported as unsettled instead of quietly becoming evidence.
 */
async function settle(cdp, { quietMs = 2500, budgetMs = 300000, minRequests = 1 } = {}) {
  const deadline = Date.now() + budgetMs;
  let quietSince = null;
  while (Date.now() < deadline) {
    const busy = cdp.inflight > 0;
    if (!busy && cdp.seen >= minRequests) {
      if (quietSince === null) quietSince = Date.now();
      if (Date.now() - quietSince >= quietMs) return { settled: true, requests: cdp.seen, waitedMs: Date.now() - (deadline - budgetMs) };
    } else {
      quietSince = null;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return { settled: false, requests: cdp.seen, waitedMs: budgetMs };
}

const index = [];

async function captureSystem(cdp, system) {
  const base = system === "guest" ? GUEST : LEGACY;
  const dir = join(OUT, system);
  mkdirSync(dir, { recursive: true });

  if (system === "guest") {
    await cdp.goto(`${base}/login`);
    if (!(await waitFor(cdp, "!!document.querySelector('form.login')"))) throw new Error("guest login form never appeared");
    await cdp.ev(`(function(){var f=document.querySelector("form.login");f.querySelector('input[name="email"]').value=${JSON.stringify(GUEST_EMAIL)};f.querySelector('input[type="password"]').value=${JSON.stringify(GUEST_PASSWORD)};f.querySelector('button[type="submit"]').click();})()`);
    if (!(await waitFor(cdp, "location.pathname && !location.pathname.includes('login')"))) throw new Error("guest login did not complete");
  } else {
    if (!LEGACY_USER || !LEGACY_PASSWORD) throw new Error("--legacy-user and --legacy-password are required for the legacy arm; they are not defaulted here on purpose");
    await cdp.goto(`${base}/auth`);
    // The legacy login is a client-rendered form; its field names are not in the served shell, so it is
    // driven by TYPE and ORDER rather than by name — which is also the only way that survives the
    // bundle being minified.
    const shape = await waitFor(cdp, "(function(){var i=document.querySelectorAll('input');return i.length>=2;})()");
    if (!shape) throw new Error("legacy login form never appeared");
    await cdp.ev(`(function(){
      var inputs = [...document.querySelectorAll("input[type=text],input[type=password],input:not([type])")];
      var user = inputs.find(function (e) { return e.type !== "password"; });
      var pass = inputs.find(function (e) { return e.type === "password"; });
      if (!user || !pass) throw new Error("legacy login: could not find a user and a password field; saw " + inputs.map(function (e) { return e.type; }).join(","));
      var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(user, ${JSON.stringify(LEGACY_USER)});
      user.dispatchEvent(new Event("input", { bubbles: true }));
      setter.call(pass, ${JSON.stringify(LEGACY_PASSWORD)});
      pass.dispatchEvent(new Event("input", { bubbles: true }));
      var form = user.form || pass.form;
      if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
      else document.querySelector('button[type="submit"]').click();
    })()`);
    // ⚠️ Wait on the CONTENT, not on the path. The legacy login page is `/auth`, which does not contain
    // the string "login", so a `!pathname.includes("login")` check is true on the login page itself —
    // the run then captured twenty-eight screens as an anonymous visitor and every one came back
    // "Please log in to continue". The first run got away with it only because the redirect happened to
    // land first. The gate text is what actually distinguishes signed-in from signed-out.
    const inOut = await waitFor(cdp, "!document.body.innerText.includes('Please log in to continue')", 200);
    if (!inOut) throw new Error("legacy login did not complete - still showing the gate");
    // …and confirm the session survives a navigation, which is the only test that matters.
    await cdp.goto(`${base}/app/dashboard`);
    if (/Please log in/.test(await cdp.ev("document.body.innerText").catch(() => "Please log in"))) {
      throw new Error("legacy login appeared to succeed but the session did not survive a navigation");
    }
  }

  for (const screen of SCREENS) {
    const route = screen[system];
    if (!route) continue;
    if (ONLY && !screen.name.includes(ONLY)) continue;
    cdp.inflight = 0; cdp.seen = 0;
    await cdp.goto(base + route);
    if (system === "guest") await waitFor(cdp, "document.documentElement.getAttribute('data-hk-ready')==='1'");
    const quiet = await settle(cdp, { budgetMs: system === "legacy" ? 420000 : 60000 });
    await new Promise((r) => setTimeout(r, 500));
    let structure = null;
    try { structure = await cdp.ev(STRUCTURE); } catch (e) { structure = { error: e.message }; }
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(dir, `${screen.name}.png`), Buffer.from(shot.data, "base64"));
    writeFileSync(join(dir, `${screen.name}.structure.json`), JSON.stringify({ ...structure, _settled: quiet.settled, _requests: quiet.requests }, null, 2) + "\n");
    const gated = /Please log in/.test(await cdp.ev("document.body.innerText").catch(() => ""));
    // A screen that produced no headings AND no table headers on a screen that should have a table is
    // almost certainly an unsettled capture, so it is marked rather than reported as a finding.
    const thin = (structure?.headings?.length ?? 0) === 0 && (structure?.thCount ?? 0) === 0;
    index.push({ system, name: screen.name, route, rows: structure?.rowCount ?? null, headings: structure?.headings?.length ?? 0, thCount: structure?.thCount ?? 0, gated, settled: quiet.settled, thin });
    console.log(`  ${system.padEnd(7)} ${screen.name.padEnd(26)} rows=${String(structure?.rowCount ?? "-").padStart(5)} th=${String(structure?.thCount ?? "-").padStart(4)} settled=${quiet.settled ? "y" : "N"}${thin ? "  THIN" : ""}${gated ? "  GATED" : ""}`);
  }
}

mkdirSync(OUT, { recursive: true });
const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "uc-"))}`, "--headless=new", "--no-first-run", "--disable-gpu", `--window-size=${WIDTH},${HEIGHT}`, "--force-device-scale-factor=1", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });

try {
  const cdp = await CDP.attach(PORT);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
  for (const system of SYSTEM === "both" ? ["guest", "legacy"] : [SYSTEM]) {
    console.log(`\n${system}:`);
    await captureSystem(cdp, system);
  }
  writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2) + "\n");
  const gatedScreens = index.filter((r) => r.gated).map((r) => `${r.system}/${r.name}`);
  console.log(`\n${index.length} captures at ${WIDTH}x${HEIGHT} into ${OUT}`);
  console.log(gatedScreens.length ? `⚠️ still gated: ${gatedScreens.join(", ")}` : "no screen came back gated");
} catch (error) {
  console.error("ui-capture could not run:", error.message);
  process.exitCode = 1;
} finally {
  chrome.kill();
}