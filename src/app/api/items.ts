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
    qty: { type: "number", default: 0,hidden:true, baseProps: { label: "Qty" } },
    category: { type: "select", default: "", baseProps: { label: "Company", searchable: true, data: [] } },
  },
  collectionName: "items",
  collectionView: "items",
  onCreate: (data) => {
    pb.collection("items").create(data);
  },
  onUpdate: (data) => {
    pb.collection("items").update(data.id, data);
  },
  onDelete: (data) => {
    pb.collection("items").delete(data.id);
  },
};

export const itemCreateForm = {
  fields: {
    name: { type: "text", default: "", baseProps: { label: "Name" } },
    cost_price: { type: "number", default: 0, baseProps: { label: "CP" } },
    sale_price: { type: "number", default: 0, baseProps: { label: "SP" } },
    box_size_qty: { type: "number", default: 1, baseProps: { label: "Box Size" } },
    category: {
      type: "select",
      default: "",
      baseProps: {
        label: "Company",
        searchable: true,
        data: [],
        dataQueryValue: "id",
        dataQuery: { collectionName: "categories" },
      },
    },
  },
  collectionName: "items",
};
