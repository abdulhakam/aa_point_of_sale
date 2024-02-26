"use client";
import useCRUD, { crud } from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import { Button, Checkbox, NumberInput, Select, Stack, Textarea } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";

export default function EditPayment({ close, recordData }) {
  const queryClient = useQueryClient();
  // const rdata = useCRUD().read({ collection: "payments", recordID });
  const parties = useCRUD().fullList({ collection: "parties" });
  const invoices = useCRUD().fullList({ collection: "invoice_view" });
  const editPayment = useMutation({
    mutationFn: crud.update,
    onSuccess: () => {
      queryClient.invalidateQueries();
      notifications.show({
        title: "Success",
        message: "Payment Updated",
        color: "green",
      });
      close();
    },
  });
  const form = useForm({
    initialValues: {
      id: recordData.id,
      invoiceType: recordData.expand?.invoice.type,
      invoiceNo: recordData.invoice,
      type: recordData.type,
      party: recordData.party,
      paid: recordData.paid,
      amount: recordData.amount,
      description: recordData.description,
      paymentDate: new Date(recordData.payment_date.slice(0, 10)) ?? new Date(),
    },
  });

  function autoSelectType(party) {
    const partyType = parties.data?.find((pty) => pty.id === party)?.type;
    form.setFieldValue("type", partyType === "customer" ? "recieving" : "sending");
  }

  function autoSetData(invoiceNo) {
    const invoice = invoices.data?.find((inv) => inv.id === invoiceNo);
    form.setFieldValue("party", invoice.party);
    autoSelectType(invoice.party);
    form.setFieldValue("paid", true);
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
    const fdata =
      invoices.data?.find((inv) => inv.id === form.values.invoiceNo).type === "sale"
        ? { ...data, booker: invoices.data?.find((inv) => inv.id === form.values.invoiceNo).booker }
        : data;
    editPayment.mutate({ collection: "payments", recordID: form.values.id, data: fdata });
  }

  const queries = [parties, invoices];
  if (checkSuccess(queries)) {
    return (
      <Stack gap={"xs"}>
        <DateInput
          label='Date'
          value={form.values.paymentDate}
          onChange={(v) => form.setFieldValue("paymentDate", v)}
        />
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
          required
        />
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
          required
        />
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
          }}
        />
        <Select
          readOnly
          label='Type'
          variant='unstyled'
          searchable
          data={["sending", "recieving"]}
          value={form.values.type}
          onChange={(v) => form.setFieldValue("type", v)}
        />
        <Checkbox
          label='Paid'
          checked={form.values.paid}
          onChange={(event) => form.setFieldValue("paid", event.currentTarget.checked)}
        />
        <NumberInput
          label='Amount'
          value={form.values.amount}
          onChange={(v) => form.setFieldValue("amount", Number(v))}
        />
        <Textarea
          label='description'
          value={form.values.description}
          disabled
          onChange={(event) => form.setFieldValue("description", event.currentTarget.value)}
        />
        <Button
          onClick={() => {
            submitHandler();
            close();
          }}
        >
          Submit
        </Button>
      </Stack>
    );
  } else return <StatusCheck check={queries} />;
}
