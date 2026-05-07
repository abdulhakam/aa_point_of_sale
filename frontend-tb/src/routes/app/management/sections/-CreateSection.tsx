import { Button, Group, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { uuidv7 } from "uuidv7";
import { trailbaseClient } from "../../../../trailbaseClient";

export function CreateSectionForm({
  setCreateModalOpen = () => false,
}: {
  setCreateModalOpen: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

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

  const createMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return await trailbaseClient.records("sections").create({
        id: uuidv7(),
        name: data.name.trim(),
        created: new Date(),
        updated: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections", "all"] });
      form.reset();
      setCreateModalOpen(false);
    },
    onError: (error: any) => {
      notifications.show({
        title: "Error",
        message: "Failed to create section: " + error.message,
        color: "red",
      });
    },
  });

  const handleCreate = (values: { id: string; name: string; created: Date; updated: Date }) => {
    if (values.name.trim()) {
      createMutation.mutate({ name: values.name });
    }
  };

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        handleCreate(values);
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
        <Button type='submit' disabled={createMutation.isPending}>
          Submit
        </Button>
      </Group>
    </form>
  );
}
