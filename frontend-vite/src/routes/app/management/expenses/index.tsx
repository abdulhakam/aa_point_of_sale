/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { expensesCollection } from "../../../../collections/expenses";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon, NumberInput } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { uuidv7 } from "uuidv7";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", title: "Name" },
  { accessor: "description", title: "Description" },
  { accessor: "amount", title: "Amount" },
  { accessor: "date", title: "Date" },
  { accessor: "created", title: "Created" },
  { accessor: "actions", title: "Actions" },
];

function Expenses() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseDescription, setNewExpenseDescription] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState(0);
  const [newExpenseDate, setNewExpenseDate] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState(0);
  const [editDate, setEditDate] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: expenses,
    isLoading,
    error,
  } = useLiveQuery((q) =>
    q
      .from({ expense: expensesCollection })
      .where(({ expense }) => like(expense.name, `%${debouncedSearch}%`) || like(expense.description, `%${debouncedSearch}%`))
      .orderBy(({ expense }) => expense.created, "desc"),
  );

  const handleCreate = async () => {
    if (newExpenseName.trim() && newExpenseDescription.trim() && newExpenseAmount >= 0 && newExpenseDate && !loadingCreate) {
      setLoadingCreate(true);
      await expensesCollection.insert({
        id: uuidv7(),
        name: newExpenseName.trim(),
        description: newExpenseDescription.trim(),
        amount: newExpenseAmount,
        date: newExpenseDate,
        created: new Date(),
        updated: new Date(),
      }, { optimistic: false });
      setNewExpenseName("");
      setNewExpenseDescription("");
      setNewExpenseAmount(0);
      setNewExpenseDate("");
      setCreateModalOpen(false);
      setLoadingCreate(false);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setEditName(expense.name);
    setEditDescription(expense.description);
    setEditAmount(expense.amount);
    setEditDate(expense.date);
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (editName.trim() && editDescription.trim() && editAmount >= 0 && editDate && editingExpense && !loadingEdit) {
      setLoadingEdit(true);
      await expensesCollection.update(editingExpense.id, { optimistic: false }, (draft) => {
        draft.name = editName.trim();
        draft.description = editDescription.trim();
        draft.amount = editAmount;
        draft.date = editDate;
        draft.updated = new Date();
      });
      setEditName("");
      setEditDescription("");
      setEditAmount(0);
      setEditDate("");
      setEditingExpense(null);
      setEditModalOpen(false);
      setLoadingEdit(false);
    }
  };

  const handleDelete = async (expenseId) => {
    if (!loadingDelete) {
      setLoadingDelete(true);
      await expensesCollection.delete(expenseId, { optimistic: false });
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
          Create New Expense
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
          {expenses?.map((expense) => (
            <Table.Tr key={expense.id}>
              <Table.Td>{expense.name}</Table.Td>
              <Table.Td>{expense.description}</Table.Td>
              <Table.Td>{expense.amount}</Table.Td>
              <Table.Td>{expense.date}</Table.Td>
              <Table.Td>{expense.created.toLocaleString()}</Table.Td>
              <Table.Td>
                <Group gap='xs'>
                  <ActionIcon variant='subtle' onClick={() => handleEdit(expense)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant='subtle' color='red' onClick={() => handleDelete(expense.id)} disabled={loadingDelete}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title='Create New Expense'>
        <TextInput
          label='Name'
          value={newExpenseName}
          onChange={(value) => setNewExpenseName(value.target.value)}
        />
        <TextInput
          label='Description'
          value={newExpenseDescription}
          onChange={(value) => setNewExpenseDescription(value.target.value)}
        />
        <NumberInput
          label='Amount'
          value={newExpenseAmount}
          onChange={(value) => setNewExpenseAmount(Number(value) || 0)}
          min={0}
        />
        <TextInput
          label='Date'
          value={newExpenseDate}
          onChange={(value) => setNewExpenseDate(value.target.value)}
        />
        <Group mt='md'>
          <Button onClick={handleCreate} disabled={loadingCreate}>Create</Button>
          <Button variant='outline' onClick={() => setCreateModalOpen(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
      <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title='Edit Expense'>
        <TextInput label='Name' value={editName} onChange={(value) => setEditName(value.target.value)} />
        <TextInput label='Description' value={editDescription} onChange={(value) => setEditDescription(value.target.value)} />
        <NumberInput
          label='Amount'
          value={editAmount}
          onChange={(value) => setEditAmount(Number(value) || 0)}
          min={0}
        />
        <TextInput label='Date' value={editDate} onChange={(value) => setEditDate(value.target.value)} />
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
export const Route = createFileRoute("/app/management/expenses/")({
  component: Expenses,
});