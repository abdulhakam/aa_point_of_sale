import { Button, Group, TextInput, MultiSelect } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { uuidv7 } from "uuidv7";
import { trailbaseClient } from "../../../../trailbaseClient";

export function CreateOrderBookerForm({
  setCreateModalOpen = () => false,
}: {
  setCreateModalOpen: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const { data: companies } = useQuery({
    queryKey: ["companies", "all"],
    queryFn: async () => {
      const response = await trailbaseClient.records("companies").list({
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
      phone: "",
      companies: [],
      created: new Date(),
      updated: new Date(),
    },

    validate: {
      name: (value) => (value ? null : "Name is required"),
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; companies: string[] }) => {
      const orderBookerId = uuidv7();
      await trailbaseClient.records("order_bookers").create({
        id: orderBookerId,
        name: data.name.trim(),
        phone: data.phone.trim(),
        created: new Date(),
        updated: new Date(),
      });
      // Insert associations
      for (const companyId of data.companies) {
        await trailbaseClient.records('companies2orderbookers').create({
          order_booker: orderBookerId,
          company: companyId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order_bookers", "all"] });
      form.reset();
      setCreateModalOpen(false);
    },
    onError: (error: any) => {
      notifications.show({
        title: "Error",
        message: "Failed to create order booker: " + error.message,
        color: "red",
      });
    },
  });

  const handleCreate = (values: { id: string; name: string; phone: string; companies: string[]; created: Date; updated: Date }) => {
    if (values.name.trim()) {
      createMutation.mutate({ name: values.name, phone: values.phone, companies: values.companies });
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

      <TextInput
        label='Phone'
        placeholder='Phone'
        key={form.key("phone")}
        {...form.getInputProps("phone")}
      />

      <MultiSelect
        label='Companies'
        placeholder='Select companies'
        data={companies?.map((company) => ({ value: company.id, label: company.name })) || []}
        searchable
        {...form.getInputProps("companies")}
      />

      <Group justify='flex-end' mt='md'>
        <Button type='submit' disabled={createMutation.isPending}>
          Submit
        </Button>
      </Group>
    </form>
  );
}