"use client";
import { DataTableColumn } from "mantine-datatable";
import useCRUD from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import ReportViewTable from "@/app/components/ReportViewTable";
import dataFilter from "@/app/components/functions/dataFilter";
import { useRef, useState } from "react";
import { ActionIcon, Button, Flex, Group, Modal, Select, Table, Text, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { qtyDisplay } from "@/app/components/functions/qtyParser";
import DataViewTable from "@/app/components/DataViewTable";
import NumberAddress from "@/app/components/NumberAddress/NumberAddress";
import PrintHead from "@/app/components/printing/PrintHead";
import { IconPrinter } from "@tabler/icons-react";
import { useReactToPrint } from "react-to-print";
import Link from "next/link";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "created", hidden: true },
  { accessor: "category", title: "Company", sortable: true },
  {
    accessor: "name",
    render: (record) => (
      <Link
        style={{ textDecoration: "none", color: "#000055" }}
        href={`/app/reports/stockreport/itemTransactionsReport?itemID=${record.id}`}
      >
        {String(record.name)}
      </Link>
    ),
  },
  { accessor: "cost_price", sortable: true, title: "CP" },
  { accessor: "sale_price", sortable: true, title: "SP" },
  { accessor: "qty", sortable: true, render: (record) => qtyDisplay(record, Number(record.qty)) },
  { accessor: "box_size_qty", sortable: true },
  {
    accessor: "stock_amount",
    title: "Stock Amount",
    textAlign: "right",
    render: (record) => (Number(record.qty) * Number(record.cost_price)).toFixed(2),
  },
];

export default function ItemsReport() {
  const printRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });
  const [opened, { open, close }] = useDisclosure(true);
  const itemsReport = useCRUD().fullList({
    collection: "items_report",
    expand: "category",
  });
  const categories = useCRUD().fullList({ collection: "categories" });
  const filterKey = "category";
  const [filterValue, setFilter] = useState("");
  const filteredData = dataFilter([{ key: filterKey, value: filterValue }], itemsReport.data);
  const queries = [itemsReport, categories];
  const stockAmountTotal = filteredData.reduce((total, record) => total + record.qty * record.cost_price, 0);
  if (checkSuccess(queries)) {
    return (
      <>
        <Modal centered opened={opened} onClose={close} title='Filter Data'>
          <Select
            label={"Company"}
            data={[
              ...categories.data.map((cat) => ({ value: cat.name, label: cat.name })),
              { value: "", label: "All" },
            ]}
            value={filterValue}
            onChange={setFilter}
          />
          <Button onClick={close}>OK</Button>
        </Modal>
        <ActionIcon
          onClick={() => {
            handlePrint();
          }}
          size='xl'
          variant='subtle'
          color='blue'
        >
          <IconPrinter />
        </ActionIcon>
        <div ref={printRef} style={{ marginLeft: "1em", marginRight: "1em" }}>
          <PrintHead />
          <Button
            mb={"xs"}
            onClick={open}
            variant='transparent'
            size='compact-lg'
            p={0}
            fw={"700"}
            color='black'
          >
            {`STOCK REPORT`}
          </Button>
          {filterValue && <Text size='sm'>Company: {filterValue}</Text>}
          <DataViewTable
            report
            fz={"sm"}
            horizontalSpacing={"sm"}
            verticalSpacing={0}
            columns={tableStructure}
            data={filteredData}
          />
          <Group justify='end' mr={"sm"}>
            {"Total Stock: "}
            {stockAmountTotal.toFixed(2)}
          </Group>
        </div>
      </>
    );
  } else return <StatusCheck check={queries} />;
}
