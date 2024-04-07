"use client";
import useCRUD from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import ReportViewTable from "@/app/components/ReportViewTable";
import dataFilter from "@/app/components/functions/dataFilter";
import { useEffect, useRef, useState } from "react";
import { ActionIcon, Button, Flex, Group, Modal, Select, Stack, Table, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { getQty, qtyDisplay } from "@/app/components/functions/qtyParser";
import { IconPrinter } from "@tabler/icons-react";
import { useReactToPrint } from "react-to-print";
import PrintHead from "@/app/components/printing/PrintHead";
import { useSearchParams } from "next/navigation";
import InvoicePrintQueue from "./queue/page";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "created", hidden: true },
  { accessor: "item", width: "8em" },
  {
    accessor: "box_size_qty",
    title: "Ctn Size",
    width: "3em",
    render: (record) => record.expand.item.box_size_qty,
  },
  { accessor: "ctn", width: "2em", render: (record) => getQty(record.expand.item, record.qty).ctns },
  { accessor: "units", width: "2em", render: (record) => getQty(record.expand.item, record.qty).units },
  { accessor: "scheme", title: "Free (units)", width: "3em" },
  { accessor: "price", width: "3em" },
  { accessor: "discount_1", title: "D1", width: "2em" },
  { accessor: "discount_2", title: "D2", width: "3em" },
  { accessor: "total", width: "4em", render: ({ total }) => Number(total).toFixed(2) },
];

export default function PrintInvoice() {
  const invoices = useCRUD().fullList({
    collection: "invoice_view",
    expand: "invoice_maker,party,booker,party.area,party.area.section",
  });
  const [type, setType] = useState("purchase");
  const [invoiceNo, setInvoiceNo] = useState("");
  const filteredInvoices = dataFilter(
    [
      {
        key: "type",
        value: type,
      },
    ],
    invoices.data
  );
  const queries = [invoices];
  if (checkSuccess(queries)) {
    return (
      <>
        <Group align='end'>
          <Select
            searchable
            allowDeselect={false}
            label={"Invoice Type:"}
            data={["purchase", "sale"]}
            value={type}
            onChange={setType}
          />
          <Select
            searchable
            allowDeselect={false}
            label={"Invoice No:"}
            data={filteredInvoices.map((inv) => ({ value: inv.id, label: String(inv.invoiceNo) }))}
            value={invoiceNo}
            onChange={setInvoiceNo}
          />
          <Button
            mt={"sm"}
            component='a'
            target='_blank'
            href={`/app/invoices/print?invoiceId=${invoiceNo}`}
            variant='outline'
          >
            View Invoice
          </Button>
        </Group>
        <Group align="start">
          <div style={{ width: "28vw" }}>
            <InvoicePrintQueue />
          </div>
          <Flex mt={"sm"} style={{ height:"80vh",width:"60vw"}}>
            {invoiceNo && (
              <iframe style={{flex:1}} src={`/app/invoices/print?invoiceId=${invoiceNo}`} />
            )}
          </Flex>
        </Group>
      </>
    );
  }
}
