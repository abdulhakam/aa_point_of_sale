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
import { DatePicker } from "@mantine/dates";

export default function PaymentsReport() {
  const [opened, { open, close }] = useDisclosure(false);
  const payments = useCRUD().fullList({
    collection: "payments_view",
    expand: "invoice,party,area,section,booker",
    sort: "",
  });
  const parties = useCRUD().fullList({ collection: "parties" });
  const areas = useCRUD().fullList({ collection: "areas", expand: "section" });
  const sections = useCRUD().fullList({ collection: "sections" });
  const bookers = useCRUD().fullList({ collection: "order_bookers" });
  //filter vars
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date("2024-01-01"),
    new Date(),
  ]);
  const [reportType, setReportType] = useState("all"); // sending, recieving, all,area,section,booker,(date---not in report type)
  const [bookerFilter, setBooker] = useState("All");
  const [areaFilter, setAreaFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [party, setParty] = useState("All");
  const [paymentType, setPaymentType] = useState("all");
  //
  const filteredPayments = dataFilter(
    [
      { key: "booker", value: bookerFilter === "All" ? "" : bookerFilter },
      { key: "area", value: areaFilter === "All" ? "" : areaFilter },
      { key: "section", value: sectionFilter === "All" ? "" : sectionFilter },
      { key: "party", value: party === "All" ? "" : party },
      { key: "type", value: paymentType === "all" ? "" : paymentType },
    ],
    payments.data?.filter(
      (pmt) => dateRange[0] < new Date(pmt.created) && dateRange[1] > new Date(pmt.created)
    )
  );
  const tableStructure = [
    { accessor: "id", hidden: true },
    {
      accessor: "created",
      title: "Date",
      render: (record) => <>{record.created.slice(0, 10)}</>,
      sortable: true,
      width:'7em'
    },
    {
      accessor: "type",
      sortable: true,
      width:'5em'
    },
    {
      accessor: "area",
      sortable: true,
      width:'9em'
    },
    {
      accessor: "section",
      sortable: true,
      width:'9em'
    },
    {
      accessor: "invoice",
      sortable: true,
      width:'5em',
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
  const queries = [payments, areas, sections, bookers, parties];
  if (checkSuccess(queries)) {
    return (
      <>
        <Modal centered opened={opened} onClose={close} title='Filter Data'>
          <Stack>
            <DatePicker type='range' size='xs' value={dateRange} onChange={setDateRange} />
            <Select
              label={"Select Booker"}
              data={[...bookers.data?.map((bkr) => bkr.name), "All"]}
              value={bookerFilter}
              searchable
              onChange={(v) => {
                setBooker(v);
                setSectionFilter("All");
                setAreaFilter("All");
                setPaymentType("all");
                setParty("All");
                setReportType("booker");
              }}
            />
            <Select
              label={"Select Section"}
              data={[...sections.data.map((sec) => sec.name), "All"]}
              value={sectionFilter}
              searchable
              onChange={(v) => {
                setSectionFilter(v);
                setAreaFilter("All");
                setPaymentType("all");
                setParty("All");
                setReportType("section");
              }}
            />
            <Select
              label={"Select Area"}
              data={
                sectionFilter === "All"
                  ? [...areas?.data?.map((ara) => ara.name), "All"]
                  : [
                      ...areas?.data
                        ?.filter((ara) => ara.expand?.section?.name === sectionFilter)
                        .map((itm) => itm.name),
                      "All",
                    ]
              }
              value={areaFilter}
              searchable
              onChange={(v) => {
                setAreaFilter(v);
                setPaymentType("all");
                setParty("All");
                setReportType("area");
              }}
            />
            <Select
              label={"Select Party"}
              data={[...parties.data.map((pty) => pty.name), "All"]}
              value={party}
              searchable
              onChange={(v) => {
                setParty(v);
                setPaymentType("all");
                setAreaFilter("All");
                setSectionFilter("All");
                setReportType("party");
              }}
            />
            <Select
              label={"Select Payment Type"}
              data={["sending", "recieving", "all"]}
              value={paymentType}
              onChange={(v) => {
                setParty("All");
                setPaymentType(v);
                setReportType(v);
              }}
            />
            <Group>
              <Button
                onClick={() => {
                  setAreaFilter("All");
                  setSectionFilter("All");
                  setParty("All");
                  setPaymentType("all");
                  setReportType("all");
                }}
              >
                RESET
              </Button>
              <Button onClick={close}>OK</Button>
            </Group>
          </Stack>
        </Modal>
        <Group align='center'>
          <Button onClick={open} variant='transparent' m={0} p={0} size='compact-lg' fw={"700"} color='black'>
            {reportType === "all" && `ALL PAYMENTS`}
            {reportType === "sending" && `PURCHASES REPORT`}
            {reportType === "recieving" && `SALES REPORT`}
            {reportType === "area" && `AREA REPORT`}
            {reportType === "section" && `SECTION REPORT`}
            {reportType === "party" && `PARTY PAYMENTS REPORT`}
            {reportType === "booker" && `BOOKER INVOICE REPORT`}
          </Button>
          <NewPayment />
        </Group>
        <Group justify='end'>
          <Text size={"sm"}>{`DATE FROM: ${dateRange[0].toLocaleDateString("en", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}`}</Text>
          <Text size={"sm"}>{`DATE TO: ${dateRange[0].toLocaleDateString("en", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}`}</Text>
        </Group>
        <Group justify="start" gap={'4rem'}>
          {bookerFilter !== "All" && <Text size={"sm"}>{`BOOKER: ${bookerFilter}`}</Text>}
          {party !== "All" && <Text size={"sm"}>{`Party: ${party}`}</Text>}
          {sectionFilter !== "All" && <Text size={"sm"}>{`Section: ${sectionFilter}`}</Text>}
          {areaFilter !== "All" && <Text size={"sm"}>{`Area: ${areaFilter}`}</Text>}
        </Group>
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
          mt={"-3em"}
          mr={"1em"}
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
