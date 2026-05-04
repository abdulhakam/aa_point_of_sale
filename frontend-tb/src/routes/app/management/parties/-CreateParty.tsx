import { Button, Group, TextInput, Select, Radio, MultiSelect, Text, Loader } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { uuidv7 } from "uuidv7";
import { partiesCollection } from "../../../../collections/parties";
import { areasCollection } from "../../../../collections/areas";
import { companiesCollection } from "../../../../collections/companies";
import { partiesEnumTypeCollection } from "../../../../collections/partiesEnumType";
import { companies2partiesCollection } from "../../../../collections/companies2parties";
import { useLiveQuery } from "@tanstack/react-db";

export function CreatePartyForm({ setCreateModalOpen }: { setCreateModalOpen: (open: boolean) => void }) {
  const [loadingCreate, setLoadingCreate] = useState(false);

  const { data: areas, isLoading: isLoadingAreas } = useLiveQuery((q) =>
    q.from({ area: areasCollection }).orderBy(({ area }) => area.name),
  );

  const { data: types, isLoading: isLoadingTypes } = useLiveQuery((q) =>
    q.from({ type: partiesEnumTypeCollection }),
  );

  const { data: companies, isLoading: isLoadingCompanies } = useLiveQuery((q) =>
    q.from({ company: companiesCollection }).orderBy(({ company }) => company.id),
  );

  const form = useForm({
    mode: "controlled",
    initialValues: {
      name: "",
      address: "",
      phone: "",
      area: "",
      type: "",
      companies: [],
      created: new Date(),
      updated: new Date(),
    },
    validate: {
      name: (value) => (value ? null : "Name is required"),
      address: (value) => (value ? null : "Address is required"),
      phone: (value) => (value ? null : "Phone is required"),
      area: (value) => (value ? null : "Area is required"),
      type: (value) => (value ? null : "Type is required"),
    },
  });

  const handleCreate = async (values) => {
    if (
      values.name.trim() &&
      values.address.trim() &&
      values.phone.trim() &&
      values.area &&
      values.type &&
      !loadingCreate
    ) {
      setLoadingCreate(true);
      const partyId = uuidv7();
      await partiesCollection.insert(
        {
          id: partyId,
          name: values.name.trim(),
          address: values.address.trim(),
          phone: values.phone.trim(),
          area: values.area,
          type: parseInt(values.type),
          created: new Date(),
          updated: new Date(),
        },
        { optimistic: false },
      );
      // Insert associations
      for (const companyId of values.companies) {
        await companies2partiesCollection.insert(
          {
            id: 0,
            company: companyId,
            party: partyId,
          },
          { optimistic: false },
        );
      }
      form.reset();
      setLoadingCreate(false);
      setCreateModalOpen(false);
    }
  };

  if (isLoadingAreas || isLoadingTypes || isLoadingCompanies) return <Loader />;

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        handleCreate(values);
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

      <Radio.Group withAsterisk label='Type' {...form.getInputProps("type")}>
        <Group mt='xs'>
          {types.length > 0 ? (
            types?.map((type) => <Radio key={type.id} value={String(type.id)} label={type.name} />)
          ) : (
            <Text>No Types Found</Text>
          )}
        </Group>
      </Radio.Group>

      <MultiSelect
        label='Companies'
        placeholder='Select companies'
        data={companies?.map((company) => ({ value: company.id, label: company.name })) || []}
        searchable
        {...form.getInputProps("companies")}
      />

      <Group justify='flex-end' mt='md'>
        <Button type='submit' disabled={loadingCreate}>
          Submit
        </Button>
      </Group>
    </form>
  );
}
