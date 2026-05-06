import { Button, Group, TextInput, Select, NumberInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { uuidv7 } from "uuidv7";
import { productsCollection } from "../../../../collections/products";
import { categoriesCollection } from "../../../../collections/categories";
import { companiesCollection } from "../../../../collections/companies";
import { useLiveQuery } from "@tanstack/react-db";

export function CreateProductForm({
  setCreateModalOpen = () => false,
}: {
  setCreateModalOpen: (open: boolean) => void;
}) {
  const [loadingCreate, setLoadingCreate] = useState(false);

  const { data: categories } = useLiveQuery((q) =>
    q.from({ category: categoriesCollection }).orderBy(({ category }) => category.name)
  );

  const { data: companies } = useLiveQuery((q) =>
    q.from({ company: companiesCollection }).orderBy(({ company }) => company.name)
  );

  const form = useForm({
    mode: "controlled",
    initialValues: {
      id: uuidv7(),
      name: "",
      category: "",
      company: "",
      cost_price: 0,
      sale_price: 0,
      box_size_qty: 0,
      created: new Date(),
      updated: new Date(),
    },

    validate: {
      name: (value) => (value ? null : "Name is required"),
      category: (value) => (value ? null : "Category is required"),
      company: (value) => (value ? null : "Company is required"),
    },
  });

  const handleCreate = async (values: { id: string; name: string; category: string; company: string; cost_price: number; sale_price: number; box_size_qty: number; created: Date; updated: Date }) => {
    if (values.name.trim() && values.category && values.company && !loadingCreate) {
      setLoadingCreate(true);
      try {
        await productsCollection.insert(
          {
            id: uuidv7(),
            name: values.name.trim(),
            category: values.category,
            company: values.company,
            cost_price: values.cost_price,
            sale_price: values.sale_price,
            box_size_qty: values.box_size_qty,
            created: new Date(),
            updated: new Date(),
          },
          { optimistic: false },
        );
        form.reset();
        setLoadingCreate(false);
        setCreateModalOpen(false);
      } catch (error) {
        console.error("Error creating product:", error);
        setLoadingCreate(false);
      }
    }
  };

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        handleCreate(values);
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
        <Button type='submit' disabled={loadingCreate}>
          Submit
        </Button>
      </Group>
    </form>
  );
}