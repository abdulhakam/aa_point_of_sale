import { Button, Group, TextInput, Select, Radio, MultiSelect, Loader } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState, useEffect, useRef } from "react";
import { partiesCollection } from "../../../../collections/parties";
import { areasCollection } from "../../../../collections/areas";
import { companiesCollection } from "../../../../collections/companies";
import { partiesEnumTypeCollection } from "../../../../collections/partiesEnumType";
import { companies2partiesCollection } from "../../../../collections/companies2parties";
import { trailbaseClient } from "../../../../trailbaseClient";
import { useLiveQuery } from "@tanstack/react-db";
import { eq } from "@tanstack/react-db";

export function UpdatePartyForm({
  party,
  setEditModalOpen,
}: {
  party: any;
  setEditModalOpen: (open: boolean) => void;
}) {
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  const { data: areas, isLoading: isLoadingAreas } = useLiveQuery((q) =>
    q.from({ area: areasCollection }).orderBy(({ area }) => area.name),
  );

  const { data: types, isLoading: isLoadingTypes } = useLiveQuery((q) =>
    q.from({ type: partiesEnumTypeCollection }),
  );

  const { data: companies, isLoading: isLoadingCompanies } = useLiveQuery((q) =>
    q.from({ company: companiesCollection }).orderBy(({ company }) => company.name),
  );

  const { data: associations, isLoading: isLoadingAssociations } = useLiveQuery((q) =>
    q.from({ assoc: companies2partiesCollection }).where(({ assoc }) => eq(assoc.party, party.id)),
  );

  const form = useForm({
    mode: "controlled",
    initialValues: {
      name: party.name,
      address: party.address,
      phone: party.phone,
      area: party.area,
      type: party.type.toString(),
      companies: [] as string[],
    },
    validate: {
      name: (value) => (value ? null : "Name is required"),
      address: (value) => (value ? null : "Address is required"),
      phone: (value) => (value ? null : "Phone is required"),
      area: (value) => (value ? null : "Area is required"),
      type: (value) => (value ? null : "Type is required"),
    },
  });

  // Initialize form companies once when associations first load — never again (avoids overwriting user edits)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && associations !== undefined) {
      initializedRef.current = true;
      form.setFieldValue("companies", associations.map((a) => a.company));
    }
  }, [associations]);

  const handleUpdate = async (values: { name: string; address: string; phone: string; area: string; type: string; companies: string[] }) => {
    if (
      values.name.trim() &&
      values.address.trim() &&
      values.phone.trim() &&
      values.area &&
      values.type &&
      !loadingUpdate
    ) {
      setLoadingUpdate(true);

      try {
        // Read current associations fresh from the live query snapshot to avoid stale closures
        const existingAssociations = associations ?? [];
        const existingCompanyIds = new Set(existingAssociations.map((a) => a.company));
        const newCompanyIds = new Set(values.companies);

        // Companies to remove (in current but not in new)
        const companiesToRemove = existingAssociations.filter((assoc) => !newCompanyIds.has(assoc.company));

        // Companies to add (in new but not in current)
        const companiesToAdd = values.companies.filter((companyId) => !existingCompanyIds.has(companyId));

        console.log("Companies to remove:", companiesToRemove);
        console.log("Companies to add:", companiesToAdd);

        // Delete removed associations in parallel
        await Promise.all(
          companiesToRemove.map((assoc) =>
            companies2partiesCollection.delete(assoc.id, { optimistic: false })
          )
        );

        // Insert new associations in parallel
        // Use raw client API to bypass collection's getKey (id is auto-assigned by DB, not known before insert)
        await Promise.all(
          companiesToAdd.map(async (companyId) => {
            const result = await trailbaseClient.records('companies2parties').create({
              company: companyId,
              party: party.id,
              deleted: 0,
            });
            console.log("Inserted association:", result);
            return result;
          })
        );

        // Then update the party
        await partiesCollection.update(party.id, { optimistic: false }, (draft) => {
          draft.name = values.name.trim();
          draft.address = values.address.trim();
          draft.phone = values.phone.trim();
          draft.area = values.area;
          draft.type = parseInt(values.type);
          draft.updated = new Date();
        });

        setLoadingUpdate(false);
        setEditModalOpen(false);
      } catch (error) {
        console.error("Error updating party:", error);
        setLoadingUpdate(false);
      }
    }
  };

  if (isLoadingAreas || isLoadingTypes || isLoadingCompanies || isLoadingAssociations) return <Loader />;

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
        {...form.getInputProps("name")}
      />

      <TextInput
        withAsterisk
        label='Address'
        placeholder='Address'
        key={form.key("address")}
        {...form.getInputProps("address")}
      />

      <TextInput
        withAsterisk
        label='Phone'
        placeholder='Phone'
        key={form.key("phone")}
        {...form.getInputProps("phone")}
      />

      <Select
        withAsterisk
        label='Area'
        placeholder='Select an area'
        data={areas?.map((area) => ({ value: area.id, label: area.name })) || []}
        searchable
        {...form.getInputProps("area")}
      />

      <Select
        withAsterisk
        label='Type'
        placeholder='Select a type'
        data={types?.map((type) => ({ value: type.id.toString(), label: type.name })) || []}
        searchable
        {...form.getInputProps("type")}
      />

      <MultiSelect
        label='Companies'
        placeholder='Select companies'
        data={companies?.map((company) => ({ value: company.id, label: company.name })) || []}
        searchable
        {...form.getInputProps("companies")}
      />

      <Group justify='flex-end' mt='md'>
        <Button type='submit' disabled={loadingUpdate}>
          Update
        </Button>
      </Group>
    </form>
  );
}
