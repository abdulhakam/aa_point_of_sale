/**
 * Compare two route snapshots produced by tools/route-snapshot.mjs.
 *
 *   node tools/route-snapshot-diff.mjs before.json after.json
 *
 * A refactoring step is sound when this reports "no differences". Anything else is a behaviour
 * change to explain before the step is accepted: a status change, a row-count change, a different
 * title or link set, or a route that appeared or vanished.
 */
import { readFileSync } from 'node:fs';

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error('usage: node tools/route-snapshot-diff.mjs before.json after.json');
  process.exit(2);
}

const before = new Map(JSON.parse(readFileSync(beforePath, 'utf8')).map((r) => [r.name, r]));
const after = new Map(JSON.parse(readFileSync(afterPath, 'utf8')).map((r) => [r.name, r]));

const names = [...new Set([...before.keys(), ...after.keys()])].sort();
let diffs = 0;

for (const name of names) {
  const a = before.get(name);
  const b = after.get(name);
  if (!a) { diffs++; console.log(`ADDED   ${name}: status=${b.status} ${b.fp}`); continue; }
  if (!b) { diffs++; console.log(`REMOVED ${name}: status=${a.status} ${a.fp}`); continue; }
  if (a.status !== b.status || a.fp !== b.fp) {
    diffs++;
    console.log(`CHANGED ${name}`);
    console.log(`  before: status=${a.status} ${a.fp}`);
    console.log(`  after : status=${b.status} ${b.fp}`);
  }
}

console.log(diffs === 0 ? `\nno differences across ${names.length} routes` : `\n${diffs} difference(s)`);
process.exit(diffs === 0 ? 0 : 1);