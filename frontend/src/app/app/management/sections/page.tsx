"use client";
import { sectionCreateForm } from "@/app/api/sections";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import {  Group,  TextInput } from "@mantine/core";
import CreateRecord from "@/app/components/CreateRecord/CreateRecord";
import { IconMap } from "@tabler/icons-react";
import useCRUD from "@/app/api/useAPI";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", sortable: true },
  { accessor: "created", sortable: true },
];

export default function Areas() {
  const [search, setSearch] = useState("");
  const sections = useCRUD().fullList({ collection: "sections"});
  return (
    <>
      <Group align='end'>
        <TextInput
          style={{ width: "10rem" }}
          label='Search'
          onChange={(value) => setSearch(value.target.value)}
          value={search}
        />
        <CreateRecord formStructure={sectionCreateForm} icon={<IconMap />} label={"Create New Section"} />
      </Group>
      {sections.isLoading && <h1>Loading...</h1>}
      {sections.isError && <h2>{sections.error.message}</h2>}
      {sections.isSuccess && (
        <DataViewTable
          formstructure={sectionCreateForm}
          filter={[{ key: "", value: search }]}
          columns={tableStructure}
          data={sections.data}
        />
      )}
    </>
  );
}
