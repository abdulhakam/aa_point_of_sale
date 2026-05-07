import { Button, Group, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { trailbaseClient } from "../../../../trailbaseClient";

export function UpdateCategoryForm({
  category,
  setEditModalOpen,
}: {
  category: any;
  setEditModalOpen: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const form = useForm({
    mode: "controlled",
    initialValues: {
      name: category.name,
    },
    validate: {
      name: (value) => (value ? null : "Name is required"),
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return await trailbaseClient.records("categories").update(category.id, {
        name: data.name.trim(),
        updated: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", "all"] });
      setEditModalOpen(false);
    },
    onError: (error: any) => {
      notifications.show({
        title: "Error",
        message: "Failed to update category: " + error.message,
        color: "red",
      });
    },
  });

  const handleUpdate = (values: { name: string }) => {
    if (values.name.trim()) {
      updateMutation.mutate({ name: values.name });
    }
  };

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        handleUpdate(values);
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
        <Button type='submit' disabled={updateMutation.isPending}>
          Update
        </Button>
      </Group>
    </form>
  );
}