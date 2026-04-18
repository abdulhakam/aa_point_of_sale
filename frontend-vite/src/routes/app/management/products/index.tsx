/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { like } from "@tanstack/react-db";
import { productsCollection } from "../../../../collections/products";
import { categoriesCollection } from "../../../../collections/categories";
import { companiesCollection } from "../../../../collections/companies";
import { Group, TextInput, Table, Button, Modal, Text, ActionIcon, Select, NumberInput } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { uuidv7 } from "uuidv7";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "name", title: "Name" },
  { accessor: "category", title: "Category" },
  { accessor: "company", title: "Company" },
  { accessor: "cost_price", title: "Cost Price" },
  { accessor: "sale_price", title: "Sale Price" },
  { accessor: "box_size_qty", title: "Box Size Qty" },
  { accessor: "created", title: "Created" },
  { accessor: "actions", title: "Actions" },
];

function Products() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductCompany, setNewProductCompany] = useState("");
  const [newProductCostPrice, setNewProductCostPrice] = useState(0);
  const [newProductSalePrice, setNewProductSalePrice] = useState(0);
  const [newProductBoxSizeQty, setNewProductBoxSizeQty] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editCostPrice, setEditCostPrice] = useState(0);
  const [editSalePrice, setEditSalePrice] = useState(0);
  const [editBoxSizeQty, setEditBoxSizeQty] = useState(0);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: categories } = useLiveQuery((q) =>
    q.from({ category: categoriesCollection }).orderBy(({ category }) => category.created, "desc"),
  );

  const { data: companies } = useLiveQuery((q) =>
    q.from({ company: companiesCollection }).orderBy(({ company }) => company.created, "desc"),
  );

  const {
    data: products,
    isLoading,
    error,
  } = useLiveQuery((q) =>
    q
      .from({ product: productsCollection })
      .where(({ product }) => like(product.name, `%${debouncedSearch}%`))
      .orderBy(({ product }) => product.created, "desc"),
  );

  const categoryOptions = categories?.map((category) => ({
    value: category.id,
    label: category.name,
  })) || [];

  const companyOptions = companies?.map((company) => ({
    value: company.id,
    label: company.name,
  })) || [];

  const handleCreate = async () => {
    if (newProductName.trim() && newProductCategory && newProductCompany && newProductCostPrice >= 0 && newProductSalePrice >= 0 && newProductBoxSizeQty >= 0 && !loadingCreate) {
      setLoadingCreate(true);
      await productsCollection.insert({
        id: uuidv7(),
        name: newProductName.trim(),
        category: newProductCategory,
        company: newProductCompany,
        cost_price: newProductCostPrice,
        sale_price: newProductSalePrice,
        box_size_qty: newProductBoxSizeQty,
        created: new Date(),
        updated: new Date(),
      }, { optimistic: false });
      setNewProductName("");
      setNewProductCategory("");
      setNewProductCompany("");
      setNewProductCostPrice(0);
      setNewProductSalePrice(0);
      setNewProductBoxSizeQty(0);
      setCreateModalOpen(false);
      setLoadingCreate(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditCategory(product.category);
    setEditCompany(product.company);
    setEditCostPrice(product.cost_price);
    setEditSalePrice(product.sale_price);
    setEditBoxSizeQty(product.box_size_qty);
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (editName.trim() && editCategory && editCompany && editCostPrice >= 0 && editSalePrice >= 0 && editBoxSizeQty >= 0 && editingProduct && !loadingEdit) {
      setLoadingEdit(true);
      await productsCollection.update(editingProduct.id, { optimistic: false }, (draft) => {
        draft.name = editName.trim();
        draft.category = editCategory;
        draft.company = editCompany;
        draft.cost_price = editCostPrice;
        draft.sale_price = editSalePrice;
        draft.box_size_qty = editBoxSizeQty;
        draft.updated = new Date();
      });
      setEditName("");
      setEditCategory("");
      setEditCompany("");
      setEditCostPrice(0);
      setEditSalePrice(0);
      setEditBoxSizeQty(0);
      setEditingProduct(null);
      setEditModalOpen(false);
      setLoadingEdit(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!loadingDelete) {
      setLoadingDelete(true);
      await productsCollection.delete(productId, { optimistic: false });
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
          Create New Product
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
          {products?.map((product) => {
            const category = categories?.find((c) => c.id === product.category);
            const company = companies?.find((c) => c.id === product.company);
            return (
              <Table.Tr key={product.id}>
                <Table.Td>{product.name}</Table.Td>
                <Table.Td>{category?.name || "Unknown"}</Table.Td>
                <Table.Td>{company?.name || "Unknown"}</Table.Td>
                <Table.Td>{product.cost_price}</Table.Td>
                <Table.Td>{product.sale_price}</Table.Td>
                <Table.Td>{product.box_size_qty}</Table.Td>
                <Table.Td>{product.created.toLocaleString()}</Table.Td>
                <Table.Td>
                  <Group gap='xs'>
                    <ActionIcon variant='subtle' onClick={() => handleEdit(product)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant='subtle' color='red' onClick={() => handleDelete(product.id)} disabled={loadingDelete}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title='Create New Product'>
        <TextInput
          label='Name'
          value={newProductName}
          onChange={(value) => setNewProductName(value.target.value)}
        />
        <Select
          label='Category'
          data={categoryOptions}
          value={newProductCategory}
          onChange={setNewProductCategory}
          searchable
          placeholder='Select a category'
        />
        <Select
          label='Company'
          data={companyOptions}
          value={newProductCompany}
          onChange={setNewProductCompany}
          searchable
          placeholder='Select a company'
        />
        <NumberInput
          label='Cost Price'
          value={newProductCostPrice}
          onChange={(value) => setNewProductCostPrice(Number(value) || 0)}
          min={0}
        />
        <NumberInput
          label='Sale Price'
          value={newProductSalePrice}
          onChange={(value) => setNewProductSalePrice(Number(value) || 0)}
          min={0}
        />
        <NumberInput
          label='Box Size Qty'
          value={newProductBoxSizeQty}
          onChange={(value) => setNewProductBoxSizeQty(Number(value) || 0)}
          min={0}
        />
        <Group mt='md'>
          <Button onClick={handleCreate} disabled={loadingCreate}>Create</Button>
          <Button variant='outline' onClick={() => setCreateModalOpen(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
      <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title='Edit Product'>
        <TextInput label='Name' value={editName} onChange={(value) => setEditName(value.target.value)} />
        <Select
          label='Category'
          data={categoryOptions}
          value={editCategory}
          onChange={setEditCategory}
          searchable
          placeholder='Select a category'
        />
        <Select
          label='Company'
          data={companyOptions}
          value={editCompany}
          onChange={setEditCompany}
          searchable
          placeholder='Select a company'
        />
        <NumberInput
          label='Cost Price'
          value={editCostPrice}
          onChange={(value) => setEditCostPrice(Number(value) || 0)}
          min={0}
        />
        <NumberInput
          label='Sale Price'
          value={editSalePrice}
          onChange={(value) => setEditSalePrice(Number(value) || 0)}
          min={0}
        />
        <NumberInput
          label='Box Size Qty'
          value={editBoxSizeQty}
          onChange={(value) => setEditBoxSizeQty(Number(value) || 0)}
          min={0}
        />
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
export const Route = createFileRoute("/app/management/products/")({
  component: Products,
});