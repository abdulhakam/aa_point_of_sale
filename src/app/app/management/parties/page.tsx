"use client";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Group, Select, TextInput } from "@mantine/core";
import CreateRecord from "@/app/components/CreateRecord/CreateRecord";
import { IconUserPlus } from "@tabler/icons-react";
import useCRUD from "@/app/api/useAPI";
import { partyCreateForm } from "@/app/api/parties";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", sortable: true },
  { accessor: "type", sortable: true },
  { accessor: "area", sortable: true },
  { accessor: "section", sortable: true, render: (record) => record?.expand?.area?.expand?.section?.name },
  { accessor: "phone", sortable: true },
  { accessor: "address", sortable: true },
  { accessor: "deleted", sortable: true },
];

export default function Preas() {
  const [partyType, setPartyType] = useState("all");
  const [search, setSearch] = useState("");
  const parties = useCRUD().fullList({ collection: "parties", expand: "area,area.section" });
  console.log(parties.data);
  return (
    <>
      <Group align='end'>
        <Select
          label='Party Type'
          value={partyType}
          onChange={setPartyType}
          data={["customer", "supplier", "all"]}
        />
        <TextInput
          style={{ width: "10rem" }}
          label='Search'
          onChange={(value) => setSearch(value.target.value)}
          value={search}
        />
        <CreateRecord formStructure={partyCreateForm} icon={<IconUserPlus />} label={"Create New Party"} />
      </Group>
      {parties.isLoading && <h1>Loading...</h1>}
      {parties.isError && <h2>{parties.error.message}</h2>}
      {parties.isSuccess && (
        <DataViewTable
          formstructure={partyCreateForm}
          filter={[{ key: "", value: search }]}
          columns={tableStructure}
          data={parties.data?.filter((item) =>
            partyType !== "all"
              ? item.expand.party.type === partyType || item.expand.party.type === "both"
              : true
          )}
        />
      )}
    </>
  );
}
