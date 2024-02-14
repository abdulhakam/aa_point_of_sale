"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/useAPI";
import DataViewTable from "@/app/components/DataViewTable";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const columns = [
  {
    accessor: "created",
    title: "Date",
    sortable: true,
    render: (row) => String(row.created).slice(0, 10),
  },
  {
    accessor: "type",
    sortable: true,
  },
  {
    accessor: "invoiceNo",
    title: "Invoice",
    sortable: true,
    render: (row) => <Link href={`/app/invoices/print?invoiceId=${row.invoice}`}>{row.invoiceNo}</Link>,
  },
  {
    accessor: "item",
    title: "Item",
    sortable: true,
  },
  { accessor: "price" },
  {
    accessor: "qty",
    title: "Qty",
    sortable: true,
  },
  {
    accessor: "scheme",
    title: "Free",
    sortable: true,
  },
  { accessor: "discount_1" },
  { accessor: "discount_2" },
  {
    accessor: "total",
    title: "Amount",
    sortable: true,
  },
];

export default function ItemTransactionsReport() {
  const searchParams = useSearchParams();
  const itemId = searchParams.get("itemID");
  const transactions = useCRUD().fullList({
    collection: "transaction_view",
    expand: "item",
    filter: itemId ? `item = '${itemId}'` : null,
  });
  const queries = [transactions];
  if (checkSuccess(queries)) {
    return (
      <>
        <h2>Item Transactions</h2>
        <DataViewTable report data={transactions.data} columns={columns} />
      </>
    );
  } else return <StatusCheck check={queries} />;
}
