import { Button, Group, TextInput, MultiSelect } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState, useEffect, useRef } from "react";
import { companiesCollection } from "../../../../collections/companies";
import { partiesCollection } from "../../../../collections/parties";
import { companies2partiesCollection } from "../../../../collections/companies2parties";
import { trailbaseClient } from "../../../../trailbaseClient";
import { useLiveQuery } from "@tanstack/react-db";
import { eq } from "@tanstack/react-db";

export function UpdateCompanyForm({
  company,
  setEditModalOpen,
}: {
  company: any;
  setEditModalOpen: (open: boolean) => void;
}) {
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  const { data: parties } = useLiveQuery((q) =>
    q.from({ party: partiesCollection }).orderBy(({ party }) => party.name)
  );

  const { data: associations } = useLiveQuery((q) =>
    q.from({ assoc: companies2partiesCollection }).where(({ assoc }) => eq(assoc.company, company.id))
  );

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

  const handleUpdate = async (values: { name: string; parties: string[] }) => {
    if (values.name.trim() && !loadingUpdate) {
      setLoadingUpdate(true);

      try {
        // Read current associations fresh from the live query snapshot to avoid stale closures
        const existingAssociations = associations ?? [];
        const existingPartyIds = new Set(existingAssociations.map((a) => a.party));
        const newPartyIds = new Set(values.parties);

        // Parties to remove (in current but not in new)
        const partiesToRemove = existingAssociations.filter((assoc) => !newPartyIds.has(assoc.party));

        // Parties to add (in new but not in current)
        const partiesToAdd = values.parties.filter((partyId) => !existingPartyIds.has(partyId));

        console.log("Parties to remove:", partiesToRemove);
        console.log("Parties to add:", partiesToAdd);

        // Delete removed associations in parallel
        await Promise.all(
          partiesToRemove.map((assoc) =>
            companies2partiesCollection.delete(assoc.id, { optimistic: false })
          )
        );

        // Insert new associations in parallel
        // Use raw client API to bypass collection's getKey (id is auto-assigned by DB, not known before insert)
        await Promise.all(
          partiesToAdd.map(async (partyId) => {
            const result = await trailbaseClient.records('companies2parties').create({
              company: company.id,
              party: partyId,
              deleted: 0,
            });
            console.log("Inserted association:", result);
            return result;
          })
        );

        // Then update the company
        await companiesCollection.update(company.id, { optimistic: false }, (draft) => {
          draft.name = values.name.trim();
          draft.updated = new Date();
        });

        setLoadingUpdate(false);
        setEditModalOpen(false);
      } catch (error) {
        console.error("Error updating company:", error);
        setLoadingUpdate(false);
      }
    }
  };

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        handleUpdate(values);
        console.log(values);
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
        <Button type='submit' disabled={loadingUpdate}>
          Update
        </Button>
      </Group>
    </form>
  );
}