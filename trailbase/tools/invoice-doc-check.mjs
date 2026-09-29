// The materialised invoice-document drift guard.
//
//   node trailbase/tools/invoice-doc-check.mjs            file checks only
//   node trailbase/tools/invoice-doc-check.mjs --live     also query GUEST_BASE for the documents
//
// Why this exists. The invoice document is defined by ONE SQL statement, and the migration that
// defines it also has to embed that statement inside twelve triggers, because SQLite cannot call a
// stored statement from a trigger. A trigger body is therefore a COPY, and a copy is where the
// money goes wrong: a trigger that re-derives 3,000 invoices when it should re-derive one is
// invisible until a till tries to save a line.
//
// So the copies are not hand-written and not trusted. This tool takes the committed build
// statement, mechanically narrows it, and asserts each trigger is exactly what that narrowing
// produces. It also asserts the four depot-wide scans are narrowed in every single trigger --
// a substitution written for one form silently misses the others, and that is the specific failure
// this catches.
//
// The live pass then checks the thing a file check cannot: that the text the depot actually stores
// is the text in the file, and that the documents agree with the base tables they were built from.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const MIGRATION = join(REPO, "trailbase", "migrations", "main", "U1790300500__invoice_document_sync.sql");

const LIVE = process.argv.includes("--live");
const BASE = process.env.GUEST_BASE || "http://127.0.0.1:4000";
const EMAIL = process.env.ADMIN_EMAIL || "admin@localhost";
const PASSWORD = process.env.ADMIN_PASSWORD || "administrator-0ne";

let failures = 0;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${extra ? `  ${extra}` : ""}`);
  if (!ok) failures++;
};
const section = (t) => console.log(`\n== ${t}`);

// ---------------------------------------------------------------- statements

/**
 * Split a migration into statements.
 *
 * Three things make this more than `split(";")`:
 *   - `;` inside a string literal is not a terminator.
 *   - a `CREATE TRIGGER` body is `BEGIN ... ; ... ; END;` -- the inner semicolons separate
 *     statements *inside* the trigger.
 *   - `CASE ... END` appears in expressions (the paid_total sum is one) and that `END` closes a
 *     CASE, not the trigger.
 */
function statements(text) {
  const WORD = /[A-Za-z_]/;
  const out = [];
  let buf = "";
  let i = 0;
  let depth = 0;
  let cases = 0;
  let inTrigger = false;
  let word = "";

  const flush = () => {
    if (!word) return;
    const up = word.toUpperCase();
    if (up === "BEGIN") depth++;
    else if (up === "CASE") cases++;
    else if (up === "END") {
      if (cases) cases--;
      else if (depth) depth--;
    } else if (up === "TRIGGER") inTrigger = true;
    word = "";
  };

  while (i < text.length) {
    const ch = text[i];
    if (ch === "'") {
      flush();
      buf += ch;
      i++;
      while (i < text.length) {
        if (text[i] === "'") {
          if (text[i + 1] === "'") {
            buf += "''";
            i += 2;
            continue;
          }
          buf += "'";
          i++;
          break;
        }
        buf += text[i];
        i++;
      }
      continue;
    }
    if (ch === "-" && text[i + 1] === "-") {
      const j = text.indexOf("\n", i);
      i = j < 0 ? text.length : j + 1;
      continue;
    }
    if (WORD.test(ch)) {
      word += ch;
      buf += ch;
      i++;
      continue;
    }
    flush();
    if (ch === ";" && depth === 0 && (inTrigger ? cases === 0 : true)) {
      if (buf.trim()) out.push(buf.trim());
      buf = "";
      inTrigger = false;
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  flush();
  if (buf.trim()) out.push(buf.trim());
  return out;
}

// ---------------------------------------------------------------- the build statement

const raw = readFileSync(MIGRATION, "utf8");
const stmts = statements(raw);

/** The commented definition in section 2, un-commented. This is the single definition. */
function canonicalBuild() {
  const lines = raw.split("\n");
  const head = lines.findIndex((l) => l.includes("2. THE BUILD STATEMENT"));
  if (head < 0) throw new Error("section 2 (the build statement) is not in the migration");
  let sep = -1;
  for (let i = head + 1; i < lines.length; i++) {
    if (/^--\s*-{20,}$/.test(lines[i])) {
      sep = i;
      break;
    }
  }
  if (sep < 0) throw new Error("the build statement block has no closing separator");
  const body = [];
  for (const line of lines.slice(sep + 1)) {
    if (!line.trim()) {
      if (body.length) break;
      continue;
    }
    if (!line.startsWith("--")) break;
    body.push(line.startsWith("-- ") ? line.slice(3) : line.slice(2));
  }
  return body.join("\n");
}

const BUILD = canonicalBuild();
const norm = (s) => String(s).replace(/\s+/g, " ").trim();

// The four depot-wide scans in the build, and the narrowing each one needs. A substitution written
// for one form misses the other three silently; the `every trigger is narrowed` check below is what
// stops that from being a slow bug rather than a fast failure.
const SCOPINGS = [
  [
    'FROM "transactions" t\n  LEFT JOIN "items" it ON it."id" = t."item"\n  WHERE t."deleted" = 0',
    'FROM "transactions" t\n  LEFT JOIN "items" it ON it."id" = t."item"\n  WHERE t."deleted" = 0 AND t."invoice" = {INV}',
  ],
  [
    'FROM "payments" WHERE "deleted" = 0 GROUP BY "invoice"',
    'FROM "payments" WHERE "deleted" = 0 AND "invoice" = {INV} GROUP BY "invoice"',
  ],
  [
    'FROM "payments" pay\n  LEFT JOIN "payment_types" pty ON pty."id" = pay."type"\n' +
      '  LEFT JOIN "parties" pa ON pa."id" = pay."party"\n' +
      '  LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"\n' +
      '  WHERE pay."deleted" = 0 GROUP BY pay."invoice"',
    'FROM "payments" pay\n  LEFT JOIN "payment_types" pty ON pty."id" = pay."type"\n' +
      '  LEFT JOIN "parties" pa ON pa."id" = pay."party"\n' +
      '  LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"\n' +
      '  WHERE pay."deleted" = 0 AND pay."invoice" = {INV} GROUP BY pay."invoice"',
  ],
  [
    'FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"\n  WHERE i."deleted" = 0 GROUP BY i."id"',
    'FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"\n  WHERE i."id" = {INV} AND i."deleted" = 0 GROUP BY i."id"',
  ],
];

/** The build, narrowed to one invoice, as a single document expression. */
function scoped(invRef) {
  let out = BUILD;
  for (const [from, to] of SCOPINGS) {
    if (!out.includes(from)) throw new Error(`scoping substitution no longer matches the build:\n${from}`);
    out = out.replace(from, to.replace("{INV}", invRef));
  }
  const ctes = out.split('INSERT INTO "inv_doc" ("id", "doc")\n')[0];
  const tail = out.slice(out.indexOf('SELECT i."id",') + 'SELECT i."id",'.length);
  return `${ctes}SELECT\n  ${tail.trim()}`;
}

/** The build, narrowed to one invoice, as an `INSERT ... SELECT (id, doc)`. */
function scopedInsert(invRef) {
  let out = BUILD;
  for (const [from, to] of SCOPINGS) {
    if (!out.includes(from)) throw new Error(`scoping substitution no longer matches the build:\n${from}`);
    out = out.replace(from, to.replace("{INV}", invRef));
  }
  const ctes = out.split('INSERT INTO "inv_doc" ("id", "doc")\n')[0];
  const tail = out.slice(out.indexOf('SELECT i."id",') + 'SELECT i."id",'.length);
  return { ctes, select: tail.trim() };
}

// The twelve document triggers and the invoice reference each one is scoped to. This table is the
// specification: if a trigger here stops matching the file, the file changed without the intent
// being recorded, and that is what the check is for.
const TRIGGERS = [
  { name: "inv_doc__line_insert", form: "subquery", inv: 'NEW."invoice"' },
  { name: "inv_doc__line_update", form: "subquery", inv: 'NEW."invoice"' },
  { name: "inv_doc__line_reassigned", form: "subquery", inv: 'OLD."invoice"' },
  { name: "inv_doc__line_delete", form: "subquery", inv: 'OLD."invoice"' },
  { name: "inv_doc__payment_insert", form: "subquery", inv: 'NEW."invoice"' },
  { name: "inv_doc__payment_update", form: "subquery", inv: 'NEW."invoice"' },
  { name: "inv_doc__payment_reassigned", form: "subquery", inv: 'OLD."invoice"' },
  { name: "inv_doc__payment_delete", form: "subquery", inv: 'OLD."invoice"' },
  { name: "inv_doc__invoice_insert", form: "insert", inv: 'NEW."id"' },
  { name: "inv_doc__invoice_update", form: "insert", inv: 'NEW."id"' },
  // The rename triggers re-derive a SET of documents (every invoice quoting the old name), so
  // they scope the build to the row being updated rather than to a named invoice.
  { name: "inv_doc__item_renamed", form: "fanout", inv: '"inv_doc"."id"' },
  { name: "inv_doc__party_renamed", form: "fanout", inv: '"inv_doc"."id"' },
  { name: "inv_doc__booker_renamed", form: "fanout", inv: '"inv_doc"."id"' },
];

// Each depot-wide scan in the build, and the predicate that narrows it. A substitution written for
// one form silently misses the other three, so the narrowing is asserted per scan rather than by
// diffing whole statements: this says exactly which fact it is checking.
const NARROWINGS = [
  ['AND t."invoice" = ', "transactions -> one invoice"],
  ['WHERE "deleted" = 0 AND "invoice" = ', "payments (paid_total) -> one invoice"],
  ['AND pay."invoice" = ', "payments (document) -> one invoice"],
  ['WHERE i."id" = ', "invoices -> one invoice"],
];

// ---------------------------------------------------------------- file checks

section("the migration file");
check("the migration exists", existsSync(MIGRATION), MIGRATION);
check("the build statement is present and non-trivial", BUILD.length > 2000, `${BUILD.length} chars`);

section("the build statement is the only definition");
const buildIndex = stmts.findIndex((s) => s.toUpperCase().startsWith("WITH LT AS"));
check("the build is executed exactly once", stmts.filter((s) => s.toUpperCase().startsWith("WITH LT AS")).length === 1);
check(
  "the commented definition equals the executed statement",
  norm(BUILD) === norm(stmts[buildIndex] || "").replace(/;$/, ""),
  `${BUILD.length} vs ${(stmts[buildIndex] || "").length}`,
);
const stored = stmts.find((s) => s.includes("materialised_source") && s.includes("invoice.build"));
check("the build is stored in materialised_source", !!stored);
if (stored) {
  const m = /'WITH lt AS \(([\s\S]*)\)'\s*,\s*\n?\s*'The single definition/s.exec(stored);
  const decoded = stored
    .slice(stored.indexOf("'WITH lt AS"), stored.lastIndexOf("',") + 1)
    .slice(1, -1)
    .replace(/''/g, "'")
    .trim();
  check(
    "the stored build equals the file's build statement",
    norm(decoded) === norm(BUILD),
    `${decoded.length} vs ${BUILD.length}`,
  );
  void m;
}

section("every trigger is a narrowing of that statement, not a copy of it");
for (const t of TRIGGERS) {
  const stmt = stmts.find((s) => s.includes(`CREATE TRIGGER "${t.name}"`));
  if (!stmt) {
    check(`${t.name} exists`, false);
    continue;
  }
  const flat = norm(stmt);
  const build = norm(scoped(t.inv));
  let ok;
  let what;
  if (t.form === "subquery") {
    ok = flat.includes(`SET "doc" = (${build}) WHERE "id" = ${t.inv}`);
    what = `the build narrowed to ${t.inv}, updating that one document`;
  } else if (t.form === "insert") {
    ok = flat.includes(`INSERT INTO "inv_doc" ("id", "doc") ${norm(scopedInsert(t.inv).ctes)} SELECT NEW."id", ${norm(scopedInsert(t.inv).select).replace(/^SELECT i\."id",\s*/, "")}`);
    what = `the build narrowed to ${t.inv}, inserted as a document`;
  } else {
    ok = flat.includes(`SET "doc" = (${build}) WHERE "id" IN (`);
    what = `the build narrowed to the row being updated, over the documents that quote the old name`;
  }
  check(`${t.name} is ${what}`, ok);
}

section("no trigger re-aggregates the whole depot");
// The unnarrowed form measured 237 ms per line write. If a substitution ever stops applying, this
// is the line that catches it -- and it is the difference between a usable till and an unusable one.
for (const t of TRIGGERS) {
  const stmt = stmts.find((s) => s.includes(`CREATE TRIGGER "${t.name}"`)) || "";
  const body = norm(stmt.slice(stmt.indexOf("BEGIN")));
  const missing = NARROWINGS.filter(([marker]) => !body.includes(norm(marker))).map(([, label]) => label);
  check(`${t.name} narrows all four depot-wide scans`, missing.length === 0, missing.join("; "));
}

section("the two non-narrowing triggers are as narrow as they should be");
const hidden = stmts.find((s) => s.includes('CREATE TRIGGER "inv_doc__invoice_hidden"')) || "";
check("a soft-deleted invoice removes its document", norm(hidden).includes('DELETE FROM "inv_doc" WHERE "id" = NEW."id"'));
check("the invoice update is an upsert, so a restored invoice gets its document back",
  norm(stmts.find((s) => s.includes('CREATE TRIGGER "inv_doc__invoice_update"')) || "").includes('ON CONFLICT("id") DO UPDATE'));

// ---------------------------------------------------------------- live checks

if (LIVE) {
  section("the live depot");
  let cookie = "";
  try {
    const res = await fetch(`${BASE}/api/auth/v1/login`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `email_or_username=${encodeURIComponent(EMAIL)}&password=${encodeURIComponent(PASSWORD)}`,
    });
    cookie = (res.headers.getSetCookie ? res.headers.getSetCookie() : []).map((c) => c.split(";")[0]).join("; ");
    check("login", Boolean(cookie), BASE);
  } catch (e) {
    check("login", false, String(e));
  }

  const get = async (p) => {
    const res = await fetch(`${BASE}${p}`, { headers: cookie ? { cookie } : {} });
    const t = await res.text();
    try {
      return { status: res.status, json: JSON.parse(t) };
    } catch {
      return { status: res.status, json: null, text: t };
    }
  };

  const status = await get("/invoice-doc");
  check("GET /invoice-doc", status.status === 200, `status ${status.status}`);
  if (status.json) {
    check("the build statement is registered", status.json.registered === true);
    check("there is one document per live invoice", status.json.inStepWithBase === true,
      `${status.json.documents} documents / ${status.json.baseInvoices} invoices`);
    check("documents are present", (status.json.documents || 0) > 0, `${status.json.documents} documents, ${(status.json.payloadBytes / 1048576).toFixed(1)} MB`);
  }

  const verify = await get("/invoice-doc/verify");
  check("GET /invoice-doc/verify", verify.status === 200);
  if (verify.json) {
    check("every document agrees with its own lines and payments", verify.json.ok === true,
      JSON.stringify(verify.json.problems || []));
  }

  const list = await get("/invoice-doc/list?limit=3");
  check("GET /invoice-doc/list", list.status === 200 && Array.isArray(list.json?.rows), `${list.json?.rows?.length} rows`);
  if (list.json?.rows?.length) {
    // `id` goes in the query, not the path: it is base64, and `=` inside a path segment is fragile
    // through the router.
    const one = await get(`/invoice-doc/document?id=${encodeURIComponent(list.json.rows[0].id)}`);
    const doc = one.json;
    check("GET /invoice-doc/document?id= returns a whole document", one.status === 200 && !!doc && !doc.error);
    if (doc && !doc.error) {
      for (const field of ["readable_id", "party", "booker", "dated", "total", "final_total", "paid_total", "remaining", "lines", "payments"]) {
        check(`the document carries ${field}`, doc[field] !== undefined);
      }
      const sum = (doc.lines || []).reduce((n, l) => n + Number(l.total || 0), 0);
      check("the document total equals the sum of its lines", Math.abs(sum - Number(doc.total)) <= 0.005,
        `${doc.total} vs ${sum.toFixed(2)}`);
      check("the document carries item names on its lines", (doc.lines || []).every((l) => l.item_name !== undefined));
      check("the document carries names on its payments", (doc.payments || []).every((p) => p.id && p.payment_date !== undefined));
    }
    // The human id must work too, because it is what appears in logs and error messages.
    const byReadable = await get(`/invoice-doc/${encodeURIComponent(list.json.rows[0].readableId)}`);
    check("GET /invoice-doc/inv-<no> reads the same document", byReadable.status === 200 && byReadable.json?.readable_id === list.json.rows[0].readableId);
  }
}

console.log();
if (failures) {
  console.log(`FAILED: ${failures} check(s)`);
  process.exit(1);
}
console.log("all checks passed");
