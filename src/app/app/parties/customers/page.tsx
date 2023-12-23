"use client";

import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import {  useState } from "react";
import { Button, Group, Modal, TextInput } from "@mantine/core";
import FormGenerator from "@/app/components/FormGenerator";
import { useDisclosure } from "@mantine/hooks";
import {  useQueryClient } from "@tanstack/react-query";
import { partyFormStructure, useParties } from "@/app/api/parties";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "name", sortable: true },
  { accessor: "type", sortable: true },
  { accessor: "area", sortable: true },
  { accessor: "phone", sortable: true },
  { accessor: "address", sortable: true },
  { accessor: "deleted", sortable: true },
];

export default function Items() {
  const [opened, { open, close }] = useDisclosure(false);
  const areas = useQueryClient().getQueryData(["areas"]);
  const formStructure = { ...partyFormStructure };
  formStructure.fields.type.baseProps.data=['customer','both'];
  formStructure.fields.type.default='customer';
  formStructure.fields.area.baseProps.data = areas?.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));
  const [search, setSearch] = useState("");
  const parties = useParties();

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
          <FormGenerator close={close} editable formStructure={partyFormStructure} />
        </Modal>
        <Button onClick={open}> Add New </Button>
      </Group>
      {parties.isLoading && <h1>Loading...</h1>}
      {parties.status==='error' && <h2>{parties.error.message}</h2>}
      {parties.status==='success' && (
        <DataViewTable
          filter={[{ key: "", value: search }]}
          columns={tableStructure}
          formStructure={partyFormStructure}
          data={parties.customers}
        />
      )}
    </>
  );
}
