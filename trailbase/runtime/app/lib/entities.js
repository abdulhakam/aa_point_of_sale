/**
 * Management-screen entity definitions: which TrailBase record API backs each
 * screen, which fields the form edits, and how list columns render.
 *
 * `deleted` is a soft-delete flag on most tables; the ones that lack the column
 * are hard-deleted instead (see `softDelete`).
 */

export const ENTITIES = {
  sections: {
    api: "sections",
    label: "Sections",
    singular: "Section",
    softDelete: false,
    sort: "+name",
    fields: [{ name: "name", label: "Name", type: "text", required: true }],
    columns: [{ key: "name", label: "Name" }],
  },
  areas: {
    api: "areas",
    label: "Areas",
    singular: "Area",
    softDelete: true,
    sort: "+name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "section", label: "Section", type: "relation", source: "sections" },
    ],
    columns: [
      { key: "name", label: "Name" },
      { key: "section", label: "Section", resolve: "sections" },
    ],
  },
  categories: {
    api: "categories",
    label: "Item Companies",
    singular: "Item Company",
    softDelete: true,
    sort: "+name",
    fields: [{ name: "name", label: "Name", type: "text", required: true }],
    columns: [{ key: "name", label: "Name" }],
  },
  companies: {
    api: "companies",
    label: "Companies",
    singular: "Company",
    softDelete: true,
    sort: "+name",
    fields: [{ name: "name", label: "Name", type: "text", required: true }],
    columns: [{ key: "name", label: "Name" }],
  },
  parties: {
    api: "parties",
    label: "Parties",
    singular: "Party",
    softDelete: true,
    sort: "+name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "type", label: "Type", type: "enum", source: "party_types" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "address", label: "Address", type: "text" },
      { name: "area", label: "Area", type: "relation", source: "areas" },
      { name: "company", label: "Companies", type: "multi", link: "party_companies", field: "party", other: "company", source: "companies" },
    ],
    columns: [
      { key: "name", label: "Name" },
      { key: "type", label: "Type", enumSource: "party_types" },
      { key: "area", label: "Area", resolve: "areas" },
      // `via` is the row's FK column, `viaSource` the ref list to look it up in, and
      // `viaKey` the FK column on that record — e.g. a party's section via its area.
      { key: "section", label: "Section", via: "area", viaSource: "areas", viaKey: "section", resolve: "sections" },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Address" },
    ],
  },
  bookers: {
    api: "order_bookers",
    label: "Order Bookers",
    singular: "Order Booker",
    softDelete: true,
    sort: "+name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "phone", label: "Phone", type: "text" },
      { name: "company", label: "Companies", type: "multi", link: "order_booker_companies", field: "order_booker", other: "company", source: "companies" },
    ],
    columns: [
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "company", label: "Companies", multi: true, resolve: "companies" },
    ],
  },
  items: {
    api: "items",
    label: "Items",
    singular: "Item",
    softDelete: false,
    sort: "+name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "category", label: "Company", type: "relation", source: "categories" },
      { name: "barcode", label: "Barcode", type: "text" },
      { name: "display_id", label: "Display ID", type: "text" },
      { name: "cost_price", label: "Cost Price", type: "number" },
      { name: "sale_price", label: "Sale Price", type: "number" },
      { name: "box_size_qty", label: "Carton Size", type: "number" },
    ],
    columns: [
      { key: "name", label: "Name" },
      { key: "category", label: "Company", resolve: "categories" },
      { key: "display_id", label: "Display ID" },
      { key: "barcode", label: "Barcode" },
      { key: "cost_price", label: "CP", align: "right" },
      { key: "sale_price", label: "SP", align: "right" },
      { key: "box_size_qty", label: "Carton Size", align: "right" },
    ],
  },
};

/** Natural display order in the management hub. */
export const ENTITY_ORDER = ["items", "parties", "bookers", "categories", "companies", "areas", "sections"];
