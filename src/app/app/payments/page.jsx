"use client";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Button, Checkbox, Flex, Group, Modal, Select, Stack, Table, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import useCRUD from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import dataFilter from "@/app/components/functions/dataFilter";
import NewPayment from "./NewPayment";
import { DateInput, DatePicker } from "@mantine/dates";
import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";
import { paymentCreateForm } from "@/app/api/payments";
import PaymentsReport from "../reports/payments/PaymentsReport";

export default function Payments() {
  return (
    <>
      <NewPayment />
      <PaymentsReport />
    </>
  );
}

function getOutstandingPayments(payments) {
  const invoices = Object.values(
    payments.reduce((acc, obj) => {
      const invoiceId = obj.expand.invoice.id;
      const amount = Number(obj.amount).toPrecision(2) * (obj.paid ? -1 : 1);

      acc[invoiceId] = acc[invoiceId] || { ...obj, amount: 0, invoices: [] };
      acc[invoiceId].invoices.push(obj);
      acc[invoiceId].amount += amount;

      return acc;
    }, {})
  ).filter((invoice) => invoice.amount !== 0);
  return invoices;
}
