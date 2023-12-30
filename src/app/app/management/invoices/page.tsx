"use client";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import {  TextInput } from "@mantine/core";
import { invoiceFormStructure } from "@/app/api/invoices";
import useCRUD from "@/app/api/useAPI";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: false },
  { accessor: "invoice_maker", sortable: true },
  { accessor: "party", sortable: true },
  { accessor: "type", sortable: true },
  { accessor: "total", sortable: true },
  { accessor: "discount_1", sortable: true },
  { accessor: "discount_2", sortable: true },
  { accessor: "final_total", sortable: true },
  { accessor: "description", sortable: true },
];

export default function Invoices() {
  const [search, setSearch] = useState("");
  const invoices = useCRUD().fullList({ collection: "invoice_view", expand: "party,invoice_maker" });
  return (
    <>
        <TextInput
          style={{ width: "10rem" }}
          label='Search'
          onChange={(value) => setSearch(value.target.value)}
          value={search}
        />
      {invoices.isLoading && <h1>Loading...</h1>}
      {invoices.status === "error" && <h2>{invoices.error.message}</h2>}
      {invoices.status === "success" && (
        <DataViewTable
        report
          filter={[{ key: "", value: search }]}
          columns={tableStructure}
          formStructure={invoiceFormStructure}
          data={invoices.data}
        />
      )}
    </>
  );
}
