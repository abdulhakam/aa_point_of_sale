import { useQuery } from "@tanstack/react-query";
import pb from "../pocketbase";
export async function listAllInvoices() {
  return await pb.collection("invoices").getFullList({
    sort: "-created",
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
    status:invoices.status,
    error:invoices.error,
  };
}
