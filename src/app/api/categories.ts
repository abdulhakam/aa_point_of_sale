import pb from "../pocketbase";
import { Category, FormStructure } from "./types";

export async function createCategory(data) {
  return await pb.collection("categories").create(data);
}

export async function listCategories() {
  return await pb.collection("categories").getFullList({
    sort: "+name"
  });
}
export async function updateCategory(data) {
  const newData = {name:data.name,phone:data.phone,address:data.address,area:data.area}
  await pb.collection('categories').update(data.id, newData)
}
export async function deleteCategory(data) {
  return await pb.collection('categories').delete(data.id);
}

export const categoryFormStructure: FormStructure<Category> = {
  fields: {
    created: { type: "datetime", baseProps: { label: "Created", readOnly: true, variant: "unstyled" } },
    updated: { type: "datetime", baseProps: { label: "Updated", readOnly: true, variant: "unstyled" } },
    id: { type: "autocomplete", baseProps: { label: "id", readOnly: true, variant: "unstyled" } },
    name: { type: "text", baseProps: { label: "Name" } },
    deleted: { type: "switch", baseProps: { label: "DELETED", disabled: true } },
  },
  collectionName:'categories',
  onCreate: (data) => createCategory(data),
  onUpdate: (data) => updateCategory(data),
  onDelete: (data) => {
    updateCategory({ ...data, deleted: true });
  },
};