// Invoice-view (keyboard console) check.
//
//   node trailbase/tools/invoice-view-check.mjs        (needs the component built: trailbase/build.bat)
//
// Boots a THROW-AWAY TrailBase depot with the guest component (never the production depot), seeds a
// minimal dataset, then drives the keyboard console's server surface end to end:
//   1. GET /invoices/new?type=1 renders the console (picker + <aa-invoice-view>).
//   2. the fragment CREATE (POST /invoices/new with X-Requested-With) answers the OPENED console.
//   3. a line added through the console + a PATCH of that line move the money.
//   4. the LIVE sheet (?source=live) reflects the base tables, and 404s for an unknown id.
//   5. /invoice/context parties carry the composite `label`.
//   6. soft delete removes the invoice from the picker but leaves the row.
//
// The keyboard choreography itself (focus walk, 000/999/up) is driven by the headless-Chrome gate that
// shares this file's name upstream; this HTTP gate is the deterministic half that runs everywhere.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toUuid } from "./uuid.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const trailbaseRoot = path.resolve(here, "..");
const site = path.join(trailbaseRoot, "runtime");
const wasm = path.join(trailbaseRoot, "traildepot", "wasm", "tb-ah-run-js.wasm");

const work = path.join(trailbaseRoot, ".tbdemo-invview");
const depot = path.join(work, "depot");
const PORT = 4325;
const BASE = `http://127.0.0.1:${PORT}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${extra ? `  ${extra}` : ""}`);
  if (!ok) failures++;
};

let trailLog = "";
async function waitFor(fn, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { const v = await fn(); if (v) return v; } catch { /* retry */ }
    await sleep(250);
  }
  return null;
}

async function startTrail() {
  if (!fs.existsSync(wasm)) throw new Error(`guest wasm not built: ${wasm}`);
  fs.rmSync(depot, { recursive: true, force: true });
  fs.mkdirSync(path.join(depot, "wasm"), { recursive: true });
  fs.copyFileSync(path.join(trailbaseRoot, "config.textproto"), path.join(depot, "config.textproto"));
  fs.copyFileSync(path.join(trailbaseRoot, "metadata.textproto"), path.join(depot, "metadata.textproto"));
  fs.cpSync(path.join(trailbaseRoot, "migrations"), path.join(depot, "migrations"), { recursive: true });
  fs.copyFileSync(wasm, path.join(depot, "wasm", "tb-ah-run-js.wasm"));

  const child = spawn("trail", [`--depot=${depot}`, "run", `--address=127.0.0.1:${PORT}`, `--runtime-root-fs=${site}`], { cwd: depot });
  child.stdout.on("data", (d) => (trailLog += d));
  child.stderr.on("data", (d) => (trailLog += d));
  const up = await waitFor(() => /Listening on/i.test(trailLog));
  if (!up) throw new Error(`TrailBase did not start:\n${trailLog}`);
  const creds = trailLog.match(/email:\s*'([^']+)'[\s\S]*?password:\s*'([^']+)'/);
  if (!creds) throw new Error(`Could not read generated credentials:\n${trailLog}`);
  return { child, email: creds[1], password: creds[2] };
}

let token = null;
async function api(method, apiPath, body) {
  const res = await fetch(BASE + apiPath, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${apiPath} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}
const create = async (name, body) => (await api("POST", `/api/records/v1/${name}`, body)).ids[0];

async function seed() {
  const section = await create("sections", { name: "North" });
  const area = await create("areas", { name: "Area-1", section: toUuid(section) });
  const company = await create("companies", { name: "Beverages" });
  await create("parties", { name: "Console Customer", type: 0, area: toUuid(area), phone: "100" });
  await create("items", { name: "Cola", category: toUuid(company), cost_price: 50, sale_price: 70, box_size_qty: 12, barcode: "111" });
}

let cookie = "";
const jar = (res) => {
  const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
};
async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/v1/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `email_or_username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
    redirect: "manual",
  });
  jar(res);
  return res.status;
}
async function get(url, headers = {}) {
  const res = await fetch(BASE + url, { redirect: "manual", headers: { ...(cookie ? { cookie } : {}), ...headers } });
  jar(res);
  return { status: res.status, location: res.headers.get("location"), body: await res.text() };
}
async function postForm(url, fields, headers = {}) {
  const res = await fetch(BASE + url, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", ...(cookie ? { cookie } : {}), ...headers },
    body: new URLSearchParams(fields).toString(),
  });
  jar(res);
  return { status: res.status, location: res.headers.get("location"), body: await res.text() };
}
async function patchJson(url, body) {
  const res = await fetch(BASE + url, {
    method: "PATCH",
    redirect: "manual",
    headers: { "content-type": "application/json", accept: "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text };
}

async function main() {
  console.log("== preparing throw-away TrailBase depot (invoice-view check) ==");
  const trail = await startTrail();
  try {
    await waitFor(async () => (await fetch(`${BASE}/healthz`)).ok);
    // The record API needs a bearer token; the app screens need the session cookie.
    const loginJson = await api("POST", "/api/auth/v1/login", { email: trail.email, password: trail.password });
    token = loginJson && loginJson.auth_token;
    check("record API login", Boolean(token), "");
    await seed();
    check("app login", [302, 303, 200].includes(await login(trail.email, trail.password)), "");

    // 1. the console renders: picker + host + NEW option
    const consolePage = await get("/invoices/new?type=1");
    check("GET /invoices/new?type=1 renders the console", consolePage.status === 200 && consolePage.body.includes("aa-invoice-view"), `${consolePage.status}`);
    check("...with the NEW option in the picker", /<option value=""[^>]*>NEW<\/option>/.test(consolePage.body), "");
    check("...and a disabled create header (State 0)", /data-console-create/.test(consolePage.body) && /name="dated"[^>]*disabled/.test(consolePage.body), "");

    // 2. fragment create -> the opened console
    const created = await postForm("/invoices/new", { type: "1", surface: "console", party: "", dated: "2026-10-01", key: "view-check-1" }, { "X-Requested-With": "XMLHttpRequest" });
    check("fragment create answers 200", created.status === 200, `${created.status}`);
    check("...as a fragment (no <html>)", !/<!doctype/i.test(created.body) && !/<html/i.test(created.body), "");
    check("...with the invoice OPENED", /data-state="open"/.test(created.body) && /data-console-item/.test(created.body), "");
    const idMatch = /data-invoice="([^"]+)"/.exec(created.body);
    check("...carrying the invoice id", Boolean(idMatch), "");
    const id = idMatch ? idMatch[1] : "";
    check("...and a created flash", /Created/.test(created.body), "");

    // 3. add a line through the console form, then PATCH it
    const ctxItems = JSON.parse((await get("/invoice/context?type=sale")).body).items || [];
    const itemId = ctxItems.length ? ctxItems[0].id : "";
    const addForm = { surface: "console", opKey: `iv-${Date.now()}`, item: itemId, qty: "3", price: "70", discount_1: "0", discount_2: "0", discount_rs: "0", scheme: "0" };
    const added = await postForm(`/invoices/${id}/line`, addForm, { "X-Requested-With": "XMLHttpRequest" });
    check("line add answers the console fragment", added.status === 200 && /data-console-lines/.test(added.body), `${added.status} id=${id} body=${String(added.body).slice(0, 120)}`);
    check("...with 3 x 70.00 = 210.00", /210\.00/.test(added.body), "");

    const invJson = await get(`/invoice/${id}`);
    const lines = (JSON.parse(invJson.body).lines) || [];
    check("the JSON API shows the line", lines.length === 1, `lines=${lines.length}`);
    const lineId = lines.length ? lines[0].id : "";
    if (lineId) {
      const patched = await patchJson(`/invoice/${id}/line/${lineId}`, { qty: 5, price: 70, cost_price: 0, discount_1: 0, discount_2: 0, discount_rs: 0, scheme: 0 });
      check("PATCH line/{lineId} applies", patched.status === 200 && patched.json?.updated === 1, `${patched.status} ${patched.text}`);
    } else {
      check("PATCH line/{lineId} applies", false, "no line to patch");
    }

    const opened = await get(`/invoices/new?type=1&invoice=${encodeURIComponent(id)}`);
    check("console re-renders with the edited total (5 x 70 = 350.00)", /350\.00/.test(opened.body), "");

    // header save through the console form re-renders the console (surface=console), not entry.html
    const partyId = (JSON.parse((await get("/invoice/context?type=sale")).body).parties || [])[0]?.id || "";
    const headerSave = await postForm(`/invoices/${id}/header`, { surface: "console", party: partyId, dated: "2026-10-02", discount_1: "0", discount_2: "0", discount_rs: "0" }, { "X-Requested-With": "XMLHttpRequest" });
    check("console header save re-renders the console", headerSave.status === 200 && /data-console-header/.test(headerSave.body), `${headerSave.status}`);
    check("...with the new date", /name="dated" value="2026-10-02"/.test(headerSave.body), "");

    // complete through the console form
    const done = await postForm(`/invoices/${id}/complete`, { surface: "console", complete: "1" }, { "X-Requested-With": "XMLHttpRequest" });
    check("console complete re-renders the console", done.status === 200 && /data-state="open"/.test(done.body), `${done.status}`);

    // 4. live sheet
    const live = await get(`/invoices/${id}/view?source=live`);
    check("?source=live renders the sheet", live.status === 200 && live.body.includes("Cola") && /SALE INVOICE/.test(live.body), `${live.status}`);
    check("?source=live reflects the edit (350.00)", /350\.00/.test(live.body), "");
    const liveMissing = await get("/invoices/AAAAAAAAAAAAAAAAAAAAAA/view?source=live");
    check("?source=live 404s for an unknown id", liveMissing.status === 404, `${liveMissing.status}`);

    // 5. composite party label
    const ctx = await get("/invoice/context?type=sale");
    const parties = JSON.parse(ctx.body).parties || [];
    check("context parties carry the composite label", parties.length > 0 && Object.prototype.hasOwnProperty.call(parties[0], "label"), JSON.stringify(parties[0] || {}));
    check("...label is name - area - section", parties.some((p) => /Console Customer - Area-1 - North/.test(p.label)), (parties[0] || {}).label || "");

    // 6. soft delete: gone from the picker, row survives
    const del = await postForm(`/invoices/${id}/delete`, { surface: "console" }, { "X-Requested-With": "XMLHttpRequest" });
    check("soft delete answers the console", del.status === 200 && /Deleted/.test(del.body), `${del.status}`);
    const pickerAfter = await get("/invoices/new?type=1");
    check("...the invoice left the picker", !pickerAfter.body.includes(id), "");
    const survives = await get(`/invoice/${id}`);
    check("...but the row survives (JSON still 200)", survives.status === 200, `${survives.status}`);

    console.log(`\n== ${failures === 0 ? "all checks passed" : failures + " FAILED"} ==`);
    if (failures) console.error("\n--- trail log tail ---\n" + trailLog.slice(-3000));
  } finally {
    trail.child.kill();
  }
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
