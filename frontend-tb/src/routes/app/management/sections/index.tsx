import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { sectionsCollection } from "../../../../collections/sections";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon, Code, Tooltip } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { uuidv7 } from "uuidv7";
import { useHotkey } from "@tanstack/react-hotkeys";

const tableStructure = [
  { accessor: "id", title: "ID", hidden: false },
  { accessor: "name", title: "Name" },
  { accessor: "created", title: "Created" },
  { accessor: "updated", title: "Updated" },
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
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  useHotkey("shift+a", () => setCreateModalOpen(true), { preventDefault: true });
  useHotkey("e", () => {
    if (selectedIndex >= 0 && sections[selectedIndex]) {
      handleEdit(sections[selectedIndex]);
    }
  });
  useHotkey(
    "delete",
    () => {
      if (selectedIndex >= 0 && sections[selectedIndex]) {
        setDeleteModalOpen(true);
      }
    },
    { preventDefault: true },
  );
  useHotkey(
    "arrowup",
    () => {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    },
    { preventDefault: true },
  );
  useHotkey(
    "arrowdown",
    () => {
      setSelectedIndex((prev) => Math.min(sections.length - 1, prev + 1));
    },
    { preventDefault: true },
  );

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

  useEffect(() => {
    if (sections && selectedIndex >= sections.length) {
      setSelectedIndex(sections.length > 0 ? sections.length - 1 : -1);
    }
  }, [sections, selectedIndex]);

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
      await fetch(`http://localhost:4000/api/records/v1/sections/${editingSection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          updated: Math.floor(new Date().valueOf() / 1000),
        }),
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
          Add New Section (Shift+A)
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
          {sections?.map((section, index) => (
            <Table.Tr
              key={section.id}
              onClick={() => setSelectedIndex(index)}
              style={{ backgroundColor: selectedIndex === index ? "#e3f2fd" : undefined, cursor: "pointer" }}
            >
              <Table.Td>
                <Code>{section.id}</Code>
              </Table.Td>
              <Table.Td>{section.name}</Table.Td>
              <Table.Td>{section.created.toLocaleString()}</Table.Td>
              <Table.Td>{section.updated.toLocaleString()}</Table.Td>
              <Table.Td>
                <Group gap='xs'>
                  <Tooltip label='Edit (E)'>
                    <ActionIcon
                      variant='subtle'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(section);
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
        title='Create New Section'
      >
        <TextInput
          label='Name'
          value={newSectionName}
          onChange={(value) => setNewSectionName(value.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCreate();
            }
          }}
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
      <Modal
        centered
        withCloseButton={false}
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title='Edit Section'
      >
        <TextInput
          label='Name'
          value={editName}
          onChange={(value) => setEditName(value.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleUpdate();
            }
          }}
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
      <Modal
        withCloseButton={false}
        centered
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title='Confirm Delete'
      >
        <Text>Are you sure you want to delete this section?</Text>
        <Group mt='md'>
          <Button
            color='red'
            onClick={() => {
              if (selectedIndex >= 0 && sections[selectedIndex]) {
                handleDelete(sections[selectedIndex].id);
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
export const Route = createFileRoute("/app/management/sections/")({
  component: Sections,
});
