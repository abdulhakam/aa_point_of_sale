"use client";
import { DataTableColumn } from "mantine-datatable";
import useCRUD from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import { useRef, useState } from "react";
import { ActionIcon, Button, Flex, Group, Modal, Select, Table, Text, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { qtyDisplay } from "@/app/components/functions/qtyParser";
import { IconPrinter } from "@tabler/icons-react";
import { useReactToPrint } from "react-to-print";
import Link from "next/link";
import PrintContent from "@/app/components/printing/PrintContent";

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
  { accessor: "sale_price", hidden: true, sortable: true, title: "SP" },
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
    pageStyle:`@page {size: A4; margin: 0.6cm 1.0cm 0.6cm 0.5cm !important;}`,
  });
  const [opened, { open, close }] = useDisclosure(true);
  const [filterValue, setFilter] = useState("");
  const itemsReport = useCRUD().fullList({
    collection: "items_report",
    expand: "category",
    filter: `${filterValue ? `category = '${filterValue}'` : ""}`,
  });
  const categories = useCRUD().fullList({ collection: "categories" });
  const filteredData = itemsReport.data;
  const queries = [itemsReport, categories];
  if (checkSuccess(queries)) {
    const stockAmountTotal = filteredData.reduce(
      (total, record) => total + record.qty * record.cost_price,
      0
    );
    return (
      <>
        <Modal centered opened={opened} onClose={close} title='Filter Data'>
          <Select
            label={"Company"}
            data={[
              ...categories.data.map((cat) => ({ value: cat.id, label: cat.name })),
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
          <PrintContent>
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
            {filterValue && <Text size='sm'>Company: {categories.data?.find((cat) => cat.id === filterValue)?.name}</Text>}
            <Table
              fz={"10pt"}
              horizontalSpacing={1}
              verticalSpacing={0}
              styles={{
                td: { fontSize: "7pt", padding: "0.2em", border: "1px solid black" },
                th: { fontSize: "7pt", padding: "0.2em", border: "1px solid black" },
              }}
            >
              <Table.Thead>
                <Table.Tr>
                  {tableStructure.map((col) =>
                    col.hidden ? null : (
                      <Table.Td key={`thead-${col.accessor}`}>
                        {String(col.title ?? col.accessor).toUpperCase()}
                      </Table.Td>
                    )
                  )}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredData.map((row) => (
                  <Table.Tr key={`row-${row.id}`}>
                    {tableStructure.map((col,i) =>
                      col.hidden ? null : (
                        <Table.Td
                          key={`td-${row.id}-${col.accessor}`}
                          style={{ textAlign: col.textAlign ?? "start", width: col.width ?? "auto" }}
                        >
                          {col.render
                            ? col.render(row,i)
                            : row.hasOwnProperty("expand")
                            ? row.expand.hasOwnProperty(col.accessor)
                              ? row.expand[col.accessor].name || row.expand[col.accessor].value
                              : row[col.accessor]
                            : row[col.accessor]}
                        </Table.Td>
                      )
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            <Group justify='end' mr={"sm"}>
              {"Total Stock: "}
              {stockAmountTotal.toFixed(2)}
            </Group>
          </PrintContent>
        </div>
      </>
    );
  } else return <StatusCheck check={queries} />;
}
