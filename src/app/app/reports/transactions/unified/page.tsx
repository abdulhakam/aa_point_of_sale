"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/useAPI";
import { NSelect } from "@/app/components/BetterComps/Select";
import { qtyDisplay } from "@/app/components/functions/qtyParser";
import { ActionIcon, Group, Table, Text } from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import Link from "next/link";
import { useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import PrintContent from "@/app/components/printing/PrintContent";
import moment from "moment";

const columns = [
  {
    accessor: "created",
    title: "Date",
    sortable: true,
    render: (row) => String(row.created).slice(0, 10),
  },
  {
    accessor: "type",
    sortable: true,
    width: "3em",
  },
  { accessor: "booker" },
  {
    accessor: "invoiceNo",
    title: "Invoice",
    width: "4em",
    sortable: true,
    render: (row) => (
      <Link href={`/app/invoices/print?invoiceId=${row.invoice}`}>
        {row.type.slice(0, 1).toUpperCase()} {row.invoiceNo}
      </Link>
    ),
  },
  { accessor: "party" },
  {
    accessor: "company",
  },
  { accessor: "area", render: (r) => r.expand?.party?.expand?.area?.name },
  { accessor: "section", render: (r) => r.expand?.party?.expand?.area?.expand.section?.name },
  {
    accessor: "item",
    title: "Item",
    sortable: true,
  },
  {
    accessor: "price",
    hidden: true,
    textAlign: "right" as any,
  },
  {
    accessor: "qty",
    title: "Qty",
    sortable: true,
    render: (row) => qtyDisplay(row.expand?.item, row.qty),
    textAlign: "right" as any,
  },
  {
    accessor: "scheme",
    title: "Free",
    sortable: true,
    textAlign: "right" as any,
  },
  {
    accessor: "discount_1",
    title: "Disc_1",
    textAlign: "right" as any,
    render: (record) => `${record.discount_1}%`,
    hidden: true,
  },
  {
    accessor: "discount_2",
    title: "Disc_2",
    textAlign: "right" as any,
    render: (record) => `${record.discount_2}%`,
    hidden: true,
  },
  { accessor: "discount_rs", title: "Disc_Rs", textAlign: "right" as any, hidden: true },
  {
    accessor: "inv_d1",
    title: "Inv Disc1",
    textAlign: "right" as any,
    render: (record) => `${record.inv_d1}%`,
    hidden: true,
  },
  {
    accessor: "inv_d2",
    title: "Inv Disc2",
    textAlign: "right" as any,
    render: (record) => `${record.inv_d2}%`,
    hidden: true,
  },
  { accessor: "inv_drs", title: "Inv DiscRs", textAlign: "right" as any, hidden: true },
  {
    accessor: "net_amount",
    title: "Total",
    sortable: true,
    textAlign: "right" as any,
    render: (row) => Number(row.net_amount).toFixed(2),
  },
];

export default function ItemTransactionsReport() {
  const printRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "Transaction Report",
    pageStyle: `@page {size: A4; margin: 0.6cm 1.0cm 0.6cm 0.5cm !important;`,
  });
  const [fromDate, setFromDate] = useState(moment().startOf("month").toDate());
  const [toDate, setToDate] = useState(moment().endOf("day").toDate());
  const form = useForm({
    initialValues: {
      company: "" as any,
      party: "" as any,
      booker: "" as any,
      area: "" as any,
      invoiceNo: "" as any,
      section: "" as any,
      item: "" as any,
    },
  });
  const invoices = useCRUD().fullList({
    collection: "invoice_view",
    filter: 'type = "sale" || type = "return"',
  });
  const transactions = useCRUD().fullList({
    collection: "transactions_report",
    expand: "item,company,party,party.area,party.area.section,booker",
    filter: `(type = "sale" || type = "return")
            && (created >= '${moment(fromDate).utc().format("YYYY-MM-DD")}' && created <= '${moment(toDate)
      .utc()
      .format("YYYY-MM-DD")}')
            ${form.values.company ? `&& (company = "${form.values.company}")` : ""}
            ${form.values.party ? `&& (party = "${form.values.party}")` : ""}
            ${form.values.booker ? `&& (booker = "${form.values.booker}")` : ""}
            ${form.values.area ? `&& (area = "${form.values.area}")` : ""}
            ${form.values.section ? `&& (section = "${form.values.section}")` : ""}
            ${form.values.item ? `&& (item = "${form.values.item}")` : ""}
            ${form.values.invoiceNo ? `&& (invoice = "${form.values.invoiceNo}")` : ""}`,
  });
  const queries = [transactions];
  if (checkSuccess(queries)) {
    const { returns, sale, total } = calculator(transactions.data);
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
        <Group>
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
            value={form.values.party}
            onChange={(v) => form.setFieldValue("party", v)}
            dataQuery={{ collectionName: "parties" }}
            options={{ filter: 'type = "customer"' }}
            dataQueryValue='id'
            label={"Party"}
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
            value={form.values.item}
            onChange={(v) => form.setFieldValue("item", v)}
            dataQuery={{ collectionName: "items" }}
            dataQueryValue='id'
            label={"Item"}
          />
          <NSelect
            searchable
            value={form.values.invoiceNo}
            onChange={(v) => form.setFieldValue("invoiceNo", v)}
            data={invoices.data?.map((inv) => ({
              value: inv.id,
              label: `${String(inv.type).slice(0, 1).toUpperCase()} ${inv.invoiceNo}`,
            }))}
            label={"Invoice"}
          />
        </Group>
        <div style={{ marginLeft: "1em", marginRight: "1em" }} ref={printRef}>
          <PrintContent>
            <Group justify='space-between'>
              <h2>All Transactions Report</h2>
              <Text size='md'>
                <b>From:</b> {moment(fromDate).format("DD-MMM-YYYY")} <b>To:</b>{" "}
                {moment(toDate).format("DD-MMM-YYYY")}
              </Text>
            </Group>
            <Group justify='space-between'>
              {form.values.item && (
                <Text size='md'>
                  <b>Item:</b> {transactions.data?.[0]?.expand?.item?.name ?? "NO DATA OR TOO MANY FILTERS"}
                </Text>
              )}
              {form.values.company && (
                <Text size='md'>
                  <b>Company:</b>{" "}
                  {transactions.data?.[0]?.expand?.company?.name ?? "NO DATA OR TOO MANY FILTERS"}
                </Text>
              )}
              {form.values.booker && (
                <Text size='md'>
                  <b>Booker:</b>{" "}
                  {transactions.data?.[0]?.expand?.booker?.name ?? "NO DATA OR TOO MANY FILTERS"}
                </Text>
              )}
              {form.values.party && (
                <Text size='md'>
                  <b>Party:</b> {transactions.data?.[0]?.expand?.party?.name ?? "NO DATA OR TOO MANY FILTERS"}
                </Text>
              )}
              {form.values.area && (
                <Text size='md'>
                  <b>Area:</b> {transactions.data?.[0]?.expand?.area?.name ?? "NO DATA OR TOO MANY FILTERS"}
                </Text>
              )}
              {form.values.section && (
                <Text size='md'>
                  <b>Section:</b>{" "}
                  {transactions.data?.[0]?.expand?.section?.name ?? "NO DATA OR TOO MANY FILTERS"}
                </Text>
              )}
              {form.values.invoiceNo && (
                <Text size='md'>
                  <b>Invoice:</b>{" "}
                  {transactions.data?.[0]?.expand?.invoice?.invoiceNo ?? "NO DATA OR TOO MANY FILTERS"}
                </Text>
              )}
            </Group>
            <Table
              fz={"10pt"}
              horizontalSpacing={1}
              verticalSpacing={0}
              styles={{
                td: { padding: "0.2em", border: "1px solid black" },
                th: { padding: "0.2em", border: "1px solid black" },
              }}
            >
              <Table.Thead>
                <Table.Tr>
                  {columns.map((col) =>
                    col.hidden ? null : (
                      <Table.Td key={`thead-${col.accessor}`}>
                        {(col.title ?? col.accessor).toUpperCase()}
                      </Table.Td>
                    )
                  )}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {transactions.data?.map((row) => (
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
            <Group justify='end'>
              <Table
                w={"14rem"}
                horizontalSpacing={2}
                verticalSpacing={0}
                data={{
                  body: [
                    [
                      <Text key={"sale"} fw={700}>
                        Total Sale
                      </Text>,
                      <Group key={"sale amount"} justify='end'>
                        <Text fw={700}>{sale.toFixed(2)}</Text>
                      </Group>,
                    ],
                    [
                      <Text key={"returnlabel"} fw={700}>
                        Total Returns
                      </Text>,
                      <Group key={"return amount"} justify='end'>
                        <Text fw={700}>{returns.toFixed(2)}</Text>
                      </Group>,
                    ],
                    [
                      <Text key={"totallabel"} fw={700}>
                        Total
                      </Text>,
                      <Group key={"Total Amount"} justify='end'>
                        <Text fw={700}>{total.toFixed(2)}</Text>
                      </Group>,
                    ],
                  ],
                }}
              />
            </Group>
          </PrintContent>
        </div>
      </>
    );
  } else return <StatusCheck check={queries} />;
}

function calculator(data) {
  const total = data.reduce(
    (total, record) => (record.type === "sale" ? record.final_amount + total : total - record.final_amount),
    0
  );
  const sale = data.reduce(
    (total, record) => (record.type === "sale" ? record.final_amount + total : total),
    0
  );
  const returns = data.reduce(
    (total, record) => (record.type !== "sale" ? total + record.final_amount : total),
    0
  );
  return { total, sale, returns };
}
