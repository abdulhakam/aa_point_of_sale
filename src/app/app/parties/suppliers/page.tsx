"use client";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Group, TextInput } from "@mantine/core";
import { areaFormStructure } from "@/app/api/areas";
import CreateRecord from "@/app/components/CreateRecord/CreateRecord";
import { IconMap, IconUserPlus } from "@tabler/icons-react";
import useCRUD from "@/app/api/useAPI";
import { partyCreateForm } from "@/app/api/parties";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", sortable: true, render: (item) => <>{item.expand?.party?.name}</> },
  { accessor: "type", sortable: true, render: (item) => <>{item.expand?.party?.type}</> },
  { accessor: "area", sortable: true },
  { accessor: "section", sortable: true },
  { accessor: "phone", sortable: true, render: (item) => <>{item.expand?.party?.phone}</> },
  { accessor: "address", sortable: true, render: (item) => <>{item.expand?.party?.address}</> },
  { accessor: "deleted", sortable: true },
];

export default function Areas() {
  const [search, setSearch] = useState("");
  const areas = useCRUD().fullList({ collection: "party_view", expand: "section,area,party" });
  return (
    <>
      <Group align='end'>
        <TextInput
          style={{ width: "10rem" }}
          label='Search'
          onChange={(value) => setSearch(value.target.value)}
          value={search}
        />
        <CreateRecord formStructure={partyCreateForm} icon={<IconUserPlus />} label={"Create New Supplier"} />
      </Group>
      {areas.isLoading && <h1>Loading...</h1>}
      {areas.isError && <h2>{areas.error.message}</h2>}
      {areas.isSuccess && (
        <DataViewTable
          formstructure={areaFormStructure}
          filter={[{ key: "", value: search }]}
          columns={tableStructure}
          data={areas.data?.filter(
            (item) => item.expand.party.type === "supplier" || item.expand.party.type === "both"
          )}
        />
      )}
    </>
  );
}
