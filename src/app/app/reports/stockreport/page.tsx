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

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "created", hidden: true },
  { accessor: "category", title: "Company", sortable: true },
  { accessor: "name" },
  { accessor: "cost_price", sortable: true, title: "CP" },
  { accessor: "sale_price", sortable: true, title: "SP" },
  { accessor: "qty", sortable: true, render: (record) => qtyDisplay(record, record.qty) },
  { accessor: "box_size_qty", sortable: true },
  { accessor: "stock_amount", title:'Stock Amount', render: (record)=>record.qty*record.cost_price}
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
        </div>
      </>
    );
  } else return <StatusCheck check={queries} />;
}
