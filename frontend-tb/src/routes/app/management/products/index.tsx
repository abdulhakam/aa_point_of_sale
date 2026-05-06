import { createFileRoute } from "@tanstack/react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { productsCollection } from "../../../../collections/products";
import { categoriesCollection } from "../../../../collections/categories";
import { companiesCollection } from "../../../../collections/companies";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon, Code, Tooltip } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { RegisterableHotkey, useHotkey } from "@tanstack/react-hotkeys";
import { CreateProductForm } from "./-CreateProduct";
import { UpdateProductForm } from "./-UpdateProduct";

const tableStructure = [
  { accessor: "id", title: "ID", hidden: false },
  { accessor: "name", title: "Name" },
  { accessor: "category", title: "Category" },
  { accessor: "company", title: "Company" },
  { accessor: "cost_price", title: "Cost Price" },
  { accessor: "sale_price", title: "Sale Price" },
  { accessor: "box_size_qty", title: "Box Size Qty" },
  { accessor: "created", title: "Created" },
  { accessor: "updated", title: "Updated" },
  { accessor: "actions", title: "Actions" },
];

function Products() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  useHotkey("shift+a" as RegisterableHotkey, () => setCreateModalOpen(true), { preventDefault: true });
  useHotkey("e" as RegisterableHotkey, () => {
    if (selectedIndex >= 0 && products[selectedIndex]) {
      handleEdit(products[selectedIndex].product);
    }
  });
  useHotkey(
    "delete",
    () => {
      if (selectedIndex >= 0 && products[selectedIndex]) {
        setDeletingProduct(products[selectedIndex].product);
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
      setSelectedIndex((prev) => Math.min(products.length - 1, prev + 1));
    },
    { preventDefault: true },
  );

  const {
    data: rawProducts,
    isLoading,
    isError,
    status,
  } = useLiveQuery((q) =>
    q
      .from({ product: productsCollection })
      .where(({ product }) => like(product.name, `%${debouncedSearch}%`))
      .orderBy(({ product }) => product.created, "desc")
      .leftJoin({ category: categoriesCollection }, ({ product, category }) => eq(product.category, category.id))
      .leftJoin({ company: companiesCollection }, ({ product, company }) => eq(product.company, company.id))
  );

  const products = rawProducts?.sort((a, b) => b.product.created - a.product.created) || [];

  useEffect(() => {
    if (products && selectedIndex >= products.length) {
      setSelectedIndex(products.length > 0 ? products.length - 1 : -1);
    }
  }, [products, selectedIndex]);

  const handleEdit = (product) => {
    setEditingProduct(product);
    setEditModalOpen(true);
  };

  const handleDelete = async (productId) => {
    if (!loadingDelete) {
      setLoadingDelete(true);
      await productsCollection.delete(productId, { optimistic: false });
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
          Add New Product (Shift+A)
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
          {products?.map((item, index) => {
            if (!item) return null;
            const { product, category, company } = item;
            return (
              <Table.Tr
                key={product.id}
                onClick={() => setSelectedIndex(index)}
                style={{
                  backgroundColor: selectedIndex === index ? "#e3f2fd" : undefined,
                  cursor: "pointer",
                }}
              >
                <Table.Td>
                  <Code>{product.id}</Code>
                </Table.Td>
                <Table.Td>{product.name}</Table.Td>
                <Table.Td>{category?.name || "Unknown"}</Table.Td>
                <Table.Td>{company?.name || "Unknown"}</Table.Td>
                <Table.Td>{product.cost_price}</Table.Td>
                <Table.Td>{product.sale_price}</Table.Td>
                <Table.Td>{product.box_size_qty}</Table.Td>
                <Table.Td>{product.created.toLocaleString()}</Table.Td>
                <Table.Td>{product.updated.toLocaleString()}</Table.Td>
                <Table.Td>
                  <Group gap='xs'>
                    <Tooltip label='Edit (E)'>
                      <ActionIcon
                        variant='subtle'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(product);
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
                          setDeletingProduct(product);
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
        title='Create New Product'
      >
        <CreateProductForm setCreateModalOpen={setCreateModalOpen} />
      </Modal>
      <Modal
        centered
        withCloseButton={false}
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title='Edit Product'
      >
        <UpdateProductForm product={editingProduct} setEditModalOpen={setEditModalOpen} />
      </Modal>
      <Modal
        withCloseButton={false}
        centered
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingProduct(null);
        }}
        title='Confirm Delete'
      >
        <Text>Are you sure you want to delete this product?</Text>
        <Group mt='md'>
          <Button
            color='red'
            onClick={() => {
              if (deletingProduct) {
                handleDelete(deletingProduct.id);
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
export const Route = createFileRoute("/app/management/products/")({
  component: Products,
});