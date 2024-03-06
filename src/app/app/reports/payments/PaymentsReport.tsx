"use client";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Badge, Button, Checkbox, Chip, Flex, Group, Modal, Select, Stack, Table, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import useCRUD from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import dataFilter from "@/app/components/functions/dataFilter";
import styles from "@/app/components/printing/styles.module.css";
import { DateInput, DatePicker } from "@mantine/dates";
import { NSelect } from "@/app/components/BetterComps/Select";
import moment from "moment";
import { useForm } from "@mantine/form";

export default function PaymentsReport() {
  const [fromDate, setFromDate] = useState<Date | null>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0)
  );
  const [toDate, setToDate] = useState<Date | null>(
    new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 23, 59, 59, 999)
  );

  const form = useForm({
    initialValues: {
      reportType: "",
      booker: "" as any,
      area: "" as any,
      section: "" as any,
      party: "",
      paymentType: "" as any,
      invoiceFilter: "",
      company: "" as any,
    },
  });

  const payments = useCRUD().fullList({
    collection: "payments_view",
    expand: "invoice,party,area,section,booker,company",
    filter: `(created >= '${moment(fromDate)
      .startOf("day")
      .format("YYYY-MM-DD HH:mm:ss")}' 
      && created <= '${moment(toDate).utc().endOf("day").format("YYYY-MM-DD HH:mm:ss")}')
      ${form.values.company ? `&& (company~"${form.values.company}")` : ""}
      ${form.values.booker ? `&& (booker = "${form.values.booker}")` : ""}
      ${form.values.area ? `&& (area = "${form.values.area}")` : ""}
      ${form.values.section ? `&& (section = "${form.values.section}")` : ""}
      ${form.values.party ? `&& (party = "${form.values.party}")` : ""}
      ${form.values.paymentType ? `&& (type = "${form.values.paymentType}")` : ""}
      ${
        form.values.invoiceFilter
          ? `&& ( original_invoices ~ "${form.values.invoiceFilter}" || invoice = "${form.values.invoiceFilter}")`
          : ""
      }
      `,
  });
  const parties = useCRUD().fullList({ collection: "parties", expand: "area,area.section" });
  const areas = useCRUD().fullList({ collection: "areas", expand: "section" });
  const sections = useCRUD().fullList({ collection: "sections" });
  const bookers = useCRUD().fullList({ collection: "order_bookers" });
  const invoices = useCRUD().fullList({ collection: "invoices", sort: "+id" });
  const tableStructure = [
    { accessor: "id", hidden: true },
    {
      accessor: "created",
      title: "Date",
      render: (record) => <>{record.created.slice(0, 10)}</>,
      sortable: true,
      width: "6em",
    },
    {
      accessor: "type",
      sortable: true,
      width: "9em",
      render: (record) =>
        record.type === "sending" ? (
          record.description === "payment" ? (
            <>{"Purchase Payment"}</>
          ) : (
            <>{"Purchase"}</>
          )
        ) : record.type === "recieving" ? (
          record.description === "payment" ? (
            <>{"Sale Payment"}</>
          ) : (
            <>{"Sale"}</>
          )
        ) : (
          <>{"Return"}</>
        ),
    },
    {
      accessor: "invoice",
      sortable: true,
      width: "4em",
      render: (record) => <>{`${record.expand?.invoice?.invoiceNo || ""}`}</>,
    },
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

    {
      accessor: "company",
      width: "14em",
      sortable: true,
      render: (record) =>
        record.expand?.company?.name ||
        record.expand?.company?.map((cmp, i) => (
          <Badge size='6pt' variant='white' color='black' key={`company-name-badge-${i}-${cmp.id}`}>
            {cmp.name}
          </Badge>
        )),
    },
    { accessor: "party", sortable: true },
    { accessor: "booker", hidden: form.values.reportType === "Sending", sortable: true },
    {
      accessor: "amount",
      textAlign: "right" as any,
      render: (record) => <>{`${record.amount != null ? record.amount.toFixed(2) : -0}`}</>,
    },
    { accessor: "description", hidden: true, sortable: true },
  ];

  const queries = [payments, areas, sections, bookers, parties, invoices];
  if (checkSuccess(queries)) {
    const {
      total,
      totalPaid,
      invoiceTotal,
      totalSending,
      totalRecieving,
      recieving,
      recieved,
      sending,
      sent,
      sendingReturns,
      recievingReturns,
    } = calculator(
      payments.data?.map((pmnt) => ({
        ...pmnt,
        expand: {
          ...pmnt.expand,
          party: { ...parties.data?.find((pty) => pty.id === pmnt.party) },
        },
      }))
    );

    return (
      <>
        <Group className={styles.hideOnPrint}>
          <Stack gap={0}>
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
          </Stack>
          <Stack gap={0}>
            <NSelect
              allowDeselect={false}
              label={"Select Section"}
              dataQuery={{ collectionName: "sections" }}
              dataQueryValue='id'
              dataLabel='name'
              value={form.values.section}
              searchable
              onChange={(v) => {
                form.setFieldValue("section", v);
                form.setFieldValue("reportType", "section");
              }}
            />
            <Select
              label={"Select Area"}
              data={
                form.values.section === ""
                  ? [...areas?.data?.map((ara) => ({ value: ara.id, label: ara.name }))]
                  : [
                      ...areas?.data
                        ?.filter((ara) => ara.expand?.section?.id === form.values.section)
                        .map((itm) => ({ label: itm.name, value: itm.id })),
                    ]
              }
              value={form.values.area}
              searchable
              onChange={(v) => {
                form.setFieldValue("area", v);
                form.setFieldValue("reportType", "area");
              }}
            />
          </Stack>
          <Stack gap={0}>
            <NSelect
              label={"Select Booker"}
              data={[]}
              dataQuery={{ collectionName: "order_bookers" }}
              dataQueryValue='id'
              value={form.values.booker}
              searchable
              onChange={(v) => {
                form.setFieldValue("booker", v);
                form.setFieldValue("reportType", "booker");
              }}
            />

            <Select
              label={"Select Party"}
              data={[
                ...parties.data.map((pty) => ({
                  value: pty.id,
                  label: `${pty.name} - ${pty.expand?.area?.name}`,
                })),
              ]}
              value={form.values.party}
              searchable
              onChange={(v) => {
                form.setFieldValue("party", v);
                form.setFieldValue("reportType", "party");
              }}
            />
          </Stack>
          <Stack gap={0}>
            <Select
              label={"Select Payment Type"}
              data={[
                { label: "Purchase", value: "sending" },
                { label: "Sale", value: "recieving" },
                { label: "Returns", value: "return" },
              ]}
              value={form.values.reportType}
              onChange={(v) => {
                form.setFieldValue("paymentType", v);
                form.setFieldValue("reportType", v);
              }}
            />
            <NSelect
              label={"Company"}
              value={form.values.company}
              onChange={(v) => {
                form.setFieldValue("company", v);
                form.setFieldValue("reportType", "company");
              }}
              dataQuery={{
                collectionName: "categories",
              }}
              dataQueryValue='id'
            />
          </Stack>
          <Stack>
            <Select
              label={"Invoice"}
              searchable
              value={form.values.invoiceFilter}
              onChange={(v) => {
                form.setFieldValue("invoiceFilter", v);
                form.setFieldValue("reportType", "invoice");
              }}
              data={invoices.data?.map((inv) => ({
                value: inv.id,
                label: `${inv.invoiceNo} ${inv.type.toUpperCase().charAt(0)}`,
              }))}
            />
            <Button
              onClick={() => {
                form.reset();
              }}
            >
              RESET
            </Button>
          </Stack>
        </Group>
        <Group align='center' justify='space-between'>
          <Group>
            <Text variant='transparent' m={0} p={0} size='compact-lg' fw={"700"} c='black'>
              {form.values.reportType === "" && `ALL PAYMENTS`}
              {form.values.reportType === "sending" && `PURCHASES REPORT`}
              {form.values.reportType === "recieving" && `SALES REPORT`}
              {form.values.reportType === "return" && `RETURNS REPORT`}
              {form.values.reportType === "area" && `AREA REPORT`}
              {form.values.reportType === "section" && `SECTION REPORT`}
              {form.values.reportType === "party" && `PARTY PAYMENTS REPORT`}
              {form.values.reportType === "company" && `COMPANY WISE REPORT`}
              {form.values.reportType === "booker" && `BOOKER INVOICE REPORT`}
              {form.values.reportType === "invoice" && `INVOICE PAYMENTS REPORT`}
            </Text>
          </Group>
          <Group justify='end'>
            <Text size={"sm"}>{`DATE FROM: ${
              fromDate !== null
                ? fromDate.toLocaleDateString("en", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "-"
            }`}</Text>
            <Text size={"sm"}>{`DATE TO: ${
              toDate !== null
                ? toDate.toLocaleDateString("en", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "-"
            }`}</Text>
          </Group>
        </Group>
        <Group justify='start' gap={"4rem"}>
          {form.values.booker && (
            <Text size={"sm"}>{`BOOKER: ${
              bookers.data.find((r) => r.id === form.values.booker)?.name
            }`}</Text>
          )}
          {form.values.party && (
            <Text size={"sm"}>{`Party: ${parties.data.find((r) => r.id === form.values.party)?.name}`}</Text>
          )}
          {form.values.section && (
            <Text size={"sm"}>{`Section: ${
              sections.data.find((r) => r.id === form.values.section)?.name
            }`}</Text>
          )}
          {form.values.area && (
            <Text size={"sm"}>{`Area: ${areas.data.find((r) => r.id === form.values.area).name}`}</Text>
          )}
        </Group>
        <Table
          fz={"9pt"}
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
                    {(col.title ?? col.accessor).toUpperCase()}
                  </Table.Td>
                )
              )}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {payments.data.map((row) => (
              <Table.Tr key={`row-${row.id}`}>
                {tableStructure.map((col) =>
                  col.hidden ? null : (
                    <Table.Td
                      key={`td-${row.id}-${col.accessor}`}
                      style={{ textAlign: col.textAlign ?? "start", width: col.width??"auto" }}
                    >
                      {col.render
                        ? col.render(row)
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

        <Stack gap={0} align='end' style={{ width: "100%" }}>
          {form.values.reportType !== "recieving" &&
            !form.values.booker &&
            (form.values.party
              ? parties.data.find((r) => r.id === form.values.party)?.type !== "customer"
              : true) &&
            (form.values.invoiceFilter
              ? invoices.data.find((r) => r.id === form.values.invoiceFilter)?.type !== "sale"
              : true) && (
              <Flex gap={0} direction={"row"}justify={"space-evenly"} align={"end"} w={"100%"}>
                <Group justify='space-between' w={"14rem"} mx={"0.2rem"}>
                  <Text style={{ fontSize: "8pt" }}>Purchase Invoice Amount</Text>
                  <Text style={{ fontSize: "8pt" }}>{sending}</Text>
                </Group>
                <Group justify='space-between' w={"12rem"} mx={"0.2rem"}>
                  <Text style={{ fontSize: "8pt" }}>Paid Amount</Text>
                  <Text style={{ fontSize: "8pt" }}>{sent}</Text>
                </Group>
                <Group justify='space-between' w={"8em"} mx={"0.2rem"}>
                  <Text style={{ fontSize: "8pt" }}>Returns</Text>
                  <Text style={{ fontSize: "8pt" }}>{sendingReturns}</Text>
                </Group>
                <Group justify='space-between' w={"14rem"} mx={"0.2rem"}>
                  <Text style={{ fontSize: "8pt" }}>Total Payable Amount</Text>
                  <Text style={{ fontSize: "8pt" }}>{totalSending}</Text>
                </Group>
              </Flex>
            )}
          {form.values.reportType !== "sending" &&
            (form.values.party
              ? parties.data.find((r) => r.id === form.values.party)?.type !== "supplier"
              : true) &&
            (form.values.invoiceFilter
              ? invoices.data.find((r) => r.id === form.values.invoiceFilter)?.type !== "purchase"
              : true) && (
              <Flex gap={0} direction={"row"}justify={"space-evenly"} align={"end"} w={"100%"}>
                <Group justify='space-between' w={"14rem"} mx={"0.2rem"}>
                  <Text style={{ fontSize: "8pt" }}>Sale Invoice Amount</Text>
                  <Text style={{ fontSize: "8pt" }}>{recieving}</Text>
                </Group>
                <Group justify='space-between' w={"12rem"} mx={"0.2rem"}>
                  <Text style={{ fontSize: "8pt" }}>Recieved Amount</Text>
                  <Text style={{ fontSize: "8pt" }}>{recieved}</Text>
                </Group>
                <Group justify='space-between' w={"8em"} mx={"0.2rem"}>
                  <Text style={{ fontSize: "8pt" }}>Returns</Text>
                  <Text style={{ fontSize: "8pt" }}>{recievingReturns}</Text>
                </Group>
                <Group justify='space-between' w={"14rem"} mx={"0.2rem"}>
                  <Text style={{ fontSize: "8pt" }}>Total Recivable Amount</Text>
                  <Text style={{ fontSize: "8pt" }}>{totalRecieving}</Text>
                </Group>
              </Flex>
            )}
        </Stack>
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
  let sendingReturns = 0;
  let recievingReturns = 0;
  for (const pmnt of payments) {
    if (pmnt.type === "sending") {
      pmnt.paid ? (sent += pmnt.amount) : (sending += pmnt.amount);
    } else if (pmnt.type === "recieving") {
      pmnt.paid ? (recieved += pmnt.amount) : (recieving += pmnt.amount);
    } else {
      if (pmnt.expand?.party.type === "customer") {
        recievingReturns += pmnt.amount;
      } else {
        sendingReturns += pmnt.amount;
      }
    }
  }

  for (const pmnt of payments) {
    pmnt.paid ? (totalPaid += pmnt.amount) : (invoiceTotal += pmnt.amount);
  }
  const totalSending = Number((sending - sent - sendingReturns).toFixed(2));
  const totalRecieving = Number((recieving - recieved - recievingReturns).toFixed(2));
  const total = Number((invoiceTotal - totalPaid).toFixed(2));
  return {
    total,
    totalSending,
    totalRecieving,
    sendingReturns: Number(sendingReturns).toFixed(2),
    recievingReturns: Number(recievingReturns).toFixed(2),
    invoiceTotal: Number(invoiceTotal).toFixed(2),
    totalPaid: Number(totalPaid).toFixed(2),
    recieving: Number(recieving).toFixed(2),
    recieved: Number(recieved).toFixed(2),
    sending: Number(sending).toFixed(2),
    sent: Number(sent).toFixed(2),
  };
}
