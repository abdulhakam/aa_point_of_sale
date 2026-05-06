import { createFileRoute } from "@tanstack/react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { categoriesCollection } from "../../../../collections/categories";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon, Code, Tooltip } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { RegisterableHotkey, useHotkey } from "@tanstack/react-hotkeys";
import { CreateCategoryForm } from "./-CreateCategory";
import { UpdateCategoryForm } from "./-UpdateCategory";

const tableStructure = [
  { accessor: "id", title: "ID", hidden: false },
  { accessor: "name", title: "Name" },
  { accessor: "created", title: "Created" },
  { accessor: "updated", title: "Updated" },
  { accessor: "actions", title: "Actions" },
];

function Categories() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  useHotkey("shift+a" as RegisterableHotkey, () => setCreateModalOpen(true), { preventDefault: true });
  useHotkey("e" as RegisterableHotkey, () => {
    if (selectedIndex >= 0 && categories[selectedIndex]) {
      handleEdit(categories[selectedIndex]);
    }
  });
  useHotkey(
    "delete",
    () => {
      if (selectedIndex >= 0 && categories[selectedIndex]) {
        setDeletingCategory(categories[selectedIndex]);
        setDeleteModalOpen(true);
      }
    },
    { preventDefault: true },
  );
  useHotkey(
    "arrowup" as RegisterableHotkey,
    () => {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    },
    { preventDefault: true },
  );
  useHotkey(
    "arrowdown" as RegisterableHotkey,
    () => {
      setSelectedIndex((prev) => Math.min(categories.length - 1, prev + 1));
    },
    { preventDefault: true },
  );

  const {
    data: categories,
    isLoading,
    isError,
    status,
  } = useLiveQuery((q) =>
    q
      .from({ category: categoriesCollection })
      .where(({ category }) => like(category.name, `%${debouncedSearch}%`))
      .orderBy(({ category }) => category.created, "desc")
  );

  useEffect(() => {
    if (categories && selectedIndex >= categories.length) {
      setSelectedIndex(categories.length > 0 ? categories.length - 1 : -1);
    }
  }, [categories, selectedIndex]);

  const handleEdit = (category) => {
    setEditingCategory(category);
    setEditModalOpen(true);
  };

  const handleDelete = async (categoryId) => {
    if (!loadingDelete) {
      setLoadingDelete(true);
      await categoriesCollection.delete(categoryId, { optimistic: false });
      setLoadingDelete(false);
    }
  };

  if (isLoading) return <Text>Loading...</Text>;
  if (isError) return <Text>Error: {status}</Text>;

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
          Add New Category (Shift+A)
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
          {categories?.map((category, index) => (
            <Table.Tr
              key={category.id}
              onClick={() => setSelectedIndex(index)}
              style={{
                backgroundColor: selectedIndex === index ? "#e3f2fd" : undefined,
                cursor: "pointer",
              }}
            >
              <Table.Td>
                <Code>{category.id}</Code>
              </Table.Td>
              <Table.Td>{category.name}</Table.Td>
              <Table.Td>{category.created.toLocaleString()}</Table.Td>
              <Table.Td>{category.updated.toLocaleString()}</Table.Td>
              <Table.Td>
                <Group gap='xs'>
                  <Tooltip label='Edit (E)'>
                    <ActionIcon
                      variant='subtle'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(category);
                      }}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label='Delete (Del)'>
                    <ActionIcon
                      variant='subtle'
                      color='red'
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingCategory(category);
                        setDeleteModalOpen(true);
                      }}
                      disabled={loadingDelete}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal
        withCloseButton={false}
        centered
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title='Create New Category'
      >
        <CreateCategoryForm setCreateModalOpen={setCreateModalOpen} />
      </Modal>
      <Modal
        centered
        withCloseButton={false}
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title='Edit Category'
      >
        <UpdateCategoryForm category={editingCategory} setEditModalOpen={setEditModalOpen} />
      </Modal>
      <Modal
        withCloseButton={false}
        centered
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingCategory(null);
        }}
        title='Confirm Delete'
      >
        <Text>Are you sure you want to delete this category?</Text>
        <Group mt='md'>
          <Button
            color='red'
            onClick={() => {
              if (deletingCategory) {
                handleDelete(deletingCategory.id);
              }
              setDeleteModalOpen(false);
            }}
            disabled={loadingDelete}
          >
            Delete
          </Button>
          <Button variant='outline' onClick={() => setDeleteModalOpen(false)}>
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