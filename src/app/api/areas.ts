import { useMutation, useQuery } from "@tanstack/react-query";
import pb from "../pocketbase";
import { FormStructure, Area } from "./types";

export function useAreas() {
  return useQuery({ queryKey: ["areas"], queryFn: listAreas });
}

export async function createArea(data) {
  return await pb.collection("areas").create(data);
}
export async function listAreas() {
  return await pb.collection("areas").getFullList({
    sort: "-created",
  });
}
export async function updateArea(data) {
  const rid = data.id;
  await pb.collection("areas").update(rid, data);
}
export async function deleteArea(data) {
  return await pb.collection("areas").delete(data.id);
}

export const areaFormStructure: FormStructure<Area> = {
  fields: {
    created: { type: "datetime", baseProps: { label: "Created", readOnly: true, variant: "unstyled" } },
    updated: { type: "datetime", baseProps: { label: "Updated", readOnly: true, variant: "unstyled" } },
    id: { type: "autocomplete", baseProps: { label: "id", readOnly: true, variant: "unstyled" } },
    name: { type: "text", baseProps: { label: "Name" } },
    deleted: { type: "switch", baseProps: { label: "DELETED", disabled: true } },
  },
  collectionName:'areas',
  onCreate: (data) => createArea(data),
  onUpdate: (data) => updateArea(data),
  onDelete: (data) => {
    updateArea({ ...data, deleted: true });
  },
};

export const exampleFormStructure = {
  fields: {
    id: { type: "autocomplete", default: undefined, baseProps: { label: "id", data: [] } },
    created: { type: "datetime", default: undefined, baseProps: { label: "Created" } },
    name: { type: "text", default: "", baseProps: { label: "Name" } },
    updated: { type: "datetime", default: undefined, baseProps: { label: "Updated" } },
    isActive: { type: "checkbox", default: false, baseProps: { label: "Is Active" } },
    role: {
      type: "select",
      default: "Guest",
      baseProps: { label: "Role", data: ["Admin", "User", "Guest"] },
    },
    isSwitch: { type: "switch", default: true, baseProps: { label: "A big Switch" } },
  },
  onCreate: (data) => createArea(data),
  onUpdate: (data) => updateArea(data),
  onDelete: (data) => {
    updateArea({ ...data, deleted: true });
  },
};
