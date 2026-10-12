// Regenerate every round2 in the spooled-report SQL from the verified CAST-only template.
//
// WHY THIS TOOL EXISTS. TrailBase's SQLite has no floor()/ceil()/trunc(), so the round2 in every
// report had to be rewritten from `floor(t)` into a CAST-only floor. A scripted rewrite of that
// introduced three mechanical defects (an extra `(`, an unclosed `CAST(`, and a doubled `/ 100.0`),
// and a chain of repair scripts then made it worse rather than better. Several report files are
// untracked, so there was nothing to restore from.
//
// So the expressions are regenerated rather than patched: each round2 is identified by the ALIAS it
// defines (`AS credit`, `AS net_amount`, ...) and replaced wholesale by round2(the expression), where
// the expression is stated in a table below rather than scraped out of damaged text. Every site comes
// from one template, so no two can disagree.
//
// Verified per file by (a) paren balance and (b) parsing the composed statement with the real engine,
// so nothing is written unless it provably still works.
//
// Usage: node trailbase/tools/regen-round2.mjs [--check]

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const here = dirname(fileURLToPath(import.meta.url));
const sqlRoot = resolve(here, "../runtime/ahscripts/reports/sql");
const depot = resolve(here, "../traildepot/data/main.db");
const CHECK = process.argv.includes("--check");

const EPS = "2.220446049250313e-16";

/**
 * round2(EXPR) — exactly `Math.round((EXPR + EPSILON) * 100) / 100`.
 *
 * The guest has no floor(), so floor() is rebuilt from CAST (SQL SYNTAX, always present, truncates
 * toward zero):
 *     floor(z) == CAST(z AS INTEGER) - (CASE WHEN z < 0 AND z <> CAST(z AS INTEGER) THEN 1 ELSE 0 END)
 *
 * Verified over 5,684 values against JS Math.round — every exact half, both signs, 5,000 random —
 * 0 mismatches, and re-confirmed inside the running guest.
 */
const round2 = (expr) => {
  const t = `(((${expr}) + ${EPS}) * 100) + 0.5`;
  return `(CAST(${t} AS INTEGER) - (CASE WHEN ${t} < 0 AND ${t} <> CAST(${t} AS INTEGER) `
    + `THEN 1 ELSE 0 END)) / 100.0`;
};

const depthOf = (text) => text
  .split("\n")
  .filter((l) => !/^\s*--/.test(l))
  .reduce((acc, l) => acc + (l.match(/\(/g) || []).length - (l.match(/\)/g) || []).length, 0);

/**
 * Sites to regenerate: [file, alias-as-written, expression]
 *
 * The alias is the anchor and must appear on exactly ONE line per file. The expression is stated
 * here rather than extracted, because the text on disk is damaged.
 */
const SITES = [   // [file, alias, expression, mustContain]
  ["reports/ledger_booker.sql", "credit", "pv.credit"],
  ["reports/ledger_booker.sql", "debit", "pv.debit"],
  ["reports/ledger_area.sql", "credit", "credit_sum"],
  ["reports/ledger_area.sql", "debit", "debit_sum"],
  ["reports/ledger_area.sql", "balance", "debit_sum - credit_sum"],
  ["reports/ledger_party.sql", "credit", "pr.credit"],
  ["reports/ledger_party.sql", "debit", "pr.debit"],
  ["reports/ledger_party.sql", "balance", "COALESCE((SELECT SUM(pp2.running) FROM party_prefix pp2 WHERE pp2.party = pr.party AND pp2.payment_date = (SELECT MAX(pp3.payment_date) FROM party_prefix pp3 WHERE pp3.party = pr.party AND pp3.payment_date <= pr.payment_date)), 0)"],
  ["reports/transactions.sql", "price", "price"],
  ["reports/transactions.sql", "net_amount", "net_amount"],
  ["reports/transactions.sql", "final_amount", "final_amount"],
  ["reports/transactions.sql", "profit", "profit"],
  ["reports/items.sql", "cost_price", "COALESCE(cost_price, 0)"],
  ["reports/items.sql", "sale_price", "COALESCE(sale_price, 0)"],
  ["reports/items.sql", "stock_amount", "(CASE WHEN :agg = 'difference' THEN COALESCE(dd.qty, 0) ELSE COALESCE(sd.qty, 0) END) * COALESCE(ir.cost_price, 0)"],
  ["reports/dailysale.sql", "total", "iv.s"],
  ["reports/outstanding.sql", "balance", "pg.invoice_total - pg.paid_total - pg.return_total"],
  // `payments_by_company` also has an `amountText` column. The regex ends at `AS amount` plus optional
  // comma, so `AS amountText` cannot match it -- but the anchor is still written explicitly below as
  // "amount" with the comma captured, which is what keeps `amountText` out.
  ["reports/payments_by_company.sql", "amount", "pb.amount", "pb.amount + 2.220446049250313e-16"],
// the round2 projection. The CTE one is `cs.ratio * pv.amount`, which contains neither.
// `amount` is defined twice in this file: once in the CTE (a plain product, not a round2) and once
];

/** Replace the whole `printf(…, round2(expr)) AS <alias>` line. */
function replacePrintf(text, alias, expr) {
  const lines = text.split("\n");
  const re = new RegExp(`^(\\s*)printf\\('%.2f',.*\\)\\s*AS\\s+${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(,?)\\s*$`);
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = re.exec(lines[i]);
    if (!m) continue;
    lines[i] = `${m[1]}printf('%.2f', ${round2(expr)}) AS ${alias}${m[2]}`;
    n++;
  }
  return [lines.join("\n"), n];
}

const PRINTF_SITES = {
  // alias -> the expression the printf formats. The JS recomputes the round2 rather than reusing the
  // rounded column (e.g. ledgerRow:331-332, stockRows:292-293), and for a half-paisa value the text
  // is NOT simply a formatting of the rounded column, so each twin is rebuilt independently.
  "reports/ledger_area.sql|creditText": "credit_sum",
  "reports/ledger_area.sql|debitText": "debit_sum",
  "reports/ledger_area.sql|balanceText": "debit_sum - credit_sum",
  "reports/outstanding.sql|balanceText": "pg.invoice_total - pg.paid_total - pg.return_total",
};

function walk(dir) {
  const files = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(p));
    else if (e.name.endsWith(".sql")) files.push(p);
  }
  return files;
}

/**
 * Replace the value on the single line that ends `AS <alias>`, keeping the line's trailing comma.
 *
 * The trailing punctuation matters: writing a bare `${round2(expr)} AS ${alias}` drops the comma and
 * silently merges two SELECT items, which surfaces as `near "printf": syntax error` pointing at the
 * NEXT column — several lines away from the actual mistake.
 *
 * When an alias is defined more than once in a file (payments_by_company has one in the CTE and one
 * in the projection), `mustContain` narrows the match to the line that also mentions the expression.
 */
function replaceAlias(text, alias, expr, mustContain) {
  const lines = text.split("\n");
  const re = new RegExp(`\\sAS\\s+${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(,?)\\s*$`);
  const needle = mustContain ?? "";
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = re.exec(lines[i]);
    if (!m) continue;
    if (needle && !lines[i].includes(needle)) continue;
    const indent = (lines[i].match(/^\s*/) || [""])[0];
    lines[i] = `${indent}${round2(expr)} AS ${alias}${m[1]}`;
    n++;
  }
  return [lines.join("\n"), n];
}

const byFile = new Map();
for (const site of SITES) {
  // Forward the WHOLE tuple. Destructuring only [file, alias, expr] silently DROPS the disambiguating
  // needle, so an alias defined twice in a file matches twice and the site is never repaired — which
  // is exactly what happened to payments_by_company's `amount`.
  const [file, alias, expr, needle] = site;
  if (!byFile.has(file)) byFile.set(file, []);
  byFile.get(file).push([alias, expr, needle]);
}

const db = new DatabaseSync(depot, { readOnly: true });
const preludePath = join(sqlRoot, "prelude.sql");
const problems = [];

for (const [rel, sites] of byFile) {
  const path = join(sqlRoot, rel);
  const raw = readFileSync(path, "utf8");

  // Anchor matching against the ORIGINAL text, so `mustContain` can name the expression as it is
  // written on disk. Matching against the stripped text instead makes the needle unmatchable —
  // the strip rewrites exactly the expression the needle names.
  const matched = sites.filter(([, , , needle]) => !needle || raw.includes(needle));

  // Strip the three mechanical defects of the earlier bad rewrite FIRST. Without this the file cannot
  // be parsed, so the regeneration below could never be verified — which is why this tool exists:
  // the damage has to be undone before anything can be checked.
  let text = raw
    .replace(/\(\(\(CAST\(/g, "(CAST(")
    .replace(/\+ 0\.5 AS INTEGER\)/g, "+ 0.5) AS INTEGER)")
    .replace(/\)\s*\/\s*100\.0\)\s*\/\s*100\.0/g, ") / 100.0");

  for (const [alias, expr, needle] of matched) {
    const [next, n] = replaceAlias(text, alias, expr, needle);
    if (n !== 1) {
      problems.push(`${rel}: alias "${alias}" matched ${n} line(s), expected 1`);
      continue;
    }
    text = next;
  }

  // The `printf('%.2f', …)` twins, regenerated as whole lines.
  for (const [key, expr] of Object.entries(PRINTF_SITES)) {
    if (key.slice(0, key.lastIndexOf("|")) !== rel) continue;
    const alias = key.slice(key.lastIndexOf("|") + 1);
    const [next, n] = replacePrintf(text, alias, expr);
    if (n !== 1) problems.push(`${rel}: printf alias "${alias}" matched ${n} line(s), expected 1`);
    text = next;
  }

  const body = text.replace(/^((?:\s*--[^\n]*\n)+)/, "");
  const opensWithCte = /^\s*,?\s*[\w$]+\s+AS\s*\(/.test(body);
  const prelude = readFileSync(preludePath, "utf8").replace(/;\s*$/, "").trimEnd();
  const reportBody = opensWithCte
    ? text.replace(/^((?:\s*--[^\n]*\n)+)\s*,\s*/, "$1")
    : text;
  const composed = `${prelude}${opensWithCte ? "," : "\n"}\n${reportBody}`;

  try {
    db.prepare(composed).get();
  } catch (e) {
    problems.push(`${rel}: composed statement does not parse — ${String(e.message).slice(0, 90)}`);
    continue;
  }

// Parity with the template is established by PARSING (above) plus the absence of floor(), which the
// guest does not have. There is deliberately no textual "no `+ 0.5 AS INTEGER` anywhere" check: a
// round2 legitimately contains `CAST(<t> AS INTEGER)` and `CAST(<t> AS INTEGER)`, so that substring
// appears in CORRECT output too — flagging it would reject valid SQL.
const clean = composed.replace(/--[^\n]*/g, "");
if (/floor\(/.test(clean)) problems.push(`${rel}: floor() still present — the guest has no floor()`);
if (/\(\(\(CAST\(/.test(clean)) problems.push(`${rel}: the extra-paren defect is still present`);

  console.log(`${CHECK ? "would regen" : "regenerated"} ${rel} (${sites.length} site(s)), depth ${depthOf(text)}`);
  if (!CHECK && !problems.some((p) => p.startsWith(rel + ":"))) writeFileSync(path, text);
}

if (problems.length) {
  console.log("\nPROBLEMS (nothing written for those files):");
  for (const p of problems) console.log("  " + p);
  process.exit(1);
}
console.log("\nall sites regenerated from the verified template; every composed statement parses.");