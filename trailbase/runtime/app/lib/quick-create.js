/*
 * Quick-create: a party or an item made from the screen that needed it.
 *
 * WHY THIS EXISTS. The legacy invoice screen let an operator create a party or an item without leaving
 * the invoice they were writing; the guest made them go to Management, fill the form, come back and
 * find the row in a 943-entry combobox. That detour is the single most expensive one in the app
 * ([[tb-0023-guest-feature-parity]]). This module is the server half: the invoice routes call it when
 * the panel's fields arrive, so the create happens inside the SAME form post that needed it and no
 * navigation and no second write path is involved.
 *
 * It deliberately goes through `management.createRow`, the same call `/management/{entity}/create`
 * makes. A second INSERT here would be a second place that knows the column types, the money rounding
 * and the required fields, and the two would drift ([[guest-writes-via-sql]] records that the guest
 * writes by SQL; that is not a reason to write the same SQL twice).
 *
 * None of these functions write to the database on their own account — they are called inside the
 * route's `write()` and the invoice's hold of the lock, like every other change to an invoice.
 */

import { ENTITIES } from "./entities.js";
import * as management from "./management.js";

/** Form values arrive as strings; an array would mean a duplicated field. */
const text = (value) => (Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "")).trim();

/**
 * A party created from an invoice.
 *
 * `fields.type` is the PARTY type — 0 customer, 1 supplier — and the caller that reads a submitted form
 * is the one that translates an invoice into it (`partyFromForm` below). That separation is deliberate:
 * the two enums have the same two names in the opposite order, so a single function holding both would
 * be the only place in the app where `1` means "supplier, because the invoice was a purchase" and
 * "sale, so the party is a customer" at once. It was got wrong once already while writing this.
 *
 * The four data fields are the legacy sale screen's create-party form: name, area, phone, address.
 *
 * A SUPPLIER ALSO GETS A COMPANY OF ITS OWN NAME. That is not an embellishment — it is what the legacy
 * purchase screen did, and the migrated data is full of it: every one of the 13 supplier parties has a
 * party_companies row, and 14 of the 15 companies are named after a party. Suppliers were the legacy
 * `categories` collection, which maps onto `companies` ([[v1-categories-map-to-companies]]). Creating a
 * supplier without one would leave the supplier's goods uncategorised, and the operator would have to
 * make the company by hand — the detour this module exists to remove.
 *
 * The company is REUSED when one of that name already exists, rather than created again. The legacy did
 * create a second one; on a fresh supplier that is a duplicate row with no upside, and the
 * find-or-create is the whole difference.
 *
 * Returns the new row's hex id. The caller converts it to base64 with `routeKit.hexToB64`, the same
 * codec the select's option values use.
 */
export async function createParty(db, fields) {
  const name = text(fields?.name);
  if (!name) throw new Error("A new party needs a name");
  const type = Number(text(fields?.type)) === 1 ? 1 : 0;

  const hex = await management.createRow(db, ENTITIES.parties, {
    name,
    type: String(type),
    phone: text(fields?.phone),
    address: text(fields?.address),
    area: text(fields?.area),
  });

  if (type === 1) {
    const companyHex = await ensureCompany(db, name);
    // The same INSERT `management.syncLinks` would make for a `multi` field, done directly so the id
    // does not have to survive a base64 round trip on its way back from the create.
    await db.execute(
      'INSERT INTO "party_companies" ("party", "company") VALUES (unhex(?), unhex(?))',
      [hex, companyHex]
    );
  }

  return hex;
}

/** The company of that name, or a new one. Soft-deleted companies are not reused. */
async function ensureCompany(db, name) {
  const found = await db.all(
    'SELECT hex("id") AS hx FROM "companies" WHERE "name" = ? AND "deleted" = 0 ORDER BY "created" LIMIT 1',
    [name]
  );
  if (found && found.length) return String(found[0][0]);
  return management.createRow(db, ENTITIES.companies, { name });
}

/**
 * An item created from an invoice line.
 *
 * The five fields are exactly the legacy invoice screen's create-item form: name, company, cost price,
 * sale price, carton size. Numbers go through `createRow`'s 2-decimal rounding
 * ([[money-is-2dp-everywhere]]), so this cannot be the place a third decimal reaches the database.
 *
 * Returns the new row's hex id.
 */
export async function createItem(db, fields) {
  const name = text(fields?.name);
  if (!name) throw new Error("A new item needs a name");

  return management.createRow(db, ENTITIES.items, {
    name,
    category: text(fields?.category),
    cost_price: text(fields?.cost_price),
    sale_price: text(fields?.sale_price),
    box_size_qty: text(fields?.box_size_qty),
  });
}

/**
 * Which party type an invoice makes. A purchase (invoice type 0) brings goods in, so its new party is a
 * SUPPLIER (1); a sale, a return and a stock difference all leave the goods with a customer, so they
 * make a CUSTOMER (0). The two enums are not the same numbers in the same order — invoice 0 is
 * purchase, party 0 is customer — and this is the one place that is allowed to know it.
 */
function partyTypeForInvoice(invoiceType) {
  return Number(text(invoiceType)) === 0 ? 1 : 0;
}

/**
 * The party a submitted form asked for, or "" when it asked for none.
 *
 * The panel's fields are the signal. It is opened by the combobox and it DISABLES its own controls
 * while closed, so a plain "Save header" submits `party_new_name` as empty and never reaches the
 * create — no marker field, and nothing for a caller to remember to clear.
 */
export async function partyFromForm(db, form) {
  if (!text(form?.party_new_name)) return "";
  return createParty(db, {
    name: form.party_new_name,
    type: partyTypeForInvoice(form.party_new_from_invoice_type),
    area: form.party_new_area,
    phone: form.party_new_phone,
    address: form.party_new_address,
  });
}

/** The item a submitted form asked for, or "" when it asked for none. Same contract as above. */
export async function itemFromForm(db, form) {
  if (!text(form?.item_new_name)) return "";
  return createItem(db, {
    name: form.item_new_name,
    category: form.item_new_category,
    cost_price: form.item_new_cost_price,
    sale_price: form.item_new_sale_price,
    box_size_qty: form.item_new_box_size_qty,
  });
}
