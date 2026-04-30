import { Button, Group, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { sectionsCollection } from "../../../../collections/sections";

export function UpdateSectionForm({
  section,
  setEditModalOpen,
}: {
  section: any;
  setEditModalOpen: (open: boolean) => void;
}) {
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  const form = useForm({
    mode: "controlled",
    initialValues: {
      name: section.name,
    },
    validate: {
      name: (value) => (value ? null : "Name is required"),
    },
  });

  const handleUpdate = async (values: { name: string }) => {
    if (values.name.trim() && !loadingUpdate) {
      setLoadingUpdate(true);
      await sectionsCollection.update(section.id, { optimistic: false }, (draft) => {
        draft.name = values.name.trim();
        draft.updated = new Date();
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

      <Group justify='flex-end' mt='md'>
        <Button type='submit' disabled={loadingUpdate}>
          Update
        </Button>
      </Group>
    </form>
  );
}
