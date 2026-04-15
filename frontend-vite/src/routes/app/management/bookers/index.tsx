/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { bookersCollection } from "../../../../collections/bookers";
import { Group, TextInput, Table, Button, Modal, Text } from "@mantine/core";
import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", title: "Name" },
  { accessor: "phone", title: "Phone" },
  { accessor: "company", title: "Company" },
  { accessor: "created", title: "Created" },
];

function Bookers() {
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newBookerName, setNewBookerName] = useState("");
  const [newBookerPhone, setNewBookerPhone] = useState("");
  const [newBookerCompany, setNewBookerCompany] = useState("{}");

  const {
    data: bookers,
    isLoading,
    error,
  } = useLiveQuery((q) =>
    q
      .from({ booker: bookersCollection })
      .where(({ booker }) => like(booker.name, `%${search}%`))
      .orderBy(({ booker }) => booker.created, "desc"),
  );

  const handleCreate = async () => {
    if (newBookerName.trim() && newBookerPhone.trim()) {
      await bookersCollection.insert({
        id: crypto.randomUUID(),
        name: newBookerName.trim(),
        phone: newBookerPhone.trim(),
        company: newBookerCompany,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      });
      setNewBookerName("");
      setNewBookerPhone("");
      setNewBookerCompany("{}");
      setCreateModalOpen(false);
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
          Create New Booker
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
          {bookers?.map((booker) => (
            <Table.Tr key={booker.id}>
              <Table.Td>{booker.name}</Table.Td>
              <Table.Td>{booker.phone}</Table.Td>
              <Table.Td>{booker.company}</Table.Td>
              <Table.Td>{new Date(booker.created).toLocaleString()}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title='Create New Booker'>
        <TextInput
          label='Name'
          value={newBookerName}
          onChange={(value) => setNewBookerName(value.target.value)}
        />
        <TextInput
          label='Phone'
          value={newBookerPhone}
          onChange={(value) => setNewBookerPhone(value.target.value)}
        />
        <TextInput
          label='Company (JSON)'
          value={newBookerCompany}
          onChange={(value) => setNewBookerCompany(value.target.value)}
        />
        <Group mt='md'>
          <Button onClick={handleCreate}>Create</Button>
          <Button variant='outline' onClick={() => setCreateModalOpen(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
    </>
  );
}
export const Route = createFileRoute("/app/management/bookers/")({
  component: Bookers,
});
