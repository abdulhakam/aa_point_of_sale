/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { paymentsCollection } from "../../../../collections/payments";
import { invoicesCollection } from "../../../../collections/invoices";
import { partiesCollection } from "../../../../collections/parties";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon, Select, NumberInput } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { uuidv7 } from "uuidv7";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "amount", title: "Amount" },
  { accessor: "description", title: "Description" },
  { accessor: "invoice", title: "Invoice" },
  { accessor: "paid", title: "Paid" },
  { accessor: "party", title: "Party" },
  { accessor: "type", title: "Type" },
  { accessor: "payment_date", title: "Payment Date" },
  { accessor: "paid_to", title: "Paid To" },
  { accessor: "created", title: "Created" },
  { accessor: "actions", title: "Actions" },
];

function Payments() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState(0);
  const [newPaymentDescription, setNewPaymentDescription] = useState("");
  const [newPaymentInvoice, setNewPaymentInvoice] = useState("");
  const [newPaymentPaid, setNewPaymentPaid] = useState(0);
  const [newPaymentParty, setNewPaymentParty] = useState("");
  const [newPaymentType, setNewPaymentType] = useState("");
  const [newPaymentPaymentDate, setNewPaymentPaymentDate] = useState("");
  const [newPaymentPaidTo, setNewPaymentPaidTo] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editAmount, setEditAmount] = useState(0);
  const [editDescription, setEditDescription] = useState("");
  const [editInvoice, setEditInvoice] = useState("");
  const [editPaid, setEditPaid] = useState(0);
  const [editParty, setEditParty] = useState("");
  const [editType, setEditType] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState("");
  const [editPaidTo, setEditPaidTo] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: invoices } = useLiveQuery((q) =>
    q.from({ invoice: invoicesCollection }).orderBy(({ invoice }) => invoice.created, "desc"),
  );

  const { data: parties } = useLiveQuery((q) =>
    q.from({ party: partiesCollection }).orderBy(({ party }) => party.created, "desc"),
  );

  const {
    data: payments,
    isLoading,
    error,
  } = useLiveQuery((q) =>
    q
      .from({ payment: paymentsCollection })
      .where(({ payment }) => like(payment.description, `%${debouncedSearch}%`))
      .orderBy(({ payment }) => payment.created, "desc"),
  );

  const invoiceOptions = invoices?.map((invoice) => ({
    value: invoice.id,
    label: `Invoice ${invoice.invoiceNo}`,
  })) || [];

  const partyOptions = parties?.map((party) => ({
    value: party.id,
    label: party.name,
  })) || [];

  const handleCreate = async () => {
    if (newPaymentAmount >= 0 && newPaymentDescription.trim() && newPaymentPaid >= 0 && newPaymentType.trim() && newPaymentPaymentDate && newPaymentPaidTo.trim() && !loadingCreate) {
      setLoadingCreate(true);
      await paymentsCollection.insert({
        id: uuidv7(),
        amount: newPaymentAmount,
        description: newPaymentDescription.trim(),
        invoice: newPaymentInvoice || undefined,
        paid: newPaymentPaid,
        party: newPaymentParty || undefined,
        type: newPaymentType.trim(),
        payment_date: newPaymentPaymentDate,
        paid_to: newPaymentPaidTo.trim(),
        created: new Date(),
        updated: new Date(),
      }, { optimistic: false });
      setNewPaymentAmount(0);
      setNewPaymentDescription("");
      setNewPaymentInvoice("");
      setNewPaymentPaid(0);
      setNewPaymentParty("");
      setNewPaymentType("");
      setNewPaymentPaymentDate("");
      setNewPaymentPaidTo("");
      setCreateModalOpen(false);
      setLoadingCreate(false);
    }
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setEditAmount(payment.amount);
    setEditDescription(payment.description);
    setEditInvoice(payment.invoice || "");
    setEditPaid(payment.paid);
    setEditParty(payment.party || "");
    setEditType(payment.type);
    setEditPaymentDate(payment.payment_date);
    setEditPaidTo(payment.paid_to);
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (editAmount >= 0 && editDescription.trim() && editPaid >= 0 && editType.trim() && editPaymentDate && editPaidTo.trim() && editingPayment && !loadingEdit) {
      setLoadingEdit(true);
      await paymentsCollection.update(editingPayment.id, { optimistic: false }, (draft) => {
        draft.amount = editAmount;
        draft.description = editDescription.trim();
        draft.invoice = editInvoice || undefined;
        draft.paid = editPaid;
        draft.party = editParty || undefined;
        draft.type = editType.trim();
        draft.payment_date = editPaymentDate;
        draft.paid_to = editPaidTo.trim();
        draft.updated = new Date();
      });
      setEditAmount(0);
      setEditDescription("");
      setEditInvoice("");
      setEditPaid(0);
      setEditParty("");
      setEditType("");
      setEditPaymentDate("");
      setEditPaidTo("");
      setEditingPayment(null);
      setEditModalOpen(false);
      setLoadingEdit(false);
    }
  };

  const handleDelete = async (paymentId) => {
    if (!loadingDelete) {
      setLoadingDelete(true);
      await paymentsCollection.delete(paymentId, { optimistic: false });
      setLoadingDelete(false);
    }
  };

  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;

  return (
    <>
      <Group align='end'>
        <TextInput
          style={{ width: "10rem" }}
          label='Search'
          onChange={(value) => setSearch(value.target.value)}
          value={search}
        />
        <Button leftSection={<IconPlus size={14} />} onClick={() => setCreateModalOpen(true)}>
          Create New Payment
        </Button>
      </Group>
      <Table>
        <Table.Thead>
          <Table.Tr>
            {tableStructure
              .filter((col) => !col.hidden)
              .map((col) => (
                <Table.Th key={col.accessor}>{col.title}</Table.Th>
              ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {payments?.map((payment) => {
            const invoice = invoices?.find((i) => i.id === payment.invoice);
            const party = parties?.find((p) => p.id === payment.party);
            return (
              <Table.Tr key={payment.id}>
                <Table.Td>{payment.amount}</Table.Td>
                <Table.Td>{payment.description}</Table.Td>
                <Table.Td>{invoice ? `Invoice ${invoice.invoiceNo}` : "N/A"}</Table.Td>
                <Table.Td>{payment.paid}</Table.Td>
                <Table.Td>{party?.name || "N/A"}</Table.Td>
                <Table.Td>{payment.type}</Table.Td>
                <Table.Td>{payment.payment_date}</Table.Td>
                <Table.Td>{payment.paid_to}</Table.Td>
                <Table.Td>{payment.created.toLocaleString()}</Table.Td>
                <Table.Td>
                  <Group gap='xs'>
                    <ActionIcon variant='subtle' onClick={() => handleEdit(payment)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant='subtle' color='red' onClick={() => handleDelete(payment.id)} disabled={loadingDelete}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title='Create New Payment'>
        <NumberInput
          label='Amount'
          value={newPaymentAmount}
          onChange={(value) => setNewPaymentAmount(Number(value) || 0)}
          min={0}
        />
        <TextInput
          label='Description'
          value={newPaymentDescription}
          onChange={(value) => setNewPaymentDescription(value.target.value)}
        />
        <Select
          label='Invoice'
          data={invoiceOptions}
          value={newPaymentInvoice}
          onChange={setNewPaymentInvoice}
          searchable
          placeholder='Select an invoice'
          clearable
        />
        <NumberInput
          label='Paid'
          value={newPaymentPaid}
          onChange={(value) => setNewPaymentPaid(Number(value) || 0)}
          min={0}
        />
        <Select
          label='Party'
          data={partyOptions}
          value={newPaymentParty}
          onChange={setNewPaymentParty}
          searchable
          placeholder='Select a party'
          clearable
        />
        <TextInput
          label='Type'
          value={newPaymentType}
          onChange={(value) => setNewPaymentType(value.target.value)}
        />
        <TextInput
          label='Payment Date'
          value={newPaymentPaymentDate}
          onChange={(value) => setNewPaymentPaymentDate(value.target.value)}
        />
        <TextInput
          label='Paid To'
          value={newPaymentPaidTo}
          onChange={(value) => setNewPaymentPaidTo(value.target.value)}
        />
        <Group mt='md'>
          <Button onClick={handleCreate} disabled={loadingCreate}>Create</Button>
          <Button variant='outline' onClick={() => setCreateModalOpen(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
      <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title='Edit Payment'>
        <NumberInput
          label='Amount'
          value={editAmount}
          onChange={(value) => setEditAmount(Number(value) || 0)}
          min={0}
        />
        <TextInput label='Description' value={editDescription} onChange={(value) => setEditDescription(value.target.value)} />
        <Select
          label='Invoice'
          data={invoiceOptions}
          value={editInvoice}
          onChange={setEditInvoice}
          searchable
          placeholder='Select an invoice'
          clearable
        />
        <NumberInput
          label='Paid'
          value={editPaid}
          onChange={(value) => setEditPaid(Number(value) || 0)}
          min={0}
        />
        <Select
          label='Party'
          data={partyOptions}
          value={editParty}
          onChange={setEditParty}
          searchable
          placeholder='Select a party'
          clearable
        />
        <TextInput label='Type' value={editType} onChange={(value) => setEditType(value.target.value)} />
        <TextInput label='Payment Date' value={editPaymentDate} onChange={(value) => setEditPaymentDate(value.target.value)} />
        <TextInput label='Paid To' value={editPaidTo} onChange={(value) => setEditPaidTo(value.target.value)} />
        <Group mt='md'>
          <Button onClick={handleUpdate} disabled={loadingEdit}>Update</Button>
          <Button variant='outline' onClick={() => setEditModalOpen(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
    </>
  );
}
export const Route = createFileRoute("/app/management/payments/")({
  component: Payments,
});