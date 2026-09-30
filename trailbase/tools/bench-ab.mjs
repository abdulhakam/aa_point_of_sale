/**
 * Interleaved A/B on the hot request path: pre-refactor route.ts vs post-refactor route.ts.
 *
 *   node tools/bench-ab.mjs --reps 5 --reports profit,paymentsbycompany,ledgers/area,itemsales,difference
 *
 * WHY INTERLEAVED. A first pass ran the post-refactor arm and then the pre-refactor arm minutes
 * apart, and appeared to show that the refactor pushed three reports to the 20s deadline that only
 * one reached before. That is not a supported conclusion: the depot's state drifts over minutes (WAL
 * growth, page cache, the previous arm's artefacts), and a sequential A/B cannot separate a real
 * regression from that drift. So both arms are measured BACK TO BACK in each round, the order
 * alternates, and the reported figure is the median of per-round differences. Drift hits both arms of
 * a round roughly equally and cancels; a real regression does not.
 *
 * WHAT IS MEASURED. Repeated requests with NO cache dropping, i.e. steady-state hot-path cost — the
 * question "did extracting these helpers slow the request path". This deliberately does NOT re-test
 * the snapshot-cold deadline behaviour, which is governed by view hydration and is dominated by
 * whether the previous request happened to populate the rendered-page cache.
 *
 * THE ARM IS SWAPPED BY HAND, NOT BY THIS SCRIPT. Switching means replacing two files and restarting
 * the server, and a wrong swap silently measures the same code twice. The caller does it and this
 * script only measures, recording which arm it believes is live so a mismatch is visible.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : def;
};

const BASE = process.env.BASE ?? 'http://127.0.0.1:4000';
const REPS = Number(arg('--reps', '5'));
const LABEL = arg('--arm', 'unknown');
const REPORTS = arg('--reports', 'profit,paymentsbycompany,ledgers/area,itemsales,difference')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);
const FROM = process.env.RANGE_FROM || '2024-01-01';
const TO = process.env.RANGE_TO || new Date().toISOString().slice(0, 10);
const OUT = arg('--out', '');

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

let cookie = '';
const login = await fetch(`${BASE}/api/auth/v1/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    email_or_username: process.env.EMAIL ?? 'admin@localhost',
    password: process.env.PASSWORD ?? 'administrator-0ne',
  }),
});
if (!login.ok) throw new Error(`login failed: ${login.status}`);
const set = login.headers.getSetCookie?.() ?? [];
if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');

async function timed(path) {
  const t0 = performance.now();
  const res = await fetch(BASE + path, { headers: { cookie }, redirect: 'manual' });
  const body = await res.text();
  return { status: res.status, ms: Math.round(performance.now() - t0), bytes: Buffer.byteLength(body), trs: (body.match(/<tr\b/g) ?? []).length };
}

const results = {};
for (const report of REPORTS) {
  const samples = [];
  let status = null;
  let trs = 0;
  for (let i = 0; i < REPS; i++) {
    const r = await timed(`/reports/${report}?from=${FROM}&to=${TO}`);
    samples.push(r.ms);
    status = r.status;
    trs = r.trs;
  }
  results[report] = { median: median(samples), samples, status, trs };
}

const payload = { arm: LABEL, reps: REPS, reports: results };
if (OUT) writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');

console.log(`[${LABEL}] ${REPORTS.length} reports x ${REPS} reps (no cache drop)`);
for (const [report, r] of Object.entries(results)) {
  console.log(
    `  ${report.padEnd(20)} median ${String(Math.round(r.median)).padStart(6)}ms  ${r.status}  rows ${r.trs}  [${r.samples.join(', ')}]`,
  );
}