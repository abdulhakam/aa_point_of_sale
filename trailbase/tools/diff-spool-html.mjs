import { writeFileSync } from "node:fs";

/**
 * Compare the two bench arms byte-for-byte and report the FIRST difference with context.
 *
 * Written in Node rather than PowerShell because `Invoke-WebRequest` cannot hold a 10 MB response
 * for the big reports (`component responded unexpectedly`), and because reading the difference out
 * of a 10 MB string needs more than a shell loop.
 *
 * Usage: node trailbase/tools/diff-spool-html.mjs [report ...]
 */

const Base = process.env.BASE || "http://127.0.0.1:4000";
const Login = process.env.LOGIN || "admin@localhost";
const Password = process.env.PASSWORD || "administrator-0ne";

const defaultReports = ["ledgers/party", "profit", "itemsales", "payments", "outstanding", "dailysale"];
const reports = process.argv.slice(2).length ? process.argv.slice(2) : defaultReports;

const from = process.env.FROM || "2021-05-05";
const to = process.env.TO || "2031-05-05";

// Log in first: an anonymous request is answered with the LOGIN page, which deserialises to an object
// with no fields, so every arm would look like an empty report.
const login = await fetch(`${Base}/login`, {
  method: "POST",
  redirect: "manual",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ email: Login, password: Password }),
});
// TrailBase answers a form login with a 303 and TWO set-cookie headers (auth_token and
// refresh_token). `getSetCookie()` is not always present, and on some responses only the combined
// header is exposed — so both accessors are tried, and both cookies are sent. Retried once, because
// an occasional login response with no cookie at all was observed.
async function loginCookie() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${Base}/login`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email: Login, password: Password }),
    });
    const list = typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter(Boolean);
    const cookie = list
      .flatMap((v) => v.split(/,\s*(?=[A-Za-z0-9_-]+=)/))
      .map((c) => c.split(";")[0])
      .filter(Boolean)
      .join("; ");
    if (cookie) return cookie;
    console.error(`  login attempt ${attempt}: status ${res.status}, no cookie`);
  }
  throw new Error("login failed: no session cookie after 3 attempts");
}

const cookie = await loginCookie();
console.log("logged in\n");

for (const report of reports) {
  const q = `arm=REPLACE&report=${encodeURIComponent(report)}&from=${from}&to=${to}&format=html`;
  const fetchArm = (arm) => fetch(`${Base}/bench/spool?${q.replace("REPLACE", arm)}`, { headers: { cookie } })
    .then(async (r) => ({ status: r.status, text: await r.text() }));

  // Sequential, not Promise.all: the two arms of a ~10 MB report overlap heavily in CPU, and issuing
  // them together made the guest return 500 for BOTH — which reads as "identical" because the two
  // error bodies are the same 32 bytes. A concurrency-induced failure that looks like a pass is the
  // worst kind, so the status is asserted rather than assumed.
  const a = await fetchArm("rows");
  const b = await fetchArm("spooled");

  console.log(`--- ${report} ---`);
  console.log(`  rows-arm  status ${a.status}  ${a.text.length} bytes`);
  console.log(`  spooled   status ${b.status}  ${b.text.length} bytes`);

  if (a.status !== 200 || b.status !== 200) {
    console.log("  NOT COMPARED: a non-200 arm cannot be compared (both erroring is NOT equality)\n");
    continue;
  }

  if (a.text === b.text) {
    console.log("  IDENTICAL\n");
    continue;
  }

  const n = Math.min(a.text.length, b.text.length);
  let i = 0;
  while (i < n && a.text[i] === b.text[i]) i++;
  if (i >= n) {
    console.log("  one is a prefix of the other — lengths differ only\n");
    continue;
  }
  const lo = Math.max(0, i - 100);
  console.log(`  first difference at char ${i}:`);
  console.log(`    rows  : ...${a.text.slice(lo, lo + 220)}`);
  console.log(`    spool : ...${b.text.slice(lo, lo + 220)}`);
  console.log();
}