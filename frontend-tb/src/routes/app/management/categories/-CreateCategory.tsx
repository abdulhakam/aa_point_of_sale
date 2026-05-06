import { Button, Group, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { uuidv7 } from "uuidv7";
import { categoriesCollection } from "../../../../collections/categories";

export function CreateCategoryForm({
  setCreateModalOpen = () => false,
}: {
  setCreateModalOpen: (open: boolean) => void;
}) {
  const [loadingCreate, setLoadingCreate] = useState(false);

  const form = useForm({
    mode: "controlled",
    initialValues: {
      id: uuidv7(),
      name: "",
      created: new Date(),
      updated: new Date(),
    },

    validate: {
      name: (value) => (value ? null : "Name is required"),
    },
  });

  const handleCreate = async (values: { id: string; name: string; created: Date; updated: Date }) => {
    if (values.name.trim() && !loadingCreate) {
      setLoadingCreate(true);
      try {
        await categoriesCollection.insert(
          {
            id: uuidv7(),
            name: values.name.trim(),
            created: new Date(),
            updated: new Date(),
          },
          { optimistic: false },
        );
        form.reset();
        setLoadingCreate(false);
        setCreateModalOpen(false);
      } catch (error) {
        console.error("Error creating category:", error);
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

      <Group justify='flex-end' mt='md'>
        <Button type='submit' disabled={loadingCreate}>
          Submit
        </Button>
      </Group>
    </form>
  );
}