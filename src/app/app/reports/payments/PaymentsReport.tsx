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
  const [fromDate, setFromDate] = useState<Date | null>(moment().utc().startOf("month").toDate());
  const [toDate, setToDate] = useState<Date | null>(moment().utc().endOf("day").toDate());

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
    expand: "invoice,party,area,section,booker",
    filter: `(created >= '${moment(fromDate).startOf("day").format("YYYY-MM-DD HH:mm:ss")}' 
      && created <= '${moment(toDate).utc().endOf("day").format("YYYY-MM-DD HH:mm:ss")}')
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
        <Group className={styles.hideOnPrint}>
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
          fz={"sm"}
          horizontalSpacing={1}
          verticalSpacing={0}
          styles={{
            td: { padding: "0.2em", border: "1px solid black" },
            th: { padding: "0.2em", border: "1px solid black" },
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
                      style={{ textAlign: col.textAlign ?? "start", width: col.width ?? "auto" }}
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

        <Flex gap={"md"} direction={"row"} justify={"end"} align={"end"} w={"100%"}>
          {form.values.reportType !== "recieving" &&
            !form.values.booker &&
            (form.values.party
              ? parties.data.find((r) => r.id === form.values.party)?.type !== "customer"
              : true) &&
            (form.values.invoiceFilter
              ? invoices.data.find((r) => r.id === form.values.invoiceFilter)?.type !== "sale"
              : true) && (
              <Table
                w={"15rem"}
                fz={"sm"}
                horizontalSpacing={1}
                verticalSpacing={0}
                data={{
                  body: [
                    [
                      <Text key={"pialabel"}>Purchase Amount</Text>,
                      <Text style={{ textAlign: "right" }} key={"piamount"}>
                        {sending}
                      </Text>,
                    ],
                    [
                      <Text key={"sentlabel"}>Paid Amount</Text>,
                      <Text style={{ textAlign: "right" }} key={"sentamount"}>
                        {sent}
                      </Text>,
                    ],
                    [
                      <Text key={"returnslabel"}>Returns</Text>,
                      <Text style={{ textAlign: "right" }} key={"returnamount"}>
                        {sendingReturns}
                      </Text>,
                    ],
                    [
                      <Text key={"reclabel"}>Payable Amount</Text>,
                      <Text style={{ textAlign: "right" }} key={"recamount"}>
                        {total}
                      </Text>,
                    ],
                  ],
                }}
              />
            )}
          {form.values.reportType !== "sending" &&
            (form.values.party
              ? parties.data.find((r) => r.id === form.values.party)?.type !== "supplier"
              : true) &&
            (form.values.invoiceFilter
              ? invoices.data.find((r) => r.id === form.values.invoiceFilter)?.type !== "purchase"
              : true) && (
              <Table
                w={"15rem"}
                fz={"sm"}
                horizontalSpacing={1}
                verticalSpacing={0}
                data={{
                  body: [
                    [
                      <Text key={"sialabel"}>Sales Amount</Text>,
                      <Text style={{ textAlign: "right" }} key={"siamount"}>
                        {recieving}
                      </Text>,
                    ],
                    [
                      <Text key={"reclabel"}>Recieved Amount</Text>,
                      <Text style={{ textAlign: "right" }} key={"recamount"}>
                        {recieved}
                      </Text>,
                    ],
                    [
                      <Text key={"sreturnslabel"}>Returns</Text>,
                      <Text style={{ textAlign: "right" }} key={"sreturnamount"}>
                        {recievingReturns}
                      </Text>,
                    ],
                    [
                      <Text key={"stotallabel"}>Recivable Amount</Text>,
                      <Text style={{ textAlign: "right" }} key={"stotalamount"}>
                        {totalRecieving}
                      </Text>,
                    ],
                  ],
                }}
              />
            )}
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
