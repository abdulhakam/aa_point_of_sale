import { createFileRoute } from "@tanstack/react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { areasCollection } from "../../../../collections/areas";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon, Code, Tooltip } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { CreateAreaForm } from "./-CreateArea";
import { UpdateAreaForm } from "./-UpdateArea";
import { sectionsCollection } from "../../../../collections/sections";

const tableStructure = [
  { accessor: "id", title: "ID", hidden: false },
  { accessor: "name", title: "Name" },
  { accessor: "section", title: "Section" },
  { accessor: "created", title: "Created" },
  { accessor: "updated", title: "Updated" },
  { accessor: "actions", title: "Actions" },
];

function Areas() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingArea, setDeletingArea] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  useHotkey("shift+a", () => setCreateModalOpen(true), { preventDefault: true });
  useHotkey("e", () => {
    if (selectedIndex >= 0 && areas[selectedIndex]) {
      handleEdit(areas[selectedIndex]);
    }
  });
  useHotkey(
    "delete",
    () => {
      if (selectedIndex >= 0 && areas[selectedIndex]) {
        setDeletingArea(areas[selectedIndex]);
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
      setSelectedIndex((prev) => Math.min(areas.length - 1, prev + 1));
    },
    { preventDefault: true },
  );

  const {
    data: areas,
    isLoading,
    isError,
    status,
  } = useLiveQuery((q) =>
    q
      .from({ area: areasCollection })
      .where(({ area }) => like(area.name, `%${debouncedSearch}%`))
      .orderBy(({ area }) => area.created, "desc")
      .join({ section: sectionsCollection }, ({ area, section }) => eq(area.section, section.id)),
  );

  useEffect(() => {
    if (areas && selectedIndex >= areas.length) {
      setSelectedIndex(areas.length > 0 ? areas.length - 1 : -1);
    }
  }, [areas, selectedIndex]);

  const handleEdit = (area) => {
    setEditingArea(area);
    setEditModalOpen(true);
  };

  const handleDelete = async (areaId) => {
    if (!loadingDelete) {
      setLoadingDelete(true);
      await areasCollection.delete(areaId, { optimistic: false });
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
          Add New Area (Shift+A)
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
          {areas?.map((item, index) => {
            if (!item) return null;
            const { area, section } = item;
            return (
              <Table.Tr
                key={area.id}
                onClick={() => setSelectedIndex(index)}
                style={{
                  backgroundColor: selectedIndex === index ? "#e3f2fd" : undefined,
                  cursor: "pointer",
                }}
              >
                <Table.Td>
                  <Code>{area.id}</Code>
                </Table.Td>
                <Table.Td>{area.name}</Table.Td>
                <Table.Td>{section.name}</Table.Td>
                <Table.Td>{area.created.toLocaleString()}</Table.Td>
                <Table.Td>{area.updated.toLocaleString()}</Table.Td>
                <Table.Td>
                  <Group gap='xs'>
                    <Tooltip label='Edit (E)'>
                      <ActionIcon
                        variant='subtle'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(area);
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
                          setDeletingArea(area);
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
            );
          })}
        </Table.Tbody>
      </Table>
      <Modal
        withCloseButton={false}
        centered
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title='Create New Area'
      >
        <CreateAreaForm setCreateModalOpen={setCreateModalOpen} />
      </Modal>
      <Modal
        centered
        withCloseButton={false}
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title='Edit Area'
      >
        <UpdateAreaForm area={editingArea} setEditModalOpen={setEditModalOpen} />
      </Modal>
      <Modal
        withCloseButton={false}
        centered
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingArea(null);
        }}
        title='Confirm Delete'
      >
        <Text>Are you sure you want to delete this area?</Text>
        <Group mt='md'>
          <Button
            color='red'
            onClick={() => {
              if (deletingArea) {
                handleDelete(deletingArea.id);
              }
              setDeleteModalOpen(false);
            }}
            disabled={loadingDelete}
          >
            Delete
          </Button>
          <Button
            variant='outline'
            onClick={() => {
              setDeleteModalOpen(false);
              setDeletingArea(null);
            }}
          >
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
