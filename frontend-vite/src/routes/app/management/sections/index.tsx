/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { sectionsCollection } from "../../../../collections/sections";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon } from "@mantine/core";
import { useState } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { uuidv7 } from "uuidv7";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", title: "Name" },
  { accessor: "created", title: "Created" },
  { accessor: "actions", title: "Actions" },
];

function Sections() {
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editName, setEditName] = useState("");

  const {
    data: sections,
    isLoading,
    error,
  } = useLiveQuery((q) =>
    q
      .from({ section: sectionsCollection })
      .where(({ section }) => like(section.name, `%${search}%`))
      .orderBy(({ section }) => section.created, "desc"),
  );

  const handleCreate = async () => {
    if (newSectionName.trim()) {
      await sectionsCollection.insert({
        id: uuidv7(),
        name: newSectionName.trim(),
        created: new Date(),
        updated: new Date(),
      });
      setNewSectionName("");
      setCreateModalOpen(false);
    }
  };

  const handleEdit = (section) => {
    setEditingSection(section);
    setEditName(section.name);
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (editName.trim() && editingSection) {
      await sectionsCollection.update(editingSection.id, {
        name: editName.trim(),
        updated: new Date(),
      });
      setEditName("");
      setEditingSection(null);
      setEditModalOpen(false);
    }
  };

  const handleDelete = async (sectionId) => {
    await sectionsCollection.delete(sectionId);
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
          Create New Section
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
          {sections?.map((section) => (
            <Table.Tr key={section.id}>
              <Table.Td>{section.name}</Table.Td>
              <Table.Td>{section.created.toLocaleString()}</Table.Td>
              <Table.Td>
                <Group gap='xs'>
                  <ActionIcon variant='subtle' onClick={() => handleEdit(section)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant='subtle' color='red' onClick={() => handleDelete(section.id)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title='Create New Section'>
        <TextInput
          label='Name'
          value={newSectionName}
          onChange={(value) => setNewSectionName(value.target.value)}
        />
        <Group mt='md'>
          <Button onClick={handleCreate}>Create</Button>
          <Button variant='outline' onClick={() => setCreateModalOpen(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
      <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title='Edit Section'>
        <TextInput label='Name' value={editName} onChange={(value) => setEditName(value.target.value)} />
        <Group mt='md'>
          <Button onClick={handleUpdate}>Update</Button>
          <Button variant='outline' onClick={() => setEditModalOpen(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
    </>
  );
}
export const Route = createFileRoute("/app/management/sections/")({
  component: Sections,
});
