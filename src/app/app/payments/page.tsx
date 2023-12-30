"use client";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Button, Group, Modal, TextInput } from "@mantine/core";
import { paymentFormStructure } from "@/app/api/payments";
import FormGenerator from "@/app/components/FormGenerator";
import { useDisclosure } from "@mantine/hooks";
import useCRUD from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "created", sortable: true },
  { accessor: "updated", sortable: true },
  { accessor: "invoice", sortable: true },
  { accessor: "party", sortable: true },
  { accessor: "type", sortable: true },
  { accessor: "amount", sortable: true },
  { accessor: "paid", sortable: true },
  { accessor: "description", sortable: true },
];

export default function Payments() {
  const [opened, { open, close }] = useDisclosure(false);
  const [search, setSearch] = useState("");
  const payments = useCRUD().fullList({ collection: "payments_view" });
  const invoices = useCRUD().fullList({ collection: "invoices" });
  const parties = useCRUD().fullList({ collection: "parties" });
  const formStructure = { ...paymentFormStructure };
  formStructure.fields.invoice.baseProps.data = invoices.data?.map((inv) => inv.id);
  formStructure.fields.party.baseProps.data = parties.data?.map((pty) => ({
    value: pty.id,
    label: pty.name,
  }));
  const queries = [payments, invoices, parties];
  if (checkSuccess(queries)) {
    return (
      <>
        <Group align='end'>
          <TextInput
            style={{ width: "10rem" }}
            label='Search'
            onChange={(value) => setSearch(value.target.value)}
            value={search}
          />
          <Modal centered size={"auto"} opened={opened} onClose={close} title='Create'>
            <FormGenerator formStructure={paymentFormStructure} editable />
          </Modal>
          <Button onClick={open}> Add New </Button>
        </Group>
        <DataViewTable
          formstructure={paymentFormStructure}
          filter={[{ key: "", value: search }]}
          columns={tableStructure}
          data={payments.data?.map((pmnt) => ({
            ...pmnt,
            expand: { party: { ...parties.data?.find((pty) => pty.id === pmnt.party) } },
          }))}
        />
      </>
    );
  } else return <StatusCheck check={queries} />;
}
