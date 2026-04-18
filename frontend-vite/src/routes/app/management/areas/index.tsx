/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { areasCollection } from "../../../../collections/areas";
import { sectionsCollection } from "../../../../collections/sections";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon, Select } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { uuidv7 } from "uuidv7";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", title: "Name" },
  { accessor: "section", title: "Section" },
  { accessor: "created", title: "Created" },
  { accessor: "actions", title: "Actions" },
];

function Areas() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaSectionId, setNewAreaSectionId] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSectionId, setEditSectionId] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: sections } = useLiveQuery((q) =>
    q.from({ section: sectionsCollection }).orderBy(({ section }) => section.created, "desc"),
  );

  const {
    data: areas,
    isLoading,
    error,
  } = useLiveQuery((q) =>
    q
      .from({ area: areasCollection })
      .where(({ area }) => like(area.name, `%${debouncedSearch}%`))
      .orderBy(({ area }) => area.created, "desc"),
  );

  const sectionOptions =
    sections?.map((section) => ({
      value: section.id,
      label: section.name,
    })) || [];

  const handleCreate = async () => {
    if (newAreaName.trim() && newAreaSectionId && !loadingCreate) {
      setLoadingCreate(true);
      await areasCollection.insert(
        {
          id: uuidv7(),
          name: newAreaName.trim(),
          section: newAreaSectionId,
          created: new Date(),
          updated: new Date(),
        },
        { optimistic: false },
      );
      setNewAreaName("");
      setNewAreaSectionId("");
      setCreateModalOpen(false);
      setLoadingCreate(false);
    }
  };

  const handleEdit = (area) => {
    setEditingArea(area);
    setEditName(area.name);
    setEditSectionId(area.section);
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (editName.trim() && editSectionId && editingArea && !loadingEdit) {
      setLoadingEdit(true);
      await areasCollection.update(editingArea.id, { optimistic: false }, (draft) => {
        draft.name = editName.trim();
        draft.section = editSectionId;
        draft.updated = new Date();
      });
      setEditName("");
      setEditSectionId("");
      setEditingArea(null);
      setEditModalOpen(false);
      setLoadingEdit(false);
    }
  };

  const handleDelete = async (areaId) => {
    if (!loadingDelete) {
      setLoadingDelete(true);
      await areasCollection.delete(areaId, { optimistic: false });
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
          {areas?.map((area) => {
            const section = sections?.find((s) => s.id === area.section);
            return (
              <Table.Tr key={area.id}>
                <Table.Td>{area.name}</Table.Td>
                <Table.Td>{section?.name || "Unknown"}</Table.Td>
                <Table.Td>{area.created.toLocaleString()}</Table.Td>
                <Table.Td>
                  <Group gap='xs'>
                    <ActionIcon variant='subtle' onClick={() => handleEdit(area)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant='subtle'
                      color='red'
                      onClick={() => handleDelete(area.id)}
                      disabled={loadingDelete}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title='Create New Area'>
        <TextInput
          label='Name'
          value={newAreaName}
          onChange={(value) => setNewAreaName(value.target.value)}
        />
        <Select
          label='Section'
          data={sectionOptions}
          value={newAreaSectionId}
          onChange={setNewAreaSectionId}
          searchable
          placeholder='Select a section'
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
      <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title='Edit Area'>
        <TextInput label='Name' value={editName} onChange={(value) => setEditName(value.target.value)} />
        <Select
          label='Section'
          data={sectionOptions}
          value={editSectionId}
          onChange={setEditSectionId}
          searchable
          placeholder='Select a section'
        />
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
export const Route = createFileRoute("/app/management/areas/")({
  component: Areas,
});
