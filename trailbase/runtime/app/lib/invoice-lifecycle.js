// Invoice lifecycle: the write lease, the line operations, and the canonical money arithmetic that
// the grid's browser-side preview mirrors.
//
// There is no lifecycle. The design is vault/decisions/no-draft-invoices-published-on-save.md, which
// supersedes vault/decisions/invoice-lifecycle-draft-open-append-only.md: the ORDERS system the
// draft phase existed for has been removed, so an invoice is published the moment it is saved and
// stays editable afterwards. There is no `status`, no commit step, and no append-only rule — a line
// is edited in place and a removed line is deleted, so what is on screen is what is in the books. A
// return is still a negative-quantity row on the same invoice
// (vault/decisions/returns-are-negative-quantities.md).
//
// What remains of the old design is the write lease, which stops two devices typing into the same
// invoice at once (vault/decisions/single-writer-per-invoice.md).
//
// The money here is the single server implementation. app/public/js/app.js mirrors it in integer
// paisa for the grid's live preview, and the smoke suite asserts the two agree on the pinned
// fixtures (vault/decisions/client-side-live-recalculation.md). If you change a formula here, the
// grid changes with it or the preview stops matching the ledger.

import { round2 } from "../compute/format.js";
import { base64ToHex } from "./management.js";

const LEASE_MS = 120_000;

function nowIso(offsetMs = 0) {
  const d = new Date(Date.now() + offsetMs);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}.${p(d.getUTCMilliseconds(), 3)}Z`
  );
}

/** Money on its way into a column: the SAME rounding the read path and the grid use. */
export const money2 = (value) => String(round2(value));

const uuidHex = async (db) => (await db.all("SELECT hex(uuid_v7()) AS hx", []))[0][0];
const base64Id = async (db, table, hex) => {
  const rows = await db.all(`SELECT "id" FROM "${table}" WHERE "id" = unhex(?)`, [hex]);
  return rows?.[0]?.[0] ?? null;
};

// ---------------------------------------------------------------------------
// Canonical money. Mirrored in app/public/js/app.js — keep the two in step.
// ---------------------------------------------------------------------------

/** One line, before the invoice's own discounts. Negative qty is a return. */
export const lineAmount = (line) => {
  const qty = Number(line.qty) || 0;
  const price = Number(line.price) || 0;
  const d1 = Number(line.discount_1) || 0;
  const d2 = Number(line.discount_2) || 0;
  const drs = Number(line.discount_rs) || 0;
  return price * qty * (1 - d1 / 100) * (1 - d2 / 100) - drs;
};

/** The line as it lands in the books: rounded to 2 dp. */
export const lineTotal = (line) => round2(lineAmount(line));

/**
 * The invoice header chain, identical to buildInvoiceView in app/compute/views.js:
 *   s = Σ round2(line); afterD1 = s - s·d1/100; unrounded = afterD1 - afterD1·d2/100;
 *   final = round2(unrounded - discount_rs)
 *
 * `total` is the lines' own value; `net` is the amount owed after the header discounts.
 */
export function invoiceTotals(lines, header = {}) {
  const d1 = Number(header.discount_1) || 0;
  const d2 = Number(header.discount_2) || 0;
  const drs = Number(header.discount_rs) || 0;
  const sum = round2(lines.reduce((acc, line) => acc + lineTotal(line), 0));
  const afterD1 = sum - (sum * d1) / 100;
  const unrounded = afterD1 - (afterD1 * d2) / 100;
  return {
    lineSum: sum,
    afterDiscount: round2(unrounded),
    total: round2(unrounded - drs),
    discount_1: d1,
    discount_2: d2,
    discount_rs: drs,
  };
}

/** The invoice's remaining balance, and whether it is owed to us or by us. */
export function balanceOf(total, paid) {
  const remaining = round2(total - paid);
  return {
    remaining,
    // A return on a settled invoice makes the balance negative: the shop owes the customer.
    // It is shown as credit due, never as an unpaid invoice.
    creditDue: remaining < -0.005,
    settled: Math.abs(remaining) <= 0.005,
  };
}

// ---------------------------------------------------------------------------
// The write lease
// ---------------------------------------------------------------------------

/**
 * A refused write. `status` is the HTTP code the route should answer with.
 *
 * A factory rather than a subclass of Error, on purpose: the ESM->CJS shim in
 * ahscripts/routes/_app/route.ts rewrites the function, const and named-list export forms, but it
 * has no rule for a class export, so one makes the whole module fail to load with "unsupported
 * keyword: export". The shim is a delicate piece and a class is not worth it.
 */
export const LifecycleError = (message, status = 409) => {
  const error = new Error(message);
  error.status = status;
  error.name = "LifecycleError";
  return error;
};

/** The invoice's id and lease holder in one read. */
export async function readState(db, invoiceHex) {
  // `party` is a BLOB the bridge already base64-encodes, so it comes back in its public form
  // without any decoding here.
  const rows = await db.all(
    'SELECT "completed", "party", "type", "invoiceNo" FROM "invoices" WHERE "id" = unhex(?)',
    [invoiceHex]
  );
  if (!rows || !rows.length) return null;
  const lease = await db.all(
    'SELECT hex("user") AS "user", "device", "lease_until" FROM "invoice_lock" ' +
      'WHERE "invoice" = unhex(?) AND "lease_until" > ?',
    [invoiceHex, nowIso()]
  );
  return {
    hex: invoiceHex,
    id: await base64Id(db, "invoices", invoiceHex),
    completed: Number(rows[0][0]) === 1,
    type: Number(rows[0][2]),
    invoiceNo: Number(rows[0][3]),
    party: rows[0][1] ?? null,
    lease: lease && lease.length ? { user: lease[0][0], device: lease[0][1], leaseUntil: lease[0][2] } : null,
  };
}

/**
 * Take or renew the invoice's write lease. This is the ONLY way to write: the route calls it
 * before any mutation and refuses on false. Auto-expiry means a crash cannot strand an invoice
 * (vault/decisions/single-writer-per-invoice.md).
 */
export async function requireLease(db, invoiceHex, userHex, device) {
  const state = await readState(db, invoiceHex);
  if (!state) throw LifecycleError("no such invoice", 404);
  const ok = await db.execute(
    'INSERT INTO "invoice_lock" ("invoice", "user", "device", "lease_until") VALUES (unhex(?), unhex(?), ?, ?) ' +
      'ON CONFLICT("invoice") DO UPDATE SET "user" = excluded."user", "device" = excluded."device", ' +
      '"lease_until" = excluded."lease_until", "updated" = strftime(\'%Y-%m-%d %H:%M:%fZ\',\'now\') ' +
      'WHERE "invoice_lock"."lease_until" <= ? OR "invoice_lock"."user" = excluded."user"',
    [invoiceHex, userHex, device ?? "", nowIso(LEASE_MS), nowIso()]
  );
  if (!(ok > 0)) {
    const holder = await db.all(
      'SELECT "device" FROM "invoice_lock" WHERE "invoice" = unhex(?) AND "lease_until" > ?',
      [invoiceHex, nowIso()]
    );
    throw LifecycleError(
      "this invoice is being edited on another device" + (holder?.[0]?.[0] ? ` (${holder[0][0] || "another device"})` : ""),
      409
    );
  }
  return state;
}

export async function releaseLease(db, invoiceHex, userHex) {
  return db.execute('DELETE FROM "invoice_lock" WHERE "invoice" = unhex(?) AND "user" = unhex(?)', [
    invoiceHex,
    userHex,
  ]);
}

/**
 * An invoice must have at least one live line before it counts as a document.
 *
 * There is no commit transition any more — the invoice is published the moment it is saved — so
 * this is the whole of what the old `commit` enforced, and it is kept because an invoice with no
 * lines is a number in the sequence that reports will show as an empty document.
 */
export async function assertHasLines(db, invoiceHex) {
  const live = await db.all(
    'SELECT COUNT(*) FROM "transactions" WHERE "invoice" = unhex(?) AND "deleted" = 0',
    [invoiceHex]
  );
  if (!live?.[0]?.[0]) throw LifecycleError("an invoice needs at least one line", 400);
  return live[0][0];
}

// ---------------------------------------------------------------------------
// Line operations.
//
// Every saved invoice is editable, so a line is changed in place and a removed line is deleted.
// The trade is deliberate: with append-only withdrawn there is no second copy of what an invoice
// used to say, so a report already read can change afterwards
// (vault/decisions/no-draft-invoices-published-on-save.md). A return is still recorded as a
// negative-quantity line, which is a real line the operator typed rather than a reversal.
// ---------------------------------------------------------------------------

/** Append a line. */
export async function appendLine(db, invoiceHex, line, opKey) {
  // A relation id that is not one is a bad request, and `unhex()` on rubbish does not fail politely:
  // it reaches the bridge as a constraint error with no message. Check it here so the caller gets a
  // 400 that says what was wrong.
  const itemHex = base64ToHex(line.item);
  if (!itemHex || !/^[0-9A-F]{32}$/.test(itemHex)) {
    throw LifecycleError(`"${String(line.item ?? "")}" is not an item id`, 400);
  }
  if (opKey) {
    const seen = await db.all('SELECT hex("line") AS hx FROM "invoice_line_op" WHERE "key" = ?', [opKey]);
    if (seen && seen.length) return await base64Id(db, "transactions", seen[0][0]);
  }
  const lineHex = await uuidHex(db);
  await db.execute(
    'INSERT INTO "transactions" ("id", "invoice", "item", "qty", "price", "cost_price", "discount_1", "discount_2", "discount_rs", "scheme") ' +
      "VALUES (unhex(?), unhex(?), unhex(?), CAST(? AS REAL), CAST(? AS REAL), CAST(? AS REAL), CAST(? AS REAL), CAST(? AS REAL), CAST(? AS REAL), CAST(? AS REAL))",
    [
      lineHex,
      invoiceHex,
      itemHex,
      String(Number(line.qty) || 0),
      money2(line.price),
      money2(line.cost_price),
      money2(line.discount_1),
      money2(line.discount_2),
      money2(line.discount_rs),
      money2(line.scheme),
    ]
  );
  if (opKey) {
    await db.execute('INSERT OR IGNORE INTO "invoice_line_op" ("key", "line") VALUES (?, unhex(?))', [
      opKey,
      lineHex,
    ]);
  }
  return await base64Id(db, "transactions", lineHex);
}

/** Edit a line in place. Valid on every invoice — a saved invoice stays editable. */
export async function editLine(db, invoiceHex, lineHex, line) {
  if (!/^[0-9A-F]{32}$/.test(String(lineHex ?? ""))) throw LifecycleError("not a line id", 400);
  return db.execute(
    'UPDATE "transactions" SET "qty" = CAST(? AS REAL), "price" = CAST(? AS REAL), "cost_price" = CAST(? AS REAL), ' +
      '"discount_1" = CAST(? AS REAL), "discount_2" = CAST(? AS REAL), "discount_rs" = CAST(? AS REAL), "scheme" = CAST(? AS REAL) ' +
      'WHERE "id" = unhex(?) AND "invoice" = unhex(?)',
    [
      String(Number(line.qty) || 0),
      money2(line.price),
      money2(line.cost_price),
      money2(line.discount_1),
      money2(line.discount_2),
      money2(line.discount_rs),
      money2(line.scheme),
      lineHex,
      invoiceHex,
    ]
  );
}

/**
 * Remove a line.
 *
 * A hard DELETE, so the books match the screen: `transactions.deleted` exists and the invoice
 * screens read it, but no report filters on it (`line_totals` sums every row of `transaction_view`),
 * so a soft-deleted line would still be counted in money. Deleting is what makes "what you see is
 * what is in the books" true here.
 */
export async function removeLine(db, invoiceHex, lineHex, opKey) {
  const rows = await db.all(
    'SELECT "id" FROM "transactions" WHERE "id" = unhex(?) AND "invoice" = unhex(?)',
    [lineHex, invoiceHex]
  );
  if (!rows || !rows.length) return 0;
  if (opKey) {
    // Idempotency: a retried remove must not remove a different line. The key is claimed first, so
    // a replay returns the original result without touching anything.
    const seen = await db.all('SELECT hex("line") AS hx FROM "invoice_line_op" WHERE "key" = ?', [opKey]);
    if (seen && seen.length) return 0;
    await db.execute('INSERT OR IGNORE INTO "invoice_line_op" ("key", "line") VALUES (?, unhex(?))', [
      opKey,
      lineHex,
    ]);
  }
  return db.execute('DELETE FROM "transactions" WHERE "id" = unhex(?)', [lineHex]);
}

export { nowIso, base64Id, uuidHex };
