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

export default function Transactions(props) {
  const [opened, { open, close }] = useDisclosure(false);
  const transactions = useTransactions();
  return (
    <>
      <Group align='end'>
        <Modal size={"auto"} opened={opened} onClose={close} title='Add'>
          <FormGenerator
            editable
            formStructure={{
              ...transactionFormStructure,
              fields: {
                ...transactionFormStructure.fields,
                invoice: { ...transactionFormStructure.fields.invoice, default: props.invoice },
              },
            }}
          />
        </Modal>
        <Button onClick={open}> Add New </Button>
      </Group>
      {transactions.isLoading && <h1>Loading...</h1>}
      {transactions.status === "error" && <h2>{transactions.error.message}</h2>}
      {transactions.status === "success" && (
        <DataViewTable
          filter={[{ key: "invoice", value: props.invoice || "pos000000000001" }]}
          columns={tableStructure}
          formStructure={transactionFormStructure}
          data={transactions.data}
        />
      )}
    </>
  );
}
