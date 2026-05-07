import { createFileRoute } from "@tanstack/react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { orderBookersCollection } from "../../../../collections/order_bookers";
import { companiesCollection } from "../../../../collections/companies";
import { companies2orderBookersCollection } from "../../../../collections/companies2orderbookers";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon, Code, Tooltip } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { CreateOrderBookerForm } from "./-CreateOrderBooker";
import { UpdateOrderBookerForm } from "./-UpdateOrderBooker";

const tableStructure = [
  { accessor: "id", title: "ID", hidden: false },
  { accessor: "name", title: "Name" },
  { accessor: "phone", title: "Phone" },
  { accessor: "companies", title: "Companies" },
  { accessor: "created", title: "Created" },
  { accessor: "updated", title: "Updated" },
  { accessor: "actions", title: "Actions" },
];

function OrderBookers() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingOrderBooker, setEditingOrderBooker] = useState(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingOrderBooker, setDeletingOrderBooker] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  useHotkeys([
    ["shift+A", () => setCreateModalOpen(true), { preventDefault: true }],
    [
      "E",
      () => {
        if (selectedIndex >= 0 && orderBookers[selectedIndex]) {
          handleEdit(orderBookers[selectedIndex].orderBooker);
        }
      },
    ],
    [
      "Delete",
      () => {
        if (selectedIndex >= 0 && orderBookers[selectedIndex]) {
          setDeletingOrderBooker(orderBookers[selectedIndex].orderBooker);
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
        setSelectedIndex((prev) => Math.min(orderBookers.length - 1, prev + 1));
      },
      { preventDefault: true },
    ],
  ]);

  const {
    data: rawOrderBookers,
    isLoading,
    isError,
    status,
  } = useLiveQuery((q) =>
    q
      .from({ order_booker: orderBookersCollection })
      .where(({ order_booker }) => like(order_booker.name, `%${debouncedSearch}%`))
      .orderBy(({ order_booker }) => order_booker.created, "desc")
      .leftJoin({ assoc: companies2orderBookersCollection }, ({ order_booker, assoc }) => eq(order_booker.id, assoc.order_booker))
      .leftJoin({ company: companiesCollection }, ({ assoc, company }) => eq(assoc.company, company.id)),
  );

  // Group order bookers by ID and collect associated companies
  const orderBookersMap = rawOrderBookers?.reduce((acc, item) => {
    const { order_booker, company } = item;
    if (!acc[order_booker.id]) {
      acc[order_booker.id] = {
        orderBooker: order_booker,
        companies: [],
      };
    }
    if (company) {
      acc[order_booker.id].companies.push(company.name);
    }
    return acc;
  }, {});

  const orderBookers = orderBookersMap
    ? Object.values(orderBookersMap).sort((a, b) => b.orderBooker.created - a.orderBooker.created)
    : [];

  useEffect(() => {
    if (orderBookers && selectedIndex >= orderBookers.length) {
      setSelectedIndex(orderBookers.length > 0 ? orderBookers.length - 1 : -1);
    }
  }, [orderBookers, selectedIndex]);

  const handleEdit = (orderBooker) => {
    setEditingOrderBooker(orderBooker);
    setEditModalOpen(true);
  };

  const handleDelete = async (orderBookerId) => {
    if (!loadingDelete) {
      setLoadingDelete(true);
      await orderBookersCollection.delete(orderBookerId, { optimistic: false });
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
          Add New Order Booker (Shift+A)
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
          {orderBookers?.map((item, index) => {
            if (!item) return null;
            const { orderBooker, companies } = item;
            return (
              <Table.Tr
                key={orderBooker.id}
                onClick={() => setSelectedIndex(index)}
                style={{
                  backgroundColor: selectedIndex === index ? "#e3f2fd" : undefined,
                  cursor: "pointer",
                }}
              >
                <Table.Td>
                  <Code>{orderBooker.id}</Code>
                </Table.Td>
                <Table.Td>{orderBooker.name}</Table.Td>
                <Table.Td>{orderBooker.phone}</Table.Td>
                <Table.Td>{companies.length > 0 ? companies.join(", ") : "None"}</Table.Td>
                <Table.Td>{orderBooker.created.toLocaleString()}</Table.Td>
                <Table.Td>{orderBooker.updated.toLocaleString()}</Table.Td>
                <Table.Td>
                  <Group gap='xs'>
                    <Tooltip label='Edit (E)'>
                      <ActionIcon
                        variant='subtle'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(orderBooker);
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
                          setDeletingOrderBooker(orderBooker);
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
        title='Create New Order Booker'
      >
        <CreateOrderBookerForm setCreateModalOpen={setCreateModalOpen} />
      </Modal>
      <Modal
        centered
        withCloseButton={false}
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title='Edit Order Booker'
      >
        <UpdateOrderBookerForm orderBooker={editingOrderBooker} setEditModalOpen={setEditModalOpen} />
      </Modal>
      <Modal
        withCloseButton={false}
        centered
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingOrderBooker(null);
        }}
        title='Confirm Delete'
      >
        <Text>Are you sure you want to delete this order booker?</Text>
        <Group mt='md'>
          <Button
            color='red'
            onClick={() => {
              if (deletingOrderBooker) {
                handleDelete(deletingOrderBooker.id);
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
export const Route = createFileRoute("/app/management/order_bookers/")({
  component: OrderBookers,
});