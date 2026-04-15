/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { areasCollection } from "../../../../collections/areas";
import { Group, TextInput, Table, Button, Modal, Text } from "@mantine/core";
import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", title: "Name" },
  { accessor: "section", title: "Section" },
  { accessor: "created", title: "Created" },
];

function Areas() {
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaSection, setNewAreaSection] = useState("");

  const {
    data: areas,
    isLoading,
    error,
  } = useLiveQuery((q) =>
    q
      .from({ area: areasCollection })
      .where(({ area }) => like(area.name, `%${search}%`))
      .orderBy(({ area }) => area.created, "desc"),
  );

  const handleCreate = async () => {
    if (newAreaName.trim() && newAreaSection.trim()) {
      await areasCollection.insert({
        id: crypto.randomUUID(),
        name: newAreaName.trim(),
        section: newAreaSection.trim(),
        created: new Date().toISOString(),
      });
      setNewAreaName("");
      setNewAreaSection("");
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
          Create New Area
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
          {areas?.map((area) => (
            <Table.Tr key={area.id}>
              <Table.Td>{area.name}</Table.Td>
              <Table.Td>{area.section}</Table.Td>
              <Table.Td>{new Date(area.created).toLocaleString()}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title='Create New Area'>
        <TextInput
          label='Name'
          value={newAreaName}
          onChange={(value) => setNewAreaName(value.target.value)}
        />
        <TextInput
          label='Section ID'
          value={newAreaSection}
          onChange={(value) => setNewAreaSection(value.target.value)}
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
export const Route = createFileRoute("/app/management/areas/")({
  component: Areas,
});
