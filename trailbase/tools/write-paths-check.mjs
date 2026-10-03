/**
 * Exercise the write paths, not just the reads.
 *
 *   node tools/write-paths-check.mjs
 *
 * `tools/route-snapshot.mjs` only issues GETs, so it cannot see a regression in `routeKit.write` —
 * the helper that drops the report snapshot after a mutation. This drives the POST endpoints that
 * the refactor touched, against the running depot, and asserts two things per write:
 *
 *   1. the endpoint's own response is what it was (status + redirect target);
 *   2. a subsequent read reflects the write, which is only true if `invalidate()` actually ran.
 *
 * Every write targets a row this script creates and then removes, so a run leaves the depot as it
 * found it apart from the job/invoice ids it consumes. It is destructive to its own fixtures only —
 * do not point it at a depot whose data you cannot regenerate.
 */
const BASE = process.env.BASE ?? 'http://127.0.0.1:4000';
const EMAIL = process.env.EMAIL ?? 'admin@localhost';
const PASSWORD = process.env.PASSWORD ?? 'administrator-0ne';

let cookie = '';
const remember = (res) => {
  const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');
};

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  — ${detail}`}`);
};

/** POST form-encoded and report status + Location, following no redirects. */
async function post(path, fields) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    redirect: 'manual',
    headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });
  const body = await res.text();
  return { status: res.status, location: res.headers.get('location'), body };
}

async function get(path) {
  const res = await fetch(BASE + path, { redirect: 'manual', headers: { cookie } });
  return { status: res.status, body: await res.text() };
}

const login = await fetch(`${BASE}/api/auth/v1/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email_or_username: EMAIL, password: PASSWORD }),
  // `redirect: 'manual'` is load-bearing, and its absence is why this tool reported six failures out
  // of seven for as long as it existed. TrailBase answers a successful login with a 303 to /login and
  // puts the tokens in `Set-Cookie` on THAT response; with the default redirect-following, `res` becomes
  // the login page — an HTML response with no Set-Cookie — so `remember()` stored an empty cookie and
  // every write went out unauthenticated and was bounced to `/login?next=…`.
  //
  // It never looked broken: the login "succeeded" (`login.ok` is true for a followed 303), so the tool
  // printed its checks and reported a plausible story — a redirect that was not a redirect, and records
  // that could not be found because they were never created. Same defect as
  // route-snapshot.mjs; see vault/issues/route-snapshot-was-snapshotting-redirects.md.
  //
  // A successful TrailBase login is a 303, so `login.ok` is false for the case that worked — the status
  // and the cookie are the real test.
  redirect: 'manual',
});
// TrailBase answers a successful login with 303 (200 is accepted in case that changes); bad
// credentials come back 401.
if (login.status !== 303 && login.status !== 200) {
  console.error(`login failed: ${login.status}`);
  process.exit(1);
}
remember(login);
// A login that set no cookie must fail loudly rather than posting six unauthenticated writes.
if (!cookie) {
  console.error(`login returned ${login.status} but set no auth cookie — every write would be bounced to /login`);
  process.exit(1);
}

// ---------------------------------------------------------------- expense create/update/delete
//
// Exercises the `/cashmemo/expenses/save` and `/cashmemo/expenses/{id}/delete` pair, which between
// them are a conditional write, an unconditional write and a delete — the shapes `write()` wraps.

const stamp = Date.now().toString(36);
const created = await post('/cashmemo/expenses/save', { description: `refactor-probe-${stamp}`, amount: '11.11' });
check('POST /cashmemo/expenses/save redirects', created.status === 303 && created.location === '/cashmemo/expenses?status=ok',
  `status=${created.status} location=${created.location} body=${created.body.slice(0, 160)}`);

const afterCreate = await get('/cashmemo/expenses?q=refactor-probe');
check('created expense is readable', afterCreate.body.includes(`refactor-probe-${stamp}`));

// The edit link carries the id in base64: `?edit=<id>`. There is no hidden `id` input on the row,
// so the link is the only handle.
const expenseId = (() => {
  const link = new RegExp(`edit=([A-Za-z0-9_-]+)[^"']*[^<]*${stamp}`).exec(afterCreate.body);
  if (link) return link[1];
  const rows = [...afterCreate.body.matchAll(/edit=([A-Za-z0-9_-]{16,})/g)];
  return rows.length ? rows[rows.length - 1][1] : null;
})();
check('found the created expense id', Boolean(expenseId), `stamp=${stamp}`);

if (expenseId) {
  const updated = await post('/cashmemo/expenses/save', { id: expenseId, description: `refactor-probe-${stamp}-b`, amount: '22.22' });
  check('POST expense update redirects', updated.status === 303, `status=${updated.status} body=${updated.body.slice(0, 160)}`);

  const afterUpdate = await get('/cashmemo/expenses?q=refactor-probe');
  check('update is visible', afterUpdate.body.includes(`refactor-probe-${stamp}-b`));

  const deleted = await post(`/cashmemo/expenses/${expenseId}/delete`, {});
  check('POST expense delete redirects', deleted.status === 303, `status=${deleted.status}`);

  const afterDelete = await get('/cashmemo/expenses?q=refactor-probe');
  check('deleted expense is gone', !afterDelete.body.includes(`refactor-probe-${stamp}-b`));
}

// ---------------------------------------------------------------- management create/delete
//
// A different entity and a different write helper (`management.createRow` + `syncLinks`).

const section = await post('/management/sections/create', { name: `refactor-probe-${stamp}` });
check('POST /management/sections/create redirects', section.status === 303 && String(section.location).startsWith('/management/sections?status=ok'),
  `status=${section.status} location=${section.location} body=${section.body.slice(0, 200)}`);

const sections = await get('/management/sections');
check('created section is listed', sections.body.includes(`refactor-probe-${stamp}`));

// The row's own id, taken from the `?edit=<id>` link *inside the same <tr>*. Matching on the stamp
// alone is not enough: taking the nearest preceding link on the whole page picks up the PREVIOUS
// row's link, which deletes a real section and leaks the fixture instead.
const rowId = (() => {
  for (const row of sections.body.split('<tr')) {
    if (!row.includes(`refactor-probe-${stamp}`)) continue;
    const link = /edit=([A-Za-z0-9_-]{16,})/.exec(row);
    if (link) return link[1];
  }
  return null;
})();
check('found the created section id', Boolean(rowId), `stamp=${stamp}`);

if (rowId) {
  const del = await post(`/management/sections/${rowId}/delete`, {});
  check('POST /management/sections/{id}/delete redirects', del.status === 303, `status=${del.status}`);
  const after = await get('/management/sections');
  check('deleted section is gone', !after.body.includes(`refactor-probe-${stamp}`));
}

// ---------------------------------------------------------------- auth guard
//
// An unauthenticated POST must still be refused; this is the one write path whose behaviour a
// refactor could silently widen.

const anon = await fetch(`${BASE}/cashmemo/expenses/save`, {
  method: 'POST',
  redirect: 'manual',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ description: 'anon-probe', amount: '1' }).toString(),
});
check('unauthenticated write is redirected to login', anon.status === 303 && String(anon.headers.get('location')).startsWith('/login'),
  `status=${anon.status} location=${anon.headers.get('location')}`);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length} checks, ${failed.length} failing`);
console.log(`fixtures removed: ${expenseId ? 'expense' : 'n/a'}, ${rowId ? 'section' : 'n/a'}`);
process.exit(failed.length === 0 ? 0 : 1);