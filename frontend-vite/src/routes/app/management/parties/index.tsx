/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { partiesCollection } from "../../../../collections/parties";
import { areasCollection } from "../../../../collections/areas";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon, Select } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { uuidv7 } from "uuidv7";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", title: "Name" },
  { accessor: "phone", title: "Phone" },
  { accessor: "address", title: "Address" },
  { accessor: "area", title: "Area" },
  { accessor: "type", title: "Type" },
  { accessor: "created", title: "Created" },
  { accessor: "actions", title: "Actions" },
];

function Parties() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyPhone, setNewPartyPhone] = useState("");
  const [newPartyAddress, setNewPartyAddress] = useState("");
  const [newPartyArea, setNewPartyArea] = useState("");
  const [newPartyType, setNewPartyType] = useState("");
  const [newPartyCompany, setNewPartyCompany] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editType, setEditType] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: areas } = useLiveQuery((q) =>
    q.from({ area: areasCollection }).orderBy(({ area }) => area.created, "desc"),
  );

  const {
    data: parties,
    isLoading,
    error,
  } = useLiveQuery((q) =>
    q
      .from({ party: partiesCollection })
      .where(({ party }) => like(party.name, `%${debouncedSearch}%`))
      .orderBy(({ party }) => party.created, "desc"),
  );

  const areaOptions = areas?.map((area) => ({
    value: area.id,
    label: area.name,
  })) || [];

  const handleCreate = async () => {
    if (newPartyName.trim() && newPartyPhone.trim() && newPartyAddress.trim() && newPartyArea && newPartyType.trim() && newPartyCompany.trim() && !loadingCreate) {
      setLoadingCreate(true);
      await partiesCollection.insert({
        id: uuidv7(),
        name: newPartyName.trim(),
        phone: newPartyPhone.trim(),
        address: newPartyAddress.trim(),
        area: newPartyArea,
        type: newPartyType.trim(),
        company: newPartyCompany.trim(),
        created: new Date(),
        updated: new Date(),
      }, { optimistic: false });
      setNewPartyName("");
      setNewPartyPhone("");
      setNewPartyAddress("");
      setNewPartyArea("");
      setNewPartyType("");
      setNewPartyCompany("");
      setCreateModalOpen(false);
      setLoadingCreate(false);
    }
  };

  const handleEdit = (party) => {
    setEditingParty(party);
    setEditName(party.name);
    setEditPhone(party.phone);
    setEditAddress(party.address);
    setEditArea(party.area);
    setEditType(party.type);
    setEditCompany(party.company);
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (editName.trim() && editPhone.trim() && editAddress.trim() && editArea && editType.trim() && editCompany.trim() && editingParty && !loadingEdit) {
      setLoadingEdit(true);
      await partiesCollection.update(editingParty.id, { optimistic: false }, (draft) => {
        draft.name = editName.trim();
        draft.phone = editPhone.trim();
        draft.address = editAddress.trim();
        draft.area = editArea;
        draft.type = editType.trim();
        draft.company = editCompany.trim();
        draft.updated = new Date();
      });
      setEditName("");
      setEditPhone("");
      setEditAddress("");
      setEditArea("");
      setEditType("");
      setEditCompany("");
      setEditingParty(null);
      setEditModalOpen(false);
      setLoadingEdit(false);
    }
  };

  const handleDelete = async (partyId) => {
    if (!loadingDelete) {
      setLoadingDelete(true);
      await partiesCollection.delete(partyId, { optimistic: false });
      setLoadingDelete(false);
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
          {parties?.map((party) => {
            const area = areas?.find((a) => a.id === party.area);
            return (
              <Table.Tr key={party.id}>
                <Table.Td>{party.name}</Table.Td>
                <Table.Td>{party.phone}</Table.Td>
                <Table.Td>{party.address}</Table.Td>
                <Table.Td>{area?.name || "Unknown"}</Table.Td>
                <Table.Td>{party.type}</Table.Td>
                <Table.Td>{party.created.toLocaleString()}</Table.Td>
                <Table.Td>
                  <Group gap='xs'>
                    <ActionIcon variant='subtle' onClick={() => handleEdit(party)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant='subtle' color='red' onClick={() => handleDelete(party.id)} disabled={loadingDelete}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            );
          })}
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
        <Select
          label='Area'
          data={areaOptions}
          value={newPartyArea}
          onChange={setNewPartyArea}
          searchable
          placeholder='Select an area'
        />
        <TextInput
          label='Type'
          value={newPartyType}
          onChange={(value) => setNewPartyType(value.target.value)}
        />
        <TextInput
          label='Company'
          value={newPartyCompany}
          onChange={(value) => setNewPartyCompany(value.target.value)}
        />
        <Group mt='md'>
          <Button onClick={handleCreate} disabled={loadingCreate}>Create</Button>
          <Button variant='outline' onClick={() => setCreateModalOpen(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
      <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title='Edit Party'>
        <TextInput label='Name' value={editName} onChange={(value) => setEditName(value.target.value)} />
        <TextInput label='Phone' value={editPhone} onChange={(value) => setEditPhone(value.target.value)} />
        <TextInput label='Address' value={editAddress} onChange={(value) => setEditAddress(value.target.value)} />
        <Select
          label='Area'
          data={areaOptions}
          value={editArea}
          onChange={setEditArea}
          searchable
          placeholder='Select an area'
        />
        <TextInput label='Type' value={editType} onChange={(value) => setEditType(value.target.value)} />
        <TextInput label='Company' value={editCompany} onChange={(value) => setEditCompany(value.target.value)} />
        <Group mt='md'>
          <Button onClick={handleUpdate} disabled={loadingEdit}>Update</Button>
          <Button variant='outline' onClick={() => setEditModalOpen(false)}>
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