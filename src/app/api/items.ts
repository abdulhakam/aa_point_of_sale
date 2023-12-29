import pb from "../pocketbase";
import { FormStructure, Item } from "./types";

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
  collectionName:'items',
  onCreate: (data) => {pb.collection('items').create(data)},
  onUpdate: (data) => {pb.collection('items').update(data.id,data)},
  onDelete: (data) => {pb.collection('items').delete(data.id)},
};
