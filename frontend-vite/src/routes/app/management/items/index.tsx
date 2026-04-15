/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { itemsCollection } from "../../../../collections/items";
import { Group, TextInput, NumberInput, Table, Button, Modal, Text } from "@mantine/core";
import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", title: "Name" },
  { accessor: "category", title: "Category" },
  { accessor: "sale_price", title: "Sale Price" },
  { accessor: "created", title: "Created" },
];

function Items() {
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemCompany, setNewItemCompany] = useState("");
  const [newItemCostPrice, setNewItemCostPrice] = useState(0);
  const [newItemSalePrice, setNewItemSalePrice] = useState(0);
  const [newItemBoxSizeQty, setNewItemBoxSizeQty] = useState(0);

  const {
    data: items,
    isLoading,
    error,
  } = useLiveQuery((q) =>
    q
      .from({ item: itemsCollection })
      .where(({ item }) => like(item.name, `%${search}%`))
      .orderBy(({ item }) => item.created, "desc"),
  );

  const handleCreate = async () => {
    if (newItemName.trim() && newItemCategory.trim() && newItemCompany.trim()) {
      await itemsCollection.insert({
        id: crypto.randomUUID(),
        name: newItemName.trim(),
        category: newItemCategory.trim(),
        company: newItemCompany.trim(),
        cost_price: newItemCostPrice,
        sale_price: newItemSalePrice,
        box_size_qty: newItemBoxSizeQty,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      });
      setNewItemName("");
      setNewItemCategory("");
      setNewItemCompany("");
      setNewItemCostPrice(0);
      setNewItemSalePrice(0);
      setNewItemBoxSizeQty(0);
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
          Create New Item
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
          {items?.map((item) => (
            <Table.Tr key={item.id}>
              <Table.Td>{item.name}</Table.Td>
              <Table.Td>{item.category}</Table.Td>
              <Table.Td>{item.sale_price}</Table.Td>
              <Table.Td>{new Date(item.created).toLocaleString()}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title='Create New Item'>
        <TextInput
          label='Name'
          value={newItemName}
          onChange={(value) => setNewItemName(value.target.value)}
        />
        <TextInput
          label='Category ID'
          value={newItemCategory}
          onChange={(value) => setNewItemCategory(value.target.value)}
        />
        <TextInput
          label='Company ID'
          value={newItemCompany}
          onChange={(value) => setNewItemCompany(value.target.value)}
        />
        <NumberInput
          label='Cost Price'
          value={newItemCostPrice}
          onChange={(value) => setNewItemCostPrice(Number(value))}
        />
        <NumberInput
          label='Sale Price'
          value={newItemSalePrice}
          onChange={(value) => setNewItemSalePrice(Number(value))}
        />
        <NumberInput
          label='Box Size Qty'
          value={newItemBoxSizeQty}
          onChange={(value) => setNewItemBoxSizeQty(Number(value))}
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
export const Route = createFileRoute("/app/management/items/")({
  component: Items,
});
