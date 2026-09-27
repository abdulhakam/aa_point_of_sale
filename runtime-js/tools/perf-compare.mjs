// Node frontend-ssr vs the runtime-js guest: app-level latency on the same depot.
//
//   node runtime-js/tools/perf-compare.mjs
//
// For each endpoint it times one "cold" request (first in this process) and the median of
// repeats, on both apps. The apps serve the same data from the same TrailBase server.

const NODE = process.env.NODE_BASE || "http://127.0.0.1:3100";
const GUEST = process.env.GUEST_BASE || "http://127.0.0.1:4003";
const EMAIL = process.env.ADMIN_EMAIL || "admin@localhost";
const PASSWORD = process.env.ADMIN_PASSWORD || "administrator-0ne";

const sep = "from=2026-09-01&to=2026-09-30";
const ENDPOINTS = [
  ["/healthz", 3],
  ["/dashboard", 3],
  ["/reports/profit?" + sep, 3],
  ["/p/reports/profit/data?" + sep, 3],
  ["/management/items", 3],
  ["/reports/status", 3],
];

const cookieFrom = (res) =>
  (res.headers.getSetCookie ? res.headers.getSetCookie() : []).map((c) => c.split(";")[0]).join("; ");

async function loginNode() {
  const res = await fetch(`${NODE}/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `email=${encodeURIComponent(EMAIL)}&password=${encodeURIComponent(PASSWORD)}`,
    redirect: "manual",
  });
  const cookie = cookieFrom(res);
  if (!cookie) throw new Error(`Node login failed (${res.status})`);
  return cookie;
}

async function loginGuest() {
  const res = await fetch(`${GUEST}/api/auth/v1/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `email_or_username=${encodeURIComponent(EMAIL)}&password=${encodeURIComponent(PASSWORD)}`,
    redirect: "manual",
  });
  const cookie = cookieFrom(res);
  if (!cookie) throw new Error(`Guest login failed (${res.status})`);
  return cookie;
}

async function measure(base, cookie, path, repeats) {
  const samples = [];
  let status = 0;
  let bytes = 0;
  let cold = 0;
  for (let i = 0; i <= repeats; i++) {
    const t0 = performance.now();
    let res;
    try {
      res = await fetch(base + path, { headers: cookie ? { cookie } : {}, redirect: "manual" });
    } catch (e) {
      return { status: 0, cold: 0, warm: 0, bytes: 0, error: String(e) };
    }
    const text = await res.text();
    const ms = performance.now() - t0;
    if (i === 0) {
      cold = ms;
      status = res.status;
      bytes = Buffer.byteLength(text);
    } else {
      samples.push(ms);
    }
  }
  samples.sort((a, b) => a - b);
  const warm = samples.length ? samples[Math.floor(samples.length / 2)] : 0;
  return { status, cold, warm, bytes };
}

const [nodeCookie, guestCookie] = await Promise.all([loginNode(), loginGuest()]);

console.log("endpoint".padEnd(44), "node cold/warm".padEnd(18), "guest cold/warm".padEnd(19), "guest status");
console.log("-".repeat(100));

for (const [path, repeats] of ENDPOINTS) {
  // Measure node fully, then guest, so neither is warmed by the other.
  const n = await measure(NODE, nodeCookie, path, repeats);
  const g = await measure(GUEST, guestCookie, path, repeats);
  const fmt = (r) => `${Math.round(r.cold ?? 0)} / ${Math.round(r.warm)} ms`;
  console.log(
    path.slice(0, 42).padEnd(44),
    fmt(n).padEnd(18),
    fmt(g).padEnd(19),
    `${g.status} (${g.error ?? "ok"})`
  );
}

console.log("\nNote: 'cold' is the first request in this run; 'warm' is the median of the repeats.");
console.log("Guest cold includes the JS view build; guest warm for /p data is a KV cache hit.");
