import { Avatar, Text, Button, Paper, TextInput, Group, Title, Select, Table } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Modal } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createParty, deleteParty, updateParty } from "../../api/parties";
import { useState } from "react";
import classes from "./CustomerView.module.css";
import { listAreas } from "@/app/api/areas";

export function CustomerInfoModal(props) {
  const [editingState, setEditingState] = useState(false);
  const areas = useQuery({ queryKey: ["areas"], queryFn: listAreas });
  const [opened, { open, close }] = useDisclosure(false);
  const queryClient = useQueryClient();
  const editCustomer = useMutation({
    mutationFn: (data) => updateParty(data),
    onSuccess: (succ) => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });

  const form = useForm({
    initialValues: {
      id: props.data.id,
      name: props.data.name,
      phone: props.data.phone,
      address: props.data.address,
      area: props.data.area.id,
      type: props.data.type,
    },
  });
  const handleSubmit = (values) => {
    editCustomer.mutate({ ...values, id: props.data.id });
    setEditingState(false); // Close the modal after submission
  };

  return (
    <>
      {areas.isSuccess && (
        <Modal
          opened={opened}
          onClose={() => {
            form.reset();
            close();
          }}
          title={editingState ? "Edit Customer Info" : "Customer Info"}
        >
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <TextInput
              classNames={{ input: classes.input }}
              size='lg'
              disabled={!editingState}
              label='id'
              {...form.getInputProps("id")}
            />
            <Select
              classNames={{ input: classes.input }}
              size='lg'
              disabled={!editingState}
              rightSection=' '
              label='Area'
              placeholder='Choose'
              data={["supplier", "customer", "both"]}
              searchable
              {...form.getInputProps("type")}
            />
            <TextInput
              classNames={{ input: classes.input }}
              size='lg'
              disabled={!editingState}
              required
              label='Name'
              placeholder=''
              {...form.getInputProps("name")}
            />
            <TextInput
              classNames={{ input: classes.input }}
              size='lg'
              disabled={!editingState}
              label='Phone'
              placeholder=''
              {...form.getInputProps("phone")}
            />
            <TextInput
              classNames={{ input: classes.input }}
              size='lg'
              disabled={!editingState}
              label='Address'
              placeholder=''
              {...form.getInputProps("address")}
            />
            <Select
              classNames={{ input: classes.input }}
              size='lg'
              disabled={!editingState}
              rightSection=' '
              label='Area'
              placeholder='Choose'
              data={areas.data.map((area) => ({ label: area.name, value: area.id }))}
              searchable
              {...form.getInputProps("area")}
            />

            <Group justify='flex-end' mt='md'>
              {editingState ? (
                <>
                  <Button color='red'>Delete</Button>
                  <Button
                    onClick={() => {
                      setEditingState((current) => !current);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type='submit'>Submit</Button>
                </>
              ) : (
                <Button onClick={() => setEditingState((current) => !current)}>Edit</Button>
              )}
            </Group>
          </form>
        </Modal>
      )}
      <Table.Tr className={classes.tableRow} onClick={open}>
        {props.children}
      </Table.Tr>
    </>
  );
}

export function CreateCustomerModal(props) {
  const [opened, { open, close }] = useDisclosure(false);
  const areas = props.areas.map((area) => ({ name: area.name, id: area.id }));
  const queryClient = useQueryClient();
  const newCustomer = useMutation({
    mutationFn: (data) => createParty(data),
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
      area: "",
    },
  });
  const handleSubmit = (values) => {
    const mutationValues = {
      name: values.name,
      phone: values.phone,
      address: values.address,
      area: areas.find((area) => area.name === values.area).id,
    };
    newCustomer.mutate(mutationValues);
  };
  return (
    <>
      <Modal opened={opened} onClose={close} title='Create a New Customer' centered>
        <Paper radius='md' withBorder p='lg' bg='var(--mantine-color-body)'>
          <Avatar src='' size={120} radius={120} mx='auto' />
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <TextInput required label='Name' placeholder='Customer Name' {...form.getInputProps("name")} />
            <TextInput
              type='tel'
              label='Phone'
              placeholder='Customer Phone'
              {...form.getInputProps("phone")}
            />
            <TextInput label='Address' placeholder='Customer Address' {...form.getInputProps("address")} />
            <Select
              label='Area'
              placeholder='Choose'
              data={areas.map((area) => area.name)}
              searchable
              {...form.getInputProps("area")}
            />
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
