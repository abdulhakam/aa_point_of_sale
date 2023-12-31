"use client";
import { DataTableColumn } from "mantine-datatable";
import useCRUD from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import ReportViewTable from "@/app/components/ReportViewTable";
import dataFilter from "@/app/components/functions/dataFilter";
import { useState } from "react";
import { Button, Flex, Group, Modal, Select, Table, Text, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { DatePicker } from "@mantine/dates";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "created", hidden: true },
  { accessor: "booking_maker", hidden: true },
  { accessor: "party", sortable: true },
  { accessor: "type", sortable: true },
  { accessor: "area", sortable: true, hidden: true },
  { accessor: "total", sortable: true },
  { accessor: "discount_1", sortable: true },
  { accessor: "discount_2", sortable: true },
  { accessor: "final_total", sortable: true },
];

export default function BookerWiseReport({ type = "sale" }) {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [opened, { open, close }] = useDisclosure(true);
  const invoiceReport = useCRUD().fullList({
    collection: "bookings_report",
    expand: "party,area,booking_maker",
  });
  const areas = useCRUD().fullList({ collection: "areas" });
  const filterKey = "area";
  const [filterValue, setFilter] = useState("");
  const filteredData = dataFilter(
    [
      { key: filterKey, value: filterValue },
      { key: "type", value: type },
    ],
    invoiceReport.data
  ).filter((inv) => new Date(inv.created) > dateRange[0] && new Date(inv.created) < dateRange[1]);
  const queries = [invoiceReport, areas];
  if (checkSuccess(queries)) {
    return (
      <>
        <Modal centered opened={opened} onClose={close} title='Filter Data'>
          <Select
            label={"Please Select Area"}
            data={areas.data.map((area) => ({ value: area.name, label: area.name }))}
            value={filterValue}
            onChange={setFilter}
          />
          <DatePicker type='range' value={dateRange} onChange={setDateRange} />
          <Button onClick={close}>OK</Button>
        </Modal>
        <Button onClick={open} variant='transparent' size='lg' fw={"700"} color='black'>
          {`BOOKER WISE ${type.toUpperCase()} REPORT IS IN PROGRESS`}
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
        <Flex
          justify={"end"}
          align={"center"}
          style={{
            border: "1px solid lightgray",
            position: "relative",
            marginTop: "-4.15rem",
            height: "4rem",
          }}
        >
          <Text mr={"3rem"} size='xl'>
            Total
          </Text>
          <Text mr={"7rem"} size='xl' fw={700}>
            {filteredData
              .map((row) => row?.final_total)
              .reduce((accumulator, currentValue) => accumulator + currentValue, 0)}
          </Text>
        </Flex>
      </>
    );
  } else return <StatusCheck check={queries} />;
}
