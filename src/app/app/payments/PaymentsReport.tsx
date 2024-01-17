"use client";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Box, Button, Flex, Group, Modal, Select, Stack, Table, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import useCRUD from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import dataFilter from "@/app/components/functions/dataFilter";
import NewPayment from "./NewPayment";

export default function PaymentsReport() {
  const [opened, { open, close }] = useDisclosure(false);
  const payments = useCRUD().fullList({
    collection: "payments_view",
    expand: "invoice,party,area,section,booker",
    sort: "",
  });
  const invoices = useCRUD().fullList({ collection: "invoices" });
  const parties = useCRUD().fullList({ collection: "parties" });
  //filter vars
  const [reportType, setReportType] = useState("all"); // sending, recieving, all,area,booker,(date---not it report type)
  const [party, setParty] = useState("All");
  const [paymentType, setPaymentType] = useState("all");
  //
  const filteredPayments = dataFilter(
    [
      { key: "party", value: party === "All" ? "" : party },
      { key: "type", value: paymentType === "all" ? "" : paymentType },
    ],
    payments.data
  );
  const tableStructure: DataTableColumn[] = [
    { accessor: "id", hidden: true },
    {
      accessor: "created",
      title: "Date",
      render: (record) => <>{record.created.slice(0, 10)}</>,
      sortable: true,
    },
    {
      accessor: "type",
      sortable: true,
    },
    {
      accessor: "area",
      sortable: true,
    },
    {
      accessor: "section",
      sortable: true,
    },
    {
      accessor: "invoice",
      sortable: true,
      render: (record) => <>{`${record.expand?.invoice?.invoiceNo || ""}`}</>,
    },
    { accessor: "party", sortable: true },
    { accessor: "booker", hidden: reportType === "Sending", sortable: true },
    { accessor: "amount", sortable: true },
    {
      accessor: "paid",
      hidden: true,
      title: "Payment",
      render: (record) => <>{record.paid ? "O" : "X"}</>,
    },
    { accessor: "description", sortable: true },
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
    ["Sending", sending, "Sent", sent, "Sending Total", totalSending],
    ["Recieving", recieving, "Recieved", recieved, "Recieving Total", totalRecieving],
    ["Invoice Total", invoiceTotal, "Paid Total", totalPaid, "Total", total],
  ];
  const queries = [payments, invoices, parties];
  if (checkSuccess(queries)) {
    return (
      <>
        <Modal centered opened={opened} onClose={close} title='Filter Data'>
          <Select
            label={"Select Report Type"}
            data={["All", "Sending", "Recieving", "Area", "Booker", "Party"]}
            value={reportType}
            onChange={setReportType}
          />
          <Select
            label={"Select Party"}
            data={[...parties.data.map((pty) => pty.name), "All"]}
            value={party}
            searchable
            onChange={setParty}
          />
          <Select
            label={"Select Payment Type"}
            data={["sending", "recieving", "all"]}
            value={paymentType}
            onChange={setPaymentType}
          />
          <Button onClick={close}>OK</Button>
        </Modal>
        <Group align='center'>
          <Button onClick={open} variant='transparent' m={0} p={0} size='compact-lg' fw={"700"} color='black'>
            {`PAYMENTS REPORT`}
          </Button>
          <NewPayment />
        </Group>
        <Text size={"md"}>{`Party: ${party}`}</Text>
        <hr />
        <DataViewTable
          report
          fz={"xs"}
          verticalSpacing={0}
          horizontalSpacing={0}
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
          mt={"-4.15em"}
          mr={"1rem"}
          h={"3rem"}
          style={{
            position: "relative",
          }}
        >
          <Stack>
            {finalData.map((row, i) => {
              return (
                <Group my={"-0.5rem"} key={i}>
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
