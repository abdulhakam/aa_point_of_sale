import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD, { crud } from "@/app/api/useAPI";
import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Select,
  Stack,
  Flex,
  TextInput,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function CreatePayment({ close }) {
  const queryClient = useQueryClient();
  const invoices = useCRUD().fullList({ collection: "invoice_view", expand: "party,booker" });
  const createPayment = useMutation({
    mutationFn: crud.create,
    onSuccess: () => {
      queryClient.invalidateQueries();
      notifications.show({
        title: "Success",
        message: "Payment Created",
        color: "green",
      });
      form.reset();
      close();
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Payment Creation Failed",
        color: "red",
      });
    },
  });
  const updateDiscount = useMutation({
    mutationFn: crud.update,
    onSuccess: () => {
      queryClient.invalidateQueries();
      notifications.show({
        title: "Success",
        message: "Discount Updated",
        color: "green",
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Discount Update Failed",
        color: "red",
      });
    },
  });
  const paymentsView = useCRUD().fullList({
    collection: "payments_view",
    expand: "party,booker",
    filter: `paid=true`,
  });
  const form = useForm({
    initialValues: {
      paymentDate: new Date(),
      invoiceType: "sale",
      invoiceNo: "",
      type: "recieving", //payment type
      party: "",
      paid: true,
      invoice_total: 0,
      paid_amount: 0,
      balance: 0,
      discount: 0,
      amount: 0,
      description: "payment",
    },
  });
  const submitHandler = () => {
    let data = {
      invoice: form.values.invoiceNo,
      type: form.values.type,
      party: form.values.party,
      amount: form.values.amount,
      description: "payment",
      paid: true,
      payment_date: form.values.paymentDate,
    };
    createPayment.mutate({ collection: "payments", data });
  };
  const queries = [paymentsView, invoices];
  if (checkSuccess(queries)) {
    function autoSetData(invoiceNo) {
      form.setFieldValue(
        "paid_amount",
        paymentsView.data?.filter((pmt) => pmt.invoice === invoiceNo).reduce((a, b) => a + b.amount, 0)
      );
      const invoice = invoices.data?.find((inv) => inv.id === invoiceNo);
      form.setFieldValue("party", invoice.party);
      form.setFieldValue("type", invoice.type === "sale" ? "recieving" : "sending");
      form.setFieldValue("invoice_total", invoice.final_total);
      form.setFieldValue("discount", invoice.discount_rs);
    }
    return (
      <Flex gap={"xs"}>
        <Stack w={"16rem"} gap={"0.3em"}>
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
          {/* <TextInput
            readOnly
            variant='unstyled'
            label='Party'
            value={invoices.data?.find((inv) => inv.id === form.values.invoiceNo)?.expand?.party.name ?? ""}
          /> */}
          {/* <NumberInput label='Invoice Total' value={form.values.invoice_total} readOnly /> */}
          <NumberInput label='Paid Amount' value={form.values.paid_amount} readOnly />
          <NumberInput
            label='Current Balance'
            value={Number(form.values.invoice_total - form.values.paid_amount).toFixed(2)}
            readOnly
          />
          <NumberInput
            label='Amount'
            value={form.values.amount}
            onChange={(v) => form.setFieldValue("amount", Number(v))}
          />
          <Group align='end'>
            <NumberInput
              label='Discount Adjustment'
              value={form.values.discount}
              onChange={(v) => form.setFieldValue("discount", Number(v))}
            />
            <Tooltip label='Apply Discount'>
              <ActionIcon
              mb={"0.1em"}
                size={"lg"}
                onClick={() =>
                  updateDiscount.mutate({
                    collection: "invoices",
                    recordID: form.values.invoiceNo,
                    data: { discount_rs: form.values.discount },
                  })
                }
              >
                <IconCheck />
              </ActionIcon>
            </Tooltip>
          </Group>
          <NumberInput
            label='Final Balance'
            value={Number(
              form.values.invoice_total -
                form.values.paid_amount -
                form.values.amount -
                invoices.data?.find((inv) => inv.id === form.values.invoiceNo)?.discount_rs
            ).toFixed(2)}
            readOnly
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
        <div style={{ width: "42rem" }}>
          <iframe
            key={`discount-${invoices.data?.find((inv) => inv.id === form.values.invoiceNo)?.discount_rs}`}
            width={"100%"}
            height={"100%"}
            src={form.values.invoiceNo ? `/views/invoice?invoiceId=${form.values.invoiceNo}` : "about:blank"}
          ></iframe>
        </div>
      </Flex>
    );
  } else return <StatusCheck check={queries} />;
}
