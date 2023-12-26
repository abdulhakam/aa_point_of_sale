"use client";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Button, Group, Modal, TextInput } from "@mantine/core";
import FormGenerator from "@/app/components/FormGenerator";
import { useDisclosure } from "@mantine/hooks";
import { transactionFormStructure, useTransactions } from "@/app/api/transactions";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "invoice", sortable: true },
  { accessor: "item", sortable: true },
  { accessor: "qty", sortable: true },
  { accessor: "price", sortable: true },
  { accessor: "discount_1", sortable: true },
  { accessor: "discount_2", sortable: true },
  { accessor: "total", sortable: true },

];

export default function Transactions() {
  const [opened, { open, close }] = useDisclosure(false);
  const [search, setSearch] = useState("");
  const transactions = useTransactions()
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
        <FormGenerator editable formStructure={transactionFormStructure} />
      </Modal>
        <Button onClick={open}> Add New </Button>
      </Group>
      {transactions.isLoading && <h1>Loading...</h1>}
      {transactions.status==='error' && <h2>{transactions.error.message}</h2>}
      {transactions.status==='success' && (
        <DataViewTable
          filter={[{ key: "", value: search }]}
          columns={tableStructure}
          formStructure={transactionFormStructure}
          data={transactions.data}
        />
      )}
    </>
  );
}
