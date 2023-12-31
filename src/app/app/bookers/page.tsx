"use client";
import { useAreas } from "@/app/api/areas";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Button, Group, Modal, TextInput } from "@mantine/core";
import FormGenerator from "@/app/components/FormGenerator";
import { useDisclosure } from "@mantine/hooks";
import useCRUD from "@/app/api/useAPI";
import { orderBookerFormStructure } from "@/app/api/order_bookers";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "name", sortable: true },
  { accessor: "phone"},
  { accessor: "created", hidden: true },
];

export default function Areas() {
  const [opened, { open, close }] = useDisclosure(false);
  const [search, setSearch] = useState("");
  const areas = useCRUD().fullList({collection:'order_bookers'})
  return (
    <>
      <Group align='end'>
        <TextInput
          style={{ width: "10rem" }}
          label='Search'
          onChange={(value) => setSearch(value.target.value)}
          value={search}
        />
        <Modal opened={opened} onClose={close} title='Create'>
          <FormGenerator formstructure={orderBookerFormStructure} editable />
        </Modal>
        <Button onClick={open}> Add New </Button>
      </Group>
      {areas.isLoading && <h1>Loading...</h1>}
      {areas.isError && <h2>{areas.error.message}</h2>}
      {areas.isSuccess && (
        <DataViewTable
          formstructure={orderBookerFormStructure}
          filter={[{ key: "", value: search }]}
          columns={tableStructure}
          data={areas.data}
        />
      )}
    </>
  );
}
