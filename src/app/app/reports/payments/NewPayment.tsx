"use client";

import CreateRecord from "@/app/components/CreateRecord/CreateRecord";
import useCRUD, { crud } from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import { IconCashBanknote } from "@tabler/icons-react";
import { Button, Checkbox, NumberInput, Select, Stack, Textarea } from "@mantine/core";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  const [invoiceType, setInvoiceType] = useState("sale");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [type, setType] = useState("sale");
  const [party, setParty] = useState("");
  const [paid, setPaid] = useState(true);
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("payment");

  function autoSelectType(party) {
    const partyType = parties.data?.find((pty) => pty.id === party)?.type;
    setType(partyType === "customer" ? "recieving" : "sending");
  }

  function autoSetData(invoiceNo) {
    const invoice = invoices.data?.find((inv) => inv.id === invoiceNo);
    setParty(invoice.party);
    autoSelectType(invoice.party);
    setPaid(true);
  }
  function submitHandler() {
    const data = {
      invoice: invoiceNo,
      booker: invoices.data?.find((inv) => inv.id === invoiceNo).booker||undefined,
      party: party,
      type: type,
      paid: paid,
      amount: amount,
      description: description,
    };
    const fdata =
      invoices.data?.find((inv) => inv.id === invoiceNo).type === "sale"
        ? { ...data, booker: invoices.data?.find((inv) => inv.id === invoiceNo).booker }
        : data;
    createPayment.mutate({ collection: "payments", data:fdata });
  }

  const queries = [parties, invoices];
  if (checkSuccess(queries)) {
    return (
      <CreateRecord icon={<IconCashBanknote />} size="xl" label={"New Payment"}>
        <Stack gap={"xs"}>
          <Select
            label='Invoice Type'
            searchable
            data={[
              { value: "sale", label: "sale" },
              { value: "purchase", label: "purchase" },
            ]}
            value={invoiceType}
            onChange={(v) => {
              setInvoiceType(v);
            }}
            required
          />
          <Select
            label='InvoiceNo'
            searchable
            data={invoices.data
              ?.filter((invoice) => invoice.type === invoiceType)
              .map((invoice) => ({ value: invoice.id, label: String(invoice.invoiceNo) }))}
            value={invoiceNo}
            onChange={(v) => {
              setInvoiceNo(v);
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
            value={party}
            onChange={(v) => {
              setParty(v);
              autoSelectType(v);
            }}
          />
          <Select
            readOnly
            label='Type'
            variant='unstyled'
            searchable
            data={["sending", "recieving"]}
            value={type}
            onChange={setType}
          />
          <Checkbox label='Paid' checked={paid} onChange={(event) => setPaid(event.currentTarget.checked)} />
          <NumberInput label='Amount' value={amount} onChange={(v) => setAmount(Number(v))} />
          <Textarea
            label='description'
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
          />
          <Button onClick={() => {submitHandler();close()}}>Submit</Button>
        </Stack>
      </CreateRecord>
    );
  } else return <StatusCheck check={queries} />;
}
