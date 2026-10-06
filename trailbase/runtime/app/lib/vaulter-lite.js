// vaulter-lite — a document store derived from the base tables, written through TrailBase's
// file-uploads API (tb-0034).
//
// One `documents` row per record: its Frontmatter is the structured row (foreign keys as `[[uuid]]`
// wikilinks) and its BODY is the human-readable document — and ONLY invoices get a body (header, lines,
// totals, and the invoice's payments below). The document text is stored as a FILE in TrailBase's
// object store, through the record API (`POST/PATCH /api/records/v1/documents`), because the object
// store is not reachable from the guest by any other route and the guest filesystem is read-only.
//
// Incremental: the `documents` table itself is the manifest. A row whose `source_updated` still equals
// the source row's `updated` is skipped; a changed row is PATCHed; a row whose source is gone is
// DELETEd. A run with no writes makes no API calls.
//
// This is a VIEW for humans and tools, not a cache the app reads back — a document an hour old cannot
// make a report stale (`reports.no_precomputation` untouched).

import { TABLES, readTable, relationsOf } from "./data.js";
import { b64ToHex, hexToB64 } from "./route-kit.js";

export function uuidOf(id) {
  const hex = b64ToHex(String(id || ""));
  if (hex.length !== 32) return String(id || "");
  return (
    hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20)
  ).toLowerCase();
}

/** base64url of a string's UTF-8 bytes — the shape `std.FileUpload.data` wants. */
function b64url(text) {
  const enc = encodeURIComponent(String(text));
  const bytes = [];
  for (let i = 0; i < enc.length; i++) {
    if (enc[i] === "%") {
      bytes.push(parseInt(enc.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(enc.charCodeAt(i));
    }
  }
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += A[b0 >> 2] + A[((b0 & 3) << 4) | ((b1 === undefined ? 0 : b1) >> 4)];
    if (b1 === undefined) break;
    out += A[((b1 & 15) << 2) | ((b2 === undefined ? 0 : b2) >> 6)];
    if (b2 === undefined) break;
    out += A[b2 & 63];
  }
  return out;
}

function yaml(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const s = String(v);
  return s !== "" && /^[A-Za-z0-9_./@-]+$/.test(s) ? s : JSON.stringify(s);
}

function frontmatter(table, row) {
  const rels = new Set(relationsOf(table));
  const out = ["---", `collection: ${table}`, `id: ${uuidOf(row.id)}`, `updated: ${yaml(row.updated)}`];
  for (const col of Object.keys(row)) {
    if (col === "id" || col === "updated") continue;
    const v = row[col];
    // FKs are `[[uuid]]` wikilinks (ids are globally unique, so a basename resolves unambiguously).
    if (rels.has(col)) out.push(`${col}: ${v ? '"[[ ' + uuidOf(v) + ' ]]"' : "null"}`);
    else out.push(`${col}: ${yaml(v)}`);
  }
  out.push("---", "");
  return out.join("\n");
}

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

async function docOf(A, table, row) {
  let text = frontmatter(table, row);
  if (table === "invoices" && A.invoiceDoc) text += "\n" + (await invoiceBody(A, row));
  return text;
}

/** One record-API call. Returns the created record id (base64url) for a POST. */
async function call(origin, headers, method, path, body) {
  const res = await globalThis.http.request({
    method,
    url: origin + path,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? "" : JSON.stringify(body),
  });
  if (!res || Number(res.status) >= 300) {
    throw new Error(`documents API ${method} ${path} -> ${res && res.status}: ${String((res && res.body) || "").slice(0, 200)}`);
  }
  return res.body ? JSON.parse(String(res.body)) : {};
}

/**
 * Generate/refresh the store. `opts.origin` is the server origin (the record API is served from it);
 * `opts.headers` carries the triggering request's auth (cookie or bearer) so the API call is authorised.
 * `opts.full` ignores the manifest and re-uploads every document.
 */
export async function generate(A, db, opts) {
  const origin = String((opts && opts.origin) || "").replace(/\/+$/, "");
  const headers = (opts && opts.headers) || {};
  const full = !!(opts && opts.full);
  if (!origin) return { ok: false, blocked: true, reason: "no origin: the record API is required to write the documents" };

  // Existing documents: `collection|slug` -> { id, sourceUpdated }, read with SQL (the guest can read).
  const existing = {};
  for (const r of (await db.all('SELECT "collection", "slug", "source_updated", hex("id") FROM "documents"')) || []) {
    existing[r[0] + "|" + r[1]] = { sourceUpdated: r[2], id: hexToB64(String(r[3])) };
  }

  const report = { ok: true, ranAt: new Date().toISOString(), full, uploaded: 0, updated: 0, removed: 0, skipped: 0, errors: [] };
  const keep = new Set();

  for (const table of (opts && opts.tables) || TABLES) {
    const rows = await readTable(table);
    for (const row of rows) {
      const slug = uuidOf(row.id);
      const key = table + "|" + slug;
      keep.add(key);
      const prev = existing[key];
      if (!full && prev && prev.sourceUpdated === String(row.updated ?? "")) {
        report.skipped++;
        continue;
      }
      try {
        const text = await docOf(A, table, row);
        // No `/` in the filename: it becomes the object-store key, and a slash is a path separator
        // there, not part of a name.
        const file = { filename: table + "-" + slug + ".md", content_type: "text/markdown", data: b64url(text) };
        if (prev) {
          await call(origin, headers, "PATCH", "/api/records/v1/documents/" + prev.id, { source_updated: String(row.updated ?? ""), doc: file });
          report.updated++;
        } else {
          await call(origin, headers, "POST", "/api/records/v1/documents", { collection: table, slug, source_updated: String(row.updated ?? ""), doc: file });
          report.uploaded++;
        }
      } catch (e) {
        report.errors.push(`${key}: ${(e && e.message) || String(e)}`);
      }
    }
  }

  // Remove documents whose source row is gone.
  for (const key of Object.keys(existing)) {
    if (keep.has(key)) continue;
    try {
      await call(origin, headers, "DELETE", "/api/records/v1/documents/" + existing[key].id);
      report.removed++;
    } catch (e) {
      report.errors.push(`${key} (delete): ${(e && e.message) || String(e)}`);
    }
  }

  return report;
}

/** A status summary read straight from the `documents` table. */
export async function status(db) {
  const rows = (await db.all('SELECT "collection", COUNT(*) FROM "documents" GROUP BY "collection"')) || [];
  const collections = {};
  let total = 0;
  for (const r of rows) {
    collections[r[0]] = Number(r[1]);
    total += Number(r[1]);
  }
  return { collections, total };
}
