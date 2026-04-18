/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { companiesCollection } from "../../../../collections/companies";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { uuidv7 } from "uuidv7";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", title: "Name" },
  { accessor: "created", title: "Created" },
  { accessor: "actions", title: "Actions" },
];

function Companies() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [editName, setEditName] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: companies,
    isLoading,
    error,
  } = useLiveQuery((q) =>
    q
      .from({ company: companiesCollection })
      .where(({ company }) => like(company.name, `%${debouncedSearch}%`))
      .orderBy(({ company }) => company.created, "desc"),
  );

  const handleCreate = async () => {
    if (newCompanyName.trim() && !loadingCreate) {
      setLoadingCreate(true);
      await companiesCollection.insert({
        id: uuidv7(),
        name: newCompanyName.trim(),
        created: new Date(),
        updated: new Date(),
      }, { optimistic: false });
      setNewCompanyName("");
      setCreateModalOpen(false);
      setLoadingCreate(false);
    }
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setEditName(company.name);
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (editName.trim() && editingCompany && !loadingEdit) {
      setLoadingEdit(true);
      await companiesCollection.update(editingCompany.id, { optimistic: false }, (draft) => {
        draft.name = editName.trim();
        draft.updated = new Date();
      });
      setEditName("");
      setEditingCompany(null);
      setEditModalOpen(false);
      setLoadingEdit(false);
    }
  };

  const handleDelete = async (companyId) => {
    if (!loadingDelete) {
      setLoadingDelete(true);
      await companiesCollection.delete(companyId, { optimistic: false });
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
          Create New Company
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
          {companies?.map((company) => (
            <Table.Tr key={company.id}>
              <Table.Td>{company.name}</Table.Td>
              <Table.Td>{company.created.toLocaleString()}</Table.Td>
              <Table.Td>
                <Group gap='xs'>
                  <ActionIcon variant='subtle' onClick={() => handleEdit(company)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant='subtle' color='red' onClick={() => handleDelete(company.id)} disabled={loadingDelete}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title='Create New Company'>
        <TextInput
          label='Name'
          value={newCompanyName}
          onChange={(value) => setNewCompanyName(value.target.value)}
        />
        <Group mt='md'>
          <Button onClick={handleCreate} disabled={loadingCreate}>Create</Button>
          <Button variant='outline' onClick={() => setCreateModalOpen(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
      <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title='Edit Company'>
        <TextInput label='Name' value={editName} onChange={(value) => setEditName(value.target.value)} />
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
export const Route = createFileRoute("/app/management/companies/")({
  component: Companies,
});