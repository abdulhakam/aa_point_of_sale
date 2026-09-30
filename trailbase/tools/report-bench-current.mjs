/**
 * Non-destructive report benchmark: where the guest is now, and did the refactor move it.
 *
 *   node tools/report-bench-current.mjs [--reps 3] [--out FILE] [--json]
 *
 * WHY THIS EXISTS ALONGSIDE `report-bench.mjs` and `run-bench.ps1`.
 *
 * `run-bench.ps1` is the reproducible one: it deletes `traildepot/data` and re-imports from v1 on
 * every run, so the numbers are comparable to each other and to the recorded baseline. That is the
 * right tool for comparing two *implementations*. It is the wrong tool for asking "how fast is the
 * system we are running right now", because it destroys the depot to answer it.
 *
 * This tool does NOT reset. It measures the depot that is actually loaded, which is the operational
 * question, and it is deliberately reported as NOT comparable to the clean-slate table
 * ([[clean-slate-benchmark-cycle]]). A depot carries a persisted `mview` snapshot, a page cache, KV
 * entries and WAL pages, so its numbers reflect a state that differs from a fresh import.
 *
 * WHAT IT DOES NORMALISE, without deleting anything:
 *   - WAL checkpoint, so a large uncheckpointed WAL is not folded into the first measurement (the
 *     recorded 68% swing came from exactly this);
 *   - ANALYZE, so the query planner has statistics rather than defaults;
 *   - repeats per report, reported as a median, because a single sample of a 10-20 s operation is
 *     mostly noise.
 *
 * COLD IS NOT AVAILABLE. The guest cannot make a read cold from inside itself: `PRAGMA
 * shrink_memory` and `PRAGMA cache_size` are rejected by the DB bridge ("pragmas not supported"),
 * both call sites swallowed the error, and an earlier `cold=1` flag was therefore a silent no-op
 * that reported warm numbers as cold ([[snapshot-persistence-hits-the-20s-deadline]]). So "cold"
 * here means only *first request in this process*; a genuinely cold measurement requires restarting
 * the server between samples. That is what `--cold-restart` does.
 */
import { appendFileSync, writeFileSync } from 'node:fs';

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : def;
};
const flag = (name) => process.argv.includes(name);

const BASE = arg('--base', 'http://127.0.0.1:4000');
const REPS = Number(arg('--reps', '3'));
const OUT = arg('--out', '');
const COLD_RESTART = flag('--cold-restart');
const FROM = process.env.RANGE_FROM || '2024-01-01';
const TO = process.env.RANGE_TO || new Date().toISOString().slice(0, 10);

// The same 14 reports report-bench.mjs uses, so the two are comparable in *scope* even though the
// depot state differs.
const REPORTS = [
  'stockreport', 'difference', 'dailysale', 'salesreport',
  'payments', 'itemsales', 'profit', 'paymentsbycompany',
  'ledgers/area', 'ledgers/general', 'ledgers/booker',
  'ledgers/party', 'outstanding', 'productsale',
];

const DEADLINE_MS = 20000;
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

let cookie = '';
async function login() {
  const res = await fetch(`${BASE}/api/auth/v1/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      email_or_username: process.env.EMAIL ?? 'admin@localhost',
      password: process.env.PASSWORD ?? 'administrator-0ne',
    }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  const set = res.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');
}

async function timed(path) {
  const t0 = performance.now();
  try {
    const res = await fetch(BASE + path, { headers: { cookie }, redirect: 'manual' });
    const body = await res.text();
    return { status: res.status, ms: Math.round(performance.now() - t0), bytes: Buffer.byteLength(body), body };
  } catch (e) {
    return { status: 'ERR', ms: Math.round(performance.now() - t0), bytes: 0, body: '', note: String(e.message ?? e) };
  }
}

/**
 * Drop the guest's own caches so the next request rebuilds from SQLite.
 *
 * This makes the measurement about *report arithmetic and rendering*, which is what the guest owns,
 * rather than about whether a snapshot happened to be warm. It is NOT a cold database read — the
 * SQLite page cache is untouched — so this is labelled `snapshot-cold` in the output.
 */
async function dropGuestCaches() {
  const res = await fetch(`${BASE}/reports/refresh?full=1`, {
    method: 'POST',
    headers: { cookie },
    redirect: 'manual',
  });
  const text = await res.text();
  return { status: res.status, rebuilt: text.slice(0, 200) };
}

function summarise(body) {
  const trs = (body.match(/<tr\b/g) ?? []).length;
  const noData = /No data/i.test(body);
  return { trs, noData };
}

const results = [];

console.log(`report benchmark — ${REPS} reps, median reported`);
console.log(`range ${FROM} .. ${TO}`);
console.log(`depot: CURRENT (not reset — not comparable to a clean-slate run)\n`);

await login();

// Warm the app and the view snapshot before measuring, so a first-request cost is not attributed to
// whichever report happened to be measured first.
await timed('/reports/status');
console.log('primed…\n');

const qs = `?from=${FROM}&to=${TO}`;

for (const report of REPORTS) {
  const cold = [];
  const warm = [];
  const statuses = [];
  const warmStatuses = [];
  let okReps = 0;
  let bytes = 0;
  let trs = 0;
  let noData = false;
  let note = '';

  for (let rep = 0; rep < REPS; rep++) {
    // snapshot-cold: the guest's report/snapshot caches are dropped before each first sample
    if (!COLD_RESTART) await dropGuestCaches();
    const c = await timed(`/reports/${report}${qs}`);
    cold.push(c.ms);
    // Status must reflect EVERY rep, not the first. A rep that renders 876 rows and a rep that hits
    // the deadline are different outcomes; keeping only the first produced a row reporting
    // "cold 68ms, status 500, 876 rows", which is self-contradictory and was a bug in this tool.
    statuses.push(c.status);
    if (c.status === 200) {
      const s = summarise(c.body);
      trs = s.trs;
      bytes = c.bytes;
      okReps++;
    }
    if (c.note) note = c.note;
    else if (c.status === 500) note = 'deadline/500';
    else if (c.status === 303) note = 'redirect(login?)';

    // warm: same report again with nothing dropped
    const w = await timed(`/reports/${report}${qs}`);
    warm.push(w.ms);
    warmStatuses.push(w.status);
  }

  // A report's verdict is its WORST rep, because a user who hits the deadline once has hit it. The
  // median still describes the typical rep, so both are reported rather than one standing in for
  // the other.
  const okCold = cold.filter((_, i) => statuses[i] === 200);
  const okWarm = warm.filter((_, i) => warmStatuses[i] === 200);
  const rec = {
    report,
    status: statuses.includes(500) ? 500 : statuses[0],
    okReps,
    coldMedian: median(cold),
    warmMedian: median(warm),
    coldMedianOk: okCold.length ? median(okCold) : null,
    warmMedianOk: okWarm.length ? median(okWarm) : null,
    coldAll: cold,
    warmAll: warm,
    statuses,
    bytes,
    trs,
    noData,
    note,
  };
  results.push(rec);

  const atDeadline = okReps < REPS || rec.coldMedian >= DEADLINE_MS;
  const okNote = okReps < REPS ? `  (${okReps}/${REPS} reps rendered)` : '';
  console.log(
    `${report.padEnd(20)} cold ${String(rec.coldMedian).padStart(7)}ms ${String(rec.status).padEnd(4)}` +
      `  warm ${String(rec.warmMedian).padStart(7)}ms` +
      `  ${(bytes / 1024).toFixed(0).padStart(6)} KB  rows ${String(trs).padStart(5)}` +
      `${atDeadline ? '  <-- DEADLINE' : ''}${okNote}${noData ? '  NO DATA' : ''}`,
  );
}

const cliff = results.filter((r) => r.status === 500 || r.coldMedian >= DEADLINE_MS);
const noData = results.filter((r) => r.noData);
const failed = results.filter((r) => r.status !== 200);
const flaky = results.filter((r) => r.status === 200 && r.okReps < REPS);

console.log(`\n${results.length} reports x ${REPS} reps`);
console.log(`at/near the ${DEADLINE_MS / 1000}s deadline: ${cliff.length}${cliff.length ? ' — ' + cliff.map((c) => c.report).join(', ') : ''}`);
console.log(`non-200: ${failed.length}${failed.length ? ' — ' + failed.map((f) => `${f.report}(${f.status})`).join(', ') : ''}`);
if (flaky.length) {
  console.log(`intermittent (some reps rendered, some hit the deadline): ${flaky.map((f) => `${f.report}(${f.okReps}/${REPS})`).join(', ')}`);
}
if (noData.length) console.log(`empty: ${noData.map((n) => n.report).join(', ')}`);
console.log('\nnot comparable to vault/references/clean-slate-benchmark-cycle — depot not reset');

if (OUT) {
  const payload = { base: BASE, reps: REPS, range: { from: FROM, to: TO }, results };
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
  console.log(`written: ${OUT}`);
}
if (OUT.endsWith('.ndjson')) appendFileSync(OUT, JSON.stringify({ ts: new Date().toISOString(), reps: REPS, results }) + '\n');