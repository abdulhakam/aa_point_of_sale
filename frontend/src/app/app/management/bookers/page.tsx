"use client";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Button, Chip, Group, Modal, TextInput } from "@mantine/core";
import FormGenerator from "@/app/components/FormGenerator";
import { useDisclosure } from "@mantine/hooks";
import { orderBookerFormStructure } from "@/app/api/order_bookers";
import useCRUD from "@/app/api/useAPI";
import CreateRecord from "@/app/components/CreateRecord/CreateRecord";
import { IconUserPlus } from "@tabler/icons-react";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", sortable: true },
  { accessor: "phone", sortable: true },
  {
    accessor: "company",
    sortable: true,
    render: (record) =>
      record.expand?.company.name ||
      record.expand?.company.map((cmp, i) => (
        <Chip size='xs' key={`company-name-chip-${i}-${cmp.id}`}>
          {cmp.name}
        </Chip>
      )),
  },
  { accessor: "created", sortable: true },
];

export default function OrderBookers() {
  const [search, setSearch] = useState("");
  const order_bookers = useCRUD().fullList({ collection: "order_bookers", expand: "company" });
  if (order_bookers.isLoading) return <h1>Loading...</h1>;
  else if (order_bookers.status === "error") return <h2>{order_bookers.error.message}</h2>;
  else if (order_bookers.status === "success")
    return (
      <>
        <Group align='end'>
          <TextInput
            style={{ width: "10rem" }}
            label='Search'
            onChange={(value) => setSearch(value.target.value)}
            value={search}
          />
          <CreateRecord
            formStructure={orderBookerFormStructure}
            icon={<IconUserPlus />}
            label={"Create New Booker"}
          />
        </Group>

        <DataViewTable
          filter={[{ key: "", value: search }]}
          columns={tableStructure}
          formstructure={orderBookerFormStructure}
          data={order_bookers.data}
        />
      </>
    );
}
