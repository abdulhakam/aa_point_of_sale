"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/useAPI";
import { NSelect } from "@/app/components/BetterComps/Select";
import DataViewTable from "@/app/components/DataViewTable";
import { qtyDisplay } from "@/app/components/functions/qtyParser";
import { Button, Chip, Group } from "@mantine/core";
import { useForm } from "@mantine/form";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

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
    width: "5em",
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
    width: "7em",
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
        <Chip size='xs' key={`company-name-chip-${i}-${cmp.id}`}>
          {cmp.name}
        </Chip>
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
  const form = useForm({
    initialValues: {
      company: "" as any,
      party: "" as any,
      area: "" as any,
      section: "" as any,
    },
  });
  const transactions = useCRUD().fullList({
    collection: "invoices_by_company",
    expand: "invoice,invoice_maker,booker,company,party,area,section,original_invoices",
    filter: `(type = "sale" || type = "return")
            ${form.values.company ? `&& (company = "${form.values.company}")` : ""}
            ${form.values.party ? `&& (party = "${form.values.party}")` : ""}
            ${form.values.area ? `&& (area = "${form.values.area}")` : ""}
            ${form.values.section ? `&& (section = "${form.values.section}")` : ""}
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
  console.log({ ...transactions.data, ...payments.data });
  const queries = [transactions, payments];
  if (checkSuccess(queries)) {
    return (
      <>
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
        <h2>Company Sale & Payment Report</h2>
        <DataViewTable
          fz={"xs"}
          horizontalSpacing={2}
          report
          data={[...transactions.data, ...payments.data]}
          columns={columns}
        />
      </>
    );
  } else return <StatusCheck check={queries} />;
}
