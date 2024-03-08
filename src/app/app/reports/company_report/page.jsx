"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/useAPI";
import { NSelect } from "@/app/components/BetterComps/Select";
import { Table, ActionIcon, Button, Flex, Group, Checkbox } from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { useState, useRef } from "react";
import { DateInput } from "@mantine/dates";
import { useReactToPrint } from "react-to-print";
import PrintContent from "@/app/components/printing/PrintContent";
import moment from "moment";
const columns = [
  { accessor: "id", hidden: true },
  {
    accessor: "dated",
    title: "Date",
    render: (record) => <>{record.dated.slice(0, 10)}</>,
    sortable: true,
    width: "6em",
  },
  {
    accessor: "type",
    sortable: true,
    width: "7em",
    render: (record) =>
      record.description === "payment" ? `${record.type} payment` : `${record.type} invoice`,
  },
  {
    accessor: "invoice",
    sortable: true,
    width: "4em",
    render: (record) => `${record.invoiceNo || ""} ${record.type.charAt(0).toUpperCase()}`,
  },
  {
    accessor: "original_invoice",
    title: "Main Invoice",
    width: "4em",
    render: (record) => `${record.expand?.original_invoice?.[0]?.invoiceNo ?? "-"} ${record.expand?.original_invoice?.[0]?.type.charAt(0).toUpperCase() ?? "-"}`,
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
  { accessor: "booker", sortable: true },
  {
    accessor: "amount",
    sortable: true,
    textAlign: "right",
    render: (record) => <>{`${record.amount != null ? record.amount.toFixed(2) : -0}`}</>,
  },
  {
    accessor: "paid",
    hidden: true,
    title: "Payment",
    render: (record) => <>{record.paid ? "O" : "X"}</>,
  },
  { accessor: "description", sortable: true, hidden: true },
];

export default function ItemTransactionsReport() {
  const printRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: "@page {size: A4; margin: 0.6cm 1.0cm 0.6cm 0.5cm !important;}",
  });
  const [fromDate, setFromDate] = useState(new Date(moment().startOf("month")));
  const [toDate, setToDate] = useState(new Date(moment().endOf("day")));
  const [applyDate, setApplyDate] = useState(true);
  const form = useForm({
    initialValues: {
      company: "",
      party: "",
      area: "",
      section: "",
      booker: "",
      invoice: "",
    },
  });

  const areas = useCRUD().fullList({ collection: "areas" });
  const sections = useCRUD().fullList({ collection: "sections" });
  const companies = useCRUD().fullList({ collection: "categories" });
  const parties = useCRUD().fullList({ collection: "parties" });
  const bookers = useCRUD().fullList({ collection: "order_bookers" });
  const invoices = useCRUD().fullList({ collection: "invoice_view", filter: `type != 'purchase'` });

  const transactions = useCRUD().fullList({
    collection: "payments_invoices_report",
    expand: "area,section,company,party,booker,original_invoice",
    filter: `(dated >= '${moment.utc(fromDate).format("YYYY-MM-DD HH:mm:ss")}' 
                && dated <= '${moment.utc(toDate).format("YYYY-MM-DD HH:mm:ss")}')
            ${form.values.company ? `&& (company = "${form.values.company}")` : ""}
            ${form.values.party ? `&& (party = "${form.values.party}")` : ""}
            ${form.values.area ? `&& (area = "${form.values.area}")` : ""}
            ${form.values.section ? `&& (section = "${form.values.section}")` : ""}
            ${form.values.booker ? `&& (booker = "${form.values.booker}")` : ""}
            ${form.values.invoice ? `&& (invoice = "${form.values.invoice}")` : ""}
            `,
  });

  const queries = [transactions, areas, sections, companies, parties, bookers];
  if (checkSuccess(queries)) {
    const allData = transactions.data.map((r) => ({
      ...r,
      expand: { ...r.expand, company: companies.data.find((c) => c.id === r.company) },
    }));
    const { total, invoiceTotal, totalPaid, recievingReturns } = calculator(allData);
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
        <Group align='end'>
          <DateInput
            value={fromDate}
            onChange={(v) => setFromDate(new Date(moment(v).startOf("day")))}
            label='Date From'
          />
          <DateInput
            value={toDate}
            onChange={(v) => setToDate(new Date(moment(v).endOf("day")))}
            label='Date To'
          />
          <Checkbox
            mb={"0.5em"}
            label='Apply Date Filter'
            checked={applyDate}
            onChange={(event) => setApplyDate(event.currentTarget.checked)}
          />
        </Group>
        <Group align='end'>
          <NSelect
            searchable
            value={form.values.company}
            onChange={(v) => form.setFieldValue("company", v)}
            dataQuery={{ collectionName: "categories" }}
            dataQueryValue='id'
            label={"Company"}
          />
          <NSelect
            searchable
            value={form.values.booker}
            onChange={(v) => form.setFieldValue("booker", v)}
            dataQuery={{ collectionName: "order_bookers" }}
            dataQueryValue='id'
            label={"Booker"}
          />
          <NSelect
            searchable
            value={form.values.party}
            onChange={(v) => form.setFieldValue("party", v)}
            dataQuery={{ collectionName: "parties" }}
            options={{ filter: 'type = "customer"' }}
            dataQueryValue='id'
            label={"Party"}
          />
          <NSelect
            searchable
            value={form.values.area}
            onChange={(v) => form.setFieldValue("area", v)}
            dataQuery={{ collectionName: "areas" }}
            dataQueryValue='id'
            label={"Area"}
          />
          <NSelect
            searchable
            value={form.values.section}
            onChange={(v) => form.setFieldValue("section", v)}
            dataQuery={{ collectionName: "sections" }}
            dataQueryValue='id'
            label={"Section"}
          />
          <NSelect
            searchable
            value={form.values.invoice}
            onChange={(v) => form.setFieldValue("invoice", v)}
            data={invoices.data?.map((inv) => ({
              value: inv.id,
              label: `${inv.invoiceNo} ${inv.type.charAt(0).toUpperCase()}`,
            }))}
            label={"Invoice"}
          />
          <Button onClick={() => form.reset()}>Reset</Button>
        </Group>
        <div style={{ marginLeft: "1em", marginRight: "1em" }} ref={printRef}>
          <PrintContent>
            <h3>Company Sale and Payment Report</h3>
            <Table
              fz={"xs"}
              horizontalSpacing={1}
              verticalSpacing={0}
              styles={{
                td: { fontSize: "xs", padding: "0.2em", border: "1px solid black" },
                th: { fontSize: "xs", padding: "0.2em", border: "1px solid black" },
              }}
            >
              <Table.Thead>
                <Table.Tr>
                  {columns.map((col) =>
                    col.hidden ? null : (
                      <Table.Td
                        style={{ textAlign: col.textAlign ?? "start", width: col.width ?? "auto" }}
                        key={`thead-${col.accessor}`}
                      >
                        {(col.title ?? col.accessor).toUpperCase()}
                      </Table.Td>
                    )
                  )}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {allData.map((row) => (
                  <Table.Tr key={`row-${row.id}`}>
                    {columns.map((col) =>
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
            <Flex mt={"xs"} justify={"end"}>
              <Table
                w={"auto"}
                fz={"sm"}
                horizontalSpacing={1}
                verticalSpacing={0}
                styles={{
                  td: { padding: "0.2em", border: "1px solid black" },
                  th: { padding: "0.2em", border: "1px solid black" },
                }}
              >
                <Table.Tr>
                  <Table.Td style={{ width: "7em" }}>Invoice Total</Table.Td>
                  <Table.Td style={{ textAlign: "right", width: "8em" }}>{invoiceTotal}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td style={{ width: "7em" }}>Returns</Table.Td>
                  <Table.Td style={{ textAlign: "right", width: "8em" }}>{recievingReturns}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td style={{ width: "7em" }}>Total Paid</Table.Td>
                  <Table.Td style={{ textAlign: "right", width: "8em" }}>{totalPaid}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td style={{ width: "7em" }}>Total</Table.Td>
                  <Table.Td style={{ textAlign: "right", fontWeight: "bold", width: "8em" }}>
                    {total}
                  </Table.Td>
                </Table.Tr>
              </Table>
            </Flex>
          </PrintContent>
        </div>
      </>
    );
  } else return <StatusCheck check={queries} />;
}

function calculator(payments) {
  
  const recieving = payments.reduce(
    (amnt, pmnt) => (pmnt.type === "sale" ? (!pmnt.paid ? amnt + pmnt.amount : amnt) : amnt),
    0
  );
  const recieved = payments.reduce(
    (amnt, pmnt) => (pmnt.type === "sale" ? (pmnt.paid ? amnt + pmnt.amount : amnt) : amnt),
    0
  );
  const sending = payments.reduce(
    (amnt, pmnt) => (pmnt.type === "purchase" ? (!pmnt.paid ? amnt + pmnt.amount : amnt) : amnt),
    0
  );
  const sent = payments.reduce(
    (amnt, pmnt) => (pmnt.type === "purchase" ? (pmnt.paid ? amnt + pmnt.amount : amnt) : amnt),
    0
  );
  
  const sendingReturns = payments.reduce(
    (amnt, pmnt) => (pmnt.type === "return" ? amnt + pmnt.amount :  amnt),
    0
  );
  const recievingReturns = payments.reduce(
    (amnt, pmnt) => (pmnt.type === "return" ? amnt + pmnt.amount :  amnt),
    0
  );
  const totalPaid = payments.reduce(
    (amnt, pmnt) => (pmnt.paid ? amnt + pmnt.amount :  amnt),
    0
  );
  const invoiceTotal = payments.reduce(
    (amnt, pmnt) => ((!pmnt.paid && pmnt.type !== "return") ? amnt + pmnt.amount :  amnt),
    0
  );

  
  const totalSending = Number((sending - sent - sendingReturns).toFixed(2));
  const totalRecieving = Number((recieving - recieved - recievingReturns).toFixed(2));
  const total = Number((invoiceTotal - totalPaid - recievingReturns).toFixed(2));
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
