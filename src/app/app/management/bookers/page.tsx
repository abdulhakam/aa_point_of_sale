"use client";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Button, Group, Modal, TextInput } from "@mantine/core";
import FormGenerator from "@/app/components/FormGenerator";
import { useDisclosure } from "@mantine/hooks";
import { orderBookerFormStructure } from "@/app/api/order_bookers";
import useCRUD from "@/app/api/useAPI";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "name", sortable: true },
  { accessor: "phone", sortable: true },
  { accessor: "created", sortable: true },
];

export default function OrderBookers() {
  const [opened, { open, close }] = useDisclosure(false);
  const [search, setSearch] = useState("");
  const order_bookers = useCRUD().fullList({collection:'order_bookers'})
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
        <FormGenerator editable formStructure={orderBookerFormStructure} />
      </Modal>
        <Button onClick={open}> Add New </Button>
      </Group>
      {order_bookers.isLoading && <h1>Loading...</h1>}
      {order_bookers.status==='error' && <h2>{order_bookers.error.message}</h2>}
      {order_bookers.status==='success' && (
        <DataViewTable
          filter={[{ key: "", value: search }]}
          columns={tableStructure}
          formStructure={orderBookerFormStructure}
          data={order_bookers.data}
        />
      )}
    </>
  );
}
