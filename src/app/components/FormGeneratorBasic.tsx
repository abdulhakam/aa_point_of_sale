import React from "react";
import {
  Button,
  Container,
  Checkbox,
  Text,
  TextInput,
  NumberInput,
  Switch,
  Autocomplete,
  Stack,
} from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { crud } from "../api/useAPI";
import Select from "./BetterComps/Select";

export default function FormGeneratorBasic(props) {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: crud.create,
    onSuccess: () => {
      queryClient.invalidateQueries();
      props.close()
    },
  });
  const updateMutation = useMutation({
    mutationFn: crud.update,
    onSuccess: () => {
      queryClient.invalidateQueries();
      props.close()
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
    props.data?null:delete data.id;
    delete data.created;
    delete data.updated;
    delete data.deleted; 
    if (props.data) {
      updateMutation.mutate({collection:props.formStructure.collectionName,data:data,recordID:props.data.id});
    } else {
      createMutation.mutate({collection:props.formStructure.collectionName,data:data});
    }
  };

  const formBuilder = (key, field) => {
    if (!field.hidden) {
      switch (field.type) {
        case "text":
          return (
            <TextInput
              variant={props.editable ? "default" : "unstyled"}
              readOnly={!props.editable}
              key={`${key}-input-${field.name}`}
              {...field.baseProps}
              {...form.getInputProps(key)}
            />
          );
        case "number":
          return (
            <NumberInput
              
              
              variant={props.editable ? "default" : "unstyled"}
              readOnly={!props.editable}
              key={`${key}-input-${field.name}`}
              {...field.baseProps}
              {...form.getInputProps(key)}
            />
          );
        case "datetime":
          return (
            <DateTimePicker
              
              
              variant={props.editable ? "default" : "unstyled"}
              readOnly={!props.editable}
              key={`${key}-input-${field.name}`}
              {...field.baseProps}
              {...form.getInputProps(key)}
            />
          );
        case "checkbox":
          return (
            <Checkbox
              variant={props.editable ? "default" : "unstyled"}
              readOnly={!props.editable}
              key={`${key}-input-${field.name}`}
              {...field.baseProps}
              {...form.getInputProps(key)}
            />
          );
        case "switch":
          return (
            <Switch
              
              
              variant={props.editable ? "default" : "unstyled"}
              disabled={!props.editable}
              key={`${key}-input-${field.name}`}
              {...field.baseProps}
              {...form.getInputProps(key)}
            />
          );
        case "autocomplete":
          return (
            <Autocomplete
              variant={props.editable ? "default" : "unstyled"}
              readOnly={!props.editable}
              key={`${key}-input-${field.name}`}
              {...field.baseProps}
              {...form.getInputProps(key)}
            />
          );
        case "select":
          return (
            <Select
              variant={props.editable ? "default" : "unstyled"}
              readOnly={!props.editable}
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
    <Container>
      <form onSubmit={form.onSubmit(submitHandler)}>
        <Stack>
          {props.formStructure.fields &&
            Object.keys(props.formStructure.fields).map((key) => {
              const field = props.formStructure.fields[key];
              return formBuilder(key, field);
            })}
          {props.editable ? (
            <Button mt='md' type='submit'>
              {props.data ? "Submit" : "Create"}
            </Button>
          ) : null}
        </Stack>
      </form>
    </Container>
  );
}

