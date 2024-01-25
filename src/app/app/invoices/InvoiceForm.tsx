"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD, { crud } from "@/app/api/useAPI";
import pb from "@/app/pocketbase";
import { NSelect } from "@/app/components/BetterComps/Select";
import {
  Button,
  Checkbox,
  Flex,
  Group,
  Modal,
  NumberInput,
  Select,
  Space,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import Transactions from "./transactions";
import { useState } from "react";
import idGenerator from "@/app/components/functions/idGenerator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDisclosure } from "@mantine/hooks";
import { TransactionForm } from "./TransactionForm";
import { DateInput } from "@mantine/dates";
import { partyCreateForm } from "@/app/api/parties";

export default function InvoiceForm(props) {
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState(false);
  const qc = useQueryClient();
  const invoices = useCRUD().fullList({
    collection: "invoice_view",
    expand: "party,invoice_maker,booker",
    filter: `type="${props.type === "sale" ? "sale" : "purchase"}"`,
    queryKey: `${props.type}Invoices`,
  });
  const parties = useCRUD().fullList({
    collection: "parties",
    filter: props.type === "sale" ? 'type="customer"||type="both"' : 'type="supplier"||type="both"',
    queryKey: props.type === "sale" ? "customers" : "suppliers",
  });
  const items = useCRUD().fullList({ collection: "items", expand: "category" });
  const user = useCRUD().read({ collection: "users", recordID: pb.authStore?.model?.id });
  const counts = useCRUD().read({ collection: "counts_for_row_numbers", recordID: "1" });
  const bookers = useCRUD().fullList({
    collection: "order_bookers",
  });
  const newInvoice = useMutation({
    mutationFn: crud.create,
    onSuccess: () => {
      paymentCreator();
    },
  });
  const updateInvoice = useMutation({
    mutationFn: crud.update,
    onSuccess: () => {
      qc.invalidateQueries();
      paymentPayer();
    },
  });
  const invoiceForm = useForm({
    initialValues: {
      invoiceNo: "new",
      booker: "",
      invoice_maker: pb.authStore?.model?.id,
      party: "",
      discount_1: 0,
      discount_2: 0,
      completed: false,
      duedate: new Date(),
      description: "",
    },
  });
  const newPayment = useMutation({
    mutationFn: crud.create,
    onSuccess: () => {
      qc.invalidateQueries();
      close();
    },
  });

  function getInvoiceData(value) {
    if (value !== "new") {
      const invoice = invoices.data.find((inv) => inv.id === value);
      invoiceForm.setValues({
        discount_1: invoice.discount_1,
        discount_2: invoice.discount_2,
        party: invoice.party,
      });
    }
  }
  const [paidAmount, setPaidAmount] = useState(0);
  function paymentCreator() {
    const iid = idGenerator(
      invoices.data.filter((inv) => inv.type === props.type).length + 1,
      props.type === "sale" ? "pos" : "pop"
    );
    const data = {
      id: iid,
      invoice: iid,
      party: invoiceForm.values.party,
      type: props.type === "sale" ? "recieving" : "sending",
      description: "Invoice Created",
      amount: 0,
      paid: false,
    };
    newPayment.mutate({ collection: "payments", data });
  }
  function paymentPayer() {
    const data = {
      party: invoiceForm.values.party,
      invoice: invoiceForm.values.invoiceNo,
      type: props.type === "sale" ? "recieving" : "sending",
      amount: paidAmount,
      description: "payment",
      paid: true,
    };
    if (paidAmount > 0) {
      newPayment.mutate({ collection: "payments", data });
    } else {
      close();
    }
  }
  function invoiceCreator() {
    const data = {
      id: idGenerator(
        invoices.data.filter((inv) => inv.type === props.type).length + 1,
        props.type === "sale" ? "pos" : "pop"
      ),
      invoiceNo: (props.type === "sale" ? counts.data.sale_invoices : counts.data.purchase_invoices) + 1,
      booker: invoiceForm.values.booker,
      invoice_maker: user.data.id,
      party: invoiceForm.values.party,
      type: props.type,
    };
    invoiceForm.setFieldValue("invoiceNo", data.id);
    newInvoice.mutate({ collection: "invoices", data: data });
  }
  function invComplete() {
    const data = {
      party: invoiceForm.values.party,
      discount_1: invoiceForm.values.discount_1,
      discount_2: invoiceForm.values.discount_2,
      duedate: invoiceForm.values.duedate,
      completed: invoiceForm.values.completed,
      description: invoiceForm.values.description,
    };
    updateInvoice.mutate({ collection: "invoices", recordID: invoiceForm.values.invoiceNo, data: data });
  }
  const invoice = invoices.data?.find((inv) => inv.id === invoiceForm.values.invoiceNo);
  const final_total = () => {
    const dis_1 = invoice?.total * (invoiceForm.values.discount_1 / 100);
    const dis_2 = (invoice?.total - dis_1) * (invoiceForm.values.discount_2 / 100);
    if (
      invoice?.discount_1 !== invoiceForm.values.discount_1 ||
      invoice?.discount_2 !== invoiceForm.values.discount_2
    ) {
      return (invoice?.total - dis_1 - dis_2).toFixed(2);
    } else {
      return invoice.final_total;
    }
  };
  const queries = [invoices, parties, user, items, counts, bookers];
  if (checkSuccess(queries)) {
    return (
      <>
        <Modal opened={opened} centered onClose={close} title='Confirm Invoice?'>
          <DateInput label='PAYMENT DUE DATE' {...invoiceForm.getInputProps("duedate")} />
          <NumberInput readOnly label='Total Amount' value={final_total()} />
          <NumberInput onChange={(v) => setPaidAmount(Number(v))} label='Paid Amount' value={paidAmount} />
          <Checkbox m={"xs"} label='Order Completed' {...invoiceForm.getInputProps("completed")} />
          <Group mt={"md"} justify='end'>
            <Button
              onClick={() => {
                setEditing(false);
                invComplete();
              }}
            >
              OK
            </Button>
          </Group>
        </Modal>
        <Text size='xl' fw={600}>
          {props.type.toUpperCase()} INVOICE
        </Text>
        <hr />
        <Group>
          <Stack gap={0}>
            <Group>
              <Group>
                <Text ml={"xs"} fw={500}>
                  {"INVOICE NO:"}
                </Text>
                <Select
                  w={"8rem"}
                  rightSectionWidth={0}
                  variant={editing ? "unstyled" : "default"}
                  readOnly={editing ? true : false}
                  allowDeselect={false}
                  searchable
                  data={[
                    ...invoices.data.map((inv) => ({ value: inv.id, label: String(inv.invoiceNo) })),
                    { value: "new", label: "new" },
                  ]}
                  {...invoiceForm.getInputProps("invoiceNo")}
                  onChange={(v) => {
                    invoiceForm.setFieldValue("invoiceNo", v);
                    invoiceForm.setFieldValue(
                      "booker",
                      invoices.data.find((inv) => inv.id === v)?.expand.booker?.id
                    );
                  }}
                />

                {invoiceForm.values.invoiceNo !== "new" && !editing && (
                  <Button
                    onClick={() => {
                      getInvoiceData(invoiceForm.values.invoiceNo);
                      setEditing(true);
                    }}
                  >
                    Edit
                  </Button>
                )}
              </Group>
              {props.type === "sale" && (
                <Group>
                  <Text ml={"xs"} fw={500}>
                    {"BOOKER:"}
                  </Text>
                  <Select
                    w={"10rem"}
                    rightSectionWidth={0}
                    variant={editing ? "unstyled" : "default"}
                    readOnly={editing ? true : false}
                    allowDeselect={false}
                    searchable
                    data={[...bookers.data.map((bkr) => ({ value: bkr.id, label: bkr.name }))]}
                    {...invoiceForm.getInputProps("booker")}
                  />
                </Group>
              )}
              {(invoiceForm.values.invoiceNo === "new" || editing) && (
                <>
                  <Group>
                    <Text fw={500}>{props.type === "sale" ? "CUSTOMER:" : "SUPPLIER:"}</Text>
                    <NSelect
                      variant={
                        editing === true || invoiceForm.values.invoiceNo !== "new" ? "unstyled" : "default"
                      }
                      withCreate
                      createForm={partyCreateForm}
                      rightSectionWidth={0}
                      readOnly={editing === true || invoiceForm.values.invoiceNo !== "new" ? true : false}
                      allowDeselect={false}
                      searchable
                      data={[...parties.data.map((pty) => ({ value: pty.id, label: pty.name }))]}
                      {...invoiceForm.getInputProps("party")}
                    />
                  </Group>

                  <Group>
                    <Flex align={"center"} w={"10rem"}>
                      <Text fw={500}>USER:</Text>
                      <Space w={"xs"} />
                      <Text>{user.data.name}</Text>
                    </Flex>
                  </Group>
                </>
              )}
              {!editing && invoiceForm.values.invoiceNo === "new" && (
                <Button
                  disabled={
                    invoiceForm.values.party === "" ||
                    (props.type === "sale" && invoiceForm.values.booker === "")
                  }
                  onClick={() => {
                    invoiceCreator();
                  }}
                >
                  Create
                </Button>
              )}
            </Group>
          </Stack>
          {editing && (
            <Stack gap={0}>
              <Textarea
                autosize
                minRows={2}
                label='description'
                {...invoiceForm.getInputProps("description")}
              />
            </Stack>
          )}
        </Group>
        <Stack gap={"0.3rem"}>
          {editing ? (
            <>
              <TransactionForm type={props.type} items={items.data} invoice={invoiceForm.values.invoiceNo} />
              <Transactions invoice={invoiceForm.values.invoiceNo} />
              {editing && (
                <Stack gap={0} align='end'>
                  <NumberInput
                    mr={"6.5rem"}
                    readOnly
                    label={"Total"}
                    defaultValue={0}
                    value={invoice.total || 0}
                  />
                  <Group align={"end"}>
                    <NumberInput
                      variant='default'
                      label={"Discount_1"}
                      rightSection={" "}
                      {...invoiceForm.getInputProps("discount_1")}
                    />
                    <NumberInput
                      variant='default'
                      label={"Discount_2"}
                      rightSection={" "}
                      {...invoiceForm.getInputProps("discount_2")}
                    />
                    <NumberInput
                      readOnly
                      label={"Total After Discount"}
                      defaultValue={0}
                      value={final_total() || 0}
                    />
                    <Button
                      onClick={() => {
                        open();
                      }}
                    >
                      Commit
                    </Button>
                  </Group>
                </Stack>
              )}
            </>
          ) : (
            <h2>Please Edit or Create a new Invoice</h2>
          )}
        </Stack>
      </>
    );
  } else return <StatusCheck check={queries} />;
}
