import pb from "../pocketbase";
import { FormStructure, Payment } from "./types";
import { crud } from "./useAPI";

export const paymentFormStructure: FormStructure<Payment> = {
  fields: {
    id: { type: "autocomplete", default: undefined, baseProps: { label: "id", data: [] } },
    created: { type: "datetime", default: undefined, baseProps: { disabled: true, label: "Created" } },
    updated: { type: "datetime", default: undefined, baseProps: { disabled: true, label: "Updated" } },
    invoice: { type: "select", default: undefined, baseProps: { label: "Invoice", data: [],searchable:true } },
    party: { type: "select", default: undefined, baseProps: { label: "Party", data: [] } },
    type: {
      type: "select",
      default: undefined,
      baseProps: { label: "type", data: ["sending", "recieving"] },
    },
    amount: { type: "number", default: undefined, baseProps: { label: "amount" } },
    paid: { type: "checkbox", default: false, baseProps: { label: "Paid" } },
    description: { type: "text", default: undefined, baseProps: { label: "description" } },
    deleted: { type: "checkbox", default: false, baseProps: { label: "Deleted" } },
  },
  collectionName: "payments",
  onCreate: (data) => crud.create({ collection: "payments", data }),
  onUpdate: (data) => crud.update({ collection: "payments", recordID: data.id, data }),
  onDelete: (data) => crud.remove({ collection: "payments", recordID: data.id || data }),
};
