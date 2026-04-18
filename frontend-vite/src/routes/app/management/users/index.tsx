/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { usersCollection } from "../../../../collections/users";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { uuidv7 } from "uuidv7";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", title: "Name" },
  { accessor: "username", title: "Username" },
  { accessor: "email", title: "Email" },
  { accessor: "created", title: "Created" },
  { accessor: "actions", title: "Actions" },
];

function Users() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: users,
    isLoading,
    error,
  } = useLiveQuery((q) =>
    q
      .from({ user: usersCollection })
      .where(({ user }) => like(user.name, `%${debouncedSearch}%`) || like(user.username, `%${debouncedSearch}%`))
      .orderBy(({ user }) => user.created, "desc"),
  );

  const handleCreate = async () => {
    if (newUserName.trim() && newUserUsername.trim() && !loadingCreate) {
      setLoadingCreate(true);
      await usersCollection.insert({
        id: uuidv7(),
        name: newUserName.trim(),
        username: newUserUsername.trim(),
        email: newUserEmail.trim() || undefined,
        created: new Date(),
        updated: new Date(),
      }, { optimistic: false });
      setNewUserName("");
      setNewUserUsername("");
      setNewUserEmail("");
      setCreateModalOpen(false);
      setLoadingCreate(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditUsername(user.username);
    setEditEmail(user.email || "");
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (editName.trim() && editUsername.trim() && editingUser && !loadingEdit) {
      setLoadingEdit(true);
      await usersCollection.update(editingUser.id, { optimistic: false }, (draft) => {
        draft.name = editName.trim();
        draft.username = editUsername.trim();
        draft.email = editEmail.trim() || undefined;
        draft.updated = new Date();
      });
      setEditName("");
      setEditUsername("");
      setEditEmail("");
      setEditingUser(null);
      setEditModalOpen(false);
      setLoadingEdit(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!loadingDelete) {
      setLoadingDelete(true);
      await usersCollection.delete(userId, { optimistic: false });
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
          Create New User
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
          {users?.map((user) => (
            <Table.Tr key={user.id}>
              <Table.Td>{user.name}</Table.Td>
              <Table.Td>{user.username}</Table.Td>
              <Table.Td>{user.email}</Table.Td>
              <Table.Td>{user.created.toLocaleString()}</Table.Td>
              <Table.Td>
                <Group gap='xs'>
                  <ActionIcon variant='subtle' onClick={() => handleEdit(user)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant='subtle' color='red' onClick={() => handleDelete(user.id)} disabled={loadingDelete}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title='Create New User'>
        <TextInput
          label='Name'
          value={newUserName}
          onChange={(value) => setNewUserName(value.target.value)}
        />
        <TextInput
          label='Username'
          value={newUserUsername}
          onChange={(value) => setNewUserUsername(value.target.value)}
        />
        <TextInput
          label='Email'
          value={newUserEmail}
          onChange={(value) => setNewUserEmail(value.target.value)}
        />
        <Group mt='md'>
          <Button onClick={handleCreate} disabled={loadingCreate}>Create</Button>
          <Button variant='outline' onClick={() => setCreateModalOpen(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
      <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title='Edit User'>
        <TextInput label='Name' value={editName} onChange={(value) => setEditName(value.target.value)} />
        <TextInput label='Username' value={editUsername} onChange={(value) => setEditUsername(value.target.value)} />
        <TextInput label='Email' value={editEmail} onChange={(value) => setEditEmail(value.target.value)} />
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
export const Route = createFileRoute("/app/management/users/")({
  component: Users,
});