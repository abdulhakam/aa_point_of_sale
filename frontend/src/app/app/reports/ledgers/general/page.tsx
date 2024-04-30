"use client";

import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/useAPI";
import DataViewTable from "@/app/components/DataViewTable";
import PrintContent from "@/app/components/printing/PrintContent";
import PrintHead from "@/app/components/printing/PrintHead";
import { ActionIcon, Flex, Group, NumberInput, Stack, Table, Text } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconPrinter } from "@tabler/icons-react";
import { DataTableColumn } from "mantine-datatable";
import moment from "moment";
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "created", width: "7em", title: "Date", render: (row) => String(row.created).slice(0, 10) },
  { accessor: "invoiceNo", title: "Inv #", width: "5em" },
  { accessor: "description" },
  { accessor: "transaction_type", title: "Type" },
  { accessor: "account_type", title: "Account" },
  {
    accessor: "accounts_recievable",
    title: "Recievables",
    textAlign: "right",
    render: (record: any) =>
      !isNaN(record.accounts_recievable)
        ? Number(record.accounts_recievable).toFixed(2)
        : record.accounts_recievable,
  },
  {
    accessor: "accounts_payable",
    title: "Payables",
    textAlign: "right",
    render: (record: any) =>
      !isNaN(record.accounts_payable) ? Number(record.accounts_payable).toFixed(2) : record.accounts_payable,
  },
  {
    accessor: "cash",
    textAlign: "right",
    render: (record: any) => (!isNaN(record.cash) ? Number(record.cash).toFixed(2) : record.cash),
  },
];

export default function LedgerReport() {
  const [fromDate, setFromDate] = useState<Date | null>(moment().startOf("month").toDate());
  const [toDate, setToDate] = useState<Date | null>(moment().endOf("day").toDate());
  const ledger = useCRUD().fullList({
    collection: "ledger_journal",
    sort: "+created",
    filter: `(created >= '${moment(fromDate)
      .startOf("day")
      .format("YYYY-MM-DD HH:mm:ss")}' && created <= '${moment(toDate)
      .endOf("day")
      .format("YYYY-MM-DD HH:mm:ss")}')`,
  });
  const printRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: "@page {size: A4; margin: 0.6cm 1.0cm 0.6cm 0.5cm !important;",
  });

  const [openingRecievables, setOpeningRecievables] = useState(0);
  const [openingPayables, setOpeningPayables] = useState(0);
  const [openingCash, setOpeningCash] = useState(0);
  const [openingStock, setOpeningStock] = useState(0);

  const opening = {
    id: "",
    collectionId: "",
    description: "Opening Balance",
    collectionName: "",
    created: "",
    transaction_type: "",
    account_type: "",
    accounts_recievable: openingRecievables,
    cash: openingCash,
    accounts_payable: openingPayables,
    stock: openingStock,
  } as any;
  const { recievable, payable, cash, stock } = calculator(
    ledger.data ? [opening, ...ledger.data] : [opening]
  );
  const totals = {
    account_type: <Text fw={700}>Totals</Text>,
    collectionId: "",
    collectionName: "",
    created: "",
    description: "",
    id: "",
    accounts_recievable: <Text fw={700}>{Number(recievable)}</Text>,
    accounts_payable: <Text fw={700}>{Number(payable)}</Text>,
    cash: <Text fw={700}>{Number(cash)}</Text>,
    stock: Number(stock),
    transaction_type: "",
    textAlign: "right",
  };
  const queries = [ledger];
  if (checkSuccess(queries)) {
    const allData = [opening, ...ledger.data, totals];
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
          <Group>
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
          </Group>
          <Group>
            <NumberInput
              label='Opening Recievables'
              value={openingRecievables}
              onChange={(v) => setOpeningRecievables(Number(v))}
            />
            <NumberInput
              label='Opening Payables'
              value={openingPayables}
              onChange={(v) => setOpeningPayables(Number(v))}
            />
            <NumberInput
              label='Opening Cash'
              value={openingCash}
              onChange={(v) => setOpeningCash(Number(v))}
            />
            {/* <NumberInput
              label='Opening Stock'
              value={openingStock}
              onChange={(v) => setOpeningStock(Number(v))}
            /> */}
          </Group>
          <div style={{ marginLeft: "1em", marginRight: "1em" }} ref={printRef}>
            <PrintContent>
              <Text size='xl' fw={700}>
                {" "}
                GENERAL LEDGER{" "}
              </Text>
              <Table
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
                    <Table.Tr
                      key={`row-${row.id}`}
                      style={
                        (row.transaction_type === "payment" || row.transaction_type === "expense")
                          ? row.account_type === "recieving"
                            ? { color: "green" }
                            : { color: "red"}
                          : row.account_type === "sending" ? { color:"blue"} : {color:"black"}
                      }
                    >
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
          </div>
        </Stack>
      </>
    );
  } else <StatusCheck check={queries} />;
}

function calculator(data) {
  let accounts_recievable = 0;
  let accounts_payable = 0;
  let cash = 0;
  let stock = 0;
  data?.map((row) => {
    accounts_recievable += Number(row.accounts_recievable);
    accounts_payable += Number(row.accounts_payable);
    cash += Number(row.cash);
    stock += Number(row.stock);
  });
  return {
    recievable: Number(accounts_recievable).toFixed(2),
    payable: Number(accounts_payable).toFixed(2),
    cash: Number(cash).toFixed(2),
    stock: Number(stock).toFixed(2),
  };
}
