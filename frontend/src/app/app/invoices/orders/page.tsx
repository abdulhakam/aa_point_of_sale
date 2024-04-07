"use client";

import useCRUD, { crud } from "@/app/api/useAPI";
import DataViewTable from "@/app/components/DataViewTable";
import { Button, Checkbox, Group, Stack, TextInput } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const columns = [
  { accessor: "type" },
  { accessor: "invoiceNo", width: "4.5rem" },
  { accessor: "booker" },
  { accessor: "invoice_maker", hidden: true },
  { accessor: "party" },
  { accessor: "total" },
  { accessor: "discount_1" },
  { accessor: "discount_2" },
  { accessor: "final_total" },
  { accessor: "duedate", render: (record) => record.duedate.slice(0, 10) },
  { accessor: "description" },
  { accessor: "created", sortable: true, render: (record) => record.created.slice(0, 10) },
  { accessor: "completed", width: "5rem", render: (record) => (record.completed ? "O" : "X") },
];
export default function InvoiceOrders() {
  const qc = useQueryClient();
  const update = useMutation({
    mutationFn: crud.update,
    onSuccess: () => {
      qc.invalidateQueries();
      notifications.show({ title: "Success", message: "Order updated", color: "green" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "Order update failed", color: "red" });
    }
  });
  const invoices = useCRUD().fullList({ collection: "invoice_view", expand: "booker,invoice_maker,party" });
  return (
    <>
      <h2>ALL INCOMPLETE ORDERS</h2>
      <DataViewTable
        fz={"xs"}
        horizontalSpacing={"0.2rem"}
        verticalSpacing={0}
        rowStyle={({ completed }) => (completed ? null : { color: "red" })}
        report
        onRowClick={(record) => {
          orderModal(record, update);
        }}
        data={invoices.data}
        columns={columns}
      />
    </>
  );
}

function orderModal(data, updateMutation) {
  const record = data.record;
  modals.openConfirmModal({
    title: "Order Details",
    centered: true,
    size: "auto",
    children: (
      <Stack gap={0}>
        <Group>
          <TextInput
            label='Invoice No'
            value={`${record.invoiceNo} ${record.type.charAt(0).toUpperCase()}`}
            readOnly
          />
          <TextInput label='Invoice Date' value={record.dated.slice(0, 10)} readOnly />
        </Group>
        <TextInput label='Party' value={record.expand.party?.name ?? "N/A"} readOnly />
        <TextInput label='Booker' value={record.expand.booker?.name ?? "N/A"} readOnly />
        <TextInput label='Total' value={record.total} readOnly />
        <Group>
          <TextInput label='Discount 1' value={record.discount_1} readOnly />
          <TextInput label='Discount 2' value={record.discount_2} readOnly />
        </Group>
        <TextInput label='Final Total' value={record.final_total} readOnly />
        <TextInput label='Description' value={record.description} readOnly />
        <Checkbox label='Completed' checked={record.completed} readOnly />
      </Stack>
    ),
    labels: { confirm: record.completed ? "Set Incomplete" : "Set Complete", cancel: "Close" },
    onConfirm: () =>
      updateMutation.mutate({
        collection: "invoices",
        recordID: record.id,
        data: { completed: !record.completed },
      }),
  });
}
