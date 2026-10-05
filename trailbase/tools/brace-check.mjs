/**
 * Crude brace/paren balance check for guest route scripts.
 *
 *   node tools/brace-check.mjs [file]
 *
 * With no argument this checks EVERY `route.{ts,js}` under `runtime/ahscripts/routes` — one file per
 * route folder since tb-0030 step 5 moved the routes out of the single `_app/route.ts` dispatcher
 * (deleted in step 6).
 *
 * The guest compiles `route.ts` with a regex-based ESM transform, so a missing brace surfaces as a
 * runtime error on some unrelated route rather than at load time. Counting delimiters is not a parser,
 * but it catches the class of damage a bulk edit actually causes — a half-removed wrapper.
 *
 * Strings, template literals, regexes and comments are blanked first; a naive count is dominated by
 * braces inside them. ⚠️ The blanking is imperfect — it can over-blank on a file whose template literals
 * confuse it — so treat a lone-brace report against a passing smoke as a tool artifact, not a syntax
 * error. See vault/tasks/tb-0030-retire-the-route-ts-dispatcher.md.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const PAIRS = [
  ["braces", /\{/g, /\}/g],
  ["parens", /\(/g, /\)/g],
  ["brackets", /\[/g, /\]/g],
];

function blankAll(input) {
  let src = input;
  const blank = (re) => (src = src.replace(re, (m) => " ".repeat(m.length)));
  blank(/\/\*[\s\S]*?\*\//g); // block comments
  blank(/\/\/[^\n]*/g); // line comments
  blank(/`(?:\\[\s\S]|[^`\\])*`/g); // template literals (handles ${ } nesting loosely)
  blank(/'(?:\\[\s\S]|[^'\\\n])*'/g); // single-quoted
  blank(/"(?:\\[\s\S]|[^"\\\n])*"/g); // double-quoted
  blank(/\/(?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\\n])+\/[gimsuy]*/g); // regex literals
  return src;
}

function checkFile(file) {
  const src = blankAll(readFileSync(file, "utf8"));
  const count = (re) => (src.match(re) ?? []).length;
  let bad = 0;
  for (const [name, open, close] of PAIRS) {
    const net = count(open) - count(close);
    if (net !== 0) {
      bad++;
      console.log(`FAIL ${name.padEnd(9)} net=${net}  ${file}`);
    }
  }
  return bad;
}

function routeFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...routeFiles(p));
    else if (/^route\.(ts|js)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const arg = process.argv[2];
const files = arg ? [arg] : routeFiles(fileURLToPath(new URL("../runtime/ahscripts/routes", import.meta.url)));

let bad = 0;
for (const file of files) bad += checkFile(file);

if (files.length > 1) console.log(`${files.length} route file(s) checked`);
console.log(bad === 0 ? "balanced" : `${bad} unbalanced group(s)`);
process.exit(bad === 0 ? 0 : 1);
