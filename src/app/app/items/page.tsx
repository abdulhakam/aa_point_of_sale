"use client";

import { itemFormStructure } from "../../api/items";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import {  useState } from "react";
import { Button, Group, Modal, TextInput } from "@mantine/core";
import FormGenerator from "@/app/components/FormGenerator";
import { useDisclosure } from "@mantine/hooks";
import {  useQuery, useQueryClient } from "@tanstack/react-query";
import { RecordModel } from "pocketbase";
import useCRUD from "@/app/api/unifiedAPI";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "name", sortable: true },
  { accessor: "cost_price"},
  { accessor: "sale_price"},
  { accessor: "qty", sortable: true },
  { accessor: "box_size_qty", sortable: true },
  { accessor: "category", sortable: true },
];

export default function Items() {
  const [opened, { open, close }] = useDisclosure(false);
  const categories = useQueryClient().getQueryData(["categories"]) as RecordModel[];
  const formStructure = { ...itemFormStructure,queryKey:'items' };
  console.log(categories)
  formStructure.fields.category.baseProps.data = categories?.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));
  const [search, setSearch] = useState("");
  const items = useCRUD().fullList({collection:'items',expand:'category'})
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
          <FormGenerator close={close} editable formStructure={itemFormStructure} />
        </Modal>
        <Button onClick={open}> Add New </Button>
      </Group>
      {items.isLoading && <h1>Loading...</h1>}
      {items.isError && <h2>{items.error.message}</h2>}
      {items.isSuccess && (
        <DataViewTable
          filter={[{ key: "", value: search }]}
          columns={tableStructure}
          formStructure={itemFormStructure}
          data={items.data}
        />
      )}
    </>
  );
}
