import { Button, Group, TextInput, Select } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { uuidv7 } from "uuidv7";
import { areasCollection } from "../../../../collections/areas";
import { sectionsCollection } from "../../../../collections/sections";
import { useLiveQuery } from "@tanstack/react-db";

export function CreateAreaForm({ setCreateModalOpen }: { setCreateModalOpen: (open: boolean) => void }) {
  const [loadingCreate, setLoadingCreate] = useState(false);

  const { data: sections } = useLiveQuery((q) =>
    q.from({ section: sectionsCollection }).orderBy(({ section }) => section.name)
  );

  const form = useForm({
    mode: "controlled",
    initialValues: {
      id: uuidv7(),
      name: "",
      section: "",
      created: new Date(),
      updated: new Date(),
    },
    validate: {
      name: (value) => (value ? null : "Name is required"),
      section: (value) => (value ? null : "Section is required"),
    },
  });

  const handleCreate = async (values) => {
    if (values.name.trim() && values.section && !loadingCreate) {
      setLoadingCreate(true);
      await areasCollection.insert(
        {
          id: uuidv7(),
          name: values.name.trim(),
          section: values.section,
          created: new Date(),
          updated: new Date(),
        },
        { optimistic: false },
      );
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

      <Select
        withAsterisk
        label='Section'
        placeholder='Select a section'
        data={sections?.map((section) => ({ value: section.id, label: section.name })) || []}
        {...form.getInputProps("section")}
      />

      <Group justify='flex-end' mt='md'>
        <Button type='submit' disabled={loadingCreate}>
          Submit
        </Button>
      </Group>
    </form>
  );
}