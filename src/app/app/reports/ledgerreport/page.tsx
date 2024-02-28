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
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "created", width: "7em", title: "Date", render: (row) => String(row.created).slice(0, 10) },
  { accessor: "invoiceNo", title: "Inv #", width: "5em" },
  { accessor: "description" },
  { accessor: "transaction_type" },
  { accessor: "account_type" },
  {
    accessor: "accounts_recievable",
    textAlign: "right",
    render: (record) => Number(record.accounts_recievable).toFixed(2),
  },
  {
    accessor: "accounts_payable",
    textAlign: "right",
    render: (record) => Number(record.accounts_payable).toFixed(2),
  },
  { accessor: "cash", textAlign: "right", render: (record) => Number(record.cash).toFixed(2) },
  // { accessor: "stock" },
];

export default function LedgerReport() {
  const [fromDate, setFromDate] = useState<Date | null>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0)
  );
  const [toDate, setToDate] = useState<Date | null>(
    new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 23, 59, 59, 999)
  );
  const ledger = useCRUD().fullList({
    collection: "ledger_journal",
    sort: "+created",
    filter: `(created >= '${new Date(
      Date.UTC(
        fromDate.getFullYear(),
        fromDate.getMonth(),
        fromDate.getDate(),
        fromDate.getHours(),
        fromDate.getMinutes(),
        fromDate.getSeconds()
      )
    )
      .toISOString()
      .replace("T", " ")
      .slice(0, 19)}' && created <= '${new Date(
      Date.UTC(
        toDate.getFullYear(),
        toDate.getMonth(),
        toDate.getDate(),
        toDate.getHours(),
        toDate.getMinutes(),
        toDate.getSeconds()
      )
    )
      .toISOString()
      .replace("T", " ")
      .slice(0, 19)}')`,
  });
  const printRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle:"@page {size: A4; margin: 0.6cm 1.0cm 0.6cm 0.5cm !important;",
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
    accounts_recievable: Number(recievable),
    cash: Number(cash),
    accounts_payable: Number(payable),
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
              onChange={(v) =>
                setFromDate(
                  new Date(
                    new Date(v).getFullYear(),
                    new Date(v).getMonth(),
                    new Date(v).getDate(),
                    0,
                    0,
                    0,
                    0
                  )
                )
              }
              label='Date From'
            />
            <DateInput
              value={toDate}
              onChange={(v) =>
                setToDate(
                  new Date(
                    new Date(v).getFullYear(),
                    new Date(v).getMonth(),
                    new Date(v).getDate(),
                    23,
                    59,
                    59,
                    999
                  )
                )
              }
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
              {/* <DataViewTable
              report
              fz={"xs"}
              horizontalSpacing={2}
              verticalSpacing={4}
              formstructure={{}}
              columns={tableStructure}
              data={[opening, ...ledger.data, totals]}
            /> */}
              <Stack gap={0} align='end'>
                <Group>
                  <Text fw={700}>Closing Value</Text>
                  <Text fw={600}>
                    {(Number(recievable) - Number(payable) + Number(cash) + Number(stock)).toFixed(2)}
                  </Text>
                </Group>
              </Stack>
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
