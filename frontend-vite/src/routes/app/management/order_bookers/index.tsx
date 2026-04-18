/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { orderBookersCollection } from "../../../../collections/order_bookers";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { uuidv7 } from "uuidv7";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", title: "Name" },
  { accessor: "phone", title: "Phone" },
  { accessor: "company", title: "Company" },
  { accessor: "created", title: "Created" },
  { accessor: "actions", title: "Actions" },
];

function OrderBookers() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newOrderBookerName, setNewOrderBookerName] = useState("");
  const [newOrderBookerPhone, setNewOrderBookerPhone] = useState("");
  const [newOrderBookerCompany, setNewOrderBookerCompany] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingOrderBooker, setEditingOrderBooker] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: orderBookers,
    isLoading,
    error,
  } = useLiveQuery((q) =>
    q
      .from({ orderBooker: orderBookersCollection })
      .where(({ orderBooker }) => like(orderBooker.name, `%${debouncedSearch}%`))
      .orderBy(({ orderBooker }) => orderBooker.created, "desc"),
  );

  const handleCreate = async () => {
    if (newOrderBookerName.trim() && newOrderBookerPhone.trim() && newOrderBookerCompany.trim() && !loadingCreate) {
      setLoadingCreate(true);
      await orderBookersCollection.insert({
        id: uuidv7(),
        name: newOrderBookerName.trim(),
        phone: newOrderBookerPhone.trim(),
        company: newOrderBookerCompany.trim(),
        created: new Date(),
        updated: new Date(),
      }, { optimistic: false });
      setNewOrderBookerName("");
      setNewOrderBookerPhone("");
      setNewOrderBookerCompany("");
      setCreateModalOpen(false);
      setLoadingCreate(false);
    }
  };

  const handleEdit = (orderBooker) => {
    setEditingOrderBooker(orderBooker);
    setEditName(orderBooker.name);
    setEditPhone(orderBooker.phone);
    setEditCompany(orderBooker.company);
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (editName.trim() && editPhone.trim() && editCompany.trim() && editingOrderBooker && !loadingEdit) {
      setLoadingEdit(true);
      await orderBookersCollection.update(editingOrderBooker.id, { optimistic: false }, (draft) => {
        draft.name = editName.trim();
        draft.phone = editPhone.trim();
        draft.company = editCompany.trim();
        draft.updated = new Date();
      });
      setEditName("");
      setEditPhone("");
      setEditCompany("");
      setEditingOrderBooker(null);
      setEditModalOpen(false);
      setLoadingEdit(false);
    }
  };

  const handleDelete = async (orderBookerId) => {
    if (!loadingDelete) {
      setLoadingDelete(true);
      await orderBookersCollection.delete(orderBookerId, { optimistic: false });
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
          Create New Order Booker
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
          {orderBookers?.map((orderBooker) => (
            <Table.Tr key={orderBooker.id}>
              <Table.Td>{orderBooker.name}</Table.Td>
              <Table.Td>{orderBooker.phone}</Table.Td>
              <Table.Td>{orderBooker.company}</Table.Td>
              <Table.Td>{orderBooker.created.toLocaleString()}</Table.Td>
              <Table.Td>
                <Group gap='xs'>
                  <ActionIcon variant='subtle' onClick={() => handleEdit(orderBooker)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant='subtle' color='red' onClick={() => handleDelete(orderBooker.id)} disabled={loadingDelete}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title='Create New Order Booker'>
        <TextInput
          label='Name'
          value={newOrderBookerName}
          onChange={(value) => setNewOrderBookerName(value.target.value)}
        />
        <TextInput
          label='Phone'
          value={newOrderBookerPhone}
          onChange={(value) => setNewOrderBookerPhone(value.target.value)}
        />
        <TextInput
          label='Company'
          value={newOrderBookerCompany}
          onChange={(value) => setNewOrderBookerCompany(value.target.value)}
        />
        <Group mt='md'>
          <Button onClick={handleCreate} disabled={loadingCreate}>Create</Button>
          <Button variant='outline' onClick={() => setCreateModalOpen(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
      <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title='Edit Order Booker'>
        <TextInput label='Name' value={editName} onChange={(value) => setEditName(value.target.value)} />
        <TextInput label='Phone' value={editPhone} onChange={(value) => setEditPhone(value.target.value)} />
        <TextInput label='Company' value={editCompany} onChange={(value) => setEditCompany(value.target.value)} />
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
export const Route = createFileRoute("/app/management/order_bookers/")({
  component: OrderBookers,
});