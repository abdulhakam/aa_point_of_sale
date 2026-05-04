import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { companiesCollection } from "../../../../collections/companies";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon, Code, Tooltip } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { RegisterableHotkey, useHotkey } from "@tanstack/react-hotkeys";
import { CreateCompanyForm } from "./-CreateCompany";
import { UpdateCompanyForm } from "./-UpdateCompany";

const tableStructure = [
  { accessor: "id", title: "ID", hidden: false },
  { accessor: "name", title: "Name" },
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

  useHotkey("shift+a" as RegisterableHotkey, () => setCreateModalOpen(true), { preventDefault: true });
  useHotkey("e" as RegisterableHotkey, () => {
    if (selectedIndex >= 0 && companies[selectedIndex]) {
      handleEdit(companies[selectedIndex]);
    }
  });
  useHotkey(
    "delete",
    () => {
      if (selectedIndex >= 0 && companies[selectedIndex]) {
        setDeletingCompany(companies[selectedIndex]);
        setDeleteModalOpen(true);
      }
    },
    { preventDefault: true },
  );
  useHotkey(
    "arrowup" as RegisterableHotkey,
    () => {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    },
    { preventDefault: true },
  );
  useHotkey(
    "arrowdown" as RegisterableHotkey,
    () => {
      setSelectedIndex((prev) => Math.min(companies.length - 1, prev + 1));
    },
    { preventDefault: true },
  );

  const {
    data: companies,
    isLoading,
    isError,
    status,
  } = useLiveQuery((q) =>
    q
      .from({ company: companiesCollection })
      .where(({ company }) => like(company.name, `%${debouncedSearch}%`))
      .orderBy(({ company }) => company.created, "desc"),
  );

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
          {companies?.map((company, index) => (
            <Table.Tr
              key={company.id}
              onClick={() => setSelectedIndex(index)}
              style={{ backgroundColor: selectedIndex === index ? "#e3f2fd" : undefined, cursor: "pointer" }}
            >
              <Table.Td>
                <Code>{company.id}</Code>
              </Table.Td>
              <Table.Td>{company.name}</Table.Td>
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
          ))}
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