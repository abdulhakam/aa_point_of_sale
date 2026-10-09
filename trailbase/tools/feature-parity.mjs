/**
 * Feature parity: every screen the LEGACY app can reach, against the guest.
 *
 * The legacy side is read out of the frozen compiled bundle, which is the only surviving description of
 * the legacy app — one `page.js` per screen under `legacyforparity/standalone/.next/server/app`, in a
 * tree that nests arbitrarily deep. The guest side is discovered by walking the guest's own route table
 * rather than a hand-written list, so a new guest route shows up here without anyone editing this file.
 *
 * ⚠️ Never write a recursive glob in a JavaScript BLOCK comment. The glob's `**` followed by `/`
 * contains the two-character sequence that ends a block comment, and everything after it is parsed as
 * code. This file did, and node reported the result as a syntax error several lines BELOW the comment,
 * on a line that was perfectly legal — which is the worst possible place to be told about it. The path
 * is spelled out in prose above instead.
 *
 *   node trailbase/tools/feature-parity.mjs [--json out.json]
 *
 * This compares REACHABLE SCREENS, not behaviour. A screen that exists in both is "present", which is
 * the coarse half of parity; the fine half — does the guest's screen do what the legacy one did — is
 * [[guest-frontend-feature-parity-gaps]], and this tool deliberately does not claim to settle it.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const LEGACY_ROOT = arg(
  "--legacy-root",
  fileURLToPath(new URL("../../legacyforparity/standalone/.next/server/app", import.meta.url))
);
const JSON_OUT = arg("--json", "");

/** The legacy app's routes, from the bundle that serves them. */
function legacyPages(dir, out = []) {
  if (!dir || !statSync(dir, { throwIfNoEntry: false })) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) legacyPages(p, out);
    else if (e === "page.js") out.push(p);
  }
  return out;
}

/** What the bundle says a screen is: its title, and the API calls it makes. */
function describe(file) {
  const src = readFileSync(file, "utf8");
  const title = /<title>([^<{]*)/.exec(src)?.[1]?.trim() ?? null;
  // Built with `new RegExp` and \x22 rather than a literal, so the pattern never has to carry a quote
  // character inside a character class — which is unreadable at best and a quoting hazard at worst.
  const Q = "\\x22";
  const collectionRe = new RegExp("(?:fullList|getList|getFullList|create|update|delete)\\(\\{\\s*collection:\\s*" + Q + "([^" + Q + "]+)" + Q, "g");
  const readRe = new RegExp("(?:fullList|getList|getFullList)\\(\\{\\s*collection:\\s*" + Q + "([^" + Q + "]+)" + Q, "g");
  const fetchRe = new RegExp("fetch\\(\\s*['\"`]([^'\"`]+)['\"`]", "g");
  const recordApis = [...new Set([...src.matchAll(readRe)].map((m) => m[1]))];
  const fetches = [...new Set([...src.matchAll(fetchRe)].map((m) => m[1]))].filter((u) => u.startsWith("/api"));
  return { title, recordApis, fetches };
}

/**
 * The guest's routes, read from the folder tree that defines them. Every URL is an
 * `ahscripts/routes/<path>/route.ts` folder since tb-0030 step 5 moved the routes out of a single
 * dispatcher, which step 6 then deleted. The folder names ARE the route: `{param}` is a single segment
 * and `[...rest]` a catch-all. Read by walking, not by grepping a dispatcher — there is none any more.
 */
function guestRoutes(
  routesDir = fileURLToPath(new URL("../runtime/ahscripts/routes", import.meta.url))
) {
  const set = new Set();
  const symbol = (seg) =>
    seg.startsWith("{") && seg.endsWith("}")
      ? ":" + seg.slice(1, -1)
      : seg.startsWith("[...") && seg.endsWith("]")
        ? "*"
        : seg;
  const walkRoutes = (dir, rel) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walkRoutes(p, rel ? `${rel}/${e}` : e);
      else if (e === "route.ts" || e === "route.js") set.add("/" + rel.split("/").map(symbol).join("/"));
    }
  };
  if (statSync(routesDir, { throwIfNoEntry: false })) walkRoutes(routesDir, "");

  // The declarative pages and their data endpoints are served by slug as well as by the `p/[...slug]`
  // folder, so they are added from the manifests on disk.
  const pagesDir = fileURLToPath(new URL("../runtime/app/pages", import.meta.url));
  const walk = (dir) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (e === "meta.json") {
        const slug = relative(pagesDir, p).replace(/[\\/]meta\.json$/, "").replace(/\\/g, "/");
        set.add(`/p/${slug}`);
        set.add(`/p/${slug}/data`);
      }
    }
  };
  if (statSync(pagesDir, { throwIfNoEntry: false })) walk(pagesDir);
  return [...set].sort();
}

const legacy = legacyPages(LEGACY_ROOT)
  .map((f) => {
    // The URL IS the path under the Next.js app directory, so the leading route group (`app/`, which is
    // a real folder here — hence the `/app/app/…` you see in the on-disk path) is part of the route.
    // Prefixing another `/app` produces `/app/app/reports/payments`, which 404s, and every screen then
    // reads as MISSING — a parity report that reports total absence because of one string.
    const slug = relative(LEGACY_ROOT, f).replace(/(^|[\\/])page\.js$/, "$1").replace(/\\/g, "/").replace(/\/$/, "");
    return { slug, route: `/${slug}`, ...describe(f) };
  })
  .sort((a, b) => a.route.localeCompare(b.route));

const guest = guestRoutes();
const guestSet = new Set(guest);

/**
 * A legacy screen is PRESENT when the guest has a route with the same path tail. The two apps name the
 * same screen differently in places — the guest mounts the item master at `/inventory` where the legacy
 * app had `/app/management/items` — so a tail match alone UNDERSTATES parity.
 *
 * Therefore there is deliberately no `MISSING` verdict here. An unmatched screen is reported as
 * `unmapped` together with the guest routes that share a path segment with it, and the decision is left
 * explicit. Calling it MISSING would be [[settle-structural-claims-with-the-owning-artifact]] in its
 * worst form: a mechanical absence read as an absence of feature, on a tool whose own route list is
 * derived by grepping for `path === "…"`, which cannot see a route served any other way.
 */
const GENERIC = new Set(["app", "reports", "report", "ledgers", "ledger", "page", "views", "view", "p", "data", "new", "auth"]);
// Normalise BOTH sides to the same shape before comparing. The earlier version stripped the `/app`
// prefix (with its trailing slash) from a legacy route but left the guest's leading slash in place, so
// `/app/dashboard` normalised to `dashboard` while `/dashboard` normalised to `/dashboard` — they never
// matched, every legacy screen fell through to `candidate`, and `exact`/`renamed` could not fire at all.
const tail = (r) => r.replace(/^\/+/, "").replace(/^app\/?/, "").replace(/\/+$/, "").toLowerCase();
const byTail = new Map();
for (const g of guest) byTail.set(tail(g), g);

const segments = (r) =>
  r
    .split("/")
    .map((s) => s.toLowerCase())
    .filter((s) => s && !GENERIC.has(s));

const rows = legacy.map((l) => {
  const t = tail(l.route);
  const exact = guestSet.has(l.route);
  const byTailMatch = byTail.get(t);
  const lsegs = segments(l.route);
  const candidates = guest
    .filter((g) => {
      const gsegs = segments(g);
      return lsegs.some((s) => gsegs.includes(s)) && !g.endsWith("/data");
    })
    .slice(0, 6);
  return {
    legacy: l.route,
    title: l.title,
    legacyApis: [...l.recordApis, ...l.fetches],
    guest: exact ? l.route : byTailMatch ?? null,
    candidates,
    status: exact ? "exact" : byTailMatch ? "renamed" : candidates.length ? "candidate" : "unmapped",
  };
});

const order = { exact: 0, renamed: 1, candidate: 2, unmapped: 3 };
rows.sort((a, b) => order[a.status] - order[b.status] || a.legacy.localeCompare(b.legacy));
const counts = rows.reduce((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {});
const w = (s, n) => String(s ?? "").padEnd(n);
console.log(`legacy screens: ${rows.length}   (from ${LEGACY_ROOT})\n`);
console.log(`${w("legacy route", 46)}${w("guest route", 32)}${w("status", 11)}guest candidates / legacy data sources`);
console.log("-".repeat(150));
for (const r of rows) {
  console.log(`${w(r.legacy, 46)}${w(r.guest ?? "-", 32)}${w(r.status, 11)}${(r.candidates.join(", ") || "-").slice(0, 68)}`);
}
console.log("-".repeat(150));
console.log(`${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join("   ")}`);
console.log(`\nguest routes discovered: ${guest.length}`);
console.log(`\n'candidate' and 'unmapped' need a human: the guest may serve the screen under another name.`);
console.log(`Decide them by opening the guest screen, not by this table. See [[guest-frontend-feature-parity-gaps]].`);

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify({ legacy: LEGACY_ROOT, counts, rows, guest }, null, 2) + "\n");
  console.log(`wrote ${JSON_OUT}`);
}
process.exit(counts.MISSING ? 1 : 0);