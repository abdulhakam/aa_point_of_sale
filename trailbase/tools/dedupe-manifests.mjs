// Remove duplicate `sql:` / `cols:` / `agg:` / `salesOnly:` lines inside one registry entry.
//
// `sync-manifests.mjs` inserts `cols:` after `sql:` when absent. An earlier version inserted
// unconditionally, and re-running it left two `cols:` (and a duplicated `sql:`/`agg:` block) in a few
// entries. In JS the LAST definition wins, so the manifest alternated between two values on
// alternate runs and the host then rejected whichever entry happened to lose — a failure that reads
// like a statement/manifest mismatch but is really this file.
//
// First occurrence is kept. The counts are printed so the result is inspectable rather than trusted.
//
// Usage: node trailbase/tools/dedupe-manifests.mjs [--check]

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const registryPath = resolve(here, "../runtime/ahscripts/lib/spoolreports.js");
const CHECK = process.argv.includes("--check");

const text = readFileSync(registryPath, "utf8");

// The file has CRLF endings, and in JS `$` matches before `\n` but NOT before `\r`. Every regex
// anchored with `$` therefore failed silently — including the entry-key match, so the tool reported
// "nothing to do" while duplicate `cols:` lines were plainly present. Splitting on /\r?\n/ restores
// the intended behaviour; the CRs are restored on write so the file's line endings are unchanged.
const lines = text.split(/\r?\n/);
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// An entry key is at indent 2, ends the line with `{`, and is NOT a `cols:` continuation. The
// previous pattern required a non-space first character, which is fine — but it also failed to match
// because the closing was `\n  },` and the key line carries a quoted name like `"ledgers/area"`, so
// the test has to accept a quote as the first character.
const isKey = (l) => /^ {2}\S[^\n]*: \{$/.test(l) && !/^ {2}cols:/.test(l);
const fieldName = (l) => {
  const m = /^ {4}(sql|cols|agg|salesOnly):/.exec(l);
  return m ? m[1] : null;
};

const out = [];
let lastKey = null;
const seen = new Map();
let dropped = 0;

for (const line of lines) {
  if (isKey(line)) {
    lastKey = line.trim().replace(/:\s*\{$/, "");
    seen.set(lastKey, new Set());
    out.push(line);
    continue;
  }
  const f = fieldName(line);
  if (f && lastKey) {
    const s = seen.get(lastKey);
    if (s.has(f)) { dropped++; continue; }
    s.add(f);
  }
  out.push(line);
}

const result = out.join(eol);
const count = (re) => (result.match(re) || []).length;
const entries = count(/^ {2}\S.*: \{$/gm);
console.log(`dropped ${dropped} duplicate field line(s)`);
console.log(`entries ${entries}  sql: ${count(/^ {4}sql:/gm)}  cols: ${count(/^ {4}cols:/gm)}`);

if (dropped === 0) {
  console.log("nothing to do");
  if (process.env.DEDUPE_DEBUG) {
    const keys = lines.filter(isKey);
    console.log(`keys seen: ${keys.length}`);
    for (const k of keys) console.log(`  ${JSON.stringify(k)}`);
  }
} else if (!CHECK) {
  writeFileSync(registryPath, result);
  console.log("written");
} else {
  console.log("(--check: nothing written)");
}