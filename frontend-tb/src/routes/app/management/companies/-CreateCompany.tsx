import { Button, Group, TextInput, MultiSelect } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { uuidv7 } from "uuidv7";
import { companiesCollection } from "../../../../collections/companies";
import { partiesCollection } from "../../../../collections/parties";
import { companies2partiesCollection } from "../../../../collections/companies2parties";
import { useLiveQuery } from "@tanstack/react-db";

export function CreateCompanyForm({
  setCreateModalOpen = () => false,
}: {
  setCreateModalOpen: (open: boolean) => void;
}) {
  const [loadingCreate, setLoadingCreate] = useState(false);

  const { data: parties } = useLiveQuery((q) =>
    q.from({ party: partiesCollection }).orderBy(({ party }) => party.name)
  );

  const form = useForm({
    mode: "controlled",
    initialValues: {
      id: uuidv7(),
      name: "",
      parties: [],
      created: new Date(),
      updated: new Date(),
    },

    validate: {
      name: (value) => (value ? null : "Name is required"),
    },
  });

  const handleCreate = async (values: { id: string; name: string; parties: string[]; created: Date; updated: Date }) => {
    if (values.name.trim() && !loadingCreate) {
      setLoadingCreate(true);
      const companyId = uuidv7();
      await companiesCollection.insert(
        {
          id: companyId,
          name: values.name.trim(),
          created: new Date(),
          updated: new Date(),
        },
        { optimistic: false },
      );
      // Insert associations
      for (const partyId of values.parties) {
        await companies2partiesCollection.insert(
          {
            id: 0, // auto
            company: companyId,
            party: partyId,
          },
          { optimistic: false },
        );
      }
      form.reset();
      setLoadingCreate(false);
      setCreateModalOpen(false);
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

      <MultiSelect
        label='Parties'
        placeholder='Select parties'
        data={parties?.map((party) => ({ value: party.id, label: party.name })) || []}
        searchable
        {...form.getInputProps("parties")}
      />

      <Group justify='flex-end' mt='md'>
        <Button type='submit' disabled={loadingCreate}>
          Submit
        </Button>
      </Group>
    </form>
  );
}