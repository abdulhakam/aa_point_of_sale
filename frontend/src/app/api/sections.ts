export const sectionCreateForm = {
  fields: {
    id: { type: "text", hidden:true, baseProps: { label: "ID",disabled:true } },
    name: { type: "text", baseProps: { label: "Name" } },
    deleted: { type: "switch", default: false, baseProps: { label: "DELETED", disabled: true } },
  },
  collectionName: "sections",
};
