import { Button, Group, TextInput, Select, NumberInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { productsCollection } from "../../../../collections/products";
import { categoriesCollection } from "../../../../collections/categories";
import { companiesCollection } from "../../../../collections/companies";
import { useLiveQuery } from "@tanstack/react-db";

export function UpdateProductForm({
  product,
  setEditModalOpen,
}: {
  product: any;
  setEditModalOpen: (open: boolean) => void;
}) {
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  const { data: categories } = useLiveQuery((q) =>
    q.from({ category: categoriesCollection }).orderBy(({ category }) => category.name)
  );

  const { data: companies } = useLiveQuery((q) =>
    q.from({ company: companiesCollection }).orderBy(({ company }) => company.name)
  );

  const form = useForm({
    mode: "controlled",
    initialValues: {
      name: product.name,
      category: product.category,
      company: product.company,
      cost_price: product.cost_price,
      sale_price: product.sale_price,
      box_size_qty: product.box_size_qty,
    },
    validate: {
      name: (value) => (value ? null : "Name is required"),
      category: (value) => (value ? null : "Category is required"),
      company: (value) => (value ? null : "Company is required"),
    },
  });

  const handleUpdate = async (values: { name: string; category: string; company: string; cost_price: number; sale_price: number; box_size_qty: number }) => {
    if (values.name.trim() && values.category && values.company && !loadingUpdate) {
      setLoadingUpdate(true);
      try {
        await productsCollection.update(product.id, { optimistic: false }, (draft) => {
          draft.name = values.name.trim();
          draft.category = values.category;
          draft.company = values.company;
          draft.cost_price = values.cost_price;
          draft.sale_price = values.sale_price;
          draft.box_size_qty = values.box_size_qty;
          draft.updated = new Date();
        });
        setLoadingUpdate(false);
        setEditModalOpen(false);
      } catch (error) {
        console.error("Error updating product:", error);
        setLoadingUpdate(false);
      }
    }
  };

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        handleUpdate(values);
        console.log(values);
      })}
    >
      <TextInput
        withAsterisk
        label='Name'
        placeholder='Name'
        key={form.key("name")}
        {...form.getInputProps("name")}
      />

      <Select
        withAsterisk
        label='Category'
        placeholder='Select category'
        data={categories?.map((category) => ({ value: category.id, label: category.name })) || []}
        searchable
        {...form.getInputProps("category")}
      />

      <Select
        withAsterisk
        label='Company'
        placeholder='Select company'
        data={companies?.map((company) => ({ value: company.id, label: company.name })) || []}
        searchable
        {...form.getInputProps("company")}
      />

      <NumberInput
        label='Cost Price'
        placeholder='0'
        min={0}
        {...form.getInputProps("cost_price")}
      />

      <NumberInput
        label='Sale Price'
        placeholder='0'
        min={0}
        {...form.getInputProps("sale_price")}
      />

      <NumberInput
        label='Box Size Qty'
        placeholder='0'
        min={0}
        {...form.getInputProps("box_size_qty")}
      />

      <Group justify='flex-end' mt='md'>
        <Button type='submit' disabled={loadingUpdate}>
          Update
        </Button>
      </Group>
    </form>
  );
}