import { useQuery } from "@tanstack/react-query";
import pb from "../pocketbase";
import { FormStructure, Item } from "./types";

export async function createItem(data) {
  return await pb.collection("items").create(data);
}
export async function viewItem(data, expandFields) {
  await pb.collection("items").getOne(data.id, {
    expand: expandFields,
  });
}
export async function listItems() {
  return await pb.collection("items").getFullList({
    sort: "+name",
    expand: "qty,category",
  });
}
export async function searchItem(page = 1, resultsPerPage = 50, filter = "") {
  await pb.collection("items").getList(page, resultsPerPage, {
    filter: filter,
  });
}
export async function updateItem(data) {
  const newData = {
    name: data.name,
    cost_price: data.cost_price,
    sale_price: data.sale_price,
    box_size_qty: data.box_size_qty,
    qty: data.qty,
    category: data.category,
  };
  await pb.collection("items").update(data.id, newData);
}
export async function deleteItem(data) {
  return await pb.collection("items").delete(data.id);
}

export function useItems() {
  return useQuery({ queryKey: ["items"], queryFn: listItems });
}

export const itemsFormStructure: FormStructure<Item> = {
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
  onCreate: (data) => createItem(data),
  onUpdate: (data) => updateItem(data),
  onDelete: (data) => {
    updateItem({ ...data, deleted: true });
  },
};
