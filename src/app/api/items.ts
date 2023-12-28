import { useQuery } from "@tanstack/react-query";
import pb from "../pocketbase";
import { FormStructure, Item } from "./types";
import { createRecord, deleteRecord, updateRecord } from "./unifiedAPI";

export const itemFormStructure: FormStructure<Item> = {
  fields: {
    created: { type: "datetime", default: undefined, baseProps: { label: "Created" } },
    updated: { type: "datetime", default: undefined, baseProps: { label: "Updated" } },
    id: { type: "autocomplete", default: undefined, baseProps: { label: "id", data: [] } },
    name: { type: "text", default: "", baseProps: { label: "Name" } },
    cost_price: { type: "number", default: 0, baseProps: { label: "CP" } },
    sale_price: { type: "number", default: 0, baseProps: { label: "SP" } },
    box_size_qty: { type: "number", default: 1, baseProps: { label: "Box Size" } },
    qty: { type: "number", default: 0, baseProps: { label: "Qty" } },
    category: { type: "select", default: "", baseProps: { label: "Category", searchable: true, data: [] } },
  },
  onCreate: (data) => {},
  onUpdate: (data) => {},
  onDelete: (data) => {},
};
