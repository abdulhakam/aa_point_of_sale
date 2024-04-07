
export const expenseCreateForm = {
  fields: {
    id: { type: "text",hidden:true, baseProps: { label: "ID" } },
    name: { type: "text",hidden:true, baseProps: { label: "Name" } },
    description: { type: "text", baseProps: { label: "Description" } },
    amount: { type: "number", baseProps: { label: "Amount" } },
  },
  collectionName: "expenses",
};