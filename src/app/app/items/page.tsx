"use client";

import { itemFormStructure } from "../../api/items";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Button, Group, Modal, TextInput } from "@mantine/core";
import FormGenerator from "@/app/components/FormGenerator";
import { useDisclosure } from "@mantine/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RecordModel } from "pocketbase";
import useCRUD from "@/app/api/useAPI";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "name", sortable: true },
  { accessor: "cost_price" },
  { accessor: "sale_price" },
  { accessor: "qty", sortable: true },
  { accessor: "box_size_qty", sortable: true },
  { accessor: "category", sortable: true },
];

export default function Items() {
  const [opened, { open, close }] = useDisclosure(false);
  const categories = useCRUD().fullList({collection:'categories'})
  const formStructure = { ...itemFormStructure,queryKey:'items' };
  formStructure.fields.category.baseProps.data = categories.data?.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }))
  const [search, setSearch] = useState("");
  const items = useCRUD().fullList({ collection: "items_report", expand: "category" });
  return (
    <>
      <Group align='end'>
        <TextInput
          style={{ width: "10rem" }}
          label='Search'
          onChange={(value) => setSearch(value.target.value)}
          value={search}
        />
        <Modal centered size={"auto"} opened={opened} onClose={close} title='Create New'>
          <FormGenerator close={close} editable formStructure={formStructure} />
        </Modal>
        <Button onClick={open}> Add New </Button>
      </Group>
      {items.isLoading && <h1>Loading...</h1>}
      {items.isError && <h2>{items.error.message}</h2>}
      {items.isSuccess && (
        <DataViewTable
          filter={[{ key: "", value: search }]}
          formstructure={formStructure}
          columns={tableStructure}
          data={items.data}
        />
      )}
    </>
  );
}
