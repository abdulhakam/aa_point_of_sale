"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD, { crud } from "@/app/api/useAPI";
import pb from "@/app/pocketbase";
import { NSelect } from "@/app/components/BetterComps/Select";
import {
  ActionIcon,
  Button,
  Checkbox,
  ComboboxItem,
  Flex,
  Group,
  Modal,
  NumberInput,
  Select,
  Space,
  Stack,
  Text,
  TextInput,
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
import { IconPrinter } from "@tabler/icons-react";
import CreateSupplier from "./purchase/CreateSupplier";
import CreateCustomer from "./sale/CreateCustomer";
import { notifications } from "@mantine/notifications";

export default function InvoiceForm(props) {
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState(false);
  const qc = useQueryClient();
  const invoiceForm = useForm({
    initialValues: {
      invoiceNo: "new",
      booker: "",
      invoice_maker: pb.authStore?.model?.id,
      party: "",
      discount_1: 0,
      discount_2: 0,
      discount_rs: 0,
      completed: false,
      date: new Date(),
      duedate: new Date(),
      description: "",
    },
  });
  const invoices = useCRUD().fullList({
    collection: "invoice_view",
    expand: "party,invoice_maker,booker",
    filter: `type="${props.type === "sale" ? "sale" : props.type === "purchase" ? "purchase" : "return"}"`,
    queryKey: `${props.type}Invoices`,
  });
  const parties = useCRUD().fullList({
    collection: "parties",
    expand: "area,area.section",
    filter:
      props.type === "sale"
        ? 'type="customer"||type="both"'
        : props.type === "purchase"
        ? 'type="supplier"||type="both"'
        : null,
    queryKey: props.type === "sale" ? "customers" : props.type === "suppliers" ? "suppliers" : "all",
  });
  const partyInvoices = useCRUD().fullList({
    collection: "invoice_view",
    filter: `party="${invoiceForm.values.party}" && type="${
      parties.data?.find((p) => p.id === invoiceForm.values.party)?.type === "customer" ? "sale" : "purchase"
    }"`,
  });
  const items = useCRUD().fullList({ collection: "items", expand: "category" });
  const user = useCRUD().read({ collection: "users", recordID: pb.authStore?.model?.id });
  const counts = useCRUD().read({ collection: "counts_for_row_numbers", recordID: "1" });
  const bookers = useCRUD().fullList({
    collection: "order_bookers",
  });
  const newInvoice = useMutation({
    mutationFn: crud.create,
    onSuccess: (data) => {
      invoiceForm.setFieldValue("invoiceNo", data.id);
      paymentCreator();
      props.type === "return"
        ? newReturnReference.mutate({
            collection: "invoices_return_reference",
            data: {
              original_invoices: originalInvoice,
              return_invoice: data.id,
              id: idGenerator(Number(data.id.substring(3)), "rtn"),
            },
          })
        : null;
      setEditing(true);
    },
  });
  const newReturnReference = useMutation({
    mutationFn: crud.create,
    onSuccess: (data) => {
      notifications.show({
        title: "Success!",
        message: "Return Reference Created",
      });
      console.log(data);
    },
    onError: () => {
      notifications.show({
        title: "Error!",
        color: "red",
        message: "Return Reference Creation Failed",
      });
    },
  });
  const updateInvoice = useMutation({
    mutationFn: crud.update,
    onSuccess: () => {
      qc.invalidateQueries();
      paymentPayer();
      window.open(`print?invoiceId=${invoiceForm.values.invoiceNo}`, "_blank").focus();
    },
  });
  const [originalInvoice, setOriginalInvoice] = useState(null);
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
        discount_rs: invoice.discount_rs,
        party: invoice.party,
      });
    }
  }
  const [paidAmount, setPaidAmount] = useState(0);
  function paymentCreator() {
    const iid = idGenerator(
      invoices.data.filter((inv) => inv.type === props.type).length + 1,
      props.type === "sale" ? "pos" : props.type === "purchase" ? "pop" : "rtn"
    );
    const data = {
      id: iid,
      invoice: iid,
      party: invoiceForm.values.party,
      type: props.type === "sale" ? "recieving" : props.type === "purchase" ? "sending" : "return", ////////////////////////////////////
      description:
        props.type === "sale"
          ? "Sale Invoice Created"
          : props.type === "purchase"
          ? "Purchase Invoice Created"
          : "Return Invoice Created",
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
        props.type === "sale" ? "pos" : props.type === "purchase" ? "pop" : "rtn"
      ),
      invoiceNo:
        (props.type === "sale"
          ? counts.data.sale_invoices
          : props.type === "purchase"
          ? counts.data.purchase_invoices
          : counts.data.return_invoices) + 1,
      dated: invoiceForm.values.date,
      booker: invoiceForm.values.booker,
      invoice_maker: user.data.id,
      party: invoiceForm.values.party,
      type: props.type,
    };
    newInvoice.mutate({ collection: "invoices", data: data });
  }
  function invComplete() {
    const data = {
      party: invoiceForm.values.party,
      discount_1: invoiceForm.values.discount_1,
      discount_2: invoiceForm.values.discount_2,
      discount_rs: invoiceForm.values.discount_rs,
      dated: invoiceForm.values.date,
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
      invoice?.discount_2 !== invoiceForm.values.discount_2 ||
      invoice?.discount_rs !== invoiceForm.values.discount_rs
    ) {
      return Number(invoice?.total - dis_1 - dis_2 - invoiceForm.values.discount_rs);
    } else {
      return Number(invoice.final_total);
    }
  };
  const getInvoiceDate = (invoice) => {
    const invoicedata = invoices.data.find((inv) => inv.id === invoice);
    return invoicedata.date ? new Date(invoicedata.date) : new Date(invoicedata.created);
  };
  const queries = [invoices, parties, user, items, counts, bookers];
  if (checkSuccess(queries)) {
    return (
      <>
        <Modal opened={opened} centered onClose={close} title='Confirm Invoice?'>
          {props.type !== "return" ? (
            <>
              <DateInput label='PAYMENT DUE DATE' {...invoiceForm.getInputProps("duedate")} />
              <NumberInput readOnly label='Total Amount' value={final_total()} />
              <NumberInput
                onChange={(v) => setPaidAmount(Number(v))}
                label='Paid Amount'
                value={paidAmount}
              />
            </>
          ) : (
            <>
              <Checkbox
                defaultChecked={props.type === "return"}
                m={"xs"}
                disabled={props.type === "return"}
                label={props.type === "return" ? "Return Completed" : "Order Completed"}
                {...invoiceForm.getInputProps("completed")}
              />
              <Text>Press OK to confirm</Text>
            </>
          )}

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
          <Group align='end'>
            <Group>
              <Select
                label='INVOICE NO:'
                w={"8rem"}
                rightSectionWidth={0}
                variant={"default"}
                disabled={editing ? true : false}
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
                  invoiceForm.setFieldValue(
                    "party",
                    invoices.data.find((inv) => inv.id === v)?.expand.party?.id
                  );
                  invoiceForm.setFieldValue("date", v === "new" ? new Date() : getInvoiceDate(v));
                }}
              />
              <DateInput
                label='INVOICE DATE'
                value={invoiceForm.values.date}
                onChange={(v) =>
                  invoiceForm.setFieldValue(
                    "date",
                    new Date(
                      new Date(v).getFullYear(),
                      new Date(v).getMonth(),
                      new Date(v).getDate(),
                      0,
                      0,
                      0
                    )
                  )
                }
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
                <Select
                  w={"10rem"}
                  rightSectionWidth={0}
                  label='BOOKER'
                  variant={"default"}
                  allowDeselect={false}
                  searchable
                  data={[...bookers.data.map((bkr) => ({ value: bkr.id, label: bkr.name }))]}
                  {...invoiceForm.getInputProps("booker")}
                />
              </Group>
            )}
            <>
              <Group align='end'>
                <NSelect
                  label={
                    props.type === "sale" ? "CUSTOMER" : props.type === "purchase" ? "SUPPLIER" : "PARTY"
                  }
                  variant={
                    editing === true || invoiceForm.values.invoiceNo !== "new" ? "unstyled" : "default"
                  }
                  rightSectionWidth={0}
                  disabled={editing === true || invoiceForm.values.invoiceNo !== "new" ? true : false}
                  allowDeselect={false}
                  searchable
                  data={[
                    ...parties.data.map((pty) => ({
                      value: pty.id,
                      label: `${pty.name} - ${pty.expand?.area.name}`,
                    })),
                  ]}
                  {...invoiceForm.getInputProps("party")}
                />
                {props.type === "purchase" && invoiceForm.values.invoiceNo === "new" && <CreateSupplier />}
                {props.type === "sale" && invoiceForm.values.invoiceNo === "new" && <CreateCustomer />}
              </Group>
              {props.type === "return" && (
                <NSelect
                  label={"Original Invoice"}
                  disabled={editing || invoiceForm.values.invoiceNo !== "new"}
                  rightSectionWidth={0}
                  allowDeselect={false}
                  searchable
                  value={originalInvoice ? originalInvoice : null}
                  onChange={(v) => setOriginalInvoice(v)}
                  data={
                    partyInvoices.data?.map((inv) => ({
                      value: inv.id,
                      label: String(inv.invoiceNo),
                    })) ?? []
                  }
                />
              )}
              <Group>
                <Flex direction={"column"} align={"center"} w={"10rem"}>
                  <TextInput disabled label={"USER:"} value={user.data.name} />
                </Flex>
              </Group>
            </>
            {!editing && invoiceForm.values.invoiceNo === "new" && (
              <Button
                disabled={
                  invoiceForm.values.party === "" ||
                  (props.type === "sale" && invoiceForm.values.booker === "") ||
                  (props.type === "return" && originalInvoice === null)
                }
                onClick={() => {
                  invoiceCreator();
                }}
              >
                Create
              </Button>
            )}
          </Group>

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
          <ActionIcon
            onClick={()=>window.open(`print?invoiceId=${invoiceForm.values.invoiceNo}`,'_blank')}
            size='xl'
            variant='subtle'
            color='blue'
          >
            <IconPrinter />
          </ActionIcon>
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
                    value={invoice?.total.toFixed(2) || 0}
                  />
                  <Group align={"end"}>
                    <NumberInput
                      label={"Discount_1"}
                      rightSection={" "}
                      {...invoiceForm.getInputProps("discount_1")}
                    />
                    <NumberInput
                      label={"Discount_2"}
                      rightSection={" "}
                      {...invoiceForm.getInputProps("discount_2")}
                    />
                    <NumberInput
                      label={"Discount_rs"}
                      rightSection={" "}
                      {...invoiceForm.getInputProps("discount_rs")}
                    />
                    <NumberInput
                      readOnly
                      label={"Total After Discount"}
                      defaultValue={0}
                      value={final_total().toFixed(2) || 0}
                    />
                    <Button
                      onClick={() => {
                        open();
                      }}
                    >
                      Complete
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
