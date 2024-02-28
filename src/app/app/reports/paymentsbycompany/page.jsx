"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/useAPI";
import { NSelect } from "@/app/components/BetterComps/Select";
import { Table, ActionIcon, Button, Chip, Group } from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { useState, useRef } from "react";
import { DateInput } from "@mantine/dates";
import PrintHead from "@/app/components/printing/PrintHead";
import { useReactToPrint } from "react-to-print";
import PrintContent from "@/app/components/printing/PrintContent";

const columns = [
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
    width: "8em",
    render: (record) => (record.type === "recieving" ? "Sale Payment" : record.type),
  },
  {
    accessor: "invoice",
    sortable: true,
    width: "4em",
    render: (record) => <>{`${record.expand?.invoice?.invoiceNo || ""}`}</>,
  },
  {
    accessor: "original_invoices",
    title: "Main Invoice",
    width: "4em",
    render: (record) => `${record.expand?.original_invoices?.[0].invoiceNo || ""}`,
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
    sortable: true,
    render: (record) =>
      record.expand?.company?.name ||
      record.expand?.company?.map((cmp, i) => (
        <span
          style={{
            display: "inline-block",
            margin: "0 1px",
            border: "1px solid black",
            padding: "2px",
            borderRadius: "10px",
          }}
          key={`company-name-chip-${i}-${cmp.id}`}
        >
          {cmp.name}
        </span>
      )),
  },
  { accessor: "party", sortable: true },
  { accessor: "booker", sortable: true },
  {
    accessor: "amount",
    sortable: true,
    render: (record) => <>{`${record.amount != null ? record.amount.toFixed(2) : -0}`}</>,
  },
  {
    accessor: "paid",
    hidden: true,
    title: "Payment",
    render: (record) => <>{record.paid ? "O" : "X"}</>,
  },
  { accessor: "description", sortable: true },
];

export default function ItemTransactionsReport() {
  const printRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: "@page {size: A4; margin: 0.6cm 1.0cm 0.6cm 0.5cm !important;}",
  });
  const [fromDate, setFromDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0)
  );
  const [toDate, setToDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 23, 59, 59, 999)
  );
  const form = useForm({
    initialValues: {
      company: "",
      party: "",
      area: "",
      section: "",
      booker: "",
    },
  });
  const transactions = useCRUD().fullList({
    collection: "invoices_by_company",
    expand: "invoice,invoice_maker,booker,company,party,area,section,original_invoices",
    filter: `(type = "sale" || type = "return" || type = "recieving")
            && (created >= '${new Date(
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
      .slice(0, 19)}')
            ${form.values.company ? `&& (company = "${form.values.company}")` : ""}
            ${form.values.party ? `&& (party = "${form.values.party}")` : ""}
            ${form.values.area ? `&& (area = "${form.values.area}")` : ""}
            ${form.values.section ? `&& (section = "${form.values.section}")` : ""}
            ${form.values.booker ? `&& (booker = "${form.values.booker}")` : ""}
            `,
  });
  const payments = useCRUD().fullList({
    collection: "payments_view",
    expand: "invoice,invoice_maker,booker,company,party,area,section,original_invoices",
    filter: `(type = "recieving" || type = "return") 
    && (description = "payment")
    ${form.values.company ? `&& (company ~ "${form.values.company}")` : ""}
    ${form.values.party ? `&& (party = "${form.values.party}")` : ""}
    ${form.values.area ? `&& (area = "${form.values.area}")` : ""}
    ${form.values.section ? `&& (section = "${form.values.section}")` : ""}
    `,
  });
  const queries = [transactions, payments];
  if (checkSuccess(queries)) {
    const allData = [...transactions.data, ...payments.data];
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
        <Group>
          <DateInput
            value={fromDate}
            onChange={(v) =>
              setFromDate(
                new Date(new Date(v).getFullYear(), new Date(v).getMonth(), new Date(v).getDate(), 0, 0, 0, 0)
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
          <Button onClick={() => form.reset()}>Reset</Button>
        </Group>
        <div style={{ marginLeft: "1em", marginRight: "1em" }} ref={printRef}>
          <PrintContent>
            <h3>Company Sale & Payment Report</h3>
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
          </PrintContent>
        </div>
      </>
    );
  } else return <StatusCheck check={queries} />;
}
