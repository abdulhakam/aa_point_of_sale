import { Avatar, Text, Button, Paper, TextInput, Group, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Modal } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomer, deleteCustomer } from "../../api/customers";

export function CustomerViewModal(props) {
  const [opened, { open, close }] = useDisclosure(false);
  const data = props.data;
  const queryClient = useQueryClient()
  const removeCustomer = useMutation({
    mutationFn: (data) => deleteCustomer(data),
    onSuccess:()=>{queryClient.invalidateQueries({queryKey:["customers"]});close()},
    onError: (error) => {
      console.log(error.message);
    },
  });
  return (
    <>
      <Modal opened={opened} onClose={close} title='Customer Info' centered>
        <Paper radius='md' withBorder p='lg' bg='var(--mantine-color-body)'>
          <Avatar src='' size={120} radius={120} mx='auto' />
          <Text ta='center' fz='lg' fw={500} mt='md'>
            {data.name}
          </Text>
          <Text ta='center' c='dimmed' fz='sm'>
            {data.phone}
          </Text>
          <Text ta='center' c='dimmed' fz='sm'>
            {data.address}
          </Text>
          <CustomerEditModal data={data} />
          <Button m={"xs"} onClick={() => {removeCustomer.mutate(data)}}>
            Delete
          </Button>
        </Paper>
      </Modal>
      <Button onClick={open}>View</Button>
    </>
  );
}

export function CustomerEditModal(props) {
  const [opened, { open, close }] = useDisclosure(false);
  const data = props.data;
  const form = useForm({
    initialValues: {
      name: data.name,
      phone: data.phone,
      address: data.address,
    },
  });
  return (
    <>
      <Modal opened={opened} onClose={close} title='Edit Customer Info' centered>
        <Paper radius='md' withBorder p='lg' bg='var(--mantine-color-body)'>
          <Avatar src='' size={120} radius={120} mx='auto' />
          <form onSubmit={form.onSubmit((values) => console.log(values))}>
            <TextInput
              required
              label='Name'
              placeholder='Customer Name'
              value={form.values.name}
              onChange={(event) => form.setFieldValue("name", event.currentTarget.value)}
            />
            <TextInput label='Phone' placeholder='Customer Phone' {...form.getInputProps("phone")} />
            <TextInput label='Address' placeholder='Customer Address' {...form.getInputProps("address")} />
            <Group justify='flex-end' mt='md'>
              <Button type='submit'>Submit</Button>
            </Group>
          </form>
        </Paper>
      </Modal>
      <Button onClick={open}>Edit</Button>
    </>
  );
}

export function CreateCustomerModal(props) {
  const [opened, { open, close }] = useDisclosure(false);
  const queryClient = useQueryClient();
  const newCustomer = useMutation({
    mutationFn: (data) => createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      form.reset();
      close();
    },
  });
  const form = useForm({
    initialValues: {
      name: "",
      phone: "",
      address: "",
    },
  });
  return (
    <>
      <Modal opened={opened} onClose={close} title='Create a New Customer' centered>
        <Paper radius='md' withBorder p='lg' bg='var(--mantine-color-body)'>
          <Avatar src='' size={120} radius={120} mx='auto' />
          <form onSubmit={form.onSubmit((values) => newCustomer.mutate(values))}>
            <TextInput
              required
              label='Name'
              placeholder='Customer Name'
              value={form.values.name}
              onChange={(event) => form.setFieldValue("name", event.currentTarget.value)}
            />
            <TextInput
              type='tel'
              label='Phone'
              placeholder='Customer Phone'
              {...form.getInputProps("phone")}
            />
            <TextInput label='Address' placeholder='Customer Address' {...form.getInputProps("address")} />
            <Group justify='flex-end' mt='md'>
              <Button type='submit'>Submit</Button>
            </Group>
          </form>
        </Paper>
      </Modal>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Title order={2} m={"xs"}>
          {" "}
          Customers{" "}
        </Title>
        <Button m={"xs"} onClick={open}>
          New Customer
        </Button>
      </div>
    </>
  );
}
