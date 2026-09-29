// Inventory: the item list behind `/inventory`, with live stock.
//
// Stock is the `itemsReport` view the stock report already uses — signed quantity per item across
// its transactions, with the legacy signs (purchase and difference add, sale subtracts, a return
// adds when the counterparty is a customer and subtracts otherwise). This module reads that view
// rather than recomputing it, so the screen and the report can never disagree.

import { money, round2 } from "../compute/format.js";
import { ENTITIES } from "./entities.js";
import { base64ToHex } from "./management.js";

/**
 * The rows for the item screen: the item's own fields joined with its live stock, an optional
 * search over name / display id / barcode, and the company name.
 */
export function stockRows(itemsReport, refs, query) {
  const needle = String(query || "").trim().toLowerCase();
  const companies = new Map((refs?.companies ?? []).map((c) => [String(c.id), c.name]));
  const rows = (itemsReport ?? []).map((it) => ({
    id: it.id,
    name: it.name ?? "",
    displayId: it.display_id ?? "",
    barcode: it.barcode ?? "",
    companyId: it.category ?? "",
    company: companies.get(String(it.category ?? "")) ?? "",
    costPrice: round2(it.cost_price),
    costPriceText: money(it.cost_price),
    salePrice: round2(it.sale_price),
    salePriceText: money(it.sale_price),
    boxSizeQty: round2(it.box_size_qty),
    boxSizeText: String(round2(it.box_size_qty)),
    stock: round2(it.qty),
    stockText: String(round2(it.qty)),
    value: round2(round2(it.qty) * round2(it.cost_price)),
    valueText: money(round2(it.qty) * round2(it.cost_price)),
  }));
  if (!needle) return rows;
  return rows.filter((r) =>
    [r.name, r.displayId, r.barcode, r.company].some((v) => String(v).toLowerCase().indexOf(needle) !== -1)
  );
}

/** Summary numbers for the top of the screen. */
export function stockSummary(rows) {
  let value = 0;
  let out = 0;
  for (const r of rows) {
    value += r.value;
    if (r.stock < 0) out += 1;
  }
  return {
    items: rows.length,
    value,
    valueText: money(value),
    negative: out,
  };
}

/** The pricing/carton fields the item form edits. Money at 2 dp ([[money-is-2dp-everywhere]]). */
const money2 = (v) => String(Number.isFinite(Number(v)) ? Number(Number(v).toFixed(2)) : 0);

/** Update one item's commercial fields in place. Ids arrive base64 and go in as hex. */
export async function updateItem(db, entityKey, publicId, form) {
  const entity = ENTITIES[entityKey];
  if (!entity) throw new Error("unknown entity");
  const hex = base64ToHex(String(publicId || ""));
  if (!hex) return 0;

  const sets = [];
  const params = [];
  for (const field of entity.fields) {
    if (form[field.name] === undefined) continue;
    if (field.type === "number") {
      sets.push(`"${field.name}" = CAST(? AS REAL)`);
      params.push(money2(form[field.name]));
    } else if (field.type === "relation") {
      const value = form[field.name];
      if (value) {
        sets.push(`"${field.name}" = unhex(?)`);
        params.push(base64ToHex(String(value)));
      } else {
        sets.push(`"${field.name}" = NULL`);
      }
    } else if (field.type === "text") {
      sets.push(`"${field.name}" = ?`);
      params.push(String(form[field.name]));
    }
  }
  if (!sets.length) return 0;
  params.push(hex);
  return await db.execute(`UPDATE "${entity.api}" SET ${sets.join(", ")} WHERE "id" = unhex(?)`, params);
}
