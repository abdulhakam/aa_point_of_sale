import { createFileRoute } from "@tanstack/react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { companiesCollection } from "../../../../collections/companies";
import { partiesCollection } from "../../../../collections/parties";
import { companies2partiesCollection } from "../../../../collections/companies2parties";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon, Code, Tooltip } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { CreateCompanyForm } from "./-CreateCompany";
import { UpdateCompanyForm } from "./-UpdateCompany";

const tableStructure = [
  { accessor: "id", title: "ID", hidden: false },
  { accessor: "name", title: "Name" },
  { accessor: "parties", title: "Parties" },
  { accessor: "created", title: "Created" },
  { accessor: "updated", title: "Updated" },
  { accessor: "actions", title: "Actions" },
];

function Companies() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  useHotkeys([
    ["shift+A", () => setCreateModalOpen(true), { preventDefault: true }],
    [
      "E",
      () => {
        if (selectedIndex >= 0 && companies[selectedIndex]) {
          handleEdit(companies[selectedIndex].company);
        }
      },
    ],
    [
      "Delete",
      () => {
        if (selectedIndex >= 0 && companies[selectedIndex]) {
          setDeletingCompany(companies[selectedIndex].company);
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
        setSelectedIndex((prev) => Math.min(companies.length - 1, prev + 1));
      },
      { preventDefault: true },
    ],
  ]);

  const {
    data: rawCompanies,
    isLoading,
    isError,
    status,
  } = useLiveQuery((q) =>
    q
      .from({ company: companiesCollection })
      .where(({ company }) => like(company.name, `%${debouncedSearch}%`))
      .orderBy(({ company }) => company.created, "desc")
      .leftJoin({ assoc: companies2partiesCollection }, ({ company, assoc }) => eq(company.id, assoc.company))
      .leftJoin({ party: partiesCollection }, ({ assoc, party }) => eq(assoc.party, party.id)),
  );

  // Group companies by ID and collect associated parties
  const companiesMap = rawCompanies?.reduce((acc, item) => {
    const { company, party } = item;
    if (!acc[company.id]) {
      acc[company.id] = {
        company,
        parties: [],
      };
    }
    if (party) {
      acc[company.id].parties.push(party.name);
    }
    return acc;
  }, {});

  const companies = companiesMap
    ? Object.values(companiesMap).sort((a, b) => b.company.created - a.company.created)
    : [];

  useEffect(() => {
    if (companies && selectedIndex >= companies.length) {
      setSelectedIndex(companies.length > 0 ? companies.length - 1 : -1);
    }
  }, [companies, selectedIndex]);

  const handleEdit = (company) => {
    setEditingCompany(company);
    setEditModalOpen(true);
  };

  const handleDelete = async (companyId) => {
    if (!loadingDelete) {
      setLoadingDelete(true);
      await companiesCollection.delete(companyId, { optimistic: false });
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
          Add New Company (Shift+A)
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
          {companies?.map((item, index) => {
            if (!item) return null;
            const { company, parties } = item;
            return (
              <Table.Tr
                key={company.id}
                onClick={() => setSelectedIndex(index)}
                style={{
                  backgroundColor: selectedIndex === index ? "#e3f2fd" : undefined,
                  cursor: "pointer",
                }}
              >
                <Table.Td>
                  <Code>{company.id}</Code>
                </Table.Td>
                <Table.Td>{company.name}</Table.Td>
                <Table.Td>{parties.length > 0 ? parties.join(", ") : "None"}</Table.Td>
                <Table.Td>{company.created.toLocaleString()}</Table.Td>
                <Table.Td>{company.updated.toLocaleString()}</Table.Td>
                <Table.Td>
                  <Group gap='xs'>
                    <Tooltip label='Edit (E)'>
                      <ActionIcon
                        variant='subtle'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(company);
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
                          setDeletingCompany(company);
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
        title='Create New Company'
      >
        <CreateCompanyForm setCreateModalOpen={setCreateModalOpen} />
      </Modal>
      <Modal
        centered
        withCloseButton={false}
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title='Edit Company'
      >
        <UpdateCompanyForm company={editingCompany} setEditModalOpen={setEditModalOpen} />
      </Modal>
      <Modal
        withCloseButton={false}
        centered
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingCompany(null);
        }}
        title='Confirm Delete'
      >
        <Text>Are you sure you want to delete this company?</Text>
        <Group mt='md'>
          <Button
            color='red'
            onClick={() => {
              if (deletingCompany) {
                handleDelete(deletingCompany.id);
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
export const Route = createFileRoute("/app/management/companies/")({
  component: Companies,
});
