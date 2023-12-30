"use Client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD, { crud } from "@/app/api/useAPI";
import pb from "@/app/pocketbase";
import { Button, Flex, Group, Modal, NumberInput, Select, Space, Stack, Text, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import Transactions from "./transactions";
import { useState } from "react";
import idGenerator from "@/app/components/functions/idGenerator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDisclosure } from "@mantine/hooks";
import { TransactionForm } from "./TransactionForm";

export default function InvoiceForm(props) {
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState(false);
  const qc = useQueryClient();
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
  const items = useCRUD().fullList({ collection: "items" });
  const user = useCRUD().read({ collection: "users", recordID: pb.authStore.model.id });
  const newInvoice = useMutation({ mutationFn: crud.create, onSuccess: () => qc.invalidateQueries() });
  const updateInvoice = useMutation({ mutationFn: crud.update, onSuccess: () => qc.invalidateQueries() });
  const invoiceForm = useForm({
    initialValues: {
      invoiceNo: "new",
      party: "pty000000000000",
      invoice_maker: pb.authStore.model.id,
      discount_1: 0,
      discount_2: 0,
      description: "",
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
  function invoiceCreator() {
    const data = {
      id: idGenerator(
        invoices.data.filter((inv) => inv.type === props.type).length + 1,
        props.type === "sale" ? "pos" : "pop"
      ),
      invoice_maker: user.data.id,
      party: invoiceForm.values.party,
      transactions: [],
      type: props.type === "sale" ? "sale" : "purchase",
    };
    invoiceForm.setFieldValue("invoiceNo", data.id);
    newInvoice.mutate({ collection: "invoices", data: data });
  }
  function invComplete() {
    const data = {
      party: invoiceForm.values.party,
      discount_1: invoiceForm.values.discount_1,
      discount_2: invoiceForm.values.discount_2,
      description: invoiceForm.values.description,
    };
    updateInvoice.mutate({ collection: "invoices", recordID: invoiceForm.values.invoiceNo, data: data });
  }
  const invoice = invoices.data?.find((inv) => inv.id === invoiceForm.values.invoiceNo);
  const final_total = () => {
    if (
      invoice.discount_1 !== invoiceForm.values.discount_1 ||
      invoice.discount_2 !== invoiceForm.values.discount_2
    ) {
      return invoice.total - invoiceForm.values.discount_1 - invoiceForm.values.discount_2;
    } else {
      return invoice.final_total;
    }
  };
  const queries = [invoices, parties, user, items];
  if (checkSuccess(queries)) {
    return (
      <>
        <Modal opened={opened} onClose={close} title='Confirm Invoice?'>
          {/* TODO: add Payment modal here. */}
        </Modal>
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
              {(invoiceForm.values.invoiceNo === "new" || editing) && (
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
              {!editing && invoiceForm.values.invoiceNo === "new" && (
                <Button onClick={() => invoiceCreator()}>Create</Button>
              )}
            </Group>
            {editing && (
              <Group align={"end"}>
                <NumberInput readOnly label={"Total"} defaultValue={0} value={invoice.total || 0} />
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
                    setEditing(false);
                    invComplete();
                    // TODO: add payment modal
                  }}
                >
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
            <>
              <TransactionForm type={props.type} items={items.data} invoice={invoiceForm.values.invoiceNo} />
              <Transactions invoice={invoiceForm.values.invoiceNo} />
            </>
          ) : (
            <h2>Please Edit or Create a new Invoice</h2>
          )}
        </Stack>
      </>
    );
  } else return <StatusCheck check={queries} />;
}
