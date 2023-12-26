"use client";

import { invoiceFormStructure, useInvoices } from "../../../api/invoices";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import { useEffect, useState } from "react";
import { Button, Group, Modal, TextInput } from "@mantine/core";
import FormGenerator from "@/app/components/FormGenerator";
import { useDisclosure } from "@mantine/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { RecordModel } from "pocketbase";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: false },
  { accessor: "invoice_maker", sortable: true },
  { accessor: "party", sortable: true },
  { accessor: "type", sortable: true },
  { accessor: "transactions", sortable: true },
  { accessor: "total", sortable: true },
  { accessor: "discount_1", sortable: true },
  { accessor: "discount_2", sortable: true },
  { accessor: "total_after_discount", sortable: true },
  { accessor: "description", sortable: true },
];

export default function Invoices() {
  const [opened, { open, close }] = useDisclosure(false);
  const users = useQueryClient().getQueryData(["users"]) as RecordModel[];
  const formStructure = { ...invoiceFormStructure };
  const [search, setSearch] = useState("");
  const invoices = useInvoices();

  if (invoices.isLoading) {
    return <h1>Loading...</h1>;
  }
  if (invoices.status === "error") {
    return <h2>{invoices.error.message}</h2>;
  }
  if (users !==undefined && invoices.status === "success")
    return (
      <>
        <Group align='end'>
          <TextInput
            style={{ width: "10rem" }}
            label='Search'
            onChange={(value) => setSearch(value.target.value)}
            value={search}
          />
          <Modal centered size={"auto"} opened={opened} onClose={close} title='Authentication'>
            <FormGenerator close={close} editable formStructure={invoiceFormStructure} />
          </Modal>
          <Button onClick={open}> Add New </Button>
        </Group>
        <DataViewTable
          filter={[{ key: "", value: search }]}
          columns={tableStructure}
          formStructure={invoiceFormStructure}
          data={invoices.allInvoices.map((invoice) => ({
            ...invoice,
            invoice_maker: users.find((user) => user.id === invoice.invoice_maker).name,
          }))}
        />
      </>
    );
}
