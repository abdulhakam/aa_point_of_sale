"use Client";
import { useForm } from "@mantine/form";
import { IconPlus } from "@tabler/icons-react";
import { ActionIcon, Button, Group, Modal, TextInput, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import pb from "@/app/pocketbase";
import { notifications } from "@mantine/notifications";
import { NSelect } from "@/app/components/BetterComps/Select";

/**
 * Create a new customer with the given information.
 *
 * @return {void}
 */
export default function CreateCustomer() {
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const areas = useQuery({
    queryKey: ["areas"],
    queryFn: () => pb.collection("areas").getFullList({ expand: "section" }),
  });
  const createCustomer = useMutation({
    mutationFn: (data: {}) => pb.collection("parties").create(data),
    onSuccess: () => {
      close();
      queryClient.invalidateQueries();
      notifications.show({
        title: "Success!",
        message: "Customer Created",
        color: "green",
      });
    },
  });
  const form = useForm({
    initialValues: {
      name: "",
      type: "customer",
      area: "",
      phone: "",
      address: "",
      deleted: false,
    },
  });
  return (
    <>
      <Modal centered opened={opened} onClose={close} title={`Create New Customer`}>
        <form
          onSubmit={form.onSubmit((values) => {
            createCustomer.mutate(values);
          })}
        >
          <TextInput label='Name' {...form.getInputProps("name")} />
          <NSelect
            searchable
            label='Area'
            data={areas.data?.map((area) => ({
              label: `${area.name} - ${area.expand?.section?.name}`,
              value: area.id,
            }))}
            {...form.getInputProps("area")}
          />
          <TextInput label='Phone' {...form.getInputProps("phone")} />
          <TextInput label='Address' {...form.getInputProps("address")} />
          <Group justify='end' align='right' mt={"xs"}>
            <Button type='submit'>OK</Button>
          </Group>
        </form>
      </Modal>
      <Tooltip label={`Create New Customer`}>
        <ActionIcon mx={"0.3rem"} size={"lg"} onClick={open}>
          <IconPlus size={32} />
        </ActionIcon>
      </Tooltip>
    </>
  );
}
