// Derive each report's column manifest from the SQL's own final SELECT list, and write it back into
// the registry.
//
// WHY THIS EXISTS. `trailbase_wasm::db::query` returns positional `Vec<Vec<Value>>` with no column
// metadata, so every report must declare its column NAMES positionally, and the host asserts every
// row's width. A statement carrying a column the manifest omits is REJECTED by the guest — loudly,
// which is the intended behaviour — while node:sqlite happily returns the row, so the Node-side gate
// alone cannot see the drift.
//
// That is exactly what happened: six statements had an extra id/filter column (dailysale also
// selects party_id, area_id and booker_id for its own filters) and every one of them passed in Node
// and failed in the real guest.
//
// Deriving the manifest from the SQL removes the possibility of the two disagreeing, rather than
// asking a human to keep them in step by hand.
//
// Each entry is rewritten WITHIN ITS OWN SPAN. A whole-file `replace` rewrites the first identical
// `cols:` in the file, and since several reports share a statement (`transactions.sql`,
// `payments.sql`, `items.sql`) and therefore share a column list, two reports would keep trading
// each other's manifest and the tool would never converge.
//
// Usage: node trailbase/tools/sync-manifests.mjs [--check]

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sqlRoot = resolve(here, "../runtime/app/reports/sql");
const registryPath = resolve(here, "../runtime/app/lib/spoolreports.js");
const CHECK = process.argv.includes("--check");

/**
 * The column names a statement yields, in order.
 *
 * Two traps, both hit here:
 *
 *  1. COMMENTS. Every file opens with a header that discusses the SELECT itself, so comments are
 *     stripped first — by cutting at `--` per line and replacing with space, which cannot join two
 *     lines and hide a later syntax error.
 *  2. WHICH SELECT. Every CTE's own SELECT is parenthesised, so the only top-level SELECT is the
 *     statement's own; taking the last top-level one is therefore correct. The body begins 6
 *     characters after the "S" of SELECT — 7 in fact, because the keyword is followed by a newline;
 *     skipping 6 chopped the first item to "T\n id" for every report.
 */
function selectList(sql) {
  const text = sql
    .split("\n")
    .map((l) => {
      const c = l.indexOf("--");
      return c < 0 ? l : l.slice(0, c);
    })
    .join("\n");

  const tops = [];
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "(") { depth++; continue; }
    if (c === ")") { depth--; continue; }
    if (depth !== 0) continue;
    if (!/\bSELECT\b/i.test(text.slice(i, i + 7))) continue;
    if (i > 0 && /[A-Za-z0-9_.]/.test(text[i - 1])) continue;
    tops.push(i);
    i += 6;
  }
  if (!tops.length) throw new Error("no top-level SELECT found");

  const start = tops[tops.length - 1];
  let fromAt = -1;
  depth = 0;
  for (let i = start + 7; i < text.length; i++) {
    const c = text[i];
    if (c === "(") { depth++; continue; }
    if (c === ")") { depth--; continue; }
    if (depth !== 0) continue;
    if (!/\bFROM\b/i.test(text.slice(i, i + 5))) continue;
    if (i > 0 && /[A-Za-z0-9_.]/.test(text[i - 1])) continue;
    fromAt = i;
    break;
  }
  if (fromAt < 0) throw new Error("no top-level FROM after the final SELECT");

  const body = text.slice(start + 7, fromAt);
  const items = [];
  let d = 0;
  let cur = "";
  for (const ch of body) {
    if (ch === "(") { d++; cur += ch; continue; }
    if (ch === ")") { d--; cur += ch; continue; }
    if (ch === "," && d === 0) { items.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) items.push(cur);

  const names = items.map((raw) => {
    // Whitespace is collapsed BEFORE matching: a multi-line item ends with "\n  AS qtyText", and a
    // `$`-anchored pattern does not match across a newline in JS, so the alias was missed and the
    // whole CASE expression then failed the bare-column test.
    const item = raw.replace(/\s+/g, " ").trim();
    if (item === "*" || item.endsWith(".*")) {
      throw new Error(`SELECT * cannot be given a positional manifest: ${item}`);
    }
    const as = /\sAS\s+"?([A-Za-z_][A-Za-z0-9_]*)"?\s*$/i.exec(item);
    if (as) return as[1];
    const bare = item.split(".").pop().trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(bare)) {
      throw new Error(`cannot derive a column name from: ${item.slice(0, 90)}`);
    }
    return bare;
  });

  if (new Set(names).size !== names.length) {
    throw new Error(`duplicate column names in the final SELECT: ${names.join(", ")}`);
  }
  return names;
}

/** Wrap a long column list the way the file already formats them. */
function formatCols(names) {
  const line = [];
  const out = [];
  for (const n of names) {
    const piece = `"${n}",`;
    if (line.length && line.join(" ").length + piece.length > 108) {
      out.push("    cols: [" + line.join(" ") + "");
      line.length = 0;
    }
    line.push(piece);
  }
  if (line.length) out.push("    cols: [" + line.join(" ") + "]");
  return out.join("\n");
}

// CRLF: `$` in JS matches before `\n` but not before `\r`, so every `$`-anchored match on this file
// silently failed until the endings were accounted for. See tools/dedupe-manifests.mjs.
const _raw = readFileSync(registryPath, "utf8");
const eol = _raw.includes("\r\n") ? "\r\n" : "\n";
let registry = _raw.split(/\\r?\\n/).join("\n");
const changes = [];

// Re-scan after every edit, so a change in entry LENGTH cannot invalidate the offsets of the
// entries that follow it. Editing in place while holding stale offsets is what left duplicated
// `cols:` lines behind.
const ENTRY = /\n {2}\S[^\n]*: \{/g;

for (let guard = 0; guard < 40; guard++) {
  const starts = [...registry.matchAll(ENTRY)];
  let edited = false;

  for (let i = 0; i < starts.length; i++) {
    const from = starts[i].index + starts[i][0].length;
    const to = i + 1 < starts.length ? starts[i + 1].index : registry.indexOf("\n};", from);
    const body = registry.slice(from, to);
    const key = starts[i][0].replace(/^\n {2}/, "").replace(/:\s*\{$/, "");

    const sqlFile = /sql:\s*"([^"]+)"/.exec(body)?.[1];
    if (!sqlFile) continue;
    const path = resolve(sqlRoot, "reports", sqlFile);
    let source;
    try {
      source = readFileSync(path, "utf8");
    } catch {
      continue;
    }

    let names;
    try {
      names = selectList(source);
    } catch (e) {
      changes.push(`${key}: SKIPPED — ${e.message}`);
      continue;
    }

    const decl = /cols:\s*\[[\s\S]*?\][\s,]*/.exec(body);
    const currentCols = decl
      ? decl[0].slice(decl[0].indexOf("[") + 1, decl[0].lastIndexOf("]"))
          .split(",").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean)
      : [];
    if (currentCols.length === names.length && currentCols.every((c, k) => c === names[k])) continue;

    changes.push(`${key}: ${currentCols.length} -> ${names.length} cols`);

    // The pattern consumes the trailing comma (`[\s,]*`), so the replacement must NOT add one back.
    // Adding it produced `"tone"],,` — a double comma that is a syntax error in the registry.
    let newBody = decl ? body.replace(decl[0], "@@COLS@@") : body;
    if (decl) {
      newBody = newBody.replace("@@COLS@@", formatCols(names));
    } else {
      newBody = newBody.replace(/( {4}sql:[^\n]*\n)/, `$1${formatCols(names)},\n`);
    }
    registry = registry.slice(0, from) + newBody + registry.slice(to);
    edited = true;
    break; // re-scan; offsets are now stale
  }

  if (!edited) break;
}

if (changes.length === 0) {
  console.log("every manifest already matches its statement's final SELECT.");
} else {
  for (const c of new Set(changes)) console.log(`  ${c}`);
  if (!CHECK) {
    writeFileSync(registryPath, registry.replace(/\n/g, eol));
    console.log(`\nupdated ${registryPath}`);
  } else {
    console.log("\n(--check: nothing written)");
  }
}