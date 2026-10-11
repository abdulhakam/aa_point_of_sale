// Payments: the reads behind `/payments` and the writes behind its "new payment" form.
//
// A payment is a row in `payments` with a type code from `payment_types`
// (0 sending, 1 recieving, 2 return), optionally linked to an invoice and/or a party, and
// optionally paid to an order booker. An entry with **no** invoice is the legacy standalone
// "DA" voucher — money received or paid without a document behind it.
//
// Money is written at 2 dp ([[money-is-2dp-everywhere]]); the row is inserted through `db.execute`
// with bound text parameters ([[guest-writes-via-sql]]).

import { dateOnly, money, round2, today } from "../compute/format.js";
import { base64ToHex } from "./management.js";

/** `payment_types` — the spelling is PocketBase's and the whole ledger depends on it. */
export const PAYMENT_TYPES = { 0: "Sending", 1: "Recieving", 2: "Return" };
export const typeLabel = (code) => PAYMENT_TYPES[Number(code)] ?? "Payment";

const money2 = (value) => String(Number.isFinite(Number(value)) ? Number(Number(value).toFixed(2)) : 0);

const named = (columns) => (row) => {
  const out = {};
  for (let i = 0; i < columns.length; i++) out[columns[i]] = row[i];
  return out;
};

const LIST_COLUMNS = [
  "id", "type", "amount", "paid", "payment_date", "description", "invoice", "invoiceNo",
  "invoiceType", "partyName", "paidTo", "areaName", "sectionName", "bookerName", "originalInvoiceNo",
  "invoiceTotal", "invoicePaid",
];

const PAYMENT_SELECT =
  'SELECT p."id" AS id, p."type" AS type, p."amount" AS amount, p."paid" AS paid, ' +
  'p."payment_date" AS payment_date, p."description" AS description, p."invoice" AS invoice, ' +
  'i."invoiceNo" AS invoiceNo, i."type" AS invoiceType, pa."name" AS partyName, bo."name" AS paidTo, ' +
  'ar."name" AS areaName, se."name" AS sectionName, bk."name" AS bookerName, oi."invoiceNo" AS originalInvoiceNo, ' +
  'ROUND(COALESCE(t.total, 0) * (1 - COALESCE(i."discount_1", 0) / 100.0) * (1 - COALESCE(i."discount_2", 0) / 100.0) - COALESCE(i."discount_rs", 0), 2) AS invoiceTotal, ' +
  'COALESCE(pay.paid, 0) AS invoicePaid ' +
  'FROM payments p ' +
  'LEFT JOIN invoices i ON i."id" = p."invoice" ' +
  'LEFT JOIN parties pa ON pa."id" = p."party" ' +
  'LEFT JOIN order_bookers bo ON bo."id" = p."paid_to" ' +
  // The invoice's party carries area -> section; the invoice itself carries the booker. A standalone
  // DA payment has no invoice, so these are empty — the legacy screen shows them blank too.
  'LEFT JOIN areas ar ON ar."id" = pa."area" ' +
  'LEFT JOIN sections se ON se."id" = ar."section" ' +
  'LEFT JOIN order_bookers bk ON bk."id" = i."booker" ' +
  // "Original invoices": a return payment's invoice references the sale it returns (one id in
  // `invoices_return_reference.original_invoices`); show that invoice's number.
  'LEFT JOIN invoices_return_reference rr ON rr."id" = p."invoice" ' +
  'LEFT JOIN invoices oi ON oi."id" = rr."original_invoices" ' +
  'LEFT JOIN (SELECT "invoice", ROUND(SUM(ROUND((("qty" * "price") * (1 - COALESCE("discount_1", 0) / 100.0) * (1 - COALESCE("discount_2", 0) / 100.0)) - COALESCE("discount_rs", 0), 2)), 2) AS total ' +
  '          FROM transactions WHERE "deleted" = 0 GROUP BY "invoice") t ON t."invoice" = i."id" ' +
  'LEFT JOIN (SELECT "invoice", ROUND(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 2) AS paid FROM payments ' +
  '          WHERE "invoice" IS NOT NULL GROUP BY "invoice") pay ON pay."invoice" = i."id" ';

/** The filtered statement, shared by the list and the totals so the two cannot disagree. */
function filteredQuery(filters) {
  const where = [];
  const params = [];
  const type = filters.type === undefined || filters.type === "" ? "" : Number(filters.type);
  if (type in PAYMENT_TYPES) {
    where.push("p.type = ?");
    params.push(String(type));
  }
  if (filters.from) {
    where.push("date(p.payment_date) >= date(?)");
    params.push(String(filters.from));
  }
  if (filters.to) {
    where.push("date(p.payment_date) <= date(?)");
    params.push(String(filters.to));
  }
  // A relation filter must compare the stored BLOB to the id's bytes, not to its base64 text: the
  // old `p."party" = ?` matched nothing and silently returned an empty list. `unhex(?)` with the
  // decoded hex is what every other relation comparison in this app already does.
  const rel = (column, value) => {
    const hex = base64ToHex(String(value));
    if (!hex) return;
    where.push(column + " = unhex(?)");
    params.push(hex);
  };
  if (filters.party) rel('p."party"', filters.party);
  if (filters.area) rel('pa."area"', filters.area);
  if (filters.section) rel('ar."section"', filters.section);
  if (filters.booker) rel('i."booker"', filters.booker);
  if (filters.standalone === "on") where.push("p.invoice IS NULL");
  // PocketBase left one `paid = 0` row per invoice as the ledger's invoice-side placeholder
  // ("Invoice Created", 0.00). The screen shows settled payments; "open entries" switches to the
  // placeholders, which is what an operator auditing the ledger wants to see.
  where.push(filters.open === "on" ? "p.paid = 0" : "p.paid = 1");
  return { params, sql: PAYMENT_SELECT + "WHERE " + where.join(" AND ") };
}

/** Count and sums over the whole filtered set — the list is capped at 300 rows. */
export async function sumPayments(db, filters = {}) {
  const { sql, params } = filteredQuery(filters);
  const rows = await db.all(
    'SELECT COUNT(*) AS n, ' +
      'ROUND(COALESCE(SUM(CASE WHEN "type" = 1 THEN "amount" ELSE 0 END), 0), 2) AS recieved, ' +
      'ROUND(COALESCE(SUM(CASE WHEN "type" = 0 THEN "amount" ELSE 0 END), 0), 2) AS sent ' +
      'FROM (' + sql + ')',
    params
  );
  const r = named(["n", "recieved", "sent"])(rows?.[0] ?? []);
  const recieved = round2(r.recieved);
  const sent = round2(r.sent);
  return {
    count: Number(r.n) || 0,
    recieved,
    recievedText: money(recieved),
    sent,
    sentText: money(sent),
    net: round2(recieved - sent),
    netText: money(round2(recieved - sent)),
  };
}

/** One raw row in the shape every caller sees — a list row, a totals row or a printed voucher. */
function shapeRow(r) {
  const amount = round2(r.amount);
  const row = {
    id: r.id,
    type: r.type === null ? null : Number(r.type),
    typeLabel: typeLabel(r.type),
    amount,
    amountText: money(amount),
    paid: Number(r.paid) === 1,
    date: dateOnly(r.payment_date),
    description: r.description ?? "",
    invoice: r.invoice ?? null,
    invoiceNo: r.invoiceNo === null || r.invoiceNo === undefined ? null : Number(r.invoiceNo),
    partyName: r.partyName ?? "",
    paidTo: r.paidTo ?? "",
    area: r.areaName ?? "",
    section: r.sectionName ?? "",
    booker: r.bookerName ?? "",
    originalInvoiceNo: r.originalInvoiceNo === null || r.originalInvoiceNo === undefined ? null : Number(r.originalInvoiceNo),
    standalone: r.invoice === null || r.invoice === undefined,
  };
  if (!row.standalone) {
    row.invoiceTotal = round2(r.invoiceTotal);
    row.invoiceTotalText = money(row.invoiceTotal);
    row.invoicePaid = round2(r.invoicePaid);
    row.balanceText = money(round2(row.invoiceTotal - row.invoicePaid));
  }
  return row;
}

export async function listPayments(db, filters = {}, opts = {}) {
  const { sql, params } = filteredQuery(filters);
  // The list is windowed at 300 by default; `show=all` lifts the cap so a wide date range can be
  // read (and printed) in full. The window is a render cap, not a filter — the totals and the row
  // count in `sumPayments` are always over the WHOLE filtered set.
  const limit = opts.all ? "" : " LIMIT 300";
  const rows = await db.all(sql + ' ORDER BY p."payment_date" DESC, p."id" DESC' + limit, params);

  return rows.map(named(LIST_COLUMNS)).map(shapeRow);
}

/**
 * One payment, in the same shape `listPayments` returns, so a voucher on paper and a row on a
 * list cannot be formatted differently. A filtered list would work, but it reads up to 300 rows
 * to find one — which is a strange thing to do on the print path.
 */
export async function readPayment(db, publicId) {
  const hex = base64ToHex(String(publicId || ""));
  if (!hex) return null;
  const { sql, params } = filteredQuery({});
  const rows = await db.all(sql + ' AND p."id" = unhex(?)', [...params, hex]);
  const mapped = rows.map(named(LIST_COLUMNS)).map(shapeRow);
  return mapped[0] ?? null;
}

/**
 * Record a payment. `invoice` is the public (base64) id or empty for a standalone DA entry.
 * Returns the new row's public id.
 */
export async function createPayment(db, form) {
  const amount = round2(form.amount);
  if (!(amount > 0)) throw new Error("amount must be greater than zero");

  const type = Number(form.type);
  if (!(type in PAYMENT_TYPES)) throw new Error("unknown payment type");

  // Reads and URLs use the base64 id; a relation write needs canonical UUID hex
  // ([[api-contract-trailbase]]), so every relation is translated here.
  const invoiceHex = form.invoice ? base64ToHex(String(form.invoice)) : null;
  const partyHex = form.party ? base64ToHex(String(form.party)) : null;
  const paidToHex = form.paidTo ? base64ToHex(String(form.paidTo)) : null;
  const date = form.date || today();
  const description = form.description ? String(form.description) : "";

  // A payment against a document defaults to settled; a standalone DA entry is the open side of
  // the ledger by itself, so it is recorded as paid.
  const paid =
    form.paid === undefined || form.paid === "" || form.paid === "on" || form.paid === "1" || form.paid === "true";

  const idHex = (await db.all("SELECT hex(uuid_v7()) AS hx", []))[0][0];

  // The relation columns are optional, and the DB bridge binds text only — so each one is either a
  // `unhex(?)` placeholder with a hex parameter, or a literal NULL with no parameter at all. Mixing
  // the two (a placeholder missing from the parameter list) is what makes the bridge fail with
  // "Error converting from js 'null' into type 'string'".
  const params = [idHex, String(type), money2(amount), String(paid ? 1 : 0), String(date), description];
  const relations = [
    ["invoice", invoiceHex],
    ["party", partyHex],
    ["paid_to", paidToHex],
  ];
  const columns = [];
  const values = [];
  for (const [column, hex] of relations) {
    if (hex) {
      columns.push(`"${column}"`);
      values.push("unhex(?)");
      params.push(hex);
    } else {
      columns.push(`"${column}"`);
      values.push("NULL");
    }
  }

  await db.execute(
    'INSERT INTO payments ("id", "type", "amount", "paid", "payment_date", "description", ' +
      columns.join(", ") +
      ") VALUES (unhex(?), ?, CAST(? AS REAL), ?, ?, ?, " +
      values.join(", ") +
      ")",
    params
  );
  const rows = await db.all('SELECT "id" FROM payments WHERE "id" = unhex(?)', [idHex]);
  return rows?.[0]?.[0] ?? null;
}

export async function deletePayment(db, publicId) {
  const hex = base64ToHex(String(publicId || ""));
  if (!hex) return 0;
  return await db.execute('DELETE FROM payments WHERE "id" = unhex(?)', [hex]);
}

/**
 * The `/payments` list screen as `{ options, data }` for `routeKit.renderRoute`.
 *
 * Extracted so the payment WRITES (create, delete) can re-render the list on an htmx request instead
 * of a 303 — one builder, so the write's list and the GET's list cannot drift. `query` carries both
 * the filters and (for a write) a `status`/`message` flash.
 */
export async function listView(A, req, query) {
  const routeKit = A.routeKit;
  const db = (globalThis).sqlite;
  const refs = await routeKit.refs();
  const filters = {
    type: routeKit.pick(query.type, ""),
    from: routeKit.pick(query.from, ""),
    to: routeKit.pick(query.to, ""),
    party: routeKit.pick(query.party, ""),
    area: routeKit.pick(query.area, ""),
    section: routeKit.pick(query.section, ""),
    booker: routeKit.pick(query.booker, ""),
    standalone: routeKit.flag(query.standalone),
    open: routeKit.flag(query.open),
  };
  const rows = await listPayments(db, filters, { all: routeKit.pick(query.show, "") === "all" });
  const totals = await sumPayments(db, filters);
  // The URL that lifts the window, keeping the current filters. Built from the filters the form
  // wrote, so "Show all" is the same query with `show=all` appended.
  const qs = Object.keys(filters)
    .filter((k) => filters[k])
    .map((k) => k + "=" + encodeURIComponent(String(filters[k])))
    .join("&");
  const rowInfo = {
    shown: rows.length,
    total: totals.count,
    truncated: rows.length < totals.count,
    allHref: "/payments?" + (qs ? qs + "&" : "") + "show=all",
  };
  return {
    options: { active: "payments", title: "Payments", template: "payments/index.html" },
    data: {
      rows,
      rowInfo,
      filters,
      types: routeKit.typeOptions(PAYMENT_TYPES),
      selectedType: Number(filters.type || -1),
      parties: refs.parties ?? [],
      areas: refs.areas ?? [],
      sections: refs.sections ?? [],
      bookers: refs.bookers ?? [],
      totals,
      status: query.status || "",
      message: query.message || "",
    },
  };
}

/**
 * The `/payments/new` screen as `{ options, data }`, shared by its GET route and the create route's
 * error path (which re-renders the form with the operator's values and the error, rather than a bare
 * 400 body htmx would not swap). `query` repopulates the fields; `error` is the message to show.
 */
export async function newView(A, req, query, error) {
  const routeKit = A.routeKit;
  const db = (globalThis).sqlite;
  const refs = await routeKit.refs();
  const invoice = query.invoice ? await A.invoices.readInvoice(db, String(query.invoice)) : null;
  // Server-rendered FALLBACK for no-JS and first paint: the open invoices, capped. The full list (open
  // or paid) is populated from the client invoice cache (`public/js/invoicedb.js`), so the server does
  // not ship ~8,900 options. A payment with no invoice at all is the legacy standalone "DA" voucher.
  const invoices = await A.invoices.listInvoices(db, { unpaid: "on" }, { limit: 200 });
  return {
    options: { active: "payments", title: "New payment", template: "payments/new.html" },
    data: {
      invoice,
      invoices,
      types: routeKit.typeOptions(PAYMENT_TYPES),
      selectedType: Number(routeKit.pick(query.type, invoice && invoice.type === 0 ? "0" : "1")),
      selectedParty: String(routeKit.pick(query.party, invoice ? invoice.party || "" : "")),
      selectedPaidTo: "",
      amount: String(routeKit.pick(query.amount, invoice ? invoice.balanceText : "")),
      today: dateOnly(new Date().toISOString()),
      parties: refs.parties ?? [],
      bookers: refs.bookers ?? [],
      error: error ?? "",
    },
  };
}
