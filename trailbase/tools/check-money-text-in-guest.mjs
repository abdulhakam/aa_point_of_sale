/**
 * Ask the RUNNING GUEST how it formats money text, and compare against JS `toFixed(2)`.
 *
 * WHY THIS IS NOT DONE IN node:sqlite. The two engines disagree, in both directions:
 *
 *   - the guest has no floor()/ceil()/trunc(), where node:sqlite has them — which invalidated a
 *     whole round2 implementation that verified green in Node;
 *   - the guest's printf and format() are a different SQLite vintage, so `%.2f` behaviour cannot
 *     be assumed to match either node:sqlite or JS.
 *
 * A money-text property checked in Node is therefore not checked at all. The probe carries its own
 * `want` values (JS `toFixed(2)` of the literal), so the comparison is self-labelling and cannot be
 * misaligned by index — which is exactly the bug a caller-side index mapping introduced once already.
 *
 * Usage: node trailbase/tools/check-money-text-in-guest.mjs
 */

const Base = process.env.BASE || "http://127.0.0.1:4000";

async function cookie() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch(`${Base}/login`, {
      method: "POST", redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email: "admin@localhost", password: "administrator-0ne" }),
    });
    const list = typeof r.headers.getSetCookie === "function"
      ? r.headers.getSetCookie()
      : [r.headers.get("set-cookie")].filter(Boolean);
    const c = list.flatMap((v) => v.split(/,\s*(?=[A-Za-z0-9_-]+=)/)).map((x) => x.split(";")[0]).join("; ");
    if (c) return c;
    console.error(`  login attempt ${attempt}: no cookie`);
  }
  throw new Error("login failed");
}

const c = await cookie();
const body = await (await fetch(`${Base}/bench/sqlfn?fmt=1`, { headers: { cookie: c } })).json();

console.log("guest money TEXT formatting vs JS toFixed(2)\n");
const bad = [];
for (const f of body.fmt ?? []) {
  const mark = f.match ? "ok  " : "FAIL";
  console.log(`  ${mark} ${String(f.label).padEnd(38)} got ${JSON.stringify(f.got)}${f.match ? "" : "  want " + JSON.stringify(f.want)}`);
  if (!f.match) bad.push(f);
}

console.log("\nguest SQL functions:");
for (const [k, v] of Object.entries(body.functions ?? {})) {
  // `cast` and `nullif` are SQL SYNTAX and keywords, not functions — `SELECT cast(1)` is a syntax
  // error because CAST needs an AS target, and NULLIF needs three arguments. Their "MISSING" here is
  // a probe artefact, and both are used freely throughout the ported SQL.
  const artefact = k === "cast" || k === "nullif";
  console.log(`  ${k.padEnd(8)} ${artefact ? "(keyword — probe artefact)" : String(v).slice(0, 52)}`);
}

console.log();
if (bad.length === 0) {
  console.log("PASS — printf('%.2f') in the guest keeps trailing zeroes and matches JS toFixed(2)");
} else {
  console.log(`FAIL — ${bad.length} formatting case(s) differ from JS:`);
  for (const b of bad) console.log(`  ${b.label}: got ${JSON.stringify(b.got)} want ${JSON.stringify(b.want)}`);
}
process.exit(bad.length ? 1 : 0);