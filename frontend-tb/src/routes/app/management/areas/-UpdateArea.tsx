import { Button, Group, TextInput, Select } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { trailbaseClient } from "../../../../trailbaseClient";

export function UpdateAreaForm({
  area,
  setEditModalOpen,
}: {
  area: any;
  setEditModalOpen: (open: boolean) => void;
}) {
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
      name: area.name,
      section: area.section,
    },
    validate: {
      name: (value) => (value ? null : "Name is required"),
      section: (value) => (value ? null : "Section is required"),
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; section: string }) => {
      return await trailbaseClient.records("areas").update(area.id, {
        name: data.name.trim(),
        section: data.section,
        updated: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas", "all"] });
      setEditModalOpen(false);
    },
    onError: (error: any) => {
      notifications.show({
        title: "Error",
        message: "Failed to update area: " + error.message,
        color: "red",
      });
    },
  });

  const handleUpdate = (values: { name: string; section: string }) => {
    if (values.name.trim() && values.section) {
      updateMutation.mutate({ name: values.name, section: values.section });
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

      <Select
        withAsterisk
        label='Section'
        placeholder='Select a section'
        data={sections?.map((section) => ({ value: section.id, label: section.name })) || []}
        {...form.getInputProps("section")}
      />

      <Group justify='flex-end' mt='md'>
        <Button type='submit' disabled={updateMutation.isPending}>
          Update
        </Button>
      </Group>
    </form>
  );
}
