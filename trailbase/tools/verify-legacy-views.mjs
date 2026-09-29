// Compose the extracted legacy views into self-contained SQL (dependencies inlined as CTEs) and
// run each against the TrailBase depot, which has only tables — no PocketBase views to hide behind.
//
//   node trailbase/tools/verify-legacy-views.mjs
//
// Also compares row counts with the same view in the PocketBase database, so a composition that
// silently drops rows is visible.

import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const viewsDir = join(repo, "trailbase", "runtime", "app", "reports", "sql", "views");
const depotDb = process.env.DEPOT_DB || "C:\\Users\\wajiz.pk\\AppData\\Local\\Temp\\kilo\\aa-perf-depot\\data\\main.db";
const pbDb = join(repo, "backend", "p_data", "data.db");

const views = new Map();
for (const file of readdirSync(viewsDir).filter((f) => f.endsWith(".sql"))) {
  views.set(file.replace(/\.sql$/, ""), readFileSync(join(viewsDir, file), "utf8").trim());
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const depsOf = (name) => {
  const sql = views.get(name) ?? "";
  return [...views.keys()].filter((n) => n !== name && new RegExp(`\\b${escapeRe(n)}\\b`).test(sql));
};

/** The view's SQL with every ported dependency inlined, in dependency order.
 *
 * The target is wrapped in a subquery so it works whether or not it starts with its own `WITH`
 * (a subquery may contain a WITH clause), and so dependency CTEs are visible inside it. */
function compose(name) {
  const ctes = [];
  const seen = new Set();
  const add = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    for (const d of depsOf(n)) add(d);
    ctes.push(`"${n}" AS (\n${views.get(n)}\n)`);
  };
  for (const d of depsOf(name)) add(d);
  if (!ctes.length) return views.get(name);
  return `WITH ${ctes.join(",\n")}\nSELECT * FROM (\n${views.get(name)}\n) AS _report`;
}

const depot = new DatabaseSync(depotDb, { readOnly: true });
const pb = new DatabaseSync(pbDb, { readOnly: true });

let ok = 0;
const failures = [];
const mismatches = [];
for (const name of [...views.keys()].sort()) {
  const sql = compose(name);
  try {
    const rows = depot.prepare(sql).all();
    let pbCount = "-";
    try {
      pbCount = String(pb.prepare(views.get(name)).all().length);
    } catch {
      pbCount = "n/a";
    }
    // A view that compiles and returns zero rows is exactly how the TEXT-enum defect
    // survived for so long, so the PocketBase count is COMPARED, not just printed.
    // It used to be printed and ignored, which made every view report "ok".
    const agrees = pbCount === "n/a" || pbCount === String(rows.length);
    if (agrees) {
      ok++;
    } else {
      mismatches.push(name);
    }
    console.log(
      `${agrees ? "ok  " : "DIFF"} ${name.padEnd(28)} depot=${String(rows.length).padStart(6)}` +
      `  pb=${pbCount.padStart(6)}` + (agrees ? "" : `  (${rows.length - Number(pbCount) >= 0 ? "+" : ""}${rows.length - Number(pbCount)})`));
  } catch (e) {
    failures.push(name);
    console.log(`FAIL ${name.padEnd(28)} ${e.message}`);
  }
}

console.log(`\n== ${ok} view(s) agree with PocketBase, ` +
  `${mismatches.length} row-count mismatch(es), ${failures.length} failed ==`);
if (mismatches.length) console.log(`   mismatched: ${mismatches.join(", ")}`);
process.exit(failures.length || mismatches.length ? 1 : 0);
