"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/useAPI";
import { NSelect } from "@/app/components/BetterComps/Select";
import DataViewTable from "@/app/components/DataViewTable";
import { qtyDisplay } from "@/app/components/functions/qtyParser";
import { ActionIcon, Button, Chip, Group } from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState,useRef} from "react";
import { DateInput } from "@mantine/dates";
import PrintHead from "@/app/components/printing/PrintHead";
import { useReactToPrint } from "react-to-print";

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
    render:(record)=> record.type==="recieving"?"Sale Payment":record.type
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
      area: "",
      section: "",
      booker: ""
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
            ${form.values.booker ? `&& (booker = "${form.values.booker}")`:""}
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
            <PrintHead />
        <h2>Company Sale & Payment Report</h2>
        <DataViewTable
          fz={"7pt"}
          horizontalSpacing={2}
          report
          data={[...transactions.data, ...payments.data]}
          columns={columns}
        />
        </div>
      </>
    );
  } else return <StatusCheck check={queries} />;
}
