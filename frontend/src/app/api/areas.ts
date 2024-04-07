import { useMutation, useQuery } from "@tanstack/react-query";
import pb from "../pocketbase";
import { FormStructure, Areas } from "./types";
import { sectionCreateForm } from "./sections";

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

export const areaFormStructure = {
  fields: {
    created: { type: "datetime", hidden:true, baseProps: { label: "Created", readOnly: true, variant: "unstyled" } },
    updated: { type: "datetime", hidden:true, baseProps: { label: "Updated", readOnly: true, variant: "unstyled" } },
    id: {
      type: "autocomplete",
      hidden: true,
      baseProps: { label: "id", readOnly: true, variant: "unstyled" },
    },
    name: { type: "text", baseProps: { label: "Name" } },
    section: {
      type: "select",
      withCreate: true,
      baseProps: {
        label: "Section",
        searchable: true,
        data: [],
        dataQueryValue: "id",
        dataQuery: { collectionName: "sections" },
      },
    },
    deleted: { type: "switch", baseProps: { label: "DELETED", disabled: true } },
  },
  collectionName: "areas",
  onCreate: (data) => pb.collection("areas").create(data),
  onUpdate: (data) => pb.collection("areas").update(data.id, data),
  onDelete: (data) => {
    pb.collection("areas").delete(data.id);
  },
};

export const areaCreateForm = {
  fields: {
    id: { type: "text", hidden: true, baseProps: { label: "ID" } },
    name: { type: "text", baseProps: { label: "Name" } },
    section: {
      type: "select",
      baseProps: {
        // key:"section-creator",
        // withCreate: true,
        // createForm: sectionCreateForm,
        label: "Section",
        searchable: true,
        data: [],
        dataQueryValue: "id",
        dataQuery: { collectionName: "sections" },
      },
    },
    deleted: { type: "switch", default: false, baseProps: { label: "DELETED", disabled: true } },
  },
  collectionName: "areas",
};
