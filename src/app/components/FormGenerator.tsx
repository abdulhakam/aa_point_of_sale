import React from "react";
import {
  Modal,
  Button,
  Container,
  Input,
  Select,
  Checkbox,
  Text,
  ComboboxData,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";

export const FormGenerator = (props) => {
  const [opened, { open, close }] = useDisclosure(false);
  const form = useForm({
    initialValues: props.data || {}, // Set initial values based on props.data
  });

  const submitHandler = (values) => {
    // Implement your submission logic here using form.values
    // You can access specific fields by their keys, e.g., values.name
    console.log("Submitted data:", values);
    // ...
  };

  const createHandler = (values) => {
    // Implement your create logic here using form.values
    console.log("Creating new data:", values);
    // ...
  };

  const formBuilder = (key, field) => {
    switch (field.type) {
      case "text":
        return (
          <Input.Wrapper label={field.label}>
            <Input
              {...form.getInputProps(key)} // Use getInputProps instead of manually managing events
            />
          </Input.Wrapper>
        );
      case "number":
        return (
          <Input.Wrapper label={field.label}>
            <Input
              type="number"
              {...form.getInputProps(key)} // Use getInputProps instead of manually managing events
            />
          </Input.Wrapper>
        );
      case "check":
        return (
          <Checkbox
            label={field.label}
            {...form.getInputProps(key, { type: "checkbox" })} // Use getInputProps with appropriate type
          />
        );
      case "select":
        
        return (
          <Select
            label={field.label}
            {...form.getInputProps(key)} // Use getInputProps instead of manually managing events
            data={field.data.map(dat=>({value:dat.id,label:dat.name}))}
          />
        );
      default:
        return <Text key={key}>Unsupported field type: {field.type}</Text>;
    }
  };

  return (
    <>
      <Modal title={props.data?"Edit Details":"Create New"} size="lg" centered opened={opened} onClose={close}>
        <Container size="md">
          <form onSubmit={form.onSubmit(props.data ? submitHandler : createHandler)}>
            {props.formStructure &&
              Object.keys(props.formStructure).map((key) => {
                const field = props.formStructure[key];
                return formBuilder(key, field);
              })}
            <Button mt="md" type="submit">
              {props.data ? "Submit" : "Create"}
            </Button>
          </form>
        </Container>
      </Modal>
      <Button m="md" onClick={open}>
        {props.data?"Edit":"New"}
      </Button>
    </>
  );
};
