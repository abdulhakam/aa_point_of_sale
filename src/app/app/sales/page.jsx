"use client";
import pb from "@/app/pocketbase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParties } from "@/app/api/parties";
import { listItems } from "@/app/api/items";
import { Box, Button, Group, NumberInput, Select, TableData, Text } from "@mantine/core";
import idGenerator from "@/app/components/functions/idGenerator";
import { getUser } from "@/app/api/users";
import { useTime } from "@/app/hooks/useTime";
import { invoiceFormStructure, useInvoices } from "@/app/api/invoices";
import { checkError, checkLoading, checkSuccess, getError } from "@/app/api/statusCheck";
import { TransactionForm } from "./TransactionForm";
import { useEffect, useState } from "react";
import { createInvoice } from "@/app/api/invoices";
import TransactionTable from "./TransactionTable";
import { useTransactions } from "@/app/api/transactions";
import { Invoice } from "@/app/api/types";
export default function InvoiceMaker() {
  const items = useQuery({ queryKey: ["items"], queryFn: listItems });
  const invoices = useInvoices();
  const parties = useParties();
  const transactions = useTransactions().data;
  const user = useQuery({
    queryKey: ["user", pb.authStore?.model?.id],
    queryFn: async () => await getUser(pb.authStore.model.id),
  });
  const qc = useQueryClient();
  const newInvoice = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      setInvoiceEditing(true);
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setParty(invoiceData?.expand?.party?.id);
    },
  });
  const updateInvoice = useMutation({
    mutationFn: invoiceFormStructure.onUpdate,
    onSuccess: () => {
      setInvoiceEditing(false);
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setParty('pty000000000000');
      setInvoiceNo('new')
    },
  });

  const saleInvoices = invoices.saleInvoices;
  const [party, setParty] = useState("pty000000000000");
  const [invoiceNo, setInvoiceNo] = useState("new");
  const [invoiceEditing, setInvoiceEditing] = useState(false);
  const records = transactions?.filter((tr) => tr.invoice === invoiceNo);

  const invoiceData = invoices?.allInvoices?.find((inv) => inv.id === invoiceNo);

  const tot = records?.reduce((acc, currval) => acc + currval.total, 0);
  const [total, setTotal] = useState(tot);
  const [disc_1, setDisc_1] = useState(0);
  const [disc_2, setDisc_2] = useState(0);
  const [tAD, setTAD] = useState(0);
  const isError = checkError([items, invoices, parties, user]);
  const isLoading = checkLoading([items, invoices, parties, user]);
  const isSuccess = checkSuccess([items, invoices, parties, user]);
  const error = getError([items, invoices, parties, user]);

  useEffect(() => {
    setTotal(tot);
    setTAD(total - disc_1 - disc_2);
    setParty(invoiceData?.party);
  }, [tot, total, disc_1, disc_2]);

  function invoiceCreator() {
    const data = {
      id: idGenerator(invoices.saleInvoices.length + 1, "pos"),
      invoice_maker: user.data.id,
      party: party,
      transactions: [],
      type: "sale",
    };
    setInvoiceNo(data.id);
    newInvoice.mutate(data);
  }

  function invComplete() {
    const data = {
      id: invoiceNo,
      party: party,
      total: total,
      discount_1: disc_1,
      discount_2: disc_2,
      total_after_discount: tAD,
      description: "",
    };
    updateInvoice.mutate(data)
  }
  return (
    <>
      {isLoading ? (
        <h1>Loading</h1>
      ) : isError ? (
        <h1>{error?.message}</h1>
      ) : isSuccess ? (
        <Box>
          <Text size='xl' fw={600}>
            Sale Invoice
          </Text>
          <hr />
          <Group justify='space-between'>
            <Group>
              <Text>Invoice#:</Text>
              <Select
                readOnly={invoiceEditing}
                searchable
                name='invoiceNo'
                variant='filled'
                style={{ width: "11rem" }}
                data={[...saleInvoices.map((inv) => inv.id), "new"]}
                defaultValue={"new"}
                onChange={(v) => setInvoiceNo(v)}
                value={invoiceNo}
              />
              {invoiceNo !== "new" ? <Button onClick={() => setInvoiceEditing(true)}>Edit</Button> : null}
            </Group>
            <Group>
              <Text span>Customer:</Text>
              <Select
                readOnly={invoiceEditing}
                searchable
                style={{ width: "12rem" }}
                size='md'
                variant='unstyled'
                value={party}
                onChange={(value) => setParty(value)}
                data={parties.customers.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Group>
            <Text mr={"xl"}>Invoice Maker:{` ${user.data.name}`}</Text>
          </Group>
          <Group align="end">
            <NumberInput readOnly label={"Total"} value={total} />
            <NumberInput onChange={(v) => setDisc_1(Number(v))} label={"Disc_1"} value={disc_1} />
            <NumberInput onChange={(v) => setDisc_2(Number(v))} label={"Disc_2"} value={disc_2} />
            <NumberInput readOnly label={"Total After Discount"} value={tAD} />
            {!invoiceEditing ? (
              invoiceNo === "new" ? (
                <Button onClick={invoiceCreator}>OK</Button>
              ) : null
            ) : (
              <Button onClick={invComplete}>Complete Invoice</Button>
            )}
          </Group>
          <TransactionForm disabled={!invoiceEditing} invoice={invoiceNo} items={items.data} />
          {invoiceEditing && <TransactionTable invoiceNo={invoiceNo} />}
        </Box>
      ) : null}
    </>
  );
}
