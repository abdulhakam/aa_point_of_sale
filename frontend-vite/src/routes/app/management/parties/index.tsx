/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { partiesCollection } from "../../../../collections/parties";
import { Group, TextInput, Table, Button, Modal, Text } from "@mantine/core";
import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", title: "Name" },
  { accessor: "phone", title: "Phone" },
  { accessor: "address", title: "Address" },
  { accessor: "type", title: "Type" },
  { accessor: "created", title: "Created" },
];

function Parties() {
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyPhone, setNewPartyPhone] = useState("");
  const [newPartyAddress, setNewPartyAddress] = useState("");
  const [newPartyType, setNewPartyType] = useState("");
  const [newPartyArea, setNewPartyArea] = useState("");
  const [newPartyCompany, setNewPartyCompany] = useState("{}");

  const {
    data: parties,
    isLoading,
    error,
  } = useLiveQuery((q) =>
    q
      .from({ party: partiesCollection })
      .where(({ party }) => like(party.name, `%${search}%`))
      .orderBy(({ party }) => party.created, "desc"),
  );

  const handleCreate = async () => {
    if (newPartyName.trim() && newPartyPhone.trim() && newPartyArea.trim()) {
      await partiesCollection.insert({
        id: crypto.randomUUID(),
        name: newPartyName.trim(),
        phone: newPartyPhone.trim(),
        address: newPartyAddress.trim(),
        type: newPartyType.trim(),
        area: newPartyArea.trim(),
        company: newPartyCompany,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      });
      setNewPartyName("");
      setNewPartyPhone("");
      setNewPartyAddress("");
      setNewPartyType("");
      setNewPartyArea("");
      setNewPartyCompany("{}");
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
          Create New Party
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
          {parties?.map((party) => (
            <Table.Tr key={party.id}>
              <Table.Td>{party.name}</Table.Td>
              <Table.Td>{party.phone}</Table.Td>
              <Table.Td>{party.address}</Table.Td>
              <Table.Td>{party.type}</Table.Td>
              <Table.Td>{new Date(party.created).toLocaleString()}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title='Create New Party'>
        <TextInput
          label='Name'
          value={newPartyName}
          onChange={(value) => setNewPartyName(value.target.value)}
        />
        <TextInput
          label='Phone'
          value={newPartyPhone}
          onChange={(value) => setNewPartyPhone(value.target.value)}
        />
        <TextInput
          label='Address'
          value={newPartyAddress}
          onChange={(value) => setNewPartyAddress(value.target.value)}
        />
        <TextInput
          label='Type'
          value={newPartyType}
          onChange={(value) => setNewPartyType(value.target.value)}
        />
        <TextInput
          label='Area ID'
          value={newPartyArea}
          onChange={(value) => setNewPartyArea(value.target.value)}
        />
        <TextInput
          label='Company (JSON)'
          value={newPartyCompany}
          onChange={(value) => setNewPartyCompany(value.target.value)}
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
export const Route = createFileRoute("/app/management/parties/")({
  component: Parties,
});
