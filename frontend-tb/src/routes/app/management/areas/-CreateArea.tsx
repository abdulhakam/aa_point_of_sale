import { Button, Group, TextInput, Select } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { uuidv7 } from "uuidv7";
import { trailbaseClient } from "../../../../trailbaseClient";

export function CreateAreaForm({ setCreateModalOpen }: { setCreateModalOpen: (open: boolean) => void }) {
  const queryClient = useQueryClient();

  const { data: sections } = useQuery({
    queryKey: ["sections", "all"],
    queryFn: async () => {
      const response = await trailbaseClient.records("sections").list({
        pagination: { limit: 0 },
        count: true,
      });
      return response.records;
    },
  });

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

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await trailbaseClient.records("areas").create({
        id: uuidv7(),
        name: data.name.trim(),
        section: data.section,
        created: new Date(),
        updated: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas", "all"] });
      form.reset();
      setCreateModalOpen(false);
    },
    onError: (error: any) => {
      notifications.show({
        title: "Error",
        message: "Failed to create area: " + error.message,
        color: "red",
      });
    },
  });

  const handleCreate = (values) => {
    if (values.name.trim() && values.section) {
      createMutation.mutate({ name: values.name, section: values.section });
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

      <Select
        withAsterisk
        label='Section'
        placeholder='Select a section'
        data={sections?.map((section) => ({ value: section.id, label: section.name })) || []}
        {...form.getInputProps("section")}
      />

      <Group justify='flex-end' mt='md'>
        <Button type='submit' disabled={createMutation.isPending}>
          Submit
        </Button>
      </Group>
    </form>
  );
}