// vaulter-lite — a filesystem Markdown document store derived from the base tables (tb-0034).
//
// One directory per collection, one `<uuid>.md` per row. The filename is the record's UUIDv7, so the
// directory listing is already in id order with no index. The FRONTMATTER is the structured row, with
// foreign keys written as `[[uuid]]` wikilinks; the BODY is the human-readable document, and ONLY
// invoices get one (header, lines, totals, and the invoice's payments below) — every other collection
// is frontmatter only.
//
// Incremental: `_meta.json` records per-collection fingerprints; a collection whose fingerprint is
// unchanged is skipped whole, and within a changed collection only rows whose `updated` moved are
// rewritten. This is a VIEW for humans and tools, not a cache the app reads back, so a stale file
// cannot make any screen or report wrong (`reports.no_precomputation` is untouched).
//
// Root: `/vaulter-lite` under the guest fs root (`%DEPOT%\runtime`). ⚠️ RUN.BAT mirrors `runtime\` over
// that with `robocopy /MIR`, so that copy must exclude `vaulter-lite` (`/XD`) or every restart wipes it.

import { TABLES, readTable, relationsOf } from "./data.js";
import { b64ToHex } from "./route-kit.js";

const ROOT = "/vaulter-lite";
const META = ROOT + "/_meta.json";

/** A base64url record id -> the dashed UUID that names its file (UUIDv7 sorts by time). */
export function uuidOf(id) {
  const hex = b64ToHex(String(id || ""));
  if (hex.length !== 32) return String(id || "");
  return (
    hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20)
  ).toLowerCase();
}

/** A YAML scalar, bare when it is clearly safe and JSON-quoted otherwise. */
function yaml(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const s = String(v);
  return s !== "" && /^[A-Za-z0-9_./@-]+$/.test(s) ? s : JSON.stringify(s);
}

/** The frontmatter block: the row's columns, FKs as `[[uuid]]`, plus the collection and the id. */
function frontmatter(table, row) {
  const rels = new Set(relationsOf(table));
  const out = ["---", `collection: ${table}`, `id: ${uuidOf(row.id)}`, `updated: ${yaml(row.updated)}`];
  for (const col of Object.keys(row)) {
    if (col === "id" || col === "updated") continue;
    const v = row[col];
    // A foreign key becomes a wikilink to the related record's file. `[[uuid]]` and not
    // `[[collection/uuid]]`: ids are globally unique, so the basename resolves unambiguously and the
    // store needs no target map (the column name alone does not say `category -> companies`). Quoted so
    // YAML reads it as a string, not a nested sequence.
    if (rels.has(col)) out.push(`${col}: ${v ? '"[[ ' + uuidOf(v) + ' ]]"' : "null"}`);
    else out.push(`${col}: ${yaml(v)}`);
  }
  out.push("---", "");
  return out.join("\n");
}

/** The printable invoice body: the materialised `inv_doc` document + its payments, as Markdown. */
async function invoiceBody(A, row) {
  const doc = await A.invoiceDoc.read(String(row.id));
  if (!doc) return "_No materialised document for this invoice yet._\n";
  const money = A.format.money;
  const lines = (doc.lines ?? []).map((l) => {
    const disc = Number(l.drs ?? 0) ? money(l.drs) : Number(l.d1 ?? 0) || Number(l.d2 ?? 0) ? `${l.d1}% / ${l.d2}%` : "—";
    return `| ${l.item_name ?? ""} | ${A.format.round2(l.qty)} | ${money(l.price)} | ${disc} | ${l.total ?? money(l.total_raw ?? 0)} |`;
  });
  const payments = (doc.payments ?? [])
    .filter((p) => Number(p.paid) === 1)
    .map((p) => `| ${String(p.payment_date ?? "").slice(0, 10)} | ${money(p.amount)} | ${p.description ?? ""} |`);
  const b = globalThis.__AA_BUSINESS__ || {};
  return [
    `# Invoice ${doc.readable_id ?? ""}`,
    "",
    `**${b.name ?? ""}**  `,
    `${b.address ?? ""}  `,
    `${b.phone ?? ""}`,
    "",
    `- **Date:** ${String(doc.dated ?? "").slice(0, 10)}`,
    `- **Party:** [[${uuidOf(doc.party)}]]`,
    "",
    "| Item | Qty | Price | Discount | Amount |",
    "|---|---:|---:|---:|---:|",
    ...(lines.length ? lines : ["| _no lines_ | | | | |"]),
    "",
    `**Total:** ${money(doc.final_total ?? 0)}  `,
    `**Paid:** ${money(doc.paid_total ?? 0)}  `,
    `**Balance:** ${money((doc.final_total ?? 0) - (doc.paid_total ?? 0))}`,
    "",
    "## Payments",
    "",
    "| Date | Amount | Description |",
    "|---|---:|---|",
    ...(payments.length ? payments : ["| _none_ | | |"]),
    "",
  ].join("\n");
}

async function readMeta() {
  try {
    return JSON.parse(await fs.readFile(META));
  } catch {
    return { lastRun: null, collections: {} };
  }
}

async function fingerprintOf(db, table) {
  const rows = await db.all(`SELECT COUNT(*) AS n, COALESCE(MAX("updated"), '') AS newest FROM "${table}"`, []);
  return rows && rows.length ? `${rows[0][0]}:${rows[0][1]}` : "0:";
}

/**
 * Generate or refresh the store. `opts.full` ignores the manifest and rewrites every row (a repair).
 * Returns a per-collection report, which is also written to `_meta.json`.
 */
export async function generate(A, db, opts) {
  const full = !!(opts && opts.full);
  // ⚠️ BLOCKER (tb-0034): the guest's filesystem root (`--runtime-root-fs`) is mounted READ-ONLY, so a
  // write here fails with WASI EPERM and `trail run` exposes no second, writable mount. Until a
  // writable mount exists (a TrailBase change) this returns a clear report instead of a 500, so the
  // trigger route degrades rather than crashing. When the mount is added, the guard below simply
  // stops firing and the generator runs.
  const made = fs.createDir(ROOT);
  if (!made && !fs.exists(ROOT)) {
    return {
      ok: false,
      blocked: true,
      reason: "the guest filesystem is read-only (WASI EPERM); a writable mount is required to generate the store",
      root: ROOT,
    };
  }
  const meta = await readMeta();
  const report = { ok: true, ranAt: new Date().toISOString(), full, collections: {}, written: 0, removed: 0, skipped: 0 };
  const tables = opts && opts.tables ? opts.tables : TABLES;

  for (const table of tables) {
    const fp = await fingerprintOf(db, table);
    if (!full && meta.collections && meta.collections[table] === fp) {
      report.collections[table] = { skipped: true, fingerprint: fp };
      report.skipped++;
      continue;
    }
    const dir = `${ROOT}/${table}`;
    fs.createDir(dir);
    const rows = await readTable(table);
    const keep = new Set();
    let written = 0;
    for (const row of rows) {
      const name = uuidOf(row.id) + ".md";
      keep.add(name);
      const file = `${dir}/${name}`;
      if (!full) {
        let existing = null;
        try {
          existing = await fs.readFile(file);
        } catch {
          existing = null;
        }
        const m = existing ? existing.match(/^updated: (.+)$/m) : null;
        if (m && m[1] === yaml(row.updated)) continue; // unchanged since the last run
      }
      let text = frontmatter(table, row);
      if (table === "invoices" && A.invoiceDoc) text += "\n" + (await invoiceBody(A, row));
      await fs.writeFile(file, text);
      written++;
      report.written++;
    }
    let removed = 0;
    for (const name of (await fs.readdir(dir)) || []) {
      if (/\.md$/.test(name) && !keep.has(name)) {
        fs.removeFile(`${dir}/${name}`);
        removed++;
        report.removed++;
      }
    }
    report.collections[table] = { rows: rows.length, written, removed, fingerprint: fp };
  }

  await fs.writeFile(META, JSON.stringify(report, null, 2));
  return report;
}

/** The last run's report, or null if the store has never been generated. */
export async function status() {
  return await readMeta();
}
