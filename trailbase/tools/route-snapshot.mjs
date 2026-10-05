/**
 * Route parity snapshot: log in, hit every app route, and record status + a content fingerprint.
 *
 *   node tools/route-snapshot.mjs [--base URL] [--out FILE]
 *
 * This is the refactoring gate. Steps that MOVE code (extracting route-kit helpers, splitting the
 * dispatcher into per-route folders, then deleting it) must not change what any screen renders, so the
 * only honest check is a before/after diff of this file. A route that appears, disappears, or changes
 * fingerprint is a regression to explain, not a rounding difference to ignore.
 *
 * The fingerprint deliberately ignores values that vary per request — a nonce, a CSRF token, a
 * generated opKey, a timestamp, a content length — because those change on every load even when the
 * page is byte-identical in substance. It hashes the SHAPE of the response: the status, the content
 * type, the row/element counts, and the title, which is what a move should preserve exactly.
 *
 * Auth is TrailBase's own cookie (the guest has no session layer), so this logs in through
 * `/api/auth/v1/login` form-encoded, the same way tools/guest-smoke.mjs does.
 */
import { writeFileSync } from 'node:fs';

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : def;
};

const BASE = arg('--base', 'http://127.0.0.1:4000');
const OUT = arg('--out', '');
const EMAIL = arg('--email', 'admin@localhost');
const PASSWORD = arg('--password', 'administrator-0ne');

let cookie = '';
const remember = (res) => {
  const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');
};

/**
 * Routes to fingerprint. `params` substitute `{id}`-style placeholders with concrete values; the
 * read-only GETs are listed first because they are the ones a move can silently break.
 */
const ROUTES = [
  ['healthz', '/healthz', 'GET'],
  ['login', '/login', 'GET'],
  ['root', '/', 'GET'],
  ['dashboard', '/dashboard', 'GET'],
  ['reports index', '/reports', 'GET'],
  ['reports status', '/reports/status', 'GET'],
  ['reports ledgers', '/reports/ledgers', 'GET'],
  ['report profit', '/reports/profit', 'GET'],
  ['report dailysale', '/reports/dailysale', 'GET'],
  // The route is `stockreport`, matching the legacy `/app/reports/stockreport`. It used to be
  // probed as `/reports/stock`, which is not a route at all — so the snapshot reported a confident
  // `404` for "report stock" and the one report the plan's gate names was never actually covered.
  ['report stock', '/reports/stockreport', 'GET'],
  ['report payments', '/reports/payments', 'GET'],
  ['report outstanding', '/reports/outstanding', 'GET'],
  ['report difference', '/reports/difference', 'GET'],
  ['report itemsales', '/reports/itemsales', 'GET'],
  ['report paymentsbycompany', '/reports/paymentsbycompany', 'GET'],
  ['report salesreport', '/reports/salesreport', 'GET'],
  ['report productsale', '/reports/productsale', 'GET'],
  ['report unknown', '/reports/does-not-exist', 'GET'],
  ['ledger general', '/reports/ledgers/general', 'GET'],
  ['ledger area', '/reports/ledgers/area', 'GET'],
  ['ledger booker', '/reports/ledgers/booker', 'GET'],
  ['ledger party', '/reports/ledgers/party', 'GET'],
  ['management index', '/management', 'GET'],
  ['management parties', '/management/parties', 'GET'],
  ['management items', '/management/items', 'GET'],
  ['management unknown', '/management/nope', 'GET'],
  ['invoices', '/invoices', 'GET'],
  ['invoice new', '/invoices/new', 'GET'],
  ['payments', '/payments', 'GET'],
  ['payment new', '/payments/new', 'GET'],
  ['cashmemo', '/cashmemo', 'GET'],
  ['cashmemo vouchers', '/cashmemo/vouchers', 'GET'],
  ['cashmemo da', '/cashmemo/da', 'GET'],
  ['cashmemo expenses', '/cashmemo/expenses', 'GET'],
  ['inventory', '/inventory', 'GET'],
  ['print', '/print', 'GET'],
  ['plugins', '/plugins', 'GET'],
  ['pages index', '/p', 'GET'],
  ['page profit', '/p/reports/profit', 'GET'],
  ['page profit data', '/p/reports/profit/data', 'GET'],
  ['page unknown', '/p/nope', 'GET'],
  ['invoice-doc', '/invoice-doc', 'GET'],
  ['invoice-doc verify', '/invoice-doc/verify', 'GET'],
  ['invoice-doc list', '/invoice-doc/list', 'GET'],
  ['jobs unknown', '/jobs/deadbeef', 'GET'],
  ['bench reportkeys', '/bench/reportkeys', 'GET'],
  ['static css', '/static/css/app.css', 'GET'],
  ['favicon', '/favicon.svg', 'GET'],
  ['not found', '/definitely-not-a-route', 'GET'],
];

/** Strip per-request noise so a code MOVE does not read as a content change. */
function normalise(text) {
  return String(text)
    .replace(/line-[a-z0-9]+-[a-z0-9]+/gi, 'OPKEY')       // generated line keys
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, 'UUID')
    .replace(/\b\d{4}-\d{2}-\d{2}T[\d:.]+Z?\b/g, 'TIMESTAMP')
    .replace(/\b\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\b/g, 'TIMESTAMP');
}

/** The fingerprint: shape, not substance. Counts + title survive a move; a nonce must not. */
function fingerprint(status, contentType, body) {
  if (contentType && contentType.includes('json')) {
    let keys = '';
    try {
      const parsed = JSON.parse(body);
      keys = Object.keys(parsed).sort().join(',');
      const version = parsed.version ?? parsed.snap?.version;
      return `json status=${status} keys=[${keys}] version=${version ?? '-'}`;
    } catch {
      return `json-unparsed status=${status} len=${body.length}`;
    }
  }
  const text = normalise(body);
  const rows = (text.match(/<tr\b/g) || []).length;
  const inputs = (text.match(/<(input|select|textarea)\b/g) || []).length;
  const title = (text.match(/<title>([^<]*)<\/title>/) || [, ''])[1];
  const links = new Set((text.match(/href="\/[^"]*"/g) || []).map((h) => h.slice(6, -1).split('?')[0]));
  return `html status=${status} tr=${rows} fields=${inputs} title="${title}" links=${links.size}`;
}

const results = [];

/**
 * The ~20 s WASM call deadline makes the heaviest reports genuinely load-dependent: the same route
 * returns 200 on a quiet server and 500 when three of them run back to back. That is not a
 * regression signal, and a gate that reports it as one is worse than no gate — it trains you to
 * ignore diffs. So a 500 is retried, and only a 500 that survives every attempt is recorded.
 *
 * The retry is therefore part of the measurement, not a workaround: what it asserts is "this route
 * can render", not "this route renders within N ms".
 */
const DEADLINE_RETRIES = 2;

async function probe(name, path, method) {
  const started = Date.now();
  let last = null;
  for (let attempt = 0; attempt <= DEADLINE_RETRIES; attempt++) {
    try {
      const res = await fetch(BASE + path, {
        method,
        redirect: 'manual',
        headers: cookie ? { cookie } : {},
      });
      const body = await res.text();
      last = {
        name,
        path,
        method,
        status: res.status,
        ms: Date.now() - started,
        attempts: attempt + 1,
        fp: fingerprint(res.status, res.headers.get('content-type'), body),
      };
      if (res.status !== 500) {
        results.push(last);
        return;
      }
    } catch (error) {
      last = { name, path, method, status: 'ERR', ms: Date.now() - started, attempts: attempt + 1, fp: String(error.message || error) };
    }
    // Let the runtime threads settle before asking again.
    await new Promise((r) => setTimeout(r, 1500));
  }
  results.push(last);
}

const login = await fetch(`${BASE}/api/auth/v1/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  // TrailBase's field is `email_or_username`; `identity` is rejected with 400.
  body: new URLSearchParams({ email_or_username: EMAIL, password: PASSWORD }),
  // `redirect: 'manual'` is load-bearing. TrailBase answers the login with a 303 to /login; if
  // fetch follows it, `res` becomes the *login page* — an HTML response with no Set-Cookie — so
  // `remember` stores an empty cookie, every later route 303s to /login, and the snapshot records
  // "45 routes, 0 erroring" having tested nothing but redirects. That is a silent false pass:
  // `login.ok` was still true, so the "logged in" line printed either way. Only the manual
  // response carries the Set-Cookie headers. guest-smoke.mjs passes this for the same reason.
  redirect: 'manual',
});
// TrailBase answers a *successful* login with a 303 to /login (the tokens ride in Set-Cookie), so
// `login.ok` is false for the case that worked. Bad credentials come back 401.
if (login.status !== 303 && login.status !== 200) {
  console.error(`login failed: ${login.status}`);
  process.exit(1);
}
remember(login);
// A login that set no cookie must fail loudly rather than snapshot 45 redirects.
if (!cookie) {
  console.error(`login returned ${login.status} but set no auth cookie — every route would snapshot a redirect`);
  process.exit(1);
}
console.log(`logged in as ${EMAIL} (${login.status}, cookie set)\n`);

for (const [name, path, method] of ROUTES) await probe(name, path, method);

const width = Math.max(...results.map((r) => r.name.length));
for (const r of results) {
  const retried = r.attempts > 1 ? ` (${r.attempts} attempts)` : '';
  console.log(`${String(r.status).padEnd(4)} ${r.name.padEnd(width)}  ${String(r.ms).padStart(6)}ms  ${r.fp}${retried}`);
}
const bad = results.filter((r) => r.status === 'ERR' || r.status === 500);
console.log(`\n${results.length} routes, ${bad.length} erroring after ${DEADLINE_RETRIES} retries`);
if (bad.length) for (const b of bad) console.log(`  ${b.name}: ${b.fp}`);

if (OUT) {
  writeFileSync(OUT, JSON.stringify(results, null, 2) + '\n');
  console.log(`snapshot written to ${OUT}`);
}