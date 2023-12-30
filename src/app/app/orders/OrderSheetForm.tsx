"use Client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD, { crud } from "@/app/api/useAPI";
import pb from "@/app/pocketbase";
import {
  Button,
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
import { useState } from "react";
import idGenerator from "@/app/components/functions/idGenerator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDisclosure } from "@mantine/hooks";
import Orders from "./Orders";
import { OrderForm } from "./OrderForm";

export default function OrderSheetForm(props) {
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState(false);
  const qc = useQueryClient();
  const orderSheets = useCRUD().fullList({
    collection: "order_sheet_view",
    expand: "party,booking_maker,booker",
    filter: `type="${props.type === "sale" ? "sale" : "purchase"}"`,
    queryKey: `${props.type} Order Sheets`,
  });
  const parties = useCRUD().fullList({
    collection: "parties",
    filter: props.type === "sale" ? 'type="customer"||type="both"' : 'type="supplier"||type="both"',
    queryKey: props.type === "sale" ? "customers" : "suppliers",
  });
  const items = useCRUD().fullList({ collection: "items" });
  const bookers = useCRUD().fullList({ collection: "order_bookers" });
  const user = useCRUD().read({ collection: "users", recordID: pb.authStore.model.id });
  const newOrder = useMutation({ mutationFn: crud.create, onSuccess: () => qc.invalidateQueries() });
  const updateOrder = useMutation({ mutationFn: crud.update, onSuccess: () => qc.invalidateQueries() });
  const orderSheetForm = useForm({
    initialValues: {
      orderSheetNo: "new",
      party: "pty000000000000",
      booking_maker: pb.authStore.model.id,
      booker: "",
      discount_1: 0,
      discount_2: 0,
      description: "",
    },
  });
  function getOrderData(value) {
    if (value !== "new") {
      const orderSheet = orderSheets.data.find((inv) => inv.id === value);
      orderSheetForm.setValues({
        discount_1: orderSheet.discount_1,
        discount_2: orderSheet.discount_2,
        party: orderSheet.party,
      });
    }
  }
  function orderSheetCreator() {
    const data = {
      id: idGenerator(
        orderSheets.data.filter((inv) => inv.type === props.type).length + 1,
        props.type === "sale" ? "ods" : "odp"
      ),
      booking_maker: user.data.id,
      party: orderSheetForm.values.party,
      booker: orderSheetForm.values.booker,
      transactions: [],
      type: props.type === "sale" ? "sale" : "purchase",
    };
    orderSheetForm.setFieldValue("orderSheetNo", data.id);
    newOrder.mutate({ collection: "order_sheets", data: data });
  }
  function orderComplete() {
    const data = {
      party: orderSheetForm.values.party,
      discount_1: orderSheetForm.values.discount_1,
      discount_2: orderSheetForm.values.discount_2,
      description: orderSheetForm.values.description,
    };
    updateOrder.mutate({
      collection: "order_sheets",
      recordID: orderSheetForm.values.orderSheetNo,
      data: data,
    });
  }
  const orderSheet = orderSheets.data?.find((inv) => inv.id === orderSheetForm.values.orderSheetNo);
  const final_total = () => {
    if (
      orderSheet.discount_1 !== orderSheetForm.values.discount_1 ||
      orderSheet.discount_2 !== orderSheetForm.values.discount_2
    ) {
      return orderSheet.total - orderSheetForm.values.discount_1 - orderSheetForm.values.discount_2;
    } else {
      return orderSheet.final_total;
    }
  };
  const queries = [orderSheets, parties, user, items, bookers];
  if (checkSuccess(queries)) {
    return (
      <>
        <Modal opened={opened} onClose={close} title='Confirm Order?'>
          {/* TODO: add Payment modal here. */}
        </Modal>
        <Text size='xl' fw={600}>
          {String(props.type).toUpperCase()} ORDER
        </Text>
        <hr />
        <Group>
          <Stack>
            <Group align="end">
              <Group>
                <Select
                  label={"BOOKING NO:"}
                  w={"10rem"}
                  variant={editing ? "unstyled" : "default"}
                  readOnly={editing ? true : false}
                  allowDeselect={false}
                  searchable
                  data={[...orderSheets.data.map((inv) => inv.id), "new"]}
                  {...orderSheetForm.getInputProps("orderSheetNo")}
                />

                {orderSheetForm.values.orderSheetNo !== "new" && !editing && (
                  <Button
                    onClick={() => {
                      getOrderData(orderSheetForm.values.orderSheetNo);
                      setEditing(true);
                    }}
                  >
                    Edit
                  </Button>
                )}
              </Group>
              {(orderSheetForm.values.orderSheetNo === "new" || editing) && (
                <>
                  <Group>
                    <Select
                      label={props.type === "sale" ? "CUSTOMER:" : "SUPPLIER:"}
                      variant={
                        editing === true || orderSheetForm.values.orderSheetNo !== "new"
                          ? "unstyled"
                          : "default"
                      }
                      readOnly={
                        editing === true || orderSheetForm.values.orderSheetNo !== "new" ? true : false
                      }
                      allowDeselect={false}
                      searchable
                      data={[...parties.data.map((pty) => ({ value: pty.id, label: pty.name }))]}
                      {...orderSheetForm.getInputProps("party")}
                    />
                  </Group>
                  <Group>
                    <Select
                      label={"BOOKER"}
                      variant={
                        editing === true || orderSheetForm.values.orderSheetNo !== "new"
                          ? "unstyled"
                          : "default"
                      }
                      readOnly={
                        editing === true || orderSheetForm.values.orderSheetNo !== "new" ? true : false
                      }
                      allowDeselect={false}
                      searchable
                      data={[...bookers.data.map((pty) => ({ value: pty.id, label: pty.name }))]}
                      {...orderSheetForm.getInputProps("booker")}
                    />
                  </Group>
                  <Group>
                    <Flex align={"center"} w={"10rem"}>
                      <TextInput variant="unstyled" label={"USER:"} readOnly value={user.data.name} />
                    </Flex>
                  </Group>
                </>
              )}
              {!editing && orderSheetForm.values.orderSheetNo === "new" && (
                <Button onClick={() => orderSheetCreator()}>Create</Button>
              )}
            </Group>
            {editing && (
              <Group align={"end"}>
                <NumberInput readOnly label={"Total"} defaultValue={0} value={orderSheet.total || 0} />
                <NumberInput
                  variant='default'
                  label={"Discount_1"}
                  rightSection={" "}
                  {...orderSheetForm.getInputProps("discount_1")}
                />
                <NumberInput
                  variant='default'
                  label={"Discount_2"}
                  rightSection={" "}
                  {...orderSheetForm.getInputProps("discount_2")}
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
                    orderComplete();
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
                {...orderSheetForm.getInputProps("description")}
              />
            </Group>
          )}
        </Group>
        <Stack>
          {editing ? (
            <>
              <OrderForm
                type={props.type}
                items={items.data}
                orderSheet={orderSheetForm.values.orderSheetNo}
              />
              <Orders orderSheet={orderSheetForm.values.orderSheetNo} />
            </>
          ) : (
            <h2>Please Edit or Create a new Order</h2>
          )}
        </Stack>
      </>
    );
  } else return <StatusCheck check={queries} />;
}
