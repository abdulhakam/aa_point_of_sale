import { Button, Group, TextInput, MultiSelect } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { uuidv7 } from "uuidv7";
import { orderBookersCollection } from "../../../../collections/order_bookers";
import { companiesCollection } from "../../../../collections/companies";
import { trailbaseClient } from "../../../../trailbaseClient";
import { useLiveQuery } from "@tanstack/react-db";

export function CreateOrderBookerForm({
  setCreateModalOpen = () => false,
}: {
  setCreateModalOpen: (open: boolean) => void;
}) {
  const [loadingCreate, setLoadingCreate] = useState(false);

  const { data: companies } = useLiveQuery((q) =>
    q.from({ company: companiesCollection }).orderBy(({ company }) => company.name)
  );

  const form = useForm({
    mode: "controlled",
    initialValues: {
      id: uuidv7(),
      name: "",
      phone: "",
      companies: [],
      created: new Date(),
      updated: new Date(),
    },

    validate: {
      name: (value) => (value ? null : "Name is required"),
    },
  });

  const handleCreate = async (values: { id: string; name: string; phone: string; companies: string[]; created: Date; updated: Date }) => {
    if (values.name.trim() && !loadingCreate) {
      setLoadingCreate(true);
      try {
        const orderBookerId = uuidv7();
        await orderBookersCollection.insert(
          {
            id: orderBookerId,
            name: values.name.trim(),
            phone: values.phone.trim(),
            created: new Date(),
            updated: new Date(),
          },
          { optimistic: false },
        );
        // Insert associations using raw client API to bypass collection's getKey
        // (id is auto-assigned by DB, not known before insert)
        for (const companyId of values.companies) {
          await trailbaseClient.records('companies2orderbookers').create({
            order_booker: orderBookerId,
            company: companyId,
          });
        }
        form.reset();
        setLoadingCreate(false);
        setCreateModalOpen(false);
      } catch (error) {
        console.error("Error creating order booker:", error);
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
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            form.onSubmit((values) => handleCreate(values))();
          }
        }}
        {...form.getInputProps("name")}
      />

      <TextInput
        label='Phone'
        placeholder='Phone'
        key={form.key("phone")}
        {...form.getInputProps("phone")}
      />

      <MultiSelect
        label='Companies'
        placeholder='Select companies'
        data={companies?.map((company) => ({ value: company.id, label: company.name })) || []}
        searchable
        {...form.getInputProps("companies")}
      />

      <Group justify='flex-end' mt='md'>
        <Button type='submit' disabled={loadingCreate}>
          Submit
        </Button>
      </Group>
    </form>
  );
}