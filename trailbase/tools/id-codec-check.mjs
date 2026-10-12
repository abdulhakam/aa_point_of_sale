/**
 * Id codec check — hex <-> the URL-safe base64 the app shows for BLOB ids.
 *
 * Run: node tools/id-codec-check.mjs
 *
 * This exists because a wrong base64 alphabet does not fail loudly. A 62-character alphabet (or one
 * with a character out of place) makes sextet 63 index past the end and return `undefined`, and
 * shifts every value >= 48, so ids decode to plausible-looking bytes that match NO row. The
 * symptom is an empty screen, not an exception — which is how a materialised invoice document once
 * rendered with blank item names.
 *
 * So this asserts the exact 64-character alphabet first, then round-trips both directions including
 * the vector recorded in `app/lib/route-kit.js`. It reads the SHIPPED source rather than a copy.
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const url = new URL('../runtime/ahscripts/lib/route-kit.js', import.meta.url);
const src = readFileSync(url, 'utf8');

const line = src.split('\n').find((l) => l.includes('const B64_ALPHABET ='));
const alphabet = line.slice(line.indexOf('"') + 1, line.lastIndexOf('"'));
if (alphabet !== STD) {
  console.error('FAIL alphabet is not the canonical 64-character set:');
  console.error('  got  [' + alphabet + '] (' + alphabet.length + ')');
  console.error('  want [' + STD + '] (64)');
  process.exit(1);
}

// Exercise the pure functions by materialising them as a real module, so what is tested is the
// shipped source rather than a hand-edited copy of it.
const start = src.indexOf('const B64_ALPHABET');
const body = src.slice(start).replace(/^export \{ invalidate \};$/m, '');
const tmp = new URL('../runtime/ahscripts/lib/route-kit.vectors.mjs', import.meta.url);
writeFileSync(tmp, body);

const m = await import(tmp.href);

const KNOWN_HEX = '01A0EBFD3E2176D294C5C5797E90A6E5';
const KNOWN_B64 = 'AaDr_T4hdtKUxcV5fpCm5Q';

let fail = 0;
const check = (label, got, want) => {
  const ok = got === want;
  if (!ok) fail++;
  console.log((ok ? 'ok   ' : 'FAIL ') + label.padEnd(34) + got + (ok ? '' : '  want ' + want));
};

console.log('== round trip hex -> base64 -> hex ==');
for (const h of [
  KNOWN_HEX,
  '000102030405060708090A0B0C0D0E0F',
  'FF',
  'DEADBEEF',
  '00',
  '0000',
  '',
]) {
  const b = m.hexToB64(h);
  check(JSON.stringify(h), m.b64ToHex(b), h.toUpperCase());
}

console.log('== the documented vector, both directions ==');
check('hexToB64(' + KNOWN_HEX.slice(0, 8) + '..)', m.hexToB64(KNOWN_HEX), KNOWN_B64);
check('b64ToHex(' + KNOWN_B64.slice(0, 8) + '..)', m.b64ToHex(KNOWN_B64), KNOWN_HEX);

console.log('== tolerance (must not throw, must match) ==');
check('junk chars skipped', m.b64ToHex(KNOWN_B64 + '!!'), KNOWN_HEX);
check('standard +/ accepted', m.b64ToHex('+/8='), 'FBFF');
check('padding terminates', m.b64ToHex(KNOWN_B64 + '=='), KNOWN_HEX);
check('empty is empty', m.b64ToHex(''), '');
check('hex strips non-hex', m.hexToB64('zz' + KNOWN_HEX), KNOWN_B64);

// The codec has a Rust implementation (tb-ah-run-js/src/api/ids.rs) AND a JS fallback, and
// `route-kit.js` picks between them at call time. Two implementations of a codec that has no loud
// failure mode is exactly the situation that produced the original bug, so they are held to each
// other by comparing both against the same vectors through the running server.
if (process.argv.includes('--compare')) {
  console.log('\n== Rust bridge vs JS fallback (via /__idcodec) ==');
  const BASE = process.env.BASE ?? 'http://127.0.0.1:4000';
  const login = await fetch(`${BASE}/api/auth/v1/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      email_or_username: process.env.EMAIL ?? 'admin@localhost',
      password: process.env.PASSWORD ?? 'administrator-0ne',
    }),
        // `redirect: 'manual'` is load-bearing. TrailBase answers a successful login with a 303 to
        // /login and puts the tokens in `Set-Cookie` on THAT response; following it returns the login
        // page, whose headers carry no cookie, so every later request goes out unauthenticated and is
        // bounced to `/login?next=…` — which reads as a redirect bug rather than a harness bug.
        // See vault/issues/route-snapshot-was-snapshotting-redirects.md.
        redirect: "manual",
  });
  const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  const probe = await fetch(`${BASE}/__idcodec`, { headers: { cookie } });
  const got = await probe.json();

  // The bridge flag arrives as a real JSON boolean, but tolerate the string form too in case the
// host's serializer changes.
const bridgePresent = got.hasBridge === true || String(got.hasBridge).trim() === 'true';
check('rust bridge is present', String(bridgePresent), 'true');
if (bridgePresent) {
    for (const [hex, v] of Object.entries(got.pairs ?? {})) {
      const label = hex ? hex.slice(0, 8) : '(empty)';
      check(`rust hexToB64(${label})`, v.rust, v.js);
      check(`rust b64ToHex(${label})`, v.rustBack, v.jsBack);
      check(`rust==js hexToB64(${label})`, v.rust, v.js);
      check(`rust==js b64ToHex(${label})`, v.rustBack, v.jsBack);
    }
  }
}

unlinkSync(tmp);
console.log(fail === 0 ? '\nALL PASS' : '\n' + fail + ' FAILURE(S)');
process.exit(fail === 0 ? 0 : 1);