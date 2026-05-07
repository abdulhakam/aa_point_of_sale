import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sectionsCollection } from "../../../../collections/sections";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon, Code, Tooltip } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { useHotkeys } from "@mantine/hooks";
import { CreateSectionForm } from "./-CreateSection";
import { UpdateSectionForm } from "./-UpdateSection";
import { trailbaseClient } from "../../../../trailbaseClient";

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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingSection, setDeletingSection] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: sections,
    isLoading,
    isError,
    status,
  } = useQuery({
    queryKey: ["sections", "all"],
    queryFn: async () => {
      const response = await trailbaseClient.records("sections").list({
        pagination: { limit: 0 },
        count: true,
      });

      return response.records;
    },
    refetchInterval: 2 * 1000,
  });

  useHotkeys([
    ["shift+A", () => setCreateModalOpen(true), { preventDefault: true }],
    [
      "E",
      () => {
        if (selectedIndex >= 0 && sections[selectedIndex]) {
          handleEdit(sections[selectedIndex]);
        }
      },
    ],
    [
      "Delete",
      () => {
        if (selectedIndex >= 0 && sections[selectedIndex]) {
          setDeletingSection(sections[selectedIndex]);
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
        setSelectedIndex((prev) => Math.min(sections.length - 1, prev + 1));
      },
      { preventDefault: true },
    ],
  ]);
  useEffect(() => {
    if (sections && selectedIndex >= sections.length) {
      setSelectedIndex(sections.length > 0 ? sections.length - 1 : -1);
    }
  }, [sections, selectedIndex]);

  const handleEdit = (section) => {
    setEditingSection(section);
    setEditModalOpen(true);
  };

  const handleDelete = async (sectionId) => {
    if (!loadingDelete) {
      setLoadingDelete(true);
      console.log(sectionId);
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
                        setDeletingSection(section);
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
        <CreateSectionForm setCreateModalOpen={setCreateModalOpen} />
      </Modal>
      <Modal
        centered
        withCloseButton={false}
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title='Edit Section'
      >
        <UpdateSectionForm section={editingSection} setEditModalOpen={setEditModalOpen} />
      </Modal>
      <Modal
        withCloseButton={false}
        centered
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingSection(null);
        }}
        title='Confirm Delete'
      >
        <Text>Are you sure you want to delete this section?</Text>
        <Group mt='md'>
          <Button
            color='red'
            onClick={() => {
              if (deletingSection) {
                handleDelete(deletingSection.id);
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
