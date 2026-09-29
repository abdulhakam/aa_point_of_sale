// Translate the preserved legacy report SQL from PocketBase TEXT enums to the
// integer codes the schema actually stores.
//
//   node trailbase/tools/translate-enums.mjs            (dry run)
//   node trailbase/tools/translate-enums.mjs --write    (apply)
//
// The translation is asymmetric, which is the whole subtlety:
//
//   COMPARISON side  payments.type = 'sending'  ->  payments.type = 0
//   OUTPUT side      CASE WHEN type = 0 THEN 'purchase'   -- label STAYS text
//
// because compute/views.js emits `typeMap[p.type] ?? p.type`, i.e. the label, for
// payments_invoices_report. A blind find-and-replace would corrupt that output.
//
// Codes: invoice_types 0 purchase / 1 sale / 2 return / 3 difference
//        payment_types 0 sending / 1 recieving / 2 return
//        party_types   0 customer / 1 supplier
//
// Every site is asserted twice: the pattern must match the expected number of
// times, AND each replacement must actually change the text. An earlier version
// asserted only the first, and silently left `sending`/`recieving` untranslated
// because the column was read from the regex source with escaped dots in it.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "runtime", "app",
  "reports", "sql", "views");
const WRITE = process.argv.includes("--write");

const INVOICE = { purchase: 0, sale: 1, return: 2, difference: 3 };
const PAYMENT = { sending: 0, recieving: 1, return: 2 };
const PARTY = { customer: 0, supplier: 1 };

// [column qualifier, pattern, expected occurrences]
const EDITS = {
  "counts_for_row_numbers.sql": [
    ["invoices.type", /WHERE type='purchase'/g, 1],
    ["invoices.type", /WHERE type='sale'/g, 1],
    ["invoices.type", /WHERE type='return'/g, 1],
    ["payments.type", /type = 'recieving'/g, 1],
    ["payments.type", /type = 'sending'/g, 1],
  ],
  "items_report.sql": [
    ["transaction_view.type", /transaction_view\.type == 'return'/g, 1],
    ["transaction_view.party_type", /transaction_view\.party_type == 'customer'/g, 1],
    ["transaction_view.type", /transaction_view\.type == 'difference'/g, 1],
    ["transaction_view.type", /transaction_view\.type='sale'/g, 1],
  ],
  "items_difference_report.sql": [
    ["transaction_view.type", /transaction_view\.type == 'difference'/g, 1],
  ],
  "payments_summary.sql": [
    ["payments_view.type", /type = 'sending'/g, 2],
    ["payments_view.type", /type = 'recieving'/g, 2],
    ["payments_view.type", /type = 'return'/g, 2],
    ["payments_view.party_type", /party_type = 'customer'/g, 1],
    ["payments_view.party_type", /party_type <> 'customer'/g, 1],
  ],
  "payments_invoices_report.sql": [
    // comparison side only; the THEN labels are output and must stay text
    ["payments_view.type", /payments_view\.type = 'sending'/g, 1],
    ["payments_view.type", /payments_view\.type = 'recieving'/g, 1],
    ["payments_view.type", /payments_view\.type = 'return'/g, 1],
  ],
  "outstanding_summary.sql": [
    ["payments_view.type", /pv\.type = 'recieving'/g, 4],
    ["payments_view.type", /pv\.type = 'return'/g, 2],
    ["parties.type", /parties\.type = 'customer'/g, 2],
    ["payments_view.type", /pv2\.type = 'recieving'/g, 1],
    ["payments_view.type", /pv\.type IN \('recieving', 'return'\)/g, 1],
  ],
  "ledger_area.sql": [
    ["payments_view.type", /p1\.type = 'recieving'/g, 2],
    ["payments_view.type", /p1\.type = 'sending'/g, 2],
  ],
  "ledger_booker.sql": [
    ["payments_view.type", /p1\.type = 'recieving'/g, 2],
    ["payments_view.type", /p1\.type = 'sending'/g, 2],
  ],
  "ledger_party.sql": [
    ["payments_view.type", /p1\.type = 'recieving'/g, 2],
    ["payments_view.type", /p1\.type = 'sending'/g, 2],
  ],
  "ledger_journal.sql": [
    ["payments_view.type", /account_type == 'recieving'/g, 2],
    ["payments_view.type", /account_type == 'sending'/g, 1],
    ["payments_view.type", /account_type == 'return'/g, 2],
    ["parties.type", /party_type == 'customer'/g, 1],
    ["parties.type", /party_type == 'supplier'/g, 1],
  ],
};

const VOCAB = {
  "invoices.type": INVOICE,
  "transaction_view.type": INVOICE,
  "payments.type": PAYMENT,
  "payments_view.type": PAYMENT,
  "parties.type": PARTY,
  "transaction_view.party_type": PARTY,
  "payments_view.party_type": PARTY,
};

// schema change rather than an enum: ids are uuid BLOBs, so an absent link is NULL,
// not ''. compute/views.js tests `!p.invoice` / `!p.party`, which is IS NOT NULL.
// The expenses UNION branch emits a literal no comparison tests; a sentinel that
// cannot collide with 0/1/2 keeps that column single-typed.
const NULL_FIXES = {
  "outstanding_summary.sql": [
    [/pv2\.invoice != ''/g, 1, "pv2.invoice IS NOT NULL"],
    [/pv\.party != ''/g, 1, "pv.party IS NOT NULL"],
  ],
  "ledger_journal.sql": [
    [/'cash' AS account_type/g, 1, "-1 AS account_type"],
  ],
};

let changed = 0;
let sites = 0;
for (const [file, edits] of Object.entries(EDITS)) {
  const path = join(DIR, file);
  const before = readFileSync(path, "utf8");
  let sql = before;

  for (const [column, re, expected] of edits) {
    const hits = sql.match(re) || [];
    if (hits.length !== expected) {
      throw new Error(`${file}: ${re} matched ${hits.length}, expected ${expected}`);
    }
    const vocab = VOCAB[column];
    if (!vocab) throw new Error(`${file}: no vocabulary for column ${column}`);
    sql = sql.replace(re, (m) => {
      // Replace EVERY literal in the match. Handling only the first one silently
      // turned `IN ('recieving','return')` into `IN (1,'return')`, which is the exact
      // class of half-translation this tool exists to prevent.
      let out = m;
      for (const lit of m.match(/'([a-z]+)'/g) || []) {
        const word = lit.slice(1, -1);
        if (vocab[word] === undefined) {
          throw new Error(`${file}: ${m} has no code for '${word}' in ${column}`);
        }
        out = out.replace(lit, String(vocab[word]));
      }
      if (out === m) throw new Error(`${file}: ${m} was not translated`);
      return out;
    });
    // the second assertion: the pass must actually have changed the text
    if (sql === before) {
      throw new Error(`${file}: ${re} matched but the replacement was a no-op`);
    }
    sites += expected;
  }

  for (const [re, expected, to] of NULL_FIXES[file] || []) {
    const hits = sql.match(re) || [];
    if (hits.length !== expected) {
      throw new Error(`${file}: ${re} matched ${hits.length}, expected ${expected}`);
    }
    sql = sql.replace(re, to);
    sites += expected;
  }

  if (sql !== before) {
    changed++;
    if (WRITE) {
      writeFileSync(path, sql);
      console.log(`wrote  ${file}`);
    } else {
      console.log(`would write ${file}`);
    }
  }
}

// A leftover enum literal is the bug this whole pass exists to remove. The only
// literals that should survive are the OUTPUT labels, which are always introduced
// by THEN -- so anything else is untranslated.
const ENUM_WORDS = "purchase|sale|return|difference|sending|recieving|customer|supplier";
const leftovers = [];
for (const file of Object.keys(EDITS)) {
  const sql = readFileSync(join(DIR, file), "utf8");
  for (const [i, line] of sql.split("\n").entries()) {
    for (const lit of line.match(new RegExp(`'(${ENUM_WORDS})'`, "g")) || []) {
      const at = line.indexOf(lit);
      const before = line.slice(0, at);
      if (!/\bTHEN\s*$/.test(before)) {
        leftovers.push(`${file}:${i + 1}  ${line.trim()}`);
        break;
      }
    }
  }
}

console.log(`\n${changed} files, ${sites} sites -- ${WRITE ? "written" : "dry run"}`);
if (leftovers.length) {
  console.log(`\nUNTRANSLATED COMPARISONS REMAINING (${leftovers.length}):`);
  for (const l of leftovers) console.log("  " + l);
  process.exitCode = 1;
} else {
  console.log("no untranslated enum comparisons remain");
}
