// Guest management module — display/form helpers and
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

const OPTION_SOURCES = ["sections", "areas", "companies", "party_types", "invoice_types", "payment_types"];

const refLists = (refs) => ({
  sections: refs.sections,
  areas: refs.areas,
  companies: refs.companies,
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
/**
 * Resolve a field's `hidden`/`disabled` declaration against the current form mode.
 *
 * The declaration in `entities.json` is one of: `true`/`false` (every mode), a mode string, or an
 * array of modes — where a mode is `"create"`, `"edit"` or `"view"`. So `"disabled": "edit"` locks a
 * field once the row exists, and `"hidden": ["create", "view"]` shows it only on the edit form. An
 * absent declaration is false (the field is visible and editable).
 */
function applies(decl, mode) {
  if (decl === true) return true;
  if (!decl || decl === false) return false;
  if (Array.isArray(decl)) return decl.includes(mode);
  return String(decl) === mode;
}

/**
 * The form's field descriptors for one mode (`"create"`, `"edit"` or `"view"`).
 *
 * `mode` defaults to `edit` when a row is present, else `create`. `view` is read-only: every field is
 * disabled regardless of its own declaration (a per-field `disabled` can still ADD a disable in
 * create/edit, but cannot opt back in while viewing). `hidden` follows the field's declaration only.
 */
export function formFields(entity, row, options, links, mode) {
  if (!mode) mode = row ? "edit" : "create";
  return entity.fields.map((field) => {
    const base = {
      name: field.name,
      label: field.label,
      required: !!field.required,
      hidden: applies(field.hidden, mode),
      disabled: mode === "view" || applies(field.disabled, mode),
    };
    if (field.type === "text") {
      return { ...base, type: "input", inputType: "text", value: row?.[field.name] ?? "" };
    }
    if (field.type === "number") {
      const value = row?.[field.name];
      // `money: "rate"` marks a unit price/cost — a rate, not an amount — so the template wraps it in
      // `<aa-money rate>`, which keeps the stored precision and sets `step="any"`
      // ([[money-is-2dp-everywhere]], [[client-side-live-recalculation]]).
      return { ...base, type: "input", inputType: "number", money: field.money, value: value === undefined || value === null ? "" : String(value), step: "any" };
    }
    if (field.type === "enum") {
      const selected = row?.[field.name];
      return {
        ...base,
        // `source` is carried so the template can emit `data-ref` and the client cache (refdb) can
        // serve this select; it was only used internally to build `options` before.
        source: field.source,
        type: "select",
        options: [{ value: "", label: "—" }, ...(options[field.source] ?? []).map((o) => ({ ...o, selected: String(selected ?? "") === o.value }))],
      };
    }
    if (field.type === "relation") {
      const selected = row?.[field.name];
      return {
        ...base,
        // `source` is carried so the template can emit `data-ref` and the client cache (refdb) can
        // serve this select; it was only used internally to build `options` before.
        source: field.source,
        type: "select",
        options: [{ value: "", label: "—" }, ...(options[field.source] ?? []).map((o) => ({ ...o, selected: String(selected ?? "") === o.value }))],
      };
    }
    const current = new Set(links[field.name]?.[row?.id] ?? []);
    return {
      ...base,
      source: field.source,
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

/**
 * Everything the `/management/<entity>` list screen renders, as `{ options, data }` for
 * `routeKit.renderRoute`.
 *
 * Extracted from the GET route so a WRITE can return the same screen: an htmx create/update/delete
 * re-renders the list (with the flash carried in `query.status`/`query.message`) into `#app-main`,
 * instead of a 303 the browser follows as a full page. One builder means the write's list and the
 * GET's list cannot drift — the reason this is a function rather than a copy in each route folder.
 */
export async function listView(A, entity, entityKey, query) {
  const refs = await A.routeKit.refs();
  const options = optionLists(refs);
  const all = sortRows(await readTable(entity.api), entity.sort);
  let visible = all.filter((row) => !entity.softDelete || !row.deleted);

  // The items list shows the legacy `Qty` column — "165 (1 ctn 21 units)" — which is the item's
  // signed stock, not a column on `items`. It is read from the SAME `itemsReport` view the stock
  // report and `/inventory` use ([[inventory]]), so the list, the report and the inventory screen
  // cannot disagree about a quantity. Keyed by id; the display is `<qty> (<ctns/units>)`.
  if (entityKey === "items") {
    const stock = await A.baseviews.itemsReport();
    const byId = new Map(stock.map((r) => [String(r.id), r]));
    visible = visible.map((row) => {
      const s = byId.get(String(row.id));
      if (!s) return row;
      const qty = Number(s.qty) || 0;
      const rounded = Math.round((qty + Number.EPSILON) * 100) / 100;
      return { ...row, qtyText: `${rounded} (${A.format.qtyDisplay(s.box_size_qty, qty)})` };
    });
  }

  const links = await loadLinks(entity);
  const editId = String(query.edit || "");
  const editRow = editId ? all.find((r) => r.id === editId) ?? null : null;
  // `?view=<id>` opens the SAME panel read-only — the legacy's eye icon, distinct from the pencil's
  // `?edit=`. The mode drives `formFields`, which disables every field while viewing.
  const viewId = String(query.view || "");
  const viewRow = viewId ? all.find((r) => r.id === viewId) ?? null : null;
  const mode = viewRow ? "view" : editRow ? "edit" : "create";
  // The create form lives behind its own affordance rather than on the list page, so the list is the
  // bare filter row + table the legacy screen is ([[tb-0023-guest-feature-parity]] item A). `?new=1`
  // opens it; a row's pencil (`?edit=<id>`) opens the same panel prefilled.
  const isNew = /^(1|true|on|yes)$/i.test(String(query.new || ""));

  return {
    options: { active: "management", title: entity.label, template: "management/list.html.jinja" },
    data: {
      entity,
      entityKey,
      columns: entity.columns,
      rows: displayRows(entity, visible, refs, links),
      fields: formFields(entity, viewRow || editRow, options, links, mode),
      editRow,
      viewRow,
      isNew,
      status: query.status || "",
      message: query.message || "",
    },
  };
}

// --------------------------------------------------------------- SQL writes

// The base64url alphabet, which is what the DB bridge emits for a BLOB id.
//
// The implementation below is now the FALLBACK only. The real one is Rust
// (`tb-ah-run-js/src/api/ids.rs`), reached through `ids.b64ToHex`; this module keeps its own copy so
// a guest running an older component still works. `tools/id-codec-check.mjs --compare` runs both
// against the same vectors, so the two cannot drift unnoticed.
//
// There were once three copies of this function — here, in `route.ts`, and in `route-kit.js`. A
// base64 decoder has no loud failure mode: a short alphabet yields plausible ids that match no row,
// which is how a materialised invoice document once rendered with empty item names.
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

// Standard base64 and base64url differ only in the last two symbols — `+/` versus `-_` — and they
// differ for **99.9%** of real 16-byte ids, because over 22 characters the difference is not rare.
// The bridge emits base64url, so its ids decode correctly as they are; but a `+` or `/` would fall
// through the `idx < 0` guard and leave a SHORT hex that then matches no row — a silent miss, not
// an error. The standard symbols are accepted as synonyms of `-` and `_` so an id that arrived from
// a record-API client (which uses standard base64) decodes to the same bytes. These are a lookup
// table rather than extra characters in B64, because a character's INDEX is its 6-bit value:
// appending `+/` would give them 64 and 65.
const B64_STANDARD = { "+": 62, "/": 63 };

/** Base64 (url-safe as the bridge emits it, standard accepted) -> uppercase hex, for `unhex(?)`. */
export function base64ToHex(value) {
  const bridge = (globalThis).ids;
  if (bridge && typeof bridge.b64ToHex === "function") return bridge.b64ToHex(String(value ?? ""));
  let bits = 0;
  let acc = 0;
  let hex = "";
  for (const ch of String(value ?? "")) {
    if (ch === "=") break;
    const inUrlSafe = B64.indexOf(ch);
    const idx = inUrlSafe >= 0 ? inUrlSafe : B64_STANDARD[ch];
    if (idx === undefined || idx < 0) continue;
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
      // Money (and any numeric column) is stored at 2 decimal places — insignificant digits
      // never reach the database ([[money-is-2dp-everywhere]]).
      const rawValue = raw === undefined || raw === null || raw === "" ? 0 : Number(raw);
      const value = Number.isFinite(rawValue) ? Number(rawValue.toFixed(2)) : 0;
      cols.push({ name: field.name, expr: "CAST(? AS REAL)", param: String(value) });
    } else {
      cols.push({ name: field.name, expr: "?", param: typeof raw === "string" ? raw : "" });
    }
  }
  return cols;
}

/** INSERT a record with a server-generated uuid_v7 id; returns the new id's hex. */
/**
 * Reject a create or update that omits a field the entity declares `required: true`.
 *
 * The entity spec has said `required: true` all along — `items.name` is the only one today — and
 * nothing read it, so an empty POST to `/inventory/save` or `/management/items/create` inserted a row
 * with `name = ''` and redirected `303 ?status=ok`. The table has `name TEXT NOT NULL DEFAULT ''`, so
 * the database was happy; the junk item then appeared in the inventory, the stock report and the
 * difference report, which is how a stray double-submit becomes a wrong stock figure.
 *
 * Found by `tools/route-coverage.mjs`, which probes every write route with an empty body and asserts it
 * is rejected rather than served.
 *
 * Throws rather than returning a flag, because every caller is already inside a request handler and an
 * unhandled throw becomes a 500 — which is what we are avoiding. So callers that want a 400 must check
 * first; see `A.management.missingRequired(entity, form)` for the non-throwing form.
 */
export function missingRequired(entity, form) {
  const fields = Array.isArray(entity?.fields) ? entity.fields : [];
  return fields
    .filter((f) => f.required)
    .filter((f) => String((form || {})[f.name] ?? "").trim() === "")
    .map((f) => f.name);
}

function requireFields(entity, form) {
  const missing = missingRequired(entity, form);
  if (missing.length) {
    throw new Error(`${entity.label ?? entity.api}: ${missing.join(", ")} required`);
  }
}

export async function createRow(db, entity, form) {
  const spec = columnSpec(entity, form);
  requireFields(entity, form);
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
