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
import Transactions from "../transactions";
import { useState } from "react";
import idGenerator from "@/app/components/functions/idGenerator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDisclosure } from "@mantine/hooks";
import { DateInput } from "@mantine/dates";
import { IconPrinter } from "@tabler/icons-react";
import CreateSupplier from "../purchase/CreateSupplier";
import CreateCustomer from "../sale/CreateCustomer";
import { notifications } from "@mantine/notifications";
import { DiffTransactionForm } from "./diffTransactionForm";

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
    filter: `type="difference"`,
    queryKey: `differenceInvoices`,
  });
  const items = useCRUD().fullList({ collection: "items_report", expand: "category" });
  const user = useCRUD().read({ collection: "users", recordID: pb.authStore?.model?.id });
  const newInvoice = useMutation({
    mutationFn: crud.create,
    onSuccess: (data) => {
      invoiceForm.setFieldValue("invoiceNo", data.id);
      paymentCreator();
      setEditing(true);
    },
  });

  const updateInvoice = useMutation({
    mutationFn: crud.update,
    onSuccess: () => {
      qc.invalidateQueries();
      // paymentPayer();
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
        discount_rs: invoice.discount_rs,
        party: invoice.party,
      });
    }
  }
  const [paidAmount, setPaidAmount] = useState(0);
  function paymentCreator() {
    const iid = idGenerator(dateString(), "dif");
    const data = {
      id: iid,
      invoice: iid,
      party: invoiceForm.values.party,
      type: "difference", ////////////////////////////////////
      description: "DIFFERENCE INVOICE",
      amount: 0,
      paid: false,
    };
    newPayment.mutate({ collection: "payments", data });
  }
  // function paymentPayer() {
  //   const data = {
  //     party: invoiceForm.values.party,
  //     invoice: invoiceForm.values.invoiceNo,
  //     type: "sale",///////// shall be set to "difference" in the future
  //     amount: paidAmount,
  //     description: "payment",
  //     paid: true,
  //   };
  //   if (paidAmount > 0) {
  //     newPayment.mutate({ collection: "payments", data });
  //   } else {
  //     close();
  //   }
  // }
  function invoiceCreator() {
    console.log(idGenerator(dateString(), "dif"))
    const data = {
      id: idGenerator(dateString(), "dif"),
      invoiceNo: dateString(),
      dated: invoiceForm.values.date,
      booker: invoiceForm.values.booker,
      invoice_maker: user.data.id,
      party: invoiceForm.values.party,
      type: "difference",
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
  const queries = [invoices, user, items];
  if (checkSuccess(queries)) {
    return (
      <>
        <Modal opened={opened} centered onClose={close} title='Confirm Invoice?'>
          
            <>
              <Checkbox
                defaultChecked={true}
                m={"xs"}
                disabled={true}
                label={"Placeholder"}
                {...invoiceForm.getInputProps("completed")}
              />
              <Text>Press OK</Text>
            </>

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
          DIFFERENCE INVOICE
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
            <>
              <Group>
                <Flex direction={"column"} align={"center"} w={"10rem"}>
                  <TextInput disabled label={"USER:"} value={user.data.name} />
                </Flex>
              </Group>
            </>
            {!editing && invoiceForm.values.invoiceNo === "new" && (
              <Button
                disabled={
                  invoiceForm.values.invoiceNo !== "new"
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
            onClick={() => window.open(`print?invoiceId=${invoiceForm.values.invoiceNo}`, "_blank")}
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
              <DiffTransactionForm type={"purchase"} items={items.data} invoice={invoiceForm.values.invoiceNo} />
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

const dateString = () => {
  const date = new Date();
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return Number(year + month + day);
};
