import { Button, Group, TextInput, MultiSelect } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState, useEffect, useRef } from "react";
import { orderBookersCollection } from "../../../../collections/order_bookers";
import { companiesCollection } from "../../../../collections/companies";
import { companies2orderBookersCollection } from "../../../../collections/companies2orderbookers";
import { trailbaseClient } from "../../../../trailbaseClient";
import { useLiveQuery } from "@tanstack/react-db";
import { eq } from "@tanstack/react-db";

export function UpdateOrderBookerForm({
  orderBooker,
  setEditModalOpen,
}: {
  orderBooker: any;
  setEditModalOpen: (open: boolean) => void;
}) {
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  const { data: companies } = useLiveQuery((q) =>
    q.from({ company: companiesCollection }).orderBy(({ company }) => company.name)
  );

  const { data: associations } = useLiveQuery((q) =>
    q.from({ assoc: companies2orderBookersCollection }).where(({ assoc }) => eq(assoc.order_booker, orderBooker.id))
  );

  const form = useForm({
    mode: "controlled",
    initialValues: {
      name: orderBooker.name,
      phone: orderBooker.phone,
      companies: [] as string[],
    },
    validate: {
      name: (value) => (value ? null : "Name is required"),
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

  const handleUpdate = async (values: { name: string; phone: string; companies: string[] }) => {
    if (values.name.trim() && !loadingUpdate) {
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
            companies2orderBookersCollection.delete(assoc.id, { optimistic: false })
          )
        );

        // Insert new associations in parallel
        // Use raw client API to bypass collection's getKey (id is auto-assigned by DB, not known before insert)
        await Promise.all(
          companiesToAdd.map(async (companyId) => {
            const result = await trailbaseClient.records('companies2orderbookers').create({
              order_booker: orderBooker.id,
              company: companyId,
            });
            console.log("Inserted association:", result);
            return result;
          })
        );

        // Then update the order booker
        await orderBookersCollection.update(orderBooker.id, { optimistic: false }, (draft) => {
          draft.name = values.name.trim();
          draft.phone = values.phone.trim();
          draft.updated = new Date();
        });

        setLoadingUpdate(false);
        setEditModalOpen(false);
      } catch (error) {
        console.error("Error updating order booker:", error);
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

      <TextInput
        label='Phone'
        placeholder='Phone'
        key={form.key("phone")}
        {...form.getInputProps("phone")}
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