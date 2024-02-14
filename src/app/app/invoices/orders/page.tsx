"use client";

import useCRUD from "@/app/api/useAPI";
import DataViewTable from "@/app/components/DataViewTable";

const columns = [
  { accessor: "type" },
  { accessor: "invoiceNo", width:'4.5rem' },
  { accessor: "booker" },
  { accessor: "invoice_maker" },
  { accessor: "party" },
  { accessor: "total" },
  { accessor: "discount_1" },
  { accessor: "discount_2" },
  { accessor: "final_total" },
  { accessor: "duedate", render: (record) => record.duedate.slice(0, 10) },
  { accessor: "description" },
  { accessor: "created", sortable: true, render: (record) => record.created.slice(0, 10) },
  { accessor: "completed", width:'5rem', render: (record) => (record.completed ? "O" : "X") },
];
export default function InvoiceOrders() {
  const invoices = useCRUD().fullList({ collection: "invoice_view", expand: "booker,invoice_maker,party" });
  return (
    <>
    <h2>ALL INCOMPLETE ORDERS</h2>
      <DataViewTable
        fz={"xs"}
        horizontalSpacing={'0.2rem'}
        verticalSpacing={0}
        rowStyle={({completed})=> completed?null:{color:'red'}}
        report
        data={invoices.data}
        columns={columns}
      />
    </>
  );
}
