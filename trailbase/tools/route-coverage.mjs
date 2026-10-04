/**
 * Route COVERAGE — the gate that `route-snapshot.mjs` cannot be.
 *
 * ## Why this exists
 *
 * `route-snapshot.mjs` issues **GETs only**. `write-paths-check.mjs` covers 13 checks across three
 * write paths. Between them, roughly twenty of the dispatcher's **POST** and **DELETE** branches —
 * invoice header/line/complete/release, the management CRUD trio, payments, expenses, the print queue,
 * job cancel/recover — had **no automated coverage at all**.
 *
 * That is what made tb-0030 step 5 (move ~60 branches into ~30 route folders, then delete the
 * dispatcher) genuinely risky rather than merely large: a regression in a POST is invisible to every
 * harness that existed, and these are the routes that touch money. So this was built first.
 *
 * ## What it asserts
 *
 * For every entry in `route-inventory.json`: the route is **reachable** and **does not fail**. It is
 * deliberately NOT a behavioural check — it cannot be, without writing to the depot for each branch —
 * so it is the floor, not the ceiling:
 *
 * - a routed handler answers with one of `expect[]`
 * - an UNROUTED path would 404 with the host's own "Route not found" body, which is distinguished
 *   below, so a route that stops being served is a failure even when 404 is also a legitimate answer
 * - a 500 is always a failure
 *
 * The "unrouted 404" distinction is the part that makes this worth having. Several routes legitimately
 * answer 404 (`/reports/does-not-exist`), so the status alone cannot tell "handled" from "gone". The
 * host's unrouted answer is a specific body; anything else that is 404 came from a handler.
 *
 * ## Why the inventory is a file and not a parse
 *
 * `route.ts` was parsed by hand, once, on 2026-10-03. A regex scrape of a 2,167-line dispatcher is a
 * second source of truth that silently loses branches — which is the failure this whole tool exists to
 * prevent. So the inventory is **hand-seeded and checked in**, and it is updated in the SAME commit as
 * any route is moved. It is a claim a human maintains, not one a regex derives, and `check` below
 * fails if the two disagree about how many routes exist.
 *
 * ## Usage
 *
 *   BASE=http://127.0.0.1:4000 EMAIL=admin@localhost PASSWORD=… node trailbase/tools/route-coverage.mjs
 *
 * Needs a live server and credentials. Use a throw-away depot: some entries write
 * (`mutates: true`), and `cleanup` records what to remove.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");

const BASE = (process.env.BASE ?? "http://127.0.0.1:4000").replace(/\/+$/, "");
const EMAIL = process.env.EMAIL ?? "admin@localhost";
const PASSWORD = process.env.PASSWORD ?? "administrator-0ne";

const inventory = JSON.parse(readFileSync(join(here, "route-inventory.json"), "utf8"));

let cookie = "";
const failures = [];
let ok = 0;

const remember = (res) => {
  for (const c of res.headers.getSetCookie?.() ?? []) cookie = c.split(";")[0];
  if (cookie && !cookie.includes("=")) cookie = "";
};

const show = (res) => (res.body ?? "").slice(0, 120).replace(/\s+/g, " ");

async function call(route) {
  const path = route.path.replace(/\{(\w+)\}/g, (_, k) => route.probe?.substitute?.[k] ?? `missing-${k}`);
  const method = route.method;
  const opts = { redirect: "manual", headers: {} };
  if (route.probe?.auth !== false && cookie) opts.headers.cookie = cookie;
  if (route.probe?.body) {
    opts.method = method;
    opts.headers["content-type"] = "application/x-www-form-urlencoded";
    opts.body = new URLSearchParams(
      Object.fromEntries(Object.entries(route.probe.body).map(([k, v]) => [k, String(v)]))
    );
  } else if (method !== "GET") {
    opts.method = method;
  }
  const res = await fetch(BASE + path, opts);
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "";
  return {
    path,
    status: res.status,
    body: text,
    // The host's UNROUTED answer only — and it is distinctive only because tb-0030 step 4 changed it
    // to. It used to be `HttpError::message(NOT_FOUND, …)`, which TrailBase renders as the bare body
    // `Not found` — byte-identical to the guest's own `text("Not found", 404)`, which route.ts returns
    // in six places. So a 404 could not be told apart from "nothing is mounted here", and the first
    // run of this tool reported two live routes as UNROUTED. The host now answers
    // `{"error":"no_route_folder","path":…}`, which is distinguishable.
    //
    // `contentType` is checked too: the guest's 404 is `text/plain`, so a JSON 404 can only be the host.
    unrouted:
      /"error"\s*:\s*"no_route_folder"/.test(text) ||
      (res.status === 404 && /application\/json/.test(contentType)),
    location: res.headers.get("location") ?? "",
  };
}

function check(route, res) {
  const label = `${route.method.padEnd(6)} ${route.path}`;
  const problems = [];
  if (res.status === 500) problems.push("500");
  if (res.unrouted) problems.push("UNROUTED (the host has no route folder for it)");
  if (!res.unrouted && !problems.length && !route.expect.includes(res.status)) {
    problems.push(`status ${res.status}, expected one of ${route.expect.join("/")}`);
  }
  if (problems.length) {
    failures.push(`${label} — ${problems.join("; ")}  ${show(res)}`);
    console.log(`FAIL  ${label.padEnd(48)} ${problems.join("; ")}`);
    console.log(`        ${show(res)}`);
  } else {
    ok++;
    console.log(`PASS  ${label.padEnd(48)} ${res.status}${res.location ? " -> " + res.location : ""}`);
  }
}

// --- login ---------------------------------------------------------------------------------
// `redirect: 'manual'` is load-bearing: TrailBase answers a successful login with a 303 to /login and
// puts the tokens in Set-Cookie on THAT response. Following it returns the login page, whose headers
// carry no cookie — which is the defect that made five harnesses in this directory silently
// unauthenticated. See vault/issues/route-snapshot-was-snapshotting-redirects.md.
{
  const res = await fetch(`${BASE}/api/auth/v1/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email_or_username: EMAIL, password: PASSWORD }),
    redirect: "manual",
  });
  if (res.status !== 303 && res.status !== 200) {
    console.error(`login failed: ${res.status}`);
    process.exit(1);
  }
  remember(res);
  if (!cookie) {
    console.error(`login returned ${res.status} but set no auth cookie — every route would be unauthenticated`);
    process.exit(1);
  }
  console.log(`logged in as ${EMAIL} (${res.status}, cookie set)\n`);
}

// Mutating entries are noted here rather than inside the loop, because the cleanup pass needs to know
// whether there is anything to clean BEFORE it reads `inventory.routes` again.
// `mutates` sits at route level, not inside `probe` - it describes the request, not how to make it.
const mutatingEntries = inventory.routes.filter((r) => r.mutates);

for (const route of inventory.routes) {
  check(route, await call(route));
}

// --- cleanup ------------------------------------------------------------------------------
//
// A gate that leaves its fixtures behind is a defect, not a convenience. The first version of this
// tool created a section and an expense and exited — so the NEXT run of `route-snapshot.mjs` reported
// seven "differences" that were this tool's own rows (row counts 2 -> 6 on expenses, inventory, the
// general ledger, items, difference and stock). `guest-smoke.mjs` passed throughout, which is what
// identified the cause: it boots and seeds its own depot, so it cannot be the thing that changed.
//
// Cleanup is by MARKER rather than by the id the create returned, because these routes answer 303 to a
// list URL and never hand back the new row's id. The list row carries it as `?edit=<base64 id>`, and the
// delete route wants that same id in the path — so read it from the href and rebuild the delete URL.
const MARKER = "coverage-probe";
let cleaned = 0;
let cleanupFailed = 0;

/**
 * Delete every row on `listPath` whose marker text is present, using `deletePrefix` + the row's own id.
 *
 * Scoped to the row, not the page: the regex requires the marker cell to appear BEFORE the href, so a
 * page that also contains an unrelated `coverage-probe`-adjacent row cannot be over-deleted, and rows
 * that merely look similar elsewhere on the page are not touched.
 */
async function cleanupVia(listPath, deletePrefix) {
  const html = await (await fetch(BASE + listPath, { headers: { cookie } })).text();
  // `MARKER ... <td class="row-actions" ...><a href="<list>?edit=<id>"`
  const re = new RegExp(
    `>${MARKER}<\\/td>[\\s\\S]{0,600}?href="([^"]+)\\?edit=([A-Za-z0-9_%=-]+)"`,
    "g"
  );
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = decodeURIComponent(m[2]);
    const url = `${deletePrefix}${id}/delete`;
    const res = await fetch(BASE + url, {
      method: "POST",
      redirect: "manual",
      headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(),
    });
    if (res.status === 302 || res.status === 303) {
      cleaned++;
      console.log(`      removed ${url}`);
    } else {
      cleanupFailed++;
      console.log(`      FAILED to remove ${url} — ${res.status}`);
    }
  }
}

if (mutatingEntries.length) {
  await cleanupVia("/management/sections", "/management/sections/");
  await cleanupVia("/cashmemo/expenses", "/cashmemo/expenses/");
}

console.log(`\n${inventory.routes.length} routes in the inventory — ${ok} reachable, ${failures.length} failing`);
console.log(`${mutatingEntries.length} entries wrote to the depot; ${cleaned} fixture(s) removed, ${cleanupFailed} failed`);
if (cleanupFailed) console.log("  ^ leftovers will make the NEXT route-snapshot diff report this tool's own rows");

// --- did this run leave anything behind? ------------------------------------------------------
//
// A gate that leaves debris poisons the NEXT gate. `route-coverage` created seven items with an empty
// name across seven early runs — before `/inventory/save` learned to reject a body with no `name` — and
// nothing noticed for hours: the items page quietly grew from 2 rows to 8, and a `route-snapshot` diff
// reported "5 differences" that were this tool's own rows. `guest-smoke` passing throughout is what
// finally identified it, because smoke seeds its own depot and cannot be the thing that changed.
//
// So the run now checks its own aftermath rather than trusting the inventory's `mutates` flags, which
// only covered the two routes that declared it. An empty-name row is the exact shape of "a create
// route accepted a request it should have rejected", so it is the thing worth asserting on.
{
  const items = await (await fetch(BASE + "/management/items", { headers: { cookie } })).text();
  const blank = [...items.matchAll(/<td[^>]*data-lead[^>]*>\s*(?:<[^>]*>\s*)*<\/td>/g)].length;
  const marker = (items.match(new RegExp(MARKER, "g")) || []).length;
  if (blank || marker) {
    cleanupFailed++;
    console.log(
      `LEFTOVER: ${blank} item(s) with an empty name and ${marker} "${MARKER}" row(s) in the depot. ` +
        `A create route accepted a request it should have rejected, or cleanup missed a table. ` +
        `This WILL show up as phantom differences in the next route-snapshot diff.`
    );
  } else {
    console.log("aftermath: depot is clean — no fixture rows left behind");
  }
}

if (failures.length) {
  console.log("\nfailures:");
  for (const f of failures) console.log("  " + f);
}
process.exitCode = failures.length || cleanupFailed ? 1 : 0;