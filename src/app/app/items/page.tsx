"use client";

import { itemsFormStructure, useItems } from "../../api/items";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import {  useState } from "react";
import { Button, Group, Modal, TextInput } from "@mantine/core";
import FormGenerator from "@/app/components/FormGenerator";
import { useDisclosure } from "@mantine/hooks";
import {  useQueryClient } from "@tanstack/react-query";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "name", sortable: true },
  { accessor: "cost_price", sortable: true },
  { accessor: "sale_price", sortable: true },
  { accessor: "qty", sortable: true },
  { accessor: "box_size_qty", sortable: true },
  { accessor: "category", sortable: true },
];

export default function Items() {
  const [opened, { open, close }] = useDisclosure(false);
  const categories = useQueryClient().getQueryData(["categories"]) as [];
  const formStructure = { ...itemsFormStructure };
  const qty = useQueryClient().getQueryData(["items_qty"]);
  formStructure.fields.category.baseProps.data = categories?.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));
  const [search, setSearch] = useState("");
  const items = useItems();

  return (
    <>
      <Group align='end'>
        <TextInput
          style={{ width: "10rem" }}
          label='Search'
          onChange={(value) => setSearch(value.target.value)}
          value={search}
        />
        <Modal centered size={'auto'} opened={opened} onClose={close} title='Authentication'>
          <FormGenerator close={close} editable formStructure={itemsFormStructure} />
        </Modal>
        <Button onClick={open}> Add New </Button>
      </Group>
      {items.isLoading && <h1>Loading...</h1>}
      {items.isError && <h2>{items.error.message}</h2>}
      {items.isSuccess && (
        <DataViewTable
          filter={[{ key: "", value: search }]}
          columns={tableStructure}
          formStructure={itemsFormStructure}
          data={items.data}
        />
      )}
    </>
  );
}