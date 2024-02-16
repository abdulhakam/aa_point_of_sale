"use client";
import { ActionIcon, Button, Checkbox, Flex, Group, Select, Stack, Text } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconPrinter } from "@tabler/icons-react";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import PrintHead from "@/app/components/printing/PrintHead";
import { useState } from "react";
import useCRUD from "@/app/api/useAPI";
import dataFilter from "@/app/components/functions/dataFilter";
import styles from "@/app/components/printing/styles.module.css";
import { DateInput } from "@mantine/dates";
import DataViewTable from "@/app/components/DataViewTable";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";

export default function BalanceReport() {
  const payments = useCRUD().fullList({
    collection: "report_balance",
    expand: "party,area,section",
    sort: "",
  });
  const parties = useCRUD().fullList({ collection: "parties" });
  //filter vars
  const [reportType, setReportType] = useState("all"); // sending, recieving, all,area,section,booker,(date---not in report type)
  const [paymentType, setPaymentType] = useState("all");
  //
  const filteredPayments = dataFilter(
    [
      { key: "type", value: paymentType === "all" ? "" : paymentType },
    ],
    payments.data
  );
  const tableStructure = [
    { accessor: "id", hidden: true },
    {
      accessor: "type",
      sortable: true,
      width: "3em",
      render: (record) =>
        record.type === "sending" ? <IconArrowUp size={12} /> : <IconArrowDown size={12} />,
    },
    { accessor: "party", sortable: true },
    {
      accessor: "area",
      sortable: true,
      width: "9em",
    },
    {
      accessor: "section",
      sortable: true,
      width: "9em",
    },
    { accessor: "amount", sortable: true, render: (record) => <>{`${record.amount!=null ?record.amount.toFixed(2):0}`}</> },
  ];
  const { total, totalPaid, invoiceTotal, totalSending, totalRecieving, recieving, recieved, sending, sent } =
    calculator(
      filteredPayments?.map((pmnt) => ({
        ...pmnt,
        expand: {
          ...pmnt.expand,
          party: { ...parties.data?.find((pty) => pty.id === pmnt.party) },
        },
      }))
    );
  const finalData = [
    reportType !== "all" ? [] : ["Sending", sending, "Sent", sent, "Sending Total", totalSending],
    reportType !== "all"
      ? []
      : ["Recieving", recieving, "Recieved", recieved, "Recieving Total", totalRecieving],
    reportType === "all"
      ? []
      : [
          reportType === "booker" ? "" : "Invoice Total",
          reportType === "booker" ? "" : invoiceTotal,
          reportType === "booker" ? "" : "Paid Total",
          reportType === "booker" ? "" : totalPaid,
          "Total",
          total,
        ],
  ];
  const queries = [payments, parties];
  const printRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });
  if (checkSuccess(queries)) {
    return (
      <>
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
        <div style={{ marginLeft: "1em", marginRight: "1em" }} ref={printRef}>
          <PrintHead />
          <hr />
          <>
            {/* <Modal centered opened={opened} onClose={close} title='Filter Data'> */}
            <Group className={styles.hideOnPrint}>
              <Stack gap={0}></Stack>
              <Stack gap={0}>
              </Stack>
              <Stack gap={0}>
                <Select
                  allowDeselect={false}
                  label={"Select Balance Type"}
                  data={["sending", "recieving", "all"]}
                  value={paymentType}
                  onChange={(v) => {
                    setPaymentType(v);
                    setReportType(v);
                  }}
                />
                <Button
                  onClick={() => {
                    setPaymentType("all");
                    setReportType("all");
                  }}
                >
                  RESET
                </Button>
              </Stack>
            </Group>
            {/* </Modal> */}
            <Group align='center' justify='space-between'>
              <Group>
                <Text variant='transparent' m={0} p={0} size='compact-lg' fw={"700"} c='black'>
                  {reportType === "all" && `ALL BALANCE REPORT`}
                  {reportType === "sending" && `SENDING BALANCE REPORT`}
                  {reportType === "recieving" && `RECEIVING BALANCE REPORT`}
                </Text>
              </Group>
              <Group justify='end'></Group>
            </Group>
            <DataViewTable
              report
              fz={"xs"}
              verticalSpacing={0}
              horizontalSpacing={2}
              rowStyle={({ paid, invoice, type }) =>
                invoice
                  ? null
                  : type !== "sending"
                  ? paid
                    ? { color: "green" }
                    : { color: "maroon" }
                  : paid
                  ? { color: "maroon" }
                  : { color: "green" }
              }
              formstructure={{}}
              columns={tableStructure}
              data={filteredPayments}
            />
            <Flex
              justify={"end"}
              align={"center"}
              px={"1em"}
              h={"3rem"}
              style={{
                position: "relative",
              }}
            >
              <Stack gap={0}>
                {finalData.map((row, i) => {
                  return (
                    <Group key={i}>
                      {row.map((cell, iter) => (
                        <Text size='xs' w={"6rem"} fw={iter % 2 ? "700" : "400"} key={iter}>
                          {cell}
                        </Text>
                      ))}
                    </Group>
                  );
                })}
              </Stack>
            </Flex>
          </>
        </div>
      </>
    );
  } else return <StatusCheck check={queries} />;
}


function calculator(payments) {
  let invoiceTotal = 0;
  let recieving = 0;
  let recieved = 0;
  let sending = 0;
  let sent = 0;
  let totalPaid = 0;
  for (const pmnt of payments) {
    pmnt.type === "sending"
      ? pmnt.paid
        ? (sent += pmnt.amount)
        : (sending += pmnt.amount)
      : pmnt.paid
      ? (recieved += pmnt.amount)
      : (recieving += pmnt.amount);
  }

  for (const pmnt of payments) {
    pmnt.paid ? (totalPaid += pmnt.amount) : (invoiceTotal += pmnt.amount);
  }
  const totalSending = Number((sending - sent).toFixed(2));
  const totalRecieving = Number((recieving - recieved).toFixed(2));
  const total = Number((invoiceTotal - totalPaid).toFixed(2));
  return {
    total,
    totalSending,
    totalRecieving,
    invoiceTotal: Number(invoiceTotal).toFixed(2),
    totalPaid: Number(totalPaid).toFixed(2),
    recieving: Number(recieving).toFixed(2),
    recieved: Number(recieved).toFixed(2),
    sending: Number(sending).toFixed(2),
    sent: Number(sent).toFixed(2),
  };
}
