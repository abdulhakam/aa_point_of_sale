import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon, Code, Tooltip } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { CreateCategoryForm } from "./-CreateCategory";
import { UpdateCategoryForm } from "./-UpdateCategory";
import { trailbaseClient } from "../../../../trailbaseClient";

const tableStructure = [
  { accessor: "id", title: "ID", hidden: false },
  { accessor: "name", title: "Name" },
  { accessor: "created", title: "Created" },
  { accessor: "updated", title: "Updated" },
  { accessor: "actions", title: "Actions" },
];

function Categories() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  useHotkeys([
    ["shift+A", () => setCreateModalOpen(true), { preventDefault: true }],
    [
      "E",
      () => {
        if (selectedIndex >= 0 && categories[selectedIndex]) {
          handleEdit(categories[selectedIndex]);
        }
      },
    ],
    [
      "Delete",
      () => {
        if (selectedIndex >= 0 && categories[selectedIndex]) {
          setDeletingCategory(categories[selectedIndex]);
          setDeleteModalOpen(true);
        }
      },
      { preventDefault: true },
    ],
    [
      "ArrowUp",
      () => {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      },
      { preventDefault: true },
    ],
    [
      "ArrowDown",
      () => {
        setSelectedIndex((prev) => Math.min(categories.length - 1, prev + 1));
      },
      { preventDefault: true },
    ],
  ]);

  const {
    data: categories,
    isLoading,
    isError,
    status,
  } = useQuery({
    queryKey: ["categories", "all", debouncedSearch],
    queryFn: async () => {
      const response = await trailbaseClient.records("categories").list({
        pagination: { limit: 0 },
        count: true,
        filter: debouncedSearch ? `name ~ '${debouncedSearch}'` : undefined,
        order: { created: "desc" },
      });
      return response.records;
    },
    refetchInterval: 2 * 1000,
  });

  useEffect(() => {
    if (categories && selectedIndex >= categories.length) {
      setSelectedIndex(categories.length > 0 ? categories.length - 1 : -1);
    }
  }, [categories, selectedIndex]);

  const handleEdit = (category) => {
    setEditingCategory(category);
    setEditModalOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      return await trailbaseClient.records("categories").delete(categoryId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", "all"] });
      setDeleteModalOpen(false);
      setDeletingCategory(null);
    },
    onError: (error: any) => {
      notifications.show({
        title: "Error",
        message: "Failed to delete category: " + error.message,
        color: "red",
      });
    },
  });

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
              <Table.Td>{new Date(category.created * 1000).toLocaleString()}</Table.Td>
              <Table.Td>{new Date(category.updated * 1000).toLocaleString()}</Table.Td>
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
                      disabled={deleteMutation.isPending}
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
                deleteMutation.mutate(deletingCategory.id);
              }
            }}
            disabled={deleteMutation.isPending}
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