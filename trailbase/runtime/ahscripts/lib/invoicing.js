// Invoice entry: create-with-allocation, edit lease, idempotent idempotent line adds, complete.
//
// Design: vault/decisions/invoice-entry-freshness-and-writes.md — immediate push (the invoice is
// created `completed=0` and patched as the operator works), a lease so two tills cannot edit the
// same invoice, server-side numbering preserving the legacy `count+1` scheme, `uuid_v7()` ids, and
// an idempotency key on create and on each line add. Money is written at 2 dp
// ([[money-is-2dp-everywhere]]).

import { base64ToHex } from "./management.js";
import { round2 } from "../compute/format.js";

const LEASE_MS = 120_000;

function nowIso(offsetMs = 0) {
  const d = new Date(Date.now() + offsetMs);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}.${p(d.getUTCMilliseconds(), 3)}Z`
  );
}

/**
 * Money on its way into a column.
 *
 * This used to be `toFixed(2)`, which is NOT the same function as the `round2` the report engine
 * and the grid use: `toFixed(2)` rounds the exact binary double (125.505 → 125.50) while `round2`
 * rounds half-up (125.505 → 125.51). They disagreed on 353 of 200,000 measured `price * qty`
 * products, which is invisible today because no screen shows a preview — and immediately visible
 * the moment the grid recalculates a cell in the browser and the saved row disagrees with it.
 * `round2` is the one that matches the legacy SQL, so it wins and this is now a single function.
 */
const money = (value) => String(round2(value));

const uuidHex = async (db) => (await db.all("SELECT hex(uuid_v7()) AS hx", []))[0][0];

/** The public (base64url) id of a row identified internally by hex — the API convention. */
const base64Id = async (db, table, hex) => {
  const rows = await db.all(`SELECT "id" FROM "${table}" WHERE "id" = unhex(?)`, [hex]);
  return rows?.[0]?.[0] ?? null;
};

const invoiceByHex = async (db, invoiceHex) =>
  db.all('SELECT "invoiceNo", "completed" FROM "invoices" WHERE "id" = unhex(?)', [invoiceHex]);

/**
 * Create an invoice for `type`, allocating its number atomically with the legacy `count+1` scheme.
 * With `key`, a repeat returns the invoice the key already created (and removes any row this call
 * created first, so a lost response cannot leave an orphan).
 */
export async function createInvoice(db, { type, key, userHex, device }) {
  const typeCode = String(Number(type));

  if (key) {
    const existing = await db.all('SELECT hex("invoice") AS hx FROM "invoice_create_key" WHERE "key" = ?', [key]);
    if (existing && existing.length) {
      const hex = existing[0][0];
      const row = await invoiceByHex(db, hex);
      return { id: await base64Id(db, "invoices", hex), invoiceNo: row?.[0]?.[0] ?? null, reused: true };
    }
  }

  const idHex = await uuidHex(db);
  // No `status`: an invoice is published the moment it is saved and stays editable afterwards
  // (vault/decisions/no-draft-invoices-published-on-save.md), so there is nothing to write. The
  // number is allocated here and the lines follow, which is the legacy `count+1` scheme preserved
  // deliberately ([[legacy-invoice-numbering-is-racy]]).
  await db.execute(
    'INSERT INTO "invoices" ("id", "type", "invoiceNo") ' +
      'SELECT unhex(?), ?, COALESCE((SELECT COUNT(*) FROM "invoices" WHERE "type" = ?), 0) + 1',
    [idHex, typeCode, typeCode]
  );

  if (key) {
    const claimed = await db.execute(
      'INSERT OR IGNORE INTO "invoice_create_key" ("key", "invoice") VALUES (?, unhex(?))',
      [key, idHex]
    );
    if (claimed === 0) {
      // Another call won the key: drop ours and return theirs.
      await db.execute('DELETE FROM "invoices" WHERE "id" = unhex(?)', [idHex]);
      const existing = await db.all('SELECT hex("invoice") AS hx FROM "invoice_create_key" WHERE "key" = ?', [key]);
      const hex = existing?.[0]?.[0];
      const row = hex ? await invoiceByHex(db, hex) : null;
      return { id: hex ? await base64Id(db, "invoices", hex) : null, invoiceNo: row?.[0]?.[0] ?? null, reused: true };
    }
  }

  // A fresh create takes the edit lease, so the till that started the invoice owns it.
  await takeLock(db, idHex, userHex, device);

  const row = await invoiceByHex(db, idHex);
  return { id: await base64Id(db, "invoices", idHex), invoiceNo: row?.[0]?.[0] ?? null, reused: false };
}

/** Take or renew the edit lease. Returns true when this user holds it afterwards. */
export async function takeLock(db, invoiceHex, userHex, device) {
  const affected = await db.execute(
    'INSERT INTO "invoice_lock" ("invoice", "user", "device", "lease_until") VALUES (unhex(?), unhex(?), ?, ?) ' +
      'ON CONFLICT("invoice") DO UPDATE SET "user" = excluded."user", "device" = excluded."device", ' +
      '"lease_until" = excluded."lease_until", "updated" = strftime(\'%Y-%m-%d %H:%M:%fZ\',\'now\') ' +
      'WHERE "invoice_lock"."lease_until" <= ? OR "invoice_lock"."user" = excluded."user"',
    [invoiceHex, userHex, device ?? "", nowIso(LEASE_MS), nowIso()]
  );
  return affected > 0;
}

export async function releaseLock(db, invoiceHex, userHex) {
  return db.execute('DELETE FROM "invoice_lock" WHERE "invoice" = unhex(?) AND "user" = unhex(?)', [
    invoiceHex,
    userHex,
  ]);
}

/** Update the invoice header (full-state fields; money at 2 dp). */
export async function patchHeader(db, invoiceHex, patch) {
  const sets = [];
  const params = [];
  for (const col of ["party", "booker", "invoice_maker"]) {
    if (patch[col] === undefined) continue;
    if (patch[col]) {
      sets.push(`"${col}" = unhex(?)`);
      params.push(base64ToHex(patch[col]));
    } else {
      sets.push(`"${col}" = NULL`);
    }
  }
  for (const col of ["dated", "description", "duedate"]) {
    if (patch[col] === undefined) continue;
    sets.push(`"${col}" = ?`);
    params.push(String(patch[col]));
  }
  for (const col of ["discount_1", "discount_2", "discount_rs"]) {
    if (patch[col] === undefined) continue;
    sets.push(`"${col}" = CAST(? AS REAL)`);
    params.push(money(patch[col]));
  }
  if (!sets.length) return 0;
  params.push(invoiceHex);
  return db.execute(`UPDATE "invoices" SET ${sets.join(", ")} WHERE "id" = unhex(?)`, params);
}

// ---------------------------------------------------------------------------
// Line writers retired 2026-10-12 (tb-0040).
//
// The line add/remove lived here as `addLine`/`deleteLine`. Every caller now goes through the
// CANONICAL `invoice-lifecycle.js` `appendLine`/`removeLine`, the same money chain the keyboard
// console and the grid use, so the two cannot write different numbers. `appendLine` additionally
// validates the item id (a 400 with a message instead of a raw constraint error) and `removeLine`
// checks the line belongs to the invoice and honours an op key — neither of which this copy had.
// Nothing here writes lines any more; the header/lease/complete writers below stay for the older
// entry and JSON routes until those are reconciled too.
// ---------------------------------------------------------------------------

/**
 * Release the lease once the operator is done with the invoice.
 *
 * There is no state to move any more: the invoice is published the moment it is saved and stays
 * editable afterwards (vault/decisions/no-draft-invoices-published-on-save.md). What this does is
 * hand the invoice back so another device can pick it up, which is the point of the lease. The
 * `completed` argument is accepted and ignored so the existing callers and the check tool keep
 * working; nothing refuses it any more.
 */
export async function completeInvoice(db, invoiceHex, userHex, _completed = true) {
  await releaseLock(db, invoiceHex, userHex);
  return 1;
}
