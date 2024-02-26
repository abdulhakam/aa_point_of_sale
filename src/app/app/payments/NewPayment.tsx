"use client";
import useCRUD, { crud } from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import { IconCashBanknote } from "@tabler/icons-react";
import {
  ActionIcon,
  Button,
  Checkbox,
  Modal,
  NumberInput,
  Select,
  Stack,
  Textarea,
  Tooltip
} from "@mantine/core";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDisclosure } from "@mantine/hooks";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";

export default function NewPayment() {
  const queryClient = useQueryClient();
  const parties = useCRUD().fullList({ collection: "parties" });
  const invoices = useCRUD().fullList({ collection: "invoice_view" });
  const createPayment = useMutation({
    mutationFn: crud.create,
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
  const [opened, { open, close }] = useDisclosure(false);
  const form = useForm({
    initialValues: {
      invoiceType: "sale",
      invoiceNo: "",
      type: "sale",
      party: "",
      paid: true,
      amount: 0,
      description: "payment",
      paymentDate: new Date(),
    }
  })

  function autoSelectType(party) {
    const partyType = parties.data?.find((pty) => pty.id === party)?.type;
    form.setFieldValue("type", partyType === "customer" ? "recieving" : "sending");
  }

  function autoSetData(invoiceNo) {
    const invoice = invoices.data?.find((inv) => inv.id === invoiceNo);
    form.setFieldValue("party",invoice.party);
    autoSelectType(invoice.party);
    form.setFieldValue("paid",true);
  }
  function submitHandler() {
    const data = {
      invoice: form.values.invoiceNo,
      booker: invoices.data?.find((inv) => inv.id === form.values.invoiceNo).booker || undefined,
      party: form.values.party,
      payment_date: form.values.paymentDate,
      type: form.values.type,
      paid: form.values.paid,
      amount: form.values.amount,
      description: form.values.description,
    };
    const fdata = invoices.data?.find((inv) => inv.id === form.values.invoiceNo).type === "sale"
      ? { ...data, booker: invoices.data?.find((inv) => inv.id === form.values.invoiceNo).booker }
      : data;
    createPayment.mutate({ collection: "payments", data: fdata });
  }

  const queries = [parties, invoices];
  if (checkSuccess(queries)) {
    return (
      <>
        <Modal centered opened={opened} onClose={close} title={`New Payment`}>
          <Stack gap={"xs"}>
            <DateInput label='Date' value={form.values.paymentDate} onChange={(v)=>form.setFieldValue("paymentDate",v)} />
            <Select
              label='Invoice Type'
              searchable
              data={[
                { value: "sale", label: "sale" },
                { value: "purchase", label: "purchase" },
              ]}
              value={form.values.invoiceType}
              onChange={(v) => {
                form.setFieldValue("invoiceType", v);
              }}
              required />
            <Select
              label='InvoiceNo'
              searchable
              data={invoices.data
                ?.filter((invoice) => invoice.type === form.values.invoiceType)
                .map((invoice) => ({ value: invoice.id, label: String(invoice.invoiceNo) }))}
              value={form.values.invoiceNo}
              onChange={(v) => {
                form.setFieldValue("invoiceNo", v);
                autoSetData(v);
              }}
              required />
            <Select
              readOnly
              variant='unstyled'
              label='Party'
              searchable
              data={parties.data?.map((party) => ({ value: party.id, label: party.name }))}
              value={form.values.party}
              onChange={(v) => {
                form.setFieldValue("party", v);
                autoSelectType(v);
              }} />
            <Select
              readOnly
              label='Type'
              variant='unstyled'
              searchable
              data={["sending", "recieving"]}
              value={form.values.type}
              onChange={(v) => form.setFieldValue("type", v)} />
            <Checkbox
              label='Paid'
              checked={form.values.paid}
              onChange={(event) => form.setFieldValue("paid",event.currentTarget.checked)} />
            <NumberInput label='Amount' value={form.values.amount} onChange={(v) => form.setFieldValue("amount",Number(v))} />
            <Textarea
              label='description'
              value={form.values.description}
              disabled
              onChange={(event) => form.setFieldValue("description",event.currentTarget.value)} />
            <Button
              onClick={() => {
                submitHandler();
                close();
              }}
            >
              Submit
            </Button>
          </Stack>
        </Modal>
        <Tooltip label={`New Payment`}>
          <ActionIcon mx={"0.3rem"} mb={"0.3rem"} size={"xl"} onClick={open}>
            <IconCashBanknote />
          </ActionIcon>
        </Tooltip>
      </>
    );
  } else return <StatusCheck check={queries} />;
}
