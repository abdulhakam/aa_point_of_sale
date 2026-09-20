"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD, { useAppliedFilters } from "@/app/api/useAPI";
import { NSelect } from "@/app/components/BetterComps/Select";
import PrintContent from "@/app/components/printing/PrintContent";
import { ActionIcon, Button, Flex, Group, NumberInput, Stack, Table, Text } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconPrinter } from "@tabler/icons-react";
import { DataTableColumn } from "mantine-datatable";
import moment from "moment";
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  // { accessor: "dated", width: "7em", title: "Date", render: (row) => String(row.created).slice(0, 10) },
  {
    accessor: "party",
    // width: "5em",
    render: (record: any) => (record.party ? (record.expand?.party?.name ?? record.party) : ""),
  },
  {
    accessor: "debit",
    textAlign: "right",
    render: (record: any) => (!isNaN(record.debit) ? Number(record.debit).toFixed(2) : record.debit),
  },
  {
    accessor: "credit",
    textAlign: "right",
    render: (record: any) => (!isNaN(record.credit) ? Number(record.credit).toFixed(2) : record.credit),
  },
  {
    accessor: "balance",
    textAlign: "right",
    render: (record: any) => (!isNaN(record.balance) ? Number(record.balance).toFixed(2) : record.balance),
  },
];
export default function AreaLedger() {
  const [fromDate, setFromDate] = useState<Date | null>(moment().startOf("year").toDate());
  const [toDate, setToDate] = useState<Date | null>(moment().endOf("day").toDate());
  const [area, setArea] = useState<any>("");
  const [section, setSection] = useState<any>("");
  const areas = useCRUD().fullList({ collection: "areas" });
  const sections = useCRUD().fullList({ collection: "sections" });

  // POS-0026 — the report query reads this APPLIED snapshot, so changing the inputs above does
  // not fire a request until the user presses Apply. Reset restores the inputs and it together.
  const { applied, apply, reset, initial } = useAppliedFilters({
    fromDate: moment().startOf("year").toDate() as Date | null,
    toDate: moment().endOf("day").toDate() as Date | null,
    area: "",
    section: "",
  });

  const ledger = useCRUD().fullList({
    collection: "ledger_area",
    expand: "invoice,party",
    sort: "+created",
    filter: `type="recieving" && (created >= '${moment(applied.fromDate)
      .startOf("day")
      .format("YYYY-MM-DD HH:mm:ss")}' && created <= '${moment(applied.toDate)
      .endOf("day")
      .format("YYYY-MM-DD HH:mm:ss")}' ) ${applied.area ? `&& party.area = '${applied.area}'` : ""} ${
      applied.section ? `&& party.area.section = '${applied.section}'` : ""
    }`,
  });
  const printRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: "@page {size: A4; margin: 0.6cm 1.0cm 0.6cm 0.5cm !important;",
  });

  const queries = [ledger, areas, sections];
  if (checkSuccess(queries)) {
    const totals = ledger.data.reduce(
      (prev, curr) => ({
        debit: prev.debit + curr.debit,
        credit: prev.credit + curr.credit,
        balance: prev.balance + curr.balance,
      }),
      { debit: 0, credit: 0, balance: 0 }
    );
    const allData = [
      ...ledger.data,
      {
        party: <Text fw={"600"}>TOTAL</Text>,
        debit: <Text fw={"600"}>{totals.debit}</Text>,
        credit: <Text fw={"600"}>{totals.credit}</Text>,
        balance: <Text fw={"600"}>{totals.balance}</Text>,
      },
    ] as any[];
    return (
      <>
        <Stack mb={"sm"}>
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
          <Group align='end'>
            <DateInput
              value={fromDate}
              onChange={(v) => setFromDate(moment(v).startOf("day").utc().toDate())}
              label='Date From'
            />
            <DateInput
              value={toDate}
              onChange={(v) => setToDate(moment(v).endOf("day").utc().toDate())}
              label='Date To'
            />
            <NSelect
              searchable
              value={area}
              onChange={(v) => {
                setArea(v);
                setSection("");
              }}
              label='Area'
              data={
                section
                  ? areas.data
                      .filter((a) => a.section == section)
                      .map((a) => ({ value: a.id, label: a.name }))
                  : areas.data.map((a) => ({ value: a.id, label: a.name }))
              }
            />
            <NSelect
              searchable
              value={section}
              onChange={setSection}
              label='Section'
              dataQuery={{
                collectionName: "sections",
              }}
              dataQueryValue={"id"}
              dataLabel={"name"}
            />
            {/* POS-0026 — request the data only when Apply is pressed. */}
            <Button onClick={() => apply({ fromDate, toDate, area, section })}>APPLY</Button>
            <Button
              variant='default'
              onClick={() => {
                setArea(initial.area);
                setSection(initial.section);
                setFromDate(initial.fromDate);
                setToDate(initial.toDate);
                reset();
              }}
            >
              Clear
            </Button>
          </Group>
          <div style={{ marginLeft: "1em", marginRight: "1em" }} ref={printRef}>
            {
              <PrintContent>
                <Text size='xl' fw={700}>
                  {" "}
                  AREA LEDGER{" "}
                </Text>
                <Group>
                  {applied.section && (
                    <div>Section: {sections.data.find((s) => s.id == applied.section)?.name}</div>
                  )}
                  {applied.area && <div>Area: {areas.data.find((a) => a.id == applied.area)?.name}</div>}
                </Group>
                <Table
                  stickyHeader
                  stickyHeaderOffset={50}
                  fz={"10pt"}
                  horizontalSpacing={1}
                  verticalSpacing={0}
                  styles={{
                    td: { fontSize: "md", padding: "0.2em", border: "1px solid black" },
                    th: { fontSize: "md", padding: "0.2em", border: "1px solid black" },
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
                    {allData.map((row) => (
                      <Table.Tr key={`row-${row.id}`}>
                        {tableStructure.map((col, i) =>
                          col.hidden ? null : (
                            <Table.Td
                              key={`td-${row.id}-${col.accessor}`}
                              style={{ textAlign: col.textAlign ?? "start", width: col.width ?? "auto" }}
                            >
                              {col.render
                                ? col.render(row as any, i)
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
              </PrintContent>
            }
          </div>
        </Stack>
      </>
    );
  } else <StatusCheck check={queries} />;
}
