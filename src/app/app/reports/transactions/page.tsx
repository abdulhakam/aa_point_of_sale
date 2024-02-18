"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/useAPI";
import { NSelect } from "@/app/components/BetterComps/Select";
import DataViewTable from "@/app/components/DataViewTable";
import { qtyDisplay } from "@/app/components/functions/qtyParser";
import { Group } from "@mantine/core";
import { useForm } from "@mantine/form";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

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
  },
  {
    accessor: "invoiceNo",
    title: "Invoice",
    sortable: true,
    render: (row) => <Link href={`/app/invoices/print?invoiceId=${row.invoice}`}>{row.invoiceNo}</Link>,
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
    hidden:true,
    // sortable: true,
  },
  { accessor: "price" },
  {
    accessor: "qty",
    title: "Qty",
    sortable: true,
    render: (row) => qtyDisplay(row.expand?.item, row.qty),
  },
  {
    accessor: "scheme",
    title: "Free",
    sortable: true,
  },
  { accessor: "discount_1" },
  { accessor: "discount_2" },
  { accessor: "inv_d1", title: "Inv Disc1" },
  { accessor: "inv_d2", title: "Inv Disc2" },
  {
    accessor: "total",
    title: "Amount",
    sortable: true,
  },
];

export default function ItemTransactionsReport() {
  const form = useForm({
    initialValues: {
      company: "" as any,
      party: "" as any,
      area: "" as any,
      section: "" as any,
      item: "" as any,
    },
  });
  const transactions = useCRUD().fullList({
    collection: "transactions_report",
    expand: "item,company,party,party.area,party.area.section",
    filter: `(type = "sale" || type = "return")
            ${form.values.company ? `&& (company = "${form.values.company}")` : ""}
            ${form.values.party ? `&& (party = "${form.values.party}")` : ""}
            ${form.values.area ? `&& (area = "${form.values.area}")` : ""}
            ${form.values.section ? `&& (section = "${form.values.section}")` : ""}
            ${form.values.item ? `&& (item = "${form.values.item}")` : ""}`,
  });
  const queries = [transactions];
  if (checkSuccess(queries)) {
    return (
      <>
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
        </Group>
        <h2>All Transactions Report</h2>
        <DataViewTable fz={"xs"} horizontalSpacing={2} report data={transactions.data} columns={columns} />
      </>
    );
  } else return <StatusCheck check={queries} />;
}
