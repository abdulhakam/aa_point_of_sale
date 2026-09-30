/**
 * Remove any `refactor-probe-*` fixtures left behind by tools/write-paths-check.mjs.
 *
 *   node tools/probe-cleanup.mjs
 *
 * The write-path check creates rows and deletes them, but a run that failed partway (or one that
 * ran before its row-matching was fixed) leaves fixtures behind in a depot that holds real
 * business data. This removes them by name, so it never touches a row it did not create.
 */
const BASE = process.env.BASE ?? 'http://127.0.0.1:4000';
const EMAIL = process.env.EMAIL ?? 'admin@localhost';
const PASSWORD = process.env.PASSWORD ?? 'administrator-0ne';
const STAMP = 'refactor-probe-';

let cookie = '';
const remember = (res) => {
  const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');
};

const login = await fetch(`${BASE}/api/auth/v1/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email_or_username: EMAIL, password: PASSWORD }),
});
if (!login.ok) {
  console.error(`login failed: ${login.status}`);
  process.exit(1);
}
remember(login);

const get = async (p) => (await fetch(BASE + p, { headers: { cookie } })).text();
const post = async (p) =>
  fetch(BASE + p, { method: 'POST', redirect: 'manual', headers: { cookie } });

/**
 * Ids whose row carries the stamp, taken from the row's own `?edit=` link.
 *
 * Rows are delimited by `<tr`, so the id is taken from the segment between this row's `<tr` and the
 * next one. Taking the nearest preceding link on the whole page instead picks up the PREVIOUS row's
 * edit link, which is how an earlier version of this deleted a real section and left the fixture.
 */
function stampRowIds(html) {
  const ids = [];
  const rows = html.split('<tr');
  for (const row of rows) {
    if (!row.includes(STAMP)) continue;
    const link = /edit=([A-Za-z0-9_-]{16,})/.exec(row);
    if (link) ids.push(link[1]);
  }
  return ids;
}

const targets = [
  ['/cashmemo/expenses', (id) => `/cashmemo/expenses/${id}/delete`],
  ['/management/sections', (id) => `/management/sections/${id}/delete`],
];

let removed = 0;
for (const [listPath, deletePath] of targets) {
  const html = await get(listPath);
  const ids = [...new Set(stampRowIds(html))];
  if (!ids.length) {
    console.log(`clean: ${listPath}`);
    continue;
  }
  for (const id of ids) {
    const res = await post(deletePath(id));
    console.log(`deleted ${id} via ${deletePath(id)} -> ${res.status}`);
    if (res.status === 303) removed++;
  }
  const after = await get(listPath);
  const left = stampRowIds(after).length;
  console.log(`${left === 0 ? 'clean' : 'STILL DIRTY'}: ${listPath} (${left} left)`);
}

console.log(`\n${removed} fixture(s) removed`);