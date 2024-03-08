"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/useAPI";
import { NSelect } from "@/app/components/BetterComps/Select";
import PrintContent from "@/app/components/printing/PrintContent";
import { ActionIcon, Button, Flex, Group, NumberInput, Stack, Table, Text } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconPrinter } from "@tabler/icons-react";
import { DataTableColumn } from "mantine-datatable";
import moment from "moment";
import Link from "next/link";
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "dated", width: "7em", title: "Date", render: (row) => String(row.created).slice(0, 10) },
  {
    accessor: "invoice",
    title: "Inv #",
    width: "5em",
    render: (row: any) => (
      <Link style={{ textDecoration: "none" }} href={`/app/invoices/print?invoiceId=${row.invoice}`}>
        {row.expand?.invoice.invoiceNo}
      </Link>
    ),
  },
  { accessor: "entry", render: (row: any) => (row.description === "payment" ? "Payment" : "Invoice") },
  {
    accessor: "credit",
    textAlign: "right",
    render: (record: any) => (!isNaN(record.credit) ? Number(record.credit).toFixed(2) : record.credit),
  },
  {
    accessor: "debit",
    textAlign: "right",
    render: (record: any) => (!isNaN(record.debit) ? Number(record.debit).toFixed(2) : record.debit),
  },
  {
    accessor: "balance",
    textAlign: "right",
    render: (record: any) => (!isNaN(record.balance) ? Number(record.balance).toFixed(2) : record.balance),
  },
];
export default function PartyLedgerReport() {
  const [fromDate, setFromDate] = useState<Date | null>(moment().startOf("year").utc().toDate());
  const [toDate, setToDate] = useState<Date | null>(moment().endOf("day").utc().toDate());
  const [party, setParty] = useState<any>("");
  const ledger = useCRUD().fullList({
    collection: "ledger_party",
    expand: "invoice,party",
    sort: "+created",
    filter: `(created >= '${moment(fromDate)
      .utc()
      .startOf("day")
      .format("YYYY-MM-DD HH:mm:ss")}' && created <= '${moment(toDate)
      .utc()
      .endOf("day")
      .format("YYYY-MM-DD HH:mm:ss")}' ) ${party ? `&& party = '${party}'` : ""}`,
  });
  const printRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: "@page {size: A4; margin: 0.6cm 1.0cm 0.6cm 0.5cm !important;",
  });

  const queries = [ledger];
  if (checkSuccess(queries)) {
    const allData = [...ledger.data];
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
              value={party}
              onChange={setParty}
              label='Party'
              dataQuery={{
                collectionName: "parties",
              }}
              dataQueryValue={"id"}
              dataLabel={"name"}
            />
            <Button onClick={() => setParty("")}>Clear</Button>
          </Group>
          <div style={{ marginLeft: "1em", marginRight: "1em" }} ref={printRef}>
            {!party ? (
              <Text size='xl'>PLEASE SELECT A PARTY TO VIEW LEDGER</Text>
            ) : (
              <PrintContent>
                <Text size='xl' fw={700}>
                  {" "}
                  PARTY LEDGER{" "}
                </Text>
                <Text>Party: {allData[0]?.expand?.party?.name ?? "NO DATA FOUND FOR SELECTED PARTY"}</Text>
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
            )}
          </div>
        </Stack>
      </>
    );
  } else <StatusCheck check={queries} />;
}
