import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { sectionsCollection } from "../../../../collections/sections";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { uuidv7 } from "uuidv7";

const tableStructure = [
  { accessor: "id", hidden: false },
  { accessor: "name", title: "Name" },
  { accessor: "created", title: "Created" },
  { accessor: "actions", title: "Actions" },
];

function Sections() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editName, setEditName] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: sections,
    isLoading,
    isError,
    status,
  } = useLiveQuery((q) =>
    q
      .from({ section: sectionsCollection })
      .where(({ section }) => like(section.name, `%${debouncedSearch}%`))
      .orderBy(({ section }) => section.created, "desc"),
  );

  const handleCreate = async () => {
    if (newSectionName.trim() && !loadingCreate) {
      setLoadingCreate(true);
      await sectionsCollection.insert(
        {
          id: uuidv7(),
          name: newSectionName.trim(),
          created: new Date(),
          updated: new Date(),
        },
        { optimistic: false },
      );
      setNewSectionName("");
      setCreateModalOpen(false);
      setLoadingCreate(false);
    }
  };

  const handleEdit = (section) => {
    setEditingSection(section);
    setEditName(section.name);
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (editName.trim() && editingSection && !loadingEdit) {
      setLoadingEdit(true);
      await sectionsCollection.update(editingSection.id, { optimistic: false }, (draft) => {
        draft.name = editName.trim();
        draft.updated = new Date();
      });
      setEditName("");
      setEditingSection(null);
      setEditModalOpen(false);
      setLoadingEdit(false);
    }
  };

  const handleDelete = async (sectionId) => {
    if (!loadingDelete) {
      setLoadingDelete(true);
      await sectionsCollection.delete(sectionId, { optimistic: false });
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
                  <ActionIcon
                    variant='subtle'
                    color='red'
                    onClick={() => handleDelete(section.id)}
                    disabled={loadingDelete}
                  >
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
          <Button onClick={handleCreate} disabled={loadingCreate}>
            Create
          </Button>
          <Button variant='outline' onClick={() => setCreateModalOpen(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
      <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title='Edit Section'>
        <TextInput label='Name' value={editName} onChange={(value) => setEditName(value.target.value)} />
        <Group mt='md'>
          <Button onClick={handleUpdate} disabled={loadingEdit}>
            Update
          </Button>
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
