// Extract the legacy PocketBase view SQL verbatim into runtime files.
//
//   node trailbase/tools/extract-legacy-views.mjs
//
// The migrations only carry *some* views (and sometimes as concatenated strings or backtick
// templates). The authoritative, fully-assembled SQL lives in the PocketBase database itself
// (`_collections`), so that is the source. Nothing is rewritten: this is the historical
// arithmetic the JS views were ported from, so parity is the point.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const dbPath = join(repo, "backend", "p_data", "data.db");
const outDir = join(repo, "trailbase", "runtime", "app", "reports", "sql", "views");

mkdirSync(outDir, { recursive: true });

const db = new DatabaseSync(dbPath, { readOnly: true });
const columns = db.prepare("PRAGMA table_info(_collections)").all().map((c) => c.name);
console.log(`_collections columns: ${columns.join(", ")}`);

const hasViewQuery = columns.includes("viewQuery");

// Every table/view and column name in the database. A double-quoted token that matches one of
// these is an *identifier*; anything else (e.g. "sending", "%.2f") is a string literal that
// TrailBase's SQLite requires in single quotes.
const known = new Set();
for (const obj of db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view')").all()) {
  known.add(String(obj.name).toLowerCase());
  try {
    for (const col of db.prepare(`PRAGMA table_info("${obj.name}")`).all()) {
      known.add(String(col.name).toLowerCase());
    }
  } catch {
    /* virtual/internal objects */
  }
}

const rows = hasViewQuery
  ? db.prepare("SELECT name, viewQuery FROM _collections WHERE viewQuery IS NOT NULL AND viewQuery != ''").all()
  : db.prepare("SELECT name, options FROM _collections WHERE type = 'view'").all();

/** SQL expression equal to the JS `round2`: `Math.round((x + EPSILON) * 100) / 100`.
 *
 * SQLite's own `round()` differs from `Math.round` (half away from zero vs half up, and a
 * different algorithm), which left ~0.15 % of rows one cent apart. This mirrors the JS exactly:
 * add EPSILON, scale, add 0.5 and truncate (sign-corrected), then unscale. */
function jsRoundLike(expr, decimals) {
  const scale = "1" + "0".repeat(decimals);
  const eps = "2.220446049250313e-16";
  // `COALESCE` mirrors the JS `num(v)`, which coerces null/undefined to 0.
  const y = "((COALESCE(" + expr + ", 0)) + " + eps + ") * " + scale;
  return "(CASE WHEN " + y + " >= 0 THEN CAST(" + y + " + 0.5 AS INTEGER) ELSE -CAST(-(" + y + ") + 0.5 AS INTEGER) END) / " + scale + ".0";
}

/**
 * PocketBase formatted money with `printf('%.2f', expr)`, producing strings. The JS views this
 * must match keep **numbers** rounded with `round2`, so convert to the JS-equivalent rounding.
 */
/** Aliases the JS deliberately keeps **unrounded** (the legacy SQL rounded them). */
const RAW_ALIASES = new Set(["unrounded_total"]);

function numbersNotStrings(sql) {
  let out = sql;
  const marker = /printf\('%\.(\d+)f',/;
  for (let guard = 0; guard < 500; guard++) {
    const m = marker.exec(out);
    if (!m) break;
    const start = m.index;
    const argStart = m.index + m[0].length;
    let depth = 1; // inside printf(
    let i = argStart;
    for (; i < out.length && depth > 0; i++) {
      if (out[i] === "(") depth++;
      else if (out[i] === ")") depth--;
    }
    const expr = out.slice(argStart, i - 1).trim();
    // If the value is aliased to something the JS keeps raw, do not round it.
    const aliased = /^\s*AS\s+([A-Za-z_][A-Za-z0-9_]*)/i.exec(out.slice(i, i + 60));
    const replacement = aliased && RAW_ALIASES.has(aliased[1]) ? expr : jsRoundLike(expr, Number(m[1]));
    out = out.slice(0, start) + replacement + out.slice(i);
  }
  return out;
}
const ADAPTATIONS = {
  payments_view: [
    [
      /\border_bookers\.company\b/g,
      "(SELECT oc.company FROM order_booker_companies oc WHERE oc.order_booker = order_bookers.id ORDER BY oc.id LIMIT 1) AS company",
    ],
  ],
  transactions_report: [
    // The JS allocates the invoice discount proportionally but guards a zero denominator
    // (`unrounded ? (drs * net_amount) / unrounded : 0`); the legacy SQL divides unconditionally,
    // so a zero `unrounded_total` becomes NULL (then 0) instead of leaving the line net intact.
    [
      /\(inv_drs\*net_amount\/invoice_view\.unrounded_total\)/g,
      "(CASE WHEN invoice_view.unrounded_total <> 0 THEN (inv_drs*net_amount)/invoice_view.unrounded_total ELSE 0 END)",
    ],
  ],
};

/** Remove the `round(..., N)` wrapper from the expression aliased `alias`.
 *
 * `invoice_view.unrounded_total` is rounded by the legacy SQL but kept raw by the JS, so the SQL
 * must return the unrounded expression to match. */
function unroundAliased(sql, alias) {
  const re = /\bround\(/gi;
  let m;
  while ((m = re.exec(sql))) {
    const open = m.index + m[0].length - 1;
    let depth = 1;
    let i = open + 1;
    let comma = -1;
    for (; i < sql.length && depth > 0; i++) {
      const c = sql[i];
      if (c === "(") depth++;
      else if (c === ")") depth--;
      else if (c === "," && depth === 1 && comma < 0) comma = i;
    }
    if (depth !== 0 || comma < 0) continue;
    const arg0 = sql.slice(open + 1, comma).trim();
    const close = i - 1;
    const after = sql.slice(close + 1, close + 41);
    if (new RegExp("^\\s*AS\\s+" + alias + "\\b", "i").test(after)) {
      return sql.slice(0, m.index) + arg0 + sql.slice(close + 1);
    }
  }
  return sql;
}

const written = [];
for (const row of rows) {
  let sql = row.viewQuery;
  if (!sql && row.options) {
    try {
      sql = JSON.parse(row.options)?.query;
    } catch {
      sql = null;
    }
  }
  if (!sql || !/select/i.test(sql)) continue;
  // PocketBase's SQLite accepts `"%.2f"` as a string literal (the double-quoted-string misfeature);
  // TrailBase's 3.53 build does not (DQS off). Convert double-quoted *literals* to single quotes,
  // leaving double-quoted identifiers (`"column"`) alone.
  let normalised = String(sql).replace(/"([^"\n]*)"/g, (match, body) =>
    known.has(body.toLowerCase()) ? match : `'${body.replace(/'/g, "''")}'`
  );
  // Match the JS views, which keep numbers rather than formatted strings.
  normalised = numbersNotStrings(normalised);
  for (const [pattern, replacement] of ADAPTATIONS[row.name] ?? []) {
    normalised = normalised.replace(pattern, replacement);
  }
  writeFileSync(join(outDir, `${row.name}.sql`), normalised.replace(/\r\n/g, "\n").trim() + "\n");
  written.push({ name: row.name, bytes: normalised.length });
}

written.sort((a, b) => a.name.localeCompare(b.name));
for (const w of written) console.log(`${w.name.padEnd(30)} ${String(w.bytes).padStart(6)} B`);
console.log(`\n${written.length} view(s) written to ${outDir}`);
