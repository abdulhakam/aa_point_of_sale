"use client";
import { areaCreateForm } from "@/app/api/areas";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import {  Group,  TextInput } from "@mantine/core";
import { areaFormStructure } from "@/app/api/areas";
import CreateRecord from "@/app/components/CreateRecord/CreateRecord";
import { IconMap } from "@tabler/icons-react";
import useCRUD from "@/app/api/useAPI";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", sortable: true },
  { accessor: "section", title:"Section", sortable: true, render:(record)=>(record?.expand?.section?.name) },
  { accessor: "created", sortable: true },
];

export default function Areas() {
  const [search, setSearch] = useState("");
  const areas = useCRUD().fullList({ collection: "areas",expand:'section'});
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
