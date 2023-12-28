"use Client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/unifiedAPI";
import pb from "@/app/pocketbase";
import { Button, Flex, Grid, Group, NumberInput, Select, Space, Stack, Text, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import Transactions from "./Transactions";
import { useState } from "react";

export default function InvoiceForm(props) {
  const [editing, setEditing] = useState(false);
  const invoices = useCRUD().fullList({
    collection: "invoice_view",
    expand: "party,invoice_maker",
    filter: `type="${props.type === "sale" ? "sale" : "purchase"}"`,
    queryKey: `${props.type}Invoices`,
  });
  const parties = useCRUD().fullList({
    collection: "parties",
    filter: props.type === "sale" ? 'type="customer"||type="both"' : 'type="supplier"||type="both"',
    queryKey: props.type === "sale" ? "customers" : "suppliers",
  });
  const user = useCRUD().read({ collection: "users", recordID: pb.authStore.model.id });
  const invoiceForm = useForm({
    initialValues: {
      invoiceNo: "new",
      party: "pty000000000000",
      invoice_maker: pb.authStore.model.id,
      discount_1: 0,
      discount_2: 0,
      total: 0,
      total_after_discount: 0,
      description: "",
    },
  });

  function getInvoiceData(value) {
    if (value !== "new") {
      const invoice = invoices.data.find((inv) => inv.id === value);
      invoiceForm.setValues({
        discount_1: invoice.discount_1,
        discount_2: invoice.discount_2,
        total: invoice.total,
        total_after_discount: invoice.final_total,
        party: invoice.party,
      });
    }
  }

  const queries = [invoices, parties, user];
  if (checkSuccess(queries)) {
    return (
      <>
        <Text size='xl' fw={600}>
          {String(props.type).toUpperCase()} INVOICE
        </Text>
        <hr />
        <Group>
          <Stack>
            <Group>
              <Group>
                <Text ml={"xs"} fw={500}>
                  {"INVOICE NO:"}
                </Text>
                <Select
                  w={"10rem"}
                  variant={editing ? "unstyled" : "default"}
                  readOnly={editing ? true : false}
                  allowDeselect={false}
                  searchable
                  data={[...invoices.data.map((inv) => inv.id), "new"]}
                  {...invoiceForm.getInputProps("invoiceNo")}
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
              {(invoiceForm.values.invoiceNo === "new"||editing) && (
                <>
                  <Group>
                    <Text fw={500}>{props.type === "sale" ? "CUSTOMER:" : "SUPPLIER:"}</Text>
                    <Select
                      variant={
                        editing === true || invoiceForm.values.invoiceNo !== "new" ? "unstyled" : "default"
                      }
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
              {!editing && invoiceForm.values.invoiceNo === "new" && <Button>Create</Button>}
            </Group>
            {editing && (
              <Group align={"end"}>
                <NumberInput readOnly label={"Total"} {...invoiceForm.getInputProps("total")} />
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
                  {...invoiceForm.getInputProps("total_after_discount")}
                />
                <Button type='submit' onClick={() => setEditing(false)}>
                  Commit
                </Button>
              </Group>
            )}
          </Stack>
          {editing && (
            <Group>
              <Textarea
                autosize
                minRows={3}
                maxRows={3}
                label='description'
                {...invoiceForm.getInputProps("description")}
              />
            </Group>
          )}
        </Group>
        <Stack>
          {editing ? (
            <Transactions invoice={invoiceForm.values.invoiceNo} />
          ) : (
            <h2>Please Edit or Create a new Invoice</h2>
          )}
        </Stack>
      </>
    );
  } else return <StatusCheck check={queries} />;
}
