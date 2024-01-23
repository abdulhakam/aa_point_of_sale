"use client";
import { areaCreateForm, useAreas } from "@/app/api/areas";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Button, Group, Modal, TextInput } from "@mantine/core";
import { areaFormStructure } from "@/app/api/areas";
import FormGenerator from "@/app/components/FormGenerator";
import { useDisclosure } from "@mantine/hooks";
import CreateRecord from "@/app/components/CreateRecord/CreateRecord";
import { IconMap } from "@tabler/icons-react";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "name", sortable: true },
  { accessor: "created", sortable: true },
];

export default function Areas() {
  const [opened, { open, close }] = useDisclosure(false);
  const [search, setSearch] = useState("");
  const areas = useAreas();
  return (
    <>
      <Group align='end'>
        <TextInput
          style={{ width: "10rem" }}
          label='Search'
          onChange={(value) => setSearch(value.target.value)}
          value={search}
        />

        <CreateRecord formStructure={areaCreateForm} icon={<IconMap />} label={"Create New Area"} />
      </Group>
      {areas.isLoading && <h1>Loading...</h1>}
      {areas.isError && <h2>{areas.error.message}</h2>}
      {areas.isSuccess && (
        <DataViewTable
          formstructure={areaFormStructure}
          filter={[{ key: "", value: search }]}
          columns={tableStructure}
          data={areas.data}
        />
      )}
    </>
  );
}
