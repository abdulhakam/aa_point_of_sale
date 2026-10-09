// Cash memo — the expenses book.
//
// `expenses` is one of the four tables the v1 import created and nothing ever wrote to it: the
// legacy app had an expenses screen that was never ported. It is a flat table (name, description,
// amount, date) and the report engine already reads it — `buildLedgerJournal` turns each row into
// `transaction_type: "expense"` with `cash: -amount` — so writing here is immediately visible in
// the general ledger and nowhere else. No view filters it, so nothing else changes.
//
// Money is written at 2 dp like every other write ([[money-is-2dp-everywhere]]), and an expense is
// a real cost: it is deleted outright rather than soft-deleted, because there is no `deleted`
// column on this table and a cost that is quietly not counted is worse than one that is removed.

import { dateOnly, money, round2, today } from "../compute/format.js";
import { base64ToHex } from "./management.js";

/** Money on its way into the column — the same rounding the reports and the grid use. */
const money2 = (value) => String(round2(value));

const named = (columns) => (row) => {
  const out = {};
  for (let i = 0; i < columns.length; i++) out[columns[i]] = row[i];
  return out;
};

const COLUMNS = ["id", "name", "description", "amount", "date", "created"];

export async function listExpenses(db, filters = {}) {
  const where = [];
  const params = [];
  if (filters.from) {
    where.push('date("date") >= date(?)');
    params.push(String(filters.from));
  }
  if (filters.to) {
    where.push('date("date") <= date(?)');
    params.push(String(filters.to));
  }
  if (filters.q) {
    where.push('(lower("name") LIKE ? OR lower("description") LIKE ?)');
    const like = `%${String(filters.q).toLowerCase()}%`;
    params.push(like, like);
  }
  const rows = await db.all(
    'SELECT "id", "name", "description", "amount", "date", "created" FROM "expenses" ' +
      (where.length ? "WHERE " + where.join(" AND ") : "") +
      ' ORDER BY date("date") DESC, "id" DESC LIMIT 500',
    params
  );
  return rows.map(named(COLUMNS)).map((r) => {
    const amount = round2(r.amount);
    return {
      id: r.id,
      name: r.name ?? "",
      description: r.description ?? "",
      amount,
      amountText: money(amount),
      // `date` is TEXT DEFAULT '' and '' is legal, meaning "unset" rather than NULL.
      date: dateOnly(r.date),
      hasDate: Boolean(r.date),
    };
  });
}

/** Totals over the whole filtered set, not the 500 rows the list shows. */
export async function sumExpenses(db, filters = {}) {
  const rows = await listExpenses(db, filters);
  const total = rows.reduce((acc, r) => acc + r.amount, 0);
  return { count: rows.length, total: round2(total), totalText: money(total) };
}

export async function createExpense(db, form) {
  const amount = round2(form.amount);
  if (!(amount > 0)) throw new Error("an expense needs an amount above zero");
  const idHex = (await db.all("SELECT hex(uuid_v7()) AS hx", []))[0][0];
  await db.execute(
    'INSERT INTO "expenses" ("id", "name", "description", "amount", "date") VALUES (unhex(?), ?, ?, CAST(? AS REAL), ?)',
    [idHex, String(form.name ?? "").trim(), String(form.description ?? "").trim(), money2(amount), form.date || today()]
  );
  return idHex;
}

export async function updateExpense(db, publicId, form) {
  const hex = base64ToHex(String(publicId || ""));
  if (!hex) return 0;
  return db.execute(
    'UPDATE "expenses" SET "name" = ?, "description" = ?, "amount" = CAST(? AS REAL), "date" = ? WHERE "id" = unhex(?)',
    [String(form.name ?? "").trim(), String(form.description ?? "").trim(), money2(form.amount), form.date || today(), hex]
  );
}

export async function deleteExpense(db, publicId) {
  const hex = base64ToHex(String(publicId || ""));
  if (!hex) return 0;
  return db.execute('DELETE FROM "expenses" WHERE "id" = unhex(?)', [hex]);
}

/**
 * The `/cashmemo/expenses` screen as `{ options, data }` for `routeKit.renderRoute`.
 *
 * Extracted so the expense WRITES (save, delete) can re-render the list on an htmx request instead of
 * a 303. `query` carries the filters, the optional `edit` id, and (for a write) a `status`/`message`
 * flash — an error is passed as `status: "error"` so the layout flash paints it red.
 */
export async function listView(A, req, query, status, message) {
  const routeKit = A.routeKit;
  const db = (globalThis).sqlite;
  const filters = {
    from: routeKit.pick(query.from, ""),
    to: routeKit.pick(query.to, ""),
    q: routeKit.pick(query.q, ""),
  };
  const [rows, totals] = await Promise.all([listExpenses(db, filters), sumExpenses(db, filters)]);
  const editId = String(query.edit || "");
  return {
    options: { active: "cashmemo", title: "Expenses", template: "cashmemo/expenses.html" },
    data: {
      rows,
      filters,
      query,
      totals,
      editRow: editId ? rows.find((r) => String(r.id) === editId) ?? null : null,
      today: A.format.dateOnly(new Date().toISOString()),
      status: status ?? "",
      message: message ?? "",
    },
  };
}
