import { createFileRoute } from "@tanstack/react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { partiesCollection } from "../../../../collections/parties";
import { areasCollection } from "../../../../collections/areas";
import { partiesEnumTypeCollection } from "../../../../collections/partiesEnumType";
import { companiesCollection } from "../../../../collections/companies";
import { companies2partiesCollection } from "../../../../collections/companies2parties";

import { Group, TextInput, Table, Button, Modal, Text, ActionIcon, Code, Tooltip } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { CreatePartyForm } from "./-CreateParty";
import { UpdatePartyForm } from "./-UpdateParty";

const tableStructure = [
  { accessor: "id", title: "ID", hidden: false },
  { accessor: "name", title: "Name" },
  { accessor: "address", title: "Address" },
  { accessor: "phone", title: "Phone" },
  { accessor: "area", title: "Area" },
  { accessor: "type", title: "Type" },
  { accessor: "companies", title: "Companies" },
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

  useHotkeys([
    ["shift+A", () => setCreateModalOpen(true), { preventDefault: true }],
    [
      "E",
      () => {
        if (selectedIndex >= 0 && partiesArray[selectedIndex]) {
          handleEdit(partiesArray[selectedIndex]);
        }
      },
    ],
    [
      "Delete",
      () => {
        if (selectedIndex >= 0 && partiesArray[selectedIndex]) {
          setDeletingParty(partiesArray[selectedIndex]);
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
        setSelectedIndex((prev) => Math.min(partiesArray.length - 1, prev + 1));
      },
      { preventDefault: true },
    ],
  ]);

  const {
    data: rawParties,
    isLoading,
    isError,
    status,
  } = useLiveQuery((q) =>
    q
      .from({ party: partiesCollection })
      .where(({ party }) => like(party.name, `%${debouncedSearch}%`))
      .orderBy(({ party }) => party.created, "desc")
      .join({ area: areasCollection }, ({ party, area }) => eq(party.area, area.id))
      .join({ type: partiesEnumTypeCollection }, ({ party, type }) => eq(party.type, type.id))
      .leftJoin({ assoc: companies2partiesCollection }, ({ party, assoc }) => eq(party.id, assoc.party))
      .leftJoin({ company: companiesCollection }, ({ assoc, company }) => eq(assoc.company, company.id)),
  );

  // Group parties by ID and collect associated companies
  const parties = rawParties?.reduce((acc, item) => {
    const { party, area, type, company } = item;
    if (!acc[party.id]) {
      acc[party.id] = {
        party,
        area,
        type,
        companies: [],
      };
    }
    if (company) {
      acc[party.id].companies.push(company.name);
    }
    return acc;
  }, {});

  const partiesArray = parties ? Object.values(parties).sort((a, b) => b.party.created - a.party.created) : [];
  useEffect(() => {
    if (partiesArray && selectedIndex >= partiesArray.length) {
      setSelectedIndex(partiesArray.length > 0 ? partiesArray.length - 1 : -1);
    }
  }, [partiesArray, selectedIndex]);

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
          {partiesArray?.map((item, index) => {
            if (!item) return null;
            const { party, area, type, companies } = item;
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
                <Table.Td>{companies.length > 0 ? companies.join(", ") : "None"}</Table.Td>
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
