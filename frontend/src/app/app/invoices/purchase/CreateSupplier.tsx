"use Client";
import { useForm } from "@mantine/form";
import { IconPlus } from "@tabler/icons-react";
import { ActionIcon, Button, Group, Modal, TextInput, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import pb from "@/app/pocketbase";
import { notifications } from "@mantine/notifications";

export default function CreateSupplier() {
  const queryClient = useQueryClient()
  const [opened, { open, close }] = useDisclosure(false);
  const createSupplier = useMutation({
    mutationFn: (data:{id:string}) => pb.collection("parties").create({
      name: form.values.name,
      type: "supplier",
      // area: "",
      // phone: "",
      // address: "",
      company: [`${data.id}`],
      deleted: false,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      notifications.show({
        title: "Success!",
        message: "Supplier Created",
        color: "green",
      });
    },
  });
  const createCompany = useMutation({
    onMutate: () => {
      close();
    },
    mutationFn: () => pb.collection("categories").create({ name: form.values.name }),
    onSuccess: (data) => {
      notifications.show({
        title: "Success!",
        message: "Company Created",
        color: "green",
      });
      createSupplier.mutate(data);
    },
  });
  const form = useForm({
    initialValues: {
      name: "",
      company: [],
    },
  });
  return (
    <>
      <Modal centered opened={opened} onClose={close} title={`Create New Supplier`}>
        <form onSubmit={(e)=>{e.preventDefault();createCompany.mutate()}}>
          <TextInput label='Name' {...form.getInputProps("name")} />
          <Group justify='end' align='right' mt={"xs"}>
            <Button type='submit'>OK</Button>
          </Group>
        </form>
      </Modal>
      <Tooltip label={`Create New Supplier`}>
        <ActionIcon mx={"0.3rem"} size={"lg"} onClick={open}>
          <IconPlus size={32} />
        </ActionIcon>
      </Tooltip>
    </>
  );
}
