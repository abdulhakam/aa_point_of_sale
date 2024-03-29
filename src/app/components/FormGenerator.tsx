import React from "react";
import { Button, Container, Checkbox, Text, TextInput, NumberInput, Switch, Grid } from "@mantine/core";
import Autocomplete from "./BetterComps/AutoComplete";
import Select from "./BetterComps/Select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { crud } from "../api/useAPI";

export default function FormGenerator(props) {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: crud.create,
    onSuccess: () => {
      queryClient.invalidateQueries();
      props.close();
    },
  });
  const updateMutation = useMutation({
    mutationFn: props.formStructure.onUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries();
      props.close();
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
    } else {
      createMutation.mutate({ collection: props.formStructure.collectionName, data: data });
    }
  };

  const formBuilder = (key, field) => {
    if (!field.hidden) {
      switch (field.type) {
        case "text":
          return (
            <TextInput
              m={"sm"}
              style={{ width: "12rem" }}
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
              m={"sm"}
              style={{ width: "12rem" }}
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
              m={"sm"}
              style={{ width: "12rem" }}
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
              m={"sm"}
              style={{ width: "12rem" }}
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
              m={"sm"}
              style={{ width: "12rem" }}
              variant={props.editable ? "default" : "unstyled"}
              disabled={!props.editable}
              key={`${key}-input-${field.name}`}
              {...field.baseProps}
              {...form.getInputProps(key)}
            />
          );
        case "autocomplete":
          return (
            <Select
              style={{ width: "12rem" }}
              m={"sm"}
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
              style={{ width: "12rem" }}
              m={"sm"}
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
        <Grid style={{ width: "40rem" }}>
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
        </Grid>
      </form>
    </Container>
  );
}
