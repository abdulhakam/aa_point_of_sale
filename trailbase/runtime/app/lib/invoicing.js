// Invoice entry: create-with-allocation, edit lease, idempotent idempotent line adds, complete.
//
// Design: vault/decisions/invoice-entry-freshness-and-writes.md — immediate push (the invoice is
// created `completed=0` and patched as the operator works), a lease so two tills cannot edit the
// same invoice, server-side numbering preserving the legacy `count+1` scheme, `uuid_v7()` ids, and
// an idempotency key on create and on each line add. Money is written at 2 dp
// ([[money-is-2dp-everywhere]]).

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

const money = (value) => {
  const n = Number(value);
  return String(Number.isFinite(n) ? Number(n.toFixed(2)) : 0);
};

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
  await db.execute(
    'INSERT INTO "invoices" ("id", "type", "invoiceNo", "completed") ' +
      'SELECT unhex(?), ?, COALESCE((SELECT COUNT(*) FROM "invoices" WHERE "type" = ?), 0) + 1, 0',
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

/** The live holder of an invoice's lease, or null. */
export async function lockHolder(db, invoiceHex) {
  const rows = await db.all(
    'SELECT hex("user") AS "user", "device", "lease_until" FROM "invoice_lock" WHERE "invoice" = unhex(?) AND "lease_until" > ?',
    [invoiceHex, nowIso()]
  );
  return rows && rows.length ? { user: rows[0][0], device: rows[0][1], leaseUntil: rows[0][2] } : null;
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

/** Add a line, idempotent on the client's op key. Returns the line's hex id. */
export async function addLine(db, invoiceHex, line, opKey) {
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
      base64ToHex(line.item),
      money(line.qty),
      money(line.price),
      money(line.cost_price),
      money(line.discount_1),
      money(line.discount_2),
      money(line.discount_rs),
      money(line.scheme),
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

export async function updateLine(db, lineHex, line) {
  return db.execute(
    'UPDATE "transactions" SET "qty" = CAST(? AS REAL), "price" = CAST(? AS REAL), "cost_price" = CAST(? AS REAL), ' +
      '"discount_1" = CAST(? AS REAL), "discount_2" = CAST(? AS REAL), "discount_rs" = CAST(? AS REAL), "scheme" = CAST(? AS REAL) ' +
      'WHERE "id" = unhex(?)',
    [
      money(line.qty),
      money(line.price),
      money(line.cost_price),
      money(line.discount_1),
      money(line.discount_2),
      money(line.discount_rs),
      money(line.scheme),
      lineHex,
    ]
  );
}

export async function deleteLine(db, lineHex) {
  return db.execute('DELETE FROM "transactions" WHERE "id" = unhex(?)', [lineHex]);
}

/** Mark the invoice complete (or reopen) and release the lease. */
export async function completeInvoice(db, invoiceHex, userHex, completed = true) {
  // The guest's DB bridge binds text parameters only, so the flag goes as a string.
  const affected = await db.execute('UPDATE "invoices" SET "completed" = ? WHERE "id" = unhex(?)', [
    String(completed ? 1 : 0),
    invoiceHex,
  ]);
  await releaseLock(db, invoiceHex, userHex);
  return affected;
}
