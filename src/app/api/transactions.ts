import { useQuery } from "@tanstack/react-query";
import pb from "../pocketbase";
import { FormStructure, Transactions } from "./types";
export const allTransactions = async () =>
  await pb.collection("transaction_view").getFullList({
    sort: "-created",expand:'item'
  });

export function useTransactions() {
  const { data, status, isLoading, error } = useQuery({
    queryKey: ["transactions"],
    queryFn: allTransactions,
  });
  return { data: data, status: status, isLoading: isLoading, error: error };
}

export async function createTransaction(data) {
  const ndata = {
    invoice: data.invoice,
    item: data.item,
    price: data.price,
    qty: data.qty,
    discount_1: data.discount_1,
    discount_2: data.discount_2,
    deleted: false,
  };

  return await pb.collection("transactions").create(ndata);
}

export async function updateTransaction(data) {
  const ndata = {
    invoice: data.invoice,
    item: data.item,
    price: data.price,
    qty: data.qty,
    discount_1: data.discount_1,
    discount_2: data.discount_2,
    deleted: false,
  };

  const record = await pb.collection("transactions").update(data.id, ndata);
}

export async function deleteTransaction(rid) {
  return await pb.collection("transactions").delete(rid);
}

export const transactionFormStructure: FormStructure<any> = {
  fields: {
    created: { type: "datetime", hidden:true, baseProps: { label: "Created", readOnly: true, variant: "unstyled" } },
    updated: { type: "datetime", hidden:true, baseProps: { label: "Updated", readOnly: true, variant: "unstyled" } },
    id: { type: "autocomplete", hidden:true, baseProps: { label: "id", readOnly: true, variant: "unstyled" } },
    invoice: { type: "text", baseProps: { label: "Invoice" } },
    item: { type: "select", baseProps: { label: "Item", data: [] } },
    price: { type: "number", baseProps: { label: "price" } },
    qty: { type: "number", baseProps: { label: "qty" } },
    scheme: { type: "number", baseProps: { label: "scheme" } },
    discount_1: { type: "number", baseProps: { label: "discount_1" } },
    discount_2: { type: "number", baseProps: { label: "discount_2" } },
    total: { type: "number", baseProps: { label: "Total", readOnly: true } },
    deleted: { type: "switch", baseProps: { label: "DELETED", disabled: true } },
  },
  collectionName:'transactions',
  onCreate: (data) => {
    createTransaction(data);
  },
  onUpdate: updateTransaction,
  onDelete: (data) => deleteTransaction(data.id),
};
