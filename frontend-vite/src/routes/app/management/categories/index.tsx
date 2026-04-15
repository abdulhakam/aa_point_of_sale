/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { categoriesCollection } from "../../../../collections/categories";
import { Group, TextInput, Table, Button, Modal, Text } from "@mantine/core";
import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", title: "Name" },
  { accessor: "created", title: "Created" },
];

function Categories() {
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const {
    data: categories,
    isLoading,
    error,
  } = useLiveQuery((q) =>
    q
      .from({ category: categoriesCollection })
      .where(({ category }) => like(category.name, `%${search}%`))
      .orderBy(({ category }) => category.created, "desc"),
  );

  const handleCreate = async () => {
    if (newCategoryName.trim()) {
      await categoriesCollection.insert({
        id: crypto.randomUUID(),
        name: newCategoryName.trim(),
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      });
      setNewCategoryName("");
      setCreateModalOpen(false);
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
              <Table.Td>{new Date(category.created).toLocaleString()}</Table.Td>
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
          <Button onClick={handleCreate}>Create</Button>
          <Button variant='outline' onClick={() => setCreateModalOpen(false)}>
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
