import { Button, Group, TextInput, Select } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { areasCollection } from "../../../../collections/areas";
import { sectionsCollection } from "../../../../collections/sections";
import { useLiveQuery } from "@tanstack/react-db";

export function UpdateAreaForm({ area, setEditModalOpen }: { area: any; setEditModalOpen: (open: boolean) => void }) {
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  const { data: sections } = useLiveQuery((q) =>
    q.from({ section: sectionsCollection }).orderBy(({ section }) => section.name)
  );

  const form = useForm({
    mode: "controlled",
    initialValues: {
      name: area.name,
      section: area.section,
    },
    validate: {
      name: (value) => (value ? null : "Name is required"),
      section: (value) => (value ? null : "Section is required"),
    },
  });

  const handleUpdate = async (values) => {
    if (values.name.trim() && values.section && !loadingUpdate) {
      setLoadingUpdate(true);
      await fetch(`http://localhost:4000/api/records/v1/areas/${area.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          section: values.section,
          updated: Math.floor(new Date().valueOf() / 1000),
        }),
      });
      setLoadingUpdate(false);
      setEditModalOpen(false);
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
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            form.onSubmit((values) => handleUpdate(values))();
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
        <Button type='submit' disabled={loadingUpdate}>
          Update
        </Button>
      </Group>
    </form>
  );
}