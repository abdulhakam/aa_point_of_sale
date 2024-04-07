import { useQuery } from "@tanstack/react-query";
import pb from "../pocketbase";
import { FormStructure, Invoices } from "./types";



export async function getInvoice(invNo) {
  return await pb.collection("invoices").getOne(invNo);
}

export async function listAllInvoices() {
  return await pb.collection("invoice_view").getFullList({
    sort: "-created",
    expand: "party,transactions",
  });
}
export function useInvoices() {
  const invoices = useQuery({ queryKey: ["invoices"], queryFn: listAllInvoices });
  const allInvoices = invoices?.data;
  const purchaseInvoices = allInvoices?.filter((invoice) => invoice.type === "purchase");
  const saleInvoices = allInvoices?.filter((invoice) => invoice.type === "sale");
  return {
    allInvoices,
    purchaseInvoices,
    saleInvoices,
    isLoading: invoices.isLoading,
    status: invoices.status,
    error: invoices.error,
  };
}

export async function createInvoice(data) {
  const ndata = {
    invoice_maker: data.id,
    party: data.party,
    type: "purchase",
    transactions: ["RELATION_RECORD_ID"],
    total: 123,
    discount_1: 123,
    discount_2: 123,
    total_after_discount: 123,
    description: "test",
    deleted: true,
  };

  return await pb.collection("invoices").create(data);
}

export async function updateInvoice(data) {
  const ndata = {
    invoice_maker: data.invoice_maker,
    party: data.party,
    type: data.type,
    transactions: data.transactions,
    total: data.total,
    discount_1: data.discount_1,
    discount_2: data.discount_2,
    total_after_discount: data.total_after_discount,
    description: data.description,
    deleted: false,
  };

  return await pb.collection("invoices").update(data.id, ndata);
}

export async function deleteInvoice(rid) {
  return await pb.collection("invoices").delete(rid);
}

export const invoiceFormStructure: FormStructure<any> = {
  fields: {
    created: { type: "datetime", baseProps: { label: "Created", readOnly: true, variant: "unstyled" } },
    updated: { type: "datetime", baseProps: { label: "Updated", readOnly: true, variant: "unstyled" } },
    id: { type: "autocomplete", baseProps: { label: "id", readOnly: true, variant: "unstyled" } },
    invoice_maker: { type: "text", baseProps: { label: "User", readOnly: true, variant: "unstyled" } },
    party: { type: "select", baseProps: { label: "Party", searchable: true, data: [] } },
    type: { type: "select", baseProps: { label: "type", searchable: true, data: ["purchase", "sale"] } },
    transactions: { type: "select", baseProps: { label: "Transactions", data: [] } },
    total: { type: "number", baseProps: { label: "Total", readOnly: true } },
    discount_1: { type: "number", baseProps: { label: "Discount_1" } },
    discount_2: { type: "number", baseProps: { label: "Discount_2" } },
    total_after_discount: { type: "number", baseProps: { label: "Total After Discount", readOnly: true } },
    description: { type: "text", baseProps: { label: "User", readOnly: true } },
    deleted: { type: "switch", baseProps: { label: "DELETED", disabled: true } },
  },
  collectionName: "invoices",
  onCreate: (data) => {
    createInvoice(data);
  },
  onUpdate: updateInvoice,
  onDelete: (data) => deleteInvoice(data.id),
};

export const invoiceCreateForm = {
  fields: {
    id: { type: "number", hidden: true, baseProps: { label: "id", readOnly: true, variant: "unstyled" } },
    invoiceNo: { type: "number", baseProps: { label: "INVOICE NO", readOnly: true, variant: "unstyled" } },
    booker: {
      type: "select",
      baseProps: {
        label: "BOOKER",
        searchable: true,
        data: [],
        dataQuery: { collectionName: "order_bookers" },
      },
    },
    invoice_maker: {
      type: "text",
      default: pb.authStore.model?.id,
      hidden: true,
      baseProps: {
        label: "INVOICE MAKER",
      },
    },
    party: {
      type: "select",
      baseProps: { label: "Party", searchable: true, data: [], },
    },
    type: {
      type: "select",
      hidden: true,
      baseProps: { label: "type", searchable: true, data: ["purchase", "sale"] },
    },
    duedate: { type: "datetime", baseProps: { label: "DUE DATE" } },
    deleted: {
      type: "switch",
      hidden: true,
      default: false,
      baseProps: { label: "DELETED", disabled: true },
    },
  },
  collectionName: "invoices",
};
