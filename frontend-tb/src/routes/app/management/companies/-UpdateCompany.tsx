import { Button, Group, TextInput, MultiSelect } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { trailbaseClient } from "../../../../trailbaseClient";

export function UpdateCompanyForm({
  company,
  setEditModalOpen,
}: {
  company: any;
  setEditModalOpen: (open: boolean) => void;
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

  const { data: associations } = useQuery({
    queryKey: ["companies2parties", company.id],
    queryFn: async () => {
      const response = await trailbaseClient.records("companies2parties").list({
        pagination: { limit: 0 },
        count: true,
        filter: `company = '${company.id}'`,
      });
      return response.records;
    },
  });

  const form = useForm({
    mode: "controlled",
    initialValues: {
      name: company.name,
      parties: [] as string[],
    },
    validate: {
      name: (value) => (value ? null : "Name is required"),
    },
  });

  // Initialize form parties once when associations first load — never again (avoids overwriting user edits)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && associations !== undefined) {
      initializedRef.current = true;
      form.setFieldValue("parties", associations.map((a) => a.party));
    }
  }, [associations]);

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; parties: string[] }) => {
      const existingAssociations = associations ?? [];
      const existingPartyIds = new Set(existingAssociations.map((a) => a.party));
      const newPartyIds = new Set(data.parties);

      // Parties to remove
      const partiesToRemove = existingAssociations.filter((assoc) => !newPartyIds.has(assoc.party));
      // Parties to add
      const partiesToAdd = data.parties.filter((partyId) => !existingPartyIds.has(partyId));

      // Delete removed associations
      await Promise.all(
        partiesToRemove.map((assoc) =>
          trailbaseClient.records("companies2parties").delete(assoc.id)
        )
      );

      // Insert new associations
      await Promise.all(
        partiesToAdd.map((partyId) =>
          trailbaseClient.records('companies2parties').create({
            company: company.id,
            party: partyId,
            deleted: 0,
          })
        )
      );

      // Update the company
      await trailbaseClient.records("companies").update(company.id, {
        name: data.name.trim(),
        updated: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", "all"] });
      setEditModalOpen(false);
    },
    onError: (error: any) => {
      notifications.show({
        title: "Error",
        message: "Failed to update company: " + error.message,
        color: "red",
      });
    },
  });

  const handleUpdate = (values: { name: string; parties: string[] }) => {
    if (values.name.trim()) {
      updateMutation.mutate({ name: values.name, parties: values.parties });
    }
  };

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        handleUpdate(values);
      })}
    >
      <TextInput
        withAsterisk
        label='Name'
        placeholder='Name'
        key={form.key("name")}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            form.onSubmit((values) => handleUpdate(values))();
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
        <Button type='submit' disabled={updateMutation.isPending}>
          Update
        </Button>
      </Group>
    </form>
  );
}