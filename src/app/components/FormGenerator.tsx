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
  TextInput,
  NumberInput,
  Switch,
  Autocomplete,
  Flex,
  Group,
} from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";

export default function FormGenerator(props) {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: props.formStructure.onCreate,
    onSuccess: () => {
      queryClient.invalidateQueries(props.formStructure.queryKey);
    },
  });
  const updateMutation = useMutation({
    mutationFn: props.formStructure.onUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries(props.formStructure.queryKey);
    },
  });
  const form = useForm(
    props.data
      ? {
          initialValues: {
            ...Object.keys(props.formStructure.fields).reduce((result, property) => {
              if (props.data.hasOwnProperty(property)) {
                result[property] = props.data[property];
              }
              return result;
            }, {}),
            created: new Date(props.data.created),
            updated: new Date(props.data.updated),
          },
        }
      : {
          initialValues: {
            ...Object.keys(props.formStructure.fields).reduce((acc, key) => {
              acc[key] = props.formStructure.fields[key].default;
              return acc;
            }, {}),
          },
        }
  );
  const submitHandler = (values) => {
    let data = { ...values };
    delete data.created;
    delete data.updated;
    delete data.deleted;
    if (props.data) {
      updateMutation.mutate(data);
      close()
    } else {
      createMutation.mutate(data);
      close()
    }
  };

  const formBuilder = (key, field) => {
    if (!field.hidden) {
      switch (field.type) {
        case "text":
          return (
            <TextInput
              m={"sm"}
              variant={props.editable ? "default" : "unstyled"}
              readOnly={!props.editable}
              // defaultValue={data[key]}
              key={`${key}-input-${field.name}`}
              {...field.baseProps}
              {...form.getInputProps(key)}
            />
          );
        case "number":
          return (
            <NumberInput
              m={"sm"}
              variant={props.editable ? "default" : "unstyled"}
              readOnly={!props.editable}
              // defaultValue={data[key]}
              key={`${key}-input-${field.name}`}
              {...field.baseProps}
              {...form.getInputProps(key)}
            />
          );
        case "datetime":
          return (
            <DateTimePicker
              m={"sm"}
              variant={props.editable ? "default" : "unstyled"}
              readOnly={!props.editable}
              // defaultValue={new Date(data[key])}
              key={`${key}-input-${field.name}`}
              {...field.baseProps}
              {...form.getInputProps(key)}
            />
          );
        case "checkbox":
          return (
            <Checkbox
              m={"sm"}
              variant={props.editable ? "default" : "unstyled"}
              readOnly={!props.editable}
              // defaultValue={data[key]}
              key={`${key}-input-${field.name}`}
              {...field.baseProps}
              {...form.getInputProps(key)}
            />
          );
        case "switch":
          return (
            <Switch
              m={"sm"}
              variant={props.editable ? "default" : "unstyled"}
              disabled={!props.editable}
              // defaultValue={data[key]}
              key={`${key}-input-${field.name}`}
              {...field.baseProps}
              {...form.getInputProps(key)}
            />
          );
        case "autocomplete":
          return (
            <Autocomplete
              m={"sm"}
              variant={props.editable ? "default" : "unstyled"}
              readOnly={!props.editable}
              // defaultValue={data[key]}
              key={`${key}-input-${field.name}`}
              {...field.baseProps}
              {...form.getInputProps(key)}
            />
          );
        case "select":
          return (
            <Select
              m={"sm"}
              variant={props.editable ? "default" : "unstyled"}
              readOnly={!props.editable}
              // defaultValue={data[key]}
              key={`${key}-input-${field.name}`}
              {...field.baseProps}
              {...form.getInputProps(key)}
            />
          );
        default:
          return <Text key={`${key}-input-${field.name}`}>Unsupported field type: {field.type}</Text>;
      }
    }
  };

  return (
    <Group>
      <form onSubmit={form.onSubmit(submitHandler)}>
        {props.formStructure.fields &&
          Object.keys(props.formStructure.fields).map((key) => {
            const field = props.formStructure.fields[key];
            return formBuilder(key, field);
          })}
          {props.editable?
        <Button mt='md' type='submit'>
          {props.data ? "Submit" : "Create"}
        </Button>:null}
      </form>
    </Group>
  );
}
