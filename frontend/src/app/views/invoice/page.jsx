"use client";
import React from "react";
import useCRUD from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import { useEffect, useRef, useState } from "react";
import { Flex, Group, Stack, Table, Text } from "@mantine/core";
import { getQty } from "@/app/components/functions/qtyParser";
import { useSearchParams } from "next/navigation";
import InvoiceBody from "@/app/app/invoices/printinvoice/queue/invoicebody";

const head = (
  <Table.Thead>
    <Table.Tr>
      <Table.Th scope='col' rowSpan={2}>
        #
      </Table.Th>
      <Table.Th scope='col' rowSpan={2}>
        ITEM
      </Table.Th>
      <Table.Th scope='col' style={{ width: "3em" }} rowSpan={2}>
        BOX SIZE
      </Table.Th>
      <Table.Th scope='col' colSpan={3}>
        QUANTITY
      </Table.Th>
      <Table.Th scope='col' colSpan={2}>
        PRICES
      </Table.Th>
      <Table.Th scope='col' colSpan={3}>
        DISCOUNTS
      </Table.Th>
      <Table.Th scope='col' rowSpan={2}>
        TOTAL
      </Table.Th>
    </Table.Tr>
    <Table.Tr>
      <Table.Th scope='col'>CTN</Table.Th>
      <Table.Th scope='col'>UNITS</Table.Th>
      <Table.Th scope='col'>FREE</Table.Th>
      <Table.Th scope='col'>UNIT</Table.Th>
      <Table.Th scope='col'>CARTON</Table.Th>
      <Table.Th scope='col'>1(%)</Table.Th>
      <Table.Th scope='col'>2(%)</Table.Th>
      <Table.Th scope='col'>IN RS</Table.Th>
    </Table.Tr>
  </Table.Thead>
);
export default function InvoicePrint() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoiceId");

  const invoices = useCRUD().read({
    collection: "invoice_view",
    recordID: invoiceId,
    expand: "invoice_maker,party,booker,party.area,party.area.section",
  });
  const transactions = useCRUD().fullList({
    collection: "transaction_view",
    expand: "item",
    filter: `invoice = '${invoiceId}'`,
    sort: "+created",
  });
  const invoice = invoices.data;
  const queries = [invoices, transactions];
  if (checkSuccess(queries)) {
    return (
      <>
        <InvoiceBody
          invoice={invoice}
          transactions={transactions.data}
        />
      </>
    );
  } else return <StatusCheck check={queries} />;
}
