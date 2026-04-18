/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { categoriesCollection } from "../../../../collections/categories";
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

function Categories() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: categories,
    isLoading,
    error,
  } = useLiveQuery((q) =>
    q
      .from({ category: categoriesCollection })
      .where(({ category }) => like(category.name, `%${debouncedSearch}%`))
      .orderBy(({ category }) => category.created, "desc"),
  );

  const handleCreate = async () => {
    if (newCategoryName.trim() && !loadingCreate) {
      setLoadingCreate(true);
      await categoriesCollection.insert({
        id: uuidv7(),
        name: newCategoryName.trim(),
        created: new Date(),
        updated: new Date(),
      }, { optimistic: false });
      setNewCategoryName("");
      setCreateModalOpen(false);
      setLoadingCreate(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (editName.trim() && editingCategory && !loadingEdit) {
      setLoadingEdit(true);
      await categoriesCollection.update(editingCategory.id, { optimistic: false }, (draft) => {
        draft.name = editName.trim();
        draft.updated = new Date();
      });
      setEditName("");
      setEditingCategory(null);
      setEditModalOpen(false);
      setLoadingEdit(false);
    }
  };

  const handleDelete = async (categoryId) => {
    if (!loadingDelete) {
      setLoadingDelete(true);
      await categoriesCollection.delete(categoryId, { optimistic: false });
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
          Create New Category
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
          {categories?.map((category) => (
            <Table.Tr key={category.id}>
              <Table.Td>{category.name}</Table.Td>
              <Table.Td>{category.created.toLocaleString()}</Table.Td>
              <Table.Td>
                <Group gap='xs'>
                  <ActionIcon variant='subtle' onClick={() => handleEdit(category)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant='subtle' color='red' onClick={() => handleDelete(category.id)} disabled={loadingDelete}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title='Create New Category'>
        <TextInput
          label='Name'
          value={newCategoryName}
          onChange={(value) => setNewCategoryName(value.target.value)}
        />
        <Group mt='md'>
          <Button onClick={handleCreate} disabled={loadingCreate}>Create</Button>
          <Button variant='outline' onClick={() => setCreateModalOpen(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
      <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title='Edit Category'>
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
export const Route = createFileRoute("/app/management/categories/")({
  component: Categories,
});