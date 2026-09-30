/**
 * Crude brace/paren balance check for a guest route script.
 *
 *   node tools/brace-check.mjs [file]
 *
 * The guest compiles `route.ts` with a regex-based ESM transform, so a missing brace surfaces as a
 * runtime error on some unrelated route rather than at load time. Counting delimiters is not a
 * parser, but it catches the class of damage a bulk edit actually causes — a half-removed wrapper.
 *
 * Strings, template literals, regexes and comments are blanked first; a naive count is dominated by
 * braces inside them (template literals in this codebase are full of `${ ... }` object literals).
 */
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? new URL('../runtime/ahscripts/routes/_app/route.ts', import.meta.url);
let src = readFileSync(file, 'utf8');

const blank = (re) => (src = src.replace(re, (m) => ' '.repeat(m.length)));

blank(/\/\*[\s\S]*?\*\//g); // block comments
blank(/\/\/[^\n]*/g); // line comments
blank(/`(?:\\[\s\S]|[^`\\])*`/g); // template literals (handles ${ } nesting loosely)
blank(/'(?:\\[\s\S]|[^'\\\n])*'/g); // single-quoted
blank(/"(?:\\[\s\S]|[^"\\\n])*"/g); // double-quoted
blank(/\/(?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\\n])+\/[gimsuy]*/g); // regex literals

const count = (re) => (src.match(re) ?? []).length;
const pairs = [
  ['braces', /\{/g, /\}/g],
  ['parens', /\(/g, /\)/g],
  ['brackets', /\[/g, /\]/g],
];

let bad = 0;
for (const [name, open, close] of pairs) {
  const o = count(open);
  const c = count(close);
  const net = o - c;
  const flag = net === 0 ? 'ok  ' : 'FAIL';
  if (net !== 0) bad++;
  console.log(`${flag} ${name.padEnd(9)} open=${o} close=${c} net=${net}`);
}

console.log(bad === 0 ? '\nbalanced' : `\n${bad} unbalanced group(s)`);
process.exit(bad === 0 ? 0 : 1);