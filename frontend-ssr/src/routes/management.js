import express from "express";
import { requireAuth } from "../lib/auth.js";
import { page, qs, ah } from "../lib/http.js";
import { ENTITIES, ENTITY_ORDER } from "../lib/entities.js";
import { toUuid, relId } from "../lib/uuid.js";
import { normalizeRows } from "../lib/reports/data.js";

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

function optionLists(refs) {
  const lists = refLists(refs);
  const out = {};
  for (const source of OPTION_SOURCES) {
    out[source] = (lists[source] ?? []).map((r) => ({ value: String(r.id), label: String(r.name ?? r.id) }));
  }
  return out;
}

/** Build a TrailBase write body from the submitted form, per the field definitions. */
function buildBody(entity, form) {
  const body = {};
  for (const field of entity.fields) {
    if (field.type === "multi") continue;
    const raw = form[field.name];
    switch (field.type) {
      case "number":
        body[field.name] = raw === "" || raw === undefined || raw === null ? 0 : Number(raw);
        break;
      case "enum":
        body[field.name] = raw === "" || raw === undefined || raw === null ? null : Number(raw);
        break;
      case "relation":
        body[field.name] = raw ? toUuid(String(raw)) : null;
        break;
      default:
        body[field.name] = typeof raw === "string" ? raw : "";
    }
  }
  return body;
}

const multiValues = (form, name) => {
  const raw = form[name];
  const list = raw === undefined || raw === null ? [] : Array.isArray(raw) ? raw : [raw];
  return list.map((v) => String(v)).filter(Boolean);
};

/** Replace a link table's rows for one parent with exactly `ids`. */
async function syncLinks(tb, token, field, parentId, ids) {
  const existing = await tb.listAll(field.link, { token, filter: { [field.field]: parentId } });
  const wanted = new Set(ids);
  const current = new Map(existing.map((row) => [relId(row[field.other]), row.id]));
  for (const [otherId, linkId] of current) {
    if (!wanted.has(otherId)) await tb.remove(field.link, linkId, token);
  }
  for (const otherId of wanted) {
    if (current.has(otherId)) continue;
    await tb.create(field.link, { [field.field]: toUuid(parentId), [field.other]: toUuid(otherId) }, token);
  }
}

/** One text value per defined column, so the template only prints. */
function displayRows(entity, rows, refs, links) {
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
        // Follow the row's FK column (`via`) into its ref list (`viaSource`) and read the FK
        // on that record (`viaKey`) — e.g. a party's section through its area. Checked before
        // `resolve` because such a column carries both.
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
function formFields(entity, row, options, links) {
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
    // multi (link table)
    const current = new Set(links[field.name]?.[row?.id] ?? []);
    return {
      ...base,
      type: "select",
      multiple: true,
      options: (options[field.source] ?? []).map((o) => ({ ...o, selected: current.has(o.value) })),
    };
  });
}

export function managementRoutes({ config, render, reports, tb }) {
  const router = express.Router();
  const shell = (req, active, title) => ({
    appName: config.appName,
    render,
    user: { email: req.session?.email, name: req.session?.name },
    active,
    title,
  });

  /** Load the link tables an entity needs, keyed field-name -> parentId -> [otherId]. */
  async function loadLinks(entity, token) {
    const out = {};
    for (const field of entity.fields) {
      if (field.type !== "multi") continue;
      const rows = await tb.listAll(field.link, { token });
      const map = {};
      for (const row of rows) {
        const parent = relId(row[field.field]);
        if (!map[parent]) map[parent] = [];
        map[parent].push(relId(row[field.other]));
      }
      out[field.name] = map;
    }
    return out;
  }

  router.get("/management", requireAuth, (req, res) => {
    res.send(
      page(shell(req, "management", "Management"), "management/index.html", {
        entities: ENTITY_ORDER.map((key) => ({ key, ...ENTITIES[key] })),
      })
    );
  });

  router.get(
    "/management/:entity",
    requireAuth,
    ah(async (req, res) => {
      const entity = ENTITIES[req.params.entity];
      if (!entity) return res.status(404).send("Unknown entity");
      const { views } = await reports.getViews(req.token);
      const options = optionLists(views.refs);
      const all = normalizeRows(entity.api, await tb.listAll(entity.api, { token: req.token, order: entity.sort }));
      const visible = all.filter((row) => !entity.softDelete || !row.deleted);
      const links = await loadLinks(entity, req.token);
      const editId = qs(req.query.edit);
      const editRow = editId ? all.find((r) => r.id === editId) ?? null : null;

      res.send(
        page(shell(req, "management", entity.label), "management/list.html", {
          entity,
          entityKey: req.params.entity,
          columns: entity.columns,
          rows: displayRows(entity, visible, views.refs, links),
          fields: formFields(entity, editRow, options, links),
          editRow,
          status: qs(req.query.status),
          message: qs(req.query.message),
        })
      );
    })
  );

  async function write(req, res, { id }) {
    const entity = ENTITIES[req.params.entity];
    if (!entity) return res.status(404).send("Unknown entity");
    let recordId = id;
    const body = buildBody(entity, req.body);
    if (id) await tb.update(entity.api, id, body, req.token);
    else recordId = await tb.create(entity.api, body, req.token);
    for (const field of entity.fields) {
      if (field.type !== "multi") continue;
      await syncLinks(tb, req.token, field, recordId, multiValues(req.body, field.name));
    }
    reports.invalidate();
    res.redirect(`/management/${req.params.entity}?status=ok&message=${id ? "Updated" : "Created"}`);
  }

  router.post(
    "/management/:entity/create",
    requireAuth,
    ah((req, res) => write(req, res, { id: null }))
  );

  router.post(
    "/management/:entity/:id/update",
    requireAuth,
    ah((req, res) => write(req, res, { id: req.params.id }))
  );

  router.post(
    "/management/:entity/:id/delete",
    requireAuth,
    ah(async (req, res) => {
      const entity = ENTITIES[req.params.entity];
      if (!entity) return res.status(404).send("Unknown entity");
      if (entity.softDelete) await tb.update(entity.api, req.params.id, { deleted: 1 }, req.token);
      else await tb.remove(entity.api, req.params.id, req.token);
      reports.invalidate();
      res.redirect(`/management/${req.params.entity}?status=ok&message=Deleted`);
    })
  );

  return router;
}
