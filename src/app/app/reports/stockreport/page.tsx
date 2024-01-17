"use client";
import { DataTableColumn } from "mantine-datatable";
import useCRUD from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import ReportViewTable from "@/app/components/ReportViewTable";
import dataFilter from "@/app/components/functions/dataFilter";
import { useState } from "react";
import { Button, Flex, Group, Modal, Select, Table, Text, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { qtyDisplay } from "@/app/components/functions/qtyParser";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "created", hidden: true },
  { accessor: "category", sortable: true },
  { accessor: "name",  },
  { accessor: "cost_price", sortable: true,title:'CP' },
  { accessor: "sale_price", sortable: true,title:'SP' },
  { accessor: "qty", sortable: true,render:(record)=>qtyDisplay(record,record.qty) },
  { accessor: "box_size_qty", sortable: true },
];

export default function ItemsReport() {
  const [opened, { open, close }] = useDisclosure(true);
  const itemsReport = useCRUD().fullList({
    collection: "items_report",
    expand: "category",
  });
  const categories = useCRUD().fullList({ collection: "categories" });
  const filterKey = "category";
  const [filterValue, setFilter] = useState("");
  const filteredData = dataFilter(
    [
      { key: filterKey, value: filterValue },
    ],
    itemsReport.data
    )
  const queries = [itemsReport, categories];
  if (checkSuccess(queries)) {
    return (
      <>
        <Modal centered opened={opened} onClose={close} title='Filter Data'>
          <Select
            label={"Please Select Category"}
            data={[...categories.data.map((cat) => ({ value: cat.name, label: cat.name })),{value:'',label:'All'}]}
            value={filterValue}
            onChange={setFilter}
          />
          <Button onClick={close}>OK</Button>
        </Modal>
        <Button onClick={open} variant='transparent' size='lg' fw={"700"} color='black'>
          {`STOCK REPORT`}
        </Button>
        <hr />
        <ReportViewTable
          rowStyle={({ party_type, amount }) =>
            party_type === "supplier"
              ? amount > 0
                ? { color: "red" }
                : { color: "green" }
              : party_type === "customer" && amount < 0
              ? { color: "red" }
              : undefined
          }
          columns={tableStructure}
          data={filteredData}
        />
      </>
    );
  } else return <StatusCheck check={queries} />;
}
