"use client";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Button, Group, Modal, TextInput } from "@mantine/core";
import FormGenerator from "@/app/components/FormGenerator";
import { useDisclosure } from "@mantine/hooks";
import { invoiceFormStructure } from "@/app/api/invoices";
import useCRUD from "@/app/api/useAPI";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
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
  const [opened, { open, close }] = useDisclosure(false);
  const [search, setSearch] = useState("");
  const invoices = useCRUD().fullList({collection:'invoice_view',expand:'party',})
  return (
    <>
      <Group align='end'>
        <TextInput
          style={{ width: "10rem" }}
          label='Search'
          onChange={(value) => setSearch(value.target.value)}
          value={search}
        />
        <Modal opened={opened} onClose={close} title="Create">
        <FormGenerator editable formStructure={invoiceFormStructure} />
      </Modal>
        <Button onClick={open}> Add New </Button>
      </Group>
      {invoices.isLoading && <h1>Loading...</h1>}
      {invoices.status==='error' && <h2>{invoices.error.message}</h2>}
      {invoices.status==='success' && (
        <DataViewTable
          filter={[{ key: "", value: search }]}
          columns={tableStructure}
          formStructure={invoiceFormStructure}
          data={invoices.data}
        />
      )}
    </>
  );
}
