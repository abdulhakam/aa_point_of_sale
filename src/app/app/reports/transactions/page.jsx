"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/useAPI";
import { NSelect } from "@/app/components/BetterComps/Select";
import DataViewTable from "@/app/components/DataViewTable";
import { qtyDisplay } from "@/app/components/functions/qtyParser";
import { ActionIcon, Group, Table, Text } from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PrintHead from "@/app/components/printing/PrintHead";
import { useState,useRef } from "react";
import { useReactToPrint } from "react-to-print";

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
  { accessor: "area", render: (r) => r.expand?.party?.expand.area?.name },
  { accessor: "section", render: (r) => r.expand?.party?.expand?.area?.expand.section?.name },
  {
    accessor: "item",
    title: "Item",
    // hidden:true,
    sortable: true,
  },
  { accessor: "price", textAlign: "right" },
  {
    accessor: "qty",
    title: "Qty",
    sortable: true,
    render: (row) => qtyDisplay(row.expand?.item, row.qty),
    textAlign: "right",
  },
  {
    accessor: "scheme",
    title: "Free",
    sortable: true,
    textAlign: "right",
  },
  {
    accessor: "discount_1",
    title: "Disc_1",
    textAlign: "right",
    render: (record) => `${record.discount_1}%`,
  },
  {
    accessor: "discount_2",
    title: "Disc_2",
    textAlign: "right",
    render: (record) => `${record.discount_2}%`,
  },
  { accessor: "inv_d1", title: "Inv Disc1", textAlign: "right", render: (record) => `${record.inv_d1}%` },
  { accessor: "inv_d2", title: "Inv Disc2", textAlign: "right", render: (record) => `${record.inv_d2}%` },
  {
    accessor: "total",
    title: "Total",
    sortable: true,
    textAlign: "right",
  },
];

export default function ItemTransactionsReport() {
  const printRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
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
      booker: "",
      area: "",
      invoiceNo: "",
      section: "",
      item: "",
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
            <PrintHead />
        <h2>All Transactions Report</h2>
        <DataViewTable
          height={300}
          fz={"7pt"}
          horizontalSpacing={2}
          report
          data={transactions.data}
          columns={columns}
        />
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
                    <Text fw={700}>{sale}</Text>
                  </Group>,
                ],
                [
                  <Text key={"returnlabel"} fw={700}>
                    Total Returns
                  </Text>,
                  <Group key={"return amount"} justify='end'>
                    <Text fw={700}>{returns}</Text>
                  </Group>,
                ],
                [
                  <Text key={"totallabel"} fw={700}>
                    Total
                  </Text>,
                  <Group key={"Total Amount"} justify='end'>
                    <Text fw={700}>{total}</Text>
                  </Group>,
                ],
              ],
            }}
          />
        </Group>
        </div>
      </>
    );
  } else return <StatusCheck check={queries} />;
}

function calculator(data) {
  const total = data.reduce(
    (total, record) => (record.type === "sale" ? record.total + total : total - record.total),
    0
  );
  const sale = data.reduce((total, record) => (record.type === "sale" ? record.total + total : total), 0);
  const returns = data.reduce((total, record) => (record.type !== "sale" ? total + record.total : total), 0);
  return { total, sale, returns };
}
