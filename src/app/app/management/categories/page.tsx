"use client";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Button, Group, Modal, TextInput } from "@mantine/core";
import FormGenerator from "@/app/components/FormGenerator";
import { useDisclosure } from "@mantine/hooks";
import { categoryFormStructure, listCategories } from "@/app/api/categories";
import { useQuery } from "@tanstack/react-query";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "name", sortable: true },
  { accessor: "created", sortable: true },
];

export default function Categories() {
  const [opened, { open, close }] = useDisclosure(false);
  const [search, setSearch] = useState("");
  const categories = useQuery({queryKey:['categories'],queryFn:listCategories})
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
        <FormGenerator editable formStructure={categoryFormStructure} />
      </Modal>
        <Button onClick={open}> Add New </Button>
      </Group>
      {categories.isLoading && <h1>Loading...</h1>}
      {categories.isError && <h2>{categories.error.message}</h2>}
      {categories.isSuccess && (
        <DataViewTable
          filter={[{ key: "", value: search }]}
          columns={tableStructure}
          formstructure={categoryFormStructure}
          data={categories.data}
        />
      )}
    </>
  );
}
