"use client";

import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/useAPI";
import DataViewTable from "@/app/components/DataViewTable";
import PrintHead from "@/app/components/printing/PrintHead";
import { ActionIcon, Flex, Group, NumberInput, Stack, Text } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconPrinter } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "created", width: "7em", title: "Date", render: (row) => String(row.created).slice(0, 10) },
  { accessor: "invoiceNo", title: "Inv #", width: "5em" },
  { accessor: "description" },
  { accessor: "transaction_type" },
  { accessor: "account_type" },
  { accessor: "accounts_recievable" },
  { accessor: "accounts_payable" },
  { accessor: "cash" },
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
  });

  const [openningRecievables, setOpenningRecievables] = useState(0);
  const [openningPayables, setOpenningPayables] = useState(0);
  const [openningCash, setOpenningCash] = useState(0);
  const [openningStock, setOpenningStock] = useState(0);

  const openning = {
    id: "",
    collectionId: "",
    description: "Openning Balance",
    collectionName: "",
    created: "",
    transaction_type: "",
    account_type: "",
    accounts_recievable: openningRecievables,
    cash: openningCash,
    accounts_payable: openningPayables,
    stock: openningStock,
  };
  const { recievable, payable, cash, stock } = calculator(ledger.data ? [openning, ...ledger.data]: [openning]);
  const totals = {
    account_type: <Text fw={700}>Totals</Text>,
    collectionId: "",
    collectionName: "",
    created: "",
    description: "",
    id: "",
    accounts_recievable: <Text fw={600}>{recievable}</Text>,
    cash: <Text fw={600}>{cash}</Text>,
    accounts_payable: <Text fw={600}>{payable}</Text>,
    stock: <Text fw={600}>{stock}</Text>,
    transaction_type: "",
  };
  const queries = [ledger];
  if (checkSuccess(queries)) {
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
                    new Date().getDate(),
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
                    new Date().getDate(),
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
              label='Openning Recievables'
              value={openningRecievables}
              onChange={(v) => setOpenningRecievables(Number(v))}
            />
            <NumberInput
              label='Openning Payables'
              value={openningPayables}
              onChange={(v) => setOpenningPayables(Number(v))}
            />
            <NumberInput
              label='Openning Cash'
              value={openningCash}
              onChange={(v) => setOpenningCash(Number(v))}
            />
            <NumberInput
              label='Openning Stock'
              value={openningStock}
              onChange={(v) => setOpenningStock(Number(v))}
            />
          </Group>
          <div style={{ marginLeft: "1em", marginRight: "1em" }} ref={printRef}>
            <PrintHead />
            <Text size='xl' fw={700}>
              {" "}
              GENERAL LEDGER{" "}
            </Text>
            <DataViewTable
              report
              fz={"xs"}
              horizontalSpacing={2}
              verticalSpacing={4}
              formstructure={{}}
              columns={tableStructure}
              data={[openning, ...ledger.data, totals]}
            />
            <Stack gap={0} align='end'>
              <Group>
                <Text fw={700}>Closing Value</Text>
                <Text fw={600}>
                  {(Number(recievable) - Number(payable) + Number(cash) + Number(stock)).toFixed(2)}
                </Text>
              </Group>
            </Stack>
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
