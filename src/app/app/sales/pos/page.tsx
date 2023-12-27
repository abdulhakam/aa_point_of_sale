"use client";

import { invoiceFormStructure, useInvoices } from "../../../api/invoices";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Button, Group, Modal, TextInput } from "@mantine/core";
import FormGenerator from "@/app/components/FormGenerator";
import { useDisclosure } from "@mantine/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { RecordModel } from "pocketbase";
import InvoiceMakerForm from "./InvoiceForm";
import { useParties } from "@/app/api/parties";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "name", sortable: true },
  { accessor: "cost_price", sortable: true },
  { accessor: "sale_price", sortable: true },
  { accessor: "qty", sortable: true },
  { accessor: "box_size_qty", sortable: true },
  { accessor: "category", sortable: true },
];

export default function Invoices() {
  // const [opened, { open, close }] = useDisclosure(false);
  const users = useQueryClient().getQueryData(["users"]) as RecordModel[];
  const parties = useParties()
  const invoices = useInvoices();

  if (invoices.isLoading) {
    return <h1>Loading...</h1>;
  }
  if (invoices.status === "error") {
    return <h2>{invoices.error.message}</h2>;
  }
  if (users !== undefined && invoices.status === "success")
    return (
      <>
        <InvoiceMakerForm />
      </>
    );
}
