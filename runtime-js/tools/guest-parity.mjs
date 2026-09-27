// Differential check: the guest app (runtime-js) vs the Node frontend-ssr, both reading the
// same TrailBase server, for every declarative page's computed report data.
//
//   node runtime-js/tools/guest-parity.mjs
//
// Compares, per page slug, `result.totals` (exact) and `result.rows` (after stripping raw
// id fields, which legitimately differ: the guest reads SQLite directly and base64-standard
// encodes uuids, while the Node app goes through the record API's url-safe encoding).

import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pagesDir = resolve(here, "../site/app/pages");

const NODE_BASE = process.env.NODE_BASE || "http://127.0.0.1:3100";
const GUEST_BASE = process.env.GUEST_BASE || "http://127.0.0.1:4003";
const EMAIL = process.env.ADMIN_EMAIL || "admin@localhost";
const PASSWORD = process.env.ADMIN_PASSWORD || "administrator-0ne";

function walk(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, base));
    else if (name === "meta.json") out.push(relative(base, dir).replace(/\\/g, "/"));
  }
  return out;
}

const cookiesOf = (res) => {
  const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  return list.map((c) => c.split(";")[0]).join("; ");
};

async function loginNode() {
  const res = await fetch(`${NODE_BASE}/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `email=${encodeURIComponent(EMAIL)}&password=${encodeURIComponent(PASSWORD)}`,
    redirect: "manual",
  });
  const cookie = cookiesOf(res);
  if (!cookie) throw new Error(`Node login failed (${res.status})`);
  return cookie;
}

async function loginTrailBase() {
  const res = await fetch(`${GUEST_BASE}/api/auth/v1/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `email_or_username=${encodeURIComponent(EMAIL)}&password=${encodeURIComponent(PASSWORD)}`,
    redirect: "manual",
  });
  const cookie = cookiesOf(res);
  if (!cookie) throw new Error(`TrailBase login failed (${res.status})`);
  return cookie;
}

const ID_KEYS = new Set(["id", "invoiceId", "itemId", "invoice_id", "original_invoices", "balance"]);
const strip = (rows) =>
  rows.map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) if (!ID_KEYS.has(k)) out[k] = v;
    return out;
  });

function diffRows(a, b) {
  if (a.length !== b.length) return `row count ${a.length} vs ${b.length}`;
  for (let i = 0; i < a.length; i++) {
    const ka = Object.keys(a[i]);
    const kb = Object.keys(b[i]);
    if (ka.length !== kb.length || ka.some((k) => !kb.includes(k))) return `row ${i} keys differ`;
    for (const k of ka) {
      if (JSON.stringify(a[i][k]) !== JSON.stringify(b[i][k])) {
        return `row ${i} field ${k}: ${JSON.stringify(a[i][k])} vs ${JSON.stringify(b[i][k])}`;
      }
    }
  }
  return null;
}

const [nodeCookie, tbCookie] = await Promise.all([loginNode(), loginTrailBase()]);
const slugs = walk(pagesDir);

async function getJson(url, cookie) {
  try {
    const res = await fetch(url, { headers: { cookie } });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { __error: `HTTP ${res.status}: ${text.slice(0, 160)}` };
    }
  } catch (e) {
    return { __error: String(e) };
  }
}

let pass = 0;
const failures = [];
for (const slug of slugs) {
  const [nr, gr] = await Promise.all([
    getJson(`${NODE_BASE}/p/${slug}/data`, nodeCookie),
    getJson(`${GUEST_BASE}/p/${slug}/data`, tbCookie),
  ]);
  if (nr.__error || gr.__error) {
    failures.push(slug);
    console.log(`FAIL ${slug}  node=${nr.__error ?? "ok"} guest=${gr.__error ?? "ok"}`);
    continue;
  }
  const nt = JSON.stringify(nr.result?.totals ?? null);
  const gt = JSON.stringify(gr.result?.totals ?? null);
  const rowDiff = diffRows(strip(nr.result?.rows ?? []), strip(gr.result?.rows ?? []));
  if (nt === gt && !rowDiff) {
    pass++;
    console.log(`ok   ${slug}  (rows=${(nr.result?.rows ?? []).length}, totals=${nt})`);
  } else {
    failures.push(slug);
    console.log(`FAIL ${slug}`);
    if (nt !== gt) console.log(`  totals: node=${nt} guest=${gt}`);
    if (rowDiff) console.log(`  rows:   ${rowDiff}`);
  }
}

console.log(`\n== guest parity: ${pass}/${slugs.length} pages match ==`);
if (failures.length) {
  console.log(`mismatches: ${failures.join(", ")}`);
  process.exit(1);
}
