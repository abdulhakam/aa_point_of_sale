// Guest management module — ports frontend-ssr/src/lib/entities.js's display/form helpers and
// src/routes/management.js's write logic onto direct SQL.
//
// The Node app writes through TrailBase record APIs; the guest has `db.execute`, so writes are
// plain INSERT/UPDATE/DELETE. Two details make that work with the guest's text-only parameter
// binding:
//   * ids and relation columns are BLOBs, so values are bound as hex and wrapped in `unhex(?)`;
//   * enums/numbers are INTEGER/REAL, so values are bound as text and wrapped in `CAST(? AS …)`.

import { readTable } from "./data.js";
import { compareText } from "../compute/format.js";

/** Apply an entity's `sort` (`"+name"` / `"-created"`) the way the Node list does via the
 * record API's `order`. Uses `compareText` so the order is engine-independent. */
export function sortRows(rows, sort) {
  const match = /^([+-]?)(.+)$/.exec(String(sort ?? ""));
  if (!match) return rows;
  const direction = match[1] === "-" ? -1 : 1;
  const key = match[2];
  return rows.slice().sort((a, b) => direction * compareText(a[key], b[key]));
}

const OPTION_SOURCES = ["sections", "areas", "categories", "companies", "party_types", "invoice_types", "payment_types"];

const refLists = (refs) => ({
  sections: refs.sections,
  areas: refs.areas,
  categories: refs.categories,
  companies: refs.companies,
  party_types: refs.partyTypes,
  invoice_types: refs.invoiceTypes,
  payment_types: refs.paymentTypes,
});

export function optionLists(refs) {
  const lists = refLists(refs);
  const out = {};
  for (const source of OPTION_SOURCES) {
    out[source] = (lists[source] ?? []).map((r) => ({ value: String(r.id), label: String(r.name ?? r.id) }));
  }
  return out;
}

/** The base tables a write to this entity can change: the record plus its link tables. */
export function touchedTables(entity) {
  return [entity.api, ...entity.fields.filter((field) => field.type === "multi" && field.link).map((field) => field.link)];
}

/** One text value per defined column, so the template only prints. */
export function displayRows(entity, rows, refs, links) {
  const lists = refLists(refs);
  const nameIn = (source, id) => (id ? lists[source]?.find((r) => r.id === id)?.name ?? "" : "");
  const enumLabel = (source, code) =>
    code === null || code === undefined ? "" : lists[source]?.find((r) => Number(r.id) === Number(code))?.name ?? String(code);

  return rows.map((row) => {
    const cells = {};
    for (const col of entity.columns) {
      if (col.enumSource) {
        cells[col.key] = enumLabel(col.enumSource, row[col.key]);
      } else if (col.multi) {
        const ids = links[col.key]?.[row.id] ?? [];
        cells[col.key] = ids.map((id) => nameIn(col.resolve, id)).filter(Boolean).join(", ");
      } else if (col.via) {
        const via = lists[col.viaSource]?.find((r) => r.id === row[col.via]);
        cells[col.key] = nameIn(col.resolve, via?.[col.viaKey]);
      } else if (col.resolve) {
        cells[col.key] = nameIn(col.resolve, row[col.key]);
      } else {
        const value = row[col.key];
        cells[col.key] = value === null || value === undefined ? "" : String(value);
      }
    }
    return { id: row.id, cells };
  });
}

/** Form fields with the current values (or blanks when creating). */
export function formFields(entity, row, options, links) {
  return entity.fields.map((field) => {
    const base = { name: field.name, label: field.label, required: !!field.required };
    if (field.type === "text") {
      return { ...base, type: "input", inputType: "text", value: row?.[field.name] ?? "" };
    }
    if (field.type === "number") {
      const value = row?.[field.name];
      return { ...base, type: "input", inputType: "number", value: value === undefined || value === null ? "" : String(value), step: "any" };
    }
    if (field.type === "enum") {
      const selected = row?.[field.name];
      return {
        ...base,
        type: "select",
        options: [{ value: "", label: "—" }, ...(options[field.source] ?? []).map((o) => ({ ...o, selected: String(selected ?? "") === o.value }))],
      };
    }
    if (field.type === "relation") {
      const selected = row?.[field.name];
      return {
        ...base,
        type: "select",
        options: [{ value: "", label: "—" }, ...(options[field.source] ?? []).map((o) => ({ ...o, selected: String(selected ?? "") === o.value }))],
      };
    }
    const current = new Set(links[field.name]?.[row?.id] ?? []);
    return {
      ...base,
      type: "select",
      multiple: true,
      options: (options[field.source] ?? []).map((o) => ({ ...o, selected: current.has(o.value) })),
    };
  });
}

/** Load the link tables an entity needs, keyed field-name -> parentId -> [otherId]. */
export async function loadLinks(entity) {
  const out = {};
  for (const field of entity.fields) {
    if (field.type !== "multi") continue;
    const rows = await readTable(field.link);
    const map = {};
    for (const row of rows) {
      const parent = row[field.field];
      if (!map[parent]) map[parent] = [];
      map[parent].push(row[field.other]);
    }
    out[field.name] = map;
  }
  return out;
}

// --------------------------------------------------------------- SQL writes

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Base64 (url-safe, as the bridge emits ids/relations) -> uppercase hex, for `unhex(?)`. */
export function base64ToHex(value) {
  const clean = String(value ?? "").replace(/[^A-Za-z0-9\-_=]/g, "");
  let bits = 0;
  let acc = 0;
  let hex = "";
  for (const ch of clean) {
    if (ch === "=") break;
    const idx = B64.indexOf(ch);
    if (idx < 0) continue;
    acc = ((acc << 6) | idx) >>> 0;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      hex += ((acc >>> bits) & 0xff).toString(16).padStart(2, "0");
    }
  }
  return hex.toUpperCase();
}

async function freshUuidHex(db) {
  const rows = await db.all("SELECT hex(uuid_v7()) AS hx", []);
  return rows[0][0];
}

const multiValues = (form, name) => {
  const raw = form[name];
  const list = raw === undefined || raw === null ? [] : Array.isArray(raw) ? raw : [raw];
  return list.map((v) => String(v)).filter(Boolean);
};

/** SQL column fragments for one submitted form, per the field definitions. */
function columnSpec(entity, form) {
  const cols = [];
  for (const field of entity.fields) {
    if (field.type === "multi") continue;
    const raw = form[field.name];
    if (field.type === "relation") {
      const hex = raw ? base64ToHex(raw) : "";
      cols.push(hex ? { name: field.name, expr: "unhex(?)", param: hex } : { name: field.name, expr: "NULL", param: null });
    } else if (field.type === "enum") {
      const value = raw === undefined || raw === null || raw === "" ? null : Number(raw);
      cols.push(value === null ? { name: field.name, expr: "NULL", param: null } : { name: field.name, expr: "CAST(? AS INTEGER)", param: String(value) });
    } else if (field.type === "number") {
      const value = raw === undefined || raw === null || raw === "" ? 0 : Number(raw);
      cols.push({ name: field.name, expr: "CAST(? AS REAL)", param: String(value) });
    } else {
      cols.push({ name: field.name, expr: "?", param: typeof raw === "string" ? raw : "" });
    }
  }
  return cols;
}

/** INSERT a record with a server-generated uuid_v7 id; returns the new id's hex. */
export async function createRow(db, entity, form) {
  const spec = columnSpec(entity, form);
  const idHex = await freshUuidHex(db);
  const names = ['"id"', ...spec.map((c) => `"${c.name}"`)];
  const exprs = ["unhex(?)", ...spec.map((c) => c.expr)];
  const params = [idHex, ...spec.filter((c) => c.param !== null).map((c) => c.param)];
  await db.execute(`INSERT INTO "${entity.api}" (${names.join(", ")}) VALUES (${exprs.join(", ")})`, params);
  return idHex;
}

export async function updateRow(db, entity, form, idHex) {
  const spec = columnSpec(entity, form);
  const sets = spec.map((c) => `"${c.name}" = ${c.expr}`);
  const params = [...spec.filter((c) => c.param !== null).map((c) => c.param), idHex];
  await db.execute(`UPDATE "${entity.api}" SET ${sets.join(", ")} WHERE "id" = unhex(?)`, params);
}

export async function softDeleteRow(db, entity, idHex) {
  await db.execute(`UPDATE "${entity.api}" SET "deleted" = 1 WHERE "id" = unhex(?)`, [idHex]);
}

export async function hardDeleteRow(db, entity, idHex) {
  await db.execute(`DELETE FROM "${entity.api}" WHERE "id" = unhex(?)`, [idHex]);
}

/** Replace a link table's rows for one parent with exactly `ids` (base64). */
export async function syncLinks(db, entity, parentHex, form) {
  for (const field of entity.fields) {
    if (field.type !== "multi" || !field.link) continue;
    const wantedHex = new Set(multiValues(form, field.name).map(base64ToHex));
    const existing = await db.all(
      `SELECT hex("id") AS link, hex("${field.other}") AS other FROM "${field.link}" WHERE hex("${field.field}") = ?`,
      [parentHex]
    );
    const current = new Map((existing ?? []).map((row) => [row[1], row[0]])); // otherHex -> linkIdHex
    for (const [otherHex, linkHex] of current) {
      if (!wantedHex.has(otherHex)) {
        await db.execute(`DELETE FROM "${field.link}" WHERE "id" = unhex(?)`, [linkHex]);
      }
    }
    for (const otherHex of wantedHex) {
      if (current.has(otherHex)) continue;
      await db.execute(
        `INSERT INTO "${field.link}" ("${field.field}", "${field.other}") VALUES (unhex(?), unhex(?))`,
        [parentHex, otherHex]
      );
    }
  }
}
