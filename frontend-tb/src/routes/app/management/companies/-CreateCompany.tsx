import { Button, Group, TextInput, MultiSelect } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { uuidv7 } from "uuidv7";
import { trailbaseClient } from "../../../../trailbaseClient";

export function CreateCompanyForm({
  setCreateModalOpen = () => false,
}: {
  setCreateModalOpen: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const { data: parties } = useQuery({
    queryKey: ["parties", "all"],
    queryFn: async () => {
      const response = await trailbaseClient.records("parties").list({
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
      parties: [],
      created: new Date(),
      updated: new Date(),
    },

    validate: {
      name: (value) => (value ? null : "Name is required"),
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; parties: string[] }) => {
      const companyId = uuidv7();
      await trailbaseClient.records("companies").create({
        id: companyId,
        name: data.name.trim(),
        created: new Date(),
        updated: new Date(),
      });
      // Insert associations
      for (const partyId of data.parties) {
        await trailbaseClient.records('companies2parties').create({
          company: companyId,
          party: partyId,
          deleted: 0,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", "all"] });
      form.reset();
      setCreateModalOpen(false);
    },
    onError: (error: any) => {
      notifications.show({
        title: "Error",
        message: "Failed to create company: " + error.message,
        color: "red",
      });
    },
  });

  const handleCreate = (values: { id: string; name: string; parties: string[]; created: Date; updated: Date }) => {
    if (values.name.trim()) {
      createMutation.mutate({ name: values.name, parties: values.parties });
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

      <MultiSelect
        label='Parties'
        placeholder='Select parties'
        data={parties?.map((party) => ({ value: party.id, label: party.name })) || []}
        searchable
        {...form.getInputProps("parties")}
      />

      <Group justify='flex-end' mt='md'>
        <Button type='submit' disabled={createMutation.isPending}>
          Submit
        </Button>
      </Group>
    </form>
  );
}