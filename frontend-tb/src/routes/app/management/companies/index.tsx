import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon, Code, Tooltip } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { CreateCompanyForm } from "./-CreateCompany";
import { UpdateCompanyForm } from "./-UpdateCompany";
import { trailbaseClient } from "../../../../trailbaseClient";

const tableStructure = [
  { accessor: "id", title: "ID", hidden: false },
  { accessor: "name", title: "Name" },
  { accessor: "parties", title: "Parties" },
  { accessor: "created", title: "Created" },
  { accessor: "updated", title: "Updated" },
  { accessor: "actions", title: "Actions" },
];

function Companies() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
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
          handleEdit(companies[selectedIndex]);
        }
      },
    ],
    [
      "Delete",
      () => {
        if (selectedIndex >= 0 && companies[selectedIndex]) {
          setDeletingCompany(companies[selectedIndex]);
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
    data: companies,
    isLoading,
    isError,
    status,
  } = useQuery({
    queryKey: ["companies", "all", debouncedSearch],
    queryFn: async () => {
      const response = await trailbaseClient.records("companies").list({
        pagination: { limit: 0 },
        count: true,
        filter: debouncedSearch ? `name ~ '${debouncedSearch}'` : undefined,
        expand: { companies2parties: { party: true } },
        order: { created: "desc" },
      });
      return response.records;
    },
    refetchInterval: 2 * 1000,
  });

  useEffect(() => {
    if (companies && selectedIndex >= companies.length) {
      setSelectedIndex(companies.length > 0 ? companies.length - 1 : -1);
    }
  }, [companies, selectedIndex]);

  const handleEdit = (company) => {
    setEditingCompany(company);
    setEditModalOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (companyId: string) => {
      return await trailbaseClient.records("companies").delete(companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", "all"] });
      setDeleteModalOpen(false);
      setDeletingCompany(null);
    },
    onError: (error: any) => {
      notifications.show({
        title: "Error",
        message: "Failed to delete company: " + error.message,
        color: "red",
      });
    },
  });

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
              style={{
                backgroundColor: selectedIndex === index ? "#e3f2fd" : undefined,
                cursor: "pointer",
              }}
            >
              <Table.Td>
                <Code>{company.id}</Code>
              </Table.Td>
              <Table.Td>{company.name}</Table.Td>
              <Table.Td>{company.companies2parties?.map(a => a.party?.name).join(", ") || ""}</Table.Td>
              <Table.Td>{new Date(company.created * 1000).toLocaleString()}</Table.Td>
              <Table.Td>{new Date(company.updated * 1000).toLocaleString()}</Table.Td>
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
                      disabled={deleteMutation.isPending}
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
                deleteMutation.mutate(deletingCompany.id);
              }
            }}
            disabled={deleteMutation.isPending}
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
