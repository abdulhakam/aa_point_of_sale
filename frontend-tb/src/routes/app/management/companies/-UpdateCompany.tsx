import { Button, Group, TextInput, MultiSelect } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState, useEffect } from "react";
import { companiesCollection } from "../../../../collections/companies";
import { partiesCollection } from "../../../../collections/parties";
import { companies2partiesCollection } from "../../../../collections/companies2parties";
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

  const currentParties = associations?.map(a => a.party) || [];

  const form = useForm({
    mode: "controlled",
    initialValues: {
      name: company.name,
      parties: currentParties,
    },
    validate: {
      name: (value) => (value ? null : "Name is required"),
    },
  });

  // Update form parties when associations load/change
  useEffect(() => {
    form.setFieldValue("parties", currentParties);
  }, [currentParties]);

  const handleUpdate = async (values: { name: string; parties: string[] }) => {
    if (values.name.trim() && !loadingUpdate) {
      setLoadingUpdate(true);

      try {
        // First, handle party associations
        const currentPartyIds = new Set(currentParties);
        const newPartyIds = new Set(values.parties);

        // Parties to remove (in current but not in new)
        const partiesToRemove = associations?.filter(assoc => !newPartyIds.has(assoc.party)) || [];

        // Parties to add (in new but not in current)
        const partiesToAdd = values.parties.filter(partyId => !currentPartyIds.has(partyId));

        console.log("Parties to remove:", partiesToRemove);
        console.log("Parties to add:", partiesToAdd);

        // Delete removed associations in parallel
        await Promise.all(
          partiesToRemove.map(assoc =>
            companies2partiesCollection.delete(assoc.id, { optimistic: false })
          )
        );

        // Insert new associations in parallel
        await Promise.all(
          partiesToAdd.map(async (partyId) => {
            const result = await companies2partiesCollection.insert(
              {
                company: company.id,
                party: partyId,
              } as any,
              { optimistic: false },
            );
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