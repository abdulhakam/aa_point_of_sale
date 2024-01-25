// TODO: turn this into expense CreateForm which has description, amount, id, created, updated fields
export const expenseCreateForm = {
  fields: {
    id: { type: "text", baseProps: { label: "ID" } },
    description: { type: "text", baseProps: { label: "Description" } },
    amount: { type: "number", baseProps: { label: "Amount" } },
  },
  collectionName: "expenses",
};