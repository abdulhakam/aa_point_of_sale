import { createFileRoute } from "@tanstack/react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { partiesCollection } from "../../../../collections/parties";
import { areasCollection } from "../../../../collections/areas";
import { partiesEnumTypeCollection } from "../../../../collections/partiesEnumType";

import { Group, TextInput, Table, Button, Modal, Text, ActionIcon, Code, Tooltip } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { CreatePartyForm } from "./-CreateParty";
import { UpdatePartyForm } from "./-UpdateParty";

const tableStructure = [
  { accessor: "id", title: "ID", hidden: false },
  { accessor: "name", title: "Name" },
  { accessor: "address", title: "Address" },
  { accessor: "phone", title: "Phone" },
  { accessor: "area", title: "Area" },
  { accessor: "type", title: "Type" },
  { accessor: "created", title: "Created" },
  { accessor: "updated", title: "Updated" },
  { accessor: "actions", title: "Actions" },
];

function Parties() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingParty, setDeletingParty] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  useHotkey("shift+a", () => setCreateModalOpen(true), { preventDefault: true });
  useHotkey("e", () => {
    if (selectedIndex >= 0 && parties[selectedIndex]) {
      handleEdit(parties[selectedIndex]);
    }
  });
  useHotkey(
    "delete",
    () => {
      if (selectedIndex >= 0 && parties[selectedIndex]) {
        setDeletingParty(parties[selectedIndex]);
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
      setSelectedIndex((prev) => Math.min(parties.length - 1, prev + 1));
    },
    { preventDefault: true },
  );

  const {
    data: parties,
    isLoading,
    isError,
    status,
  } = useLiveQuery((q) =>
    q
      .from({ party: partiesCollection })
      .where(({ party }) => like(party.name, `%${debouncedSearch}%`))
      .orderBy(({ party }) => party.created, "desc")
      .join({ area: areasCollection }, ({ party, area }) => eq(party.area, area.id))
      .join({ type: partiesEnumTypeCollection }, ({ party, type }) => eq(party.type, type.id)),
  );
  useEffect(() => {
    if (parties && selectedIndex >= parties.length) {
      setSelectedIndex(parties.length > 0 ? parties.length - 1 : -1);
    }
  }, [parties, selectedIndex]);

  const handleEdit = (party) => {
    setEditingParty(party);
    setEditModalOpen(true);
  };

  const handleDelete = async (partyId) => {
    if (!loadingDelete) {
      setLoadingDelete(true);
      await partiesCollection.delete(partyId, { optimistic: false });
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
          Add New Party (Shift+A)
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
          {parties?.map((item, index) => {
            if (!item) return null;
            const { party, area, type } = item;
            return (
              <Table.Tr
                key={party.id}
                onClick={() => setSelectedIndex(index)}
                style={{
                  backgroundColor: selectedIndex === index ? "#e3f2fd" : undefined,
                  cursor: "pointer",
                }}
              >
                <Table.Td>
                  <Code>{party.id}</Code>
                </Table.Td>
                <Table.Td>{party.name}</Table.Td>
                <Table.Td>{party.address}</Table.Td>
                <Table.Td>{party.phone}</Table.Td>
                <Table.Td>{area.name}</Table.Td>
                <Table.Td>{type.name}</Table.Td>
                <Table.Td>{party.created.toLocaleString()}</Table.Td>
                <Table.Td>{party.updated.toLocaleString()}</Table.Td>
                <Table.Td>
                  <Group gap='xs'>
                    <Tooltip label='Edit (E)'>
                      <ActionIcon
                        variant='subtle'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(party);
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
                          setDeletingParty(party);
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
        title='Create New Party'
      >
        <CreatePartyForm setCreateModalOpen={setCreateModalOpen} />
      </Modal>
      <Modal
        centered
        withCloseButton={false}
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title='Edit Party'
      >
        <UpdatePartyForm party={editingParty} setEditModalOpen={setEditModalOpen} />
      </Modal>
      <Modal
        withCloseButton={false}
        centered
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingParty(null);
        }}
        title='Confirm Delete'
      >
        <Text>Are you sure you want to delete this party?</Text>
        <Group mt='md'>
          <Button
            color='red'
            onClick={() => {
              if (deletingParty) {
                handleDelete(deletingParty.id);
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
export const Route = createFileRoute("/app/management/parties/")({
  component: Parties,
});
