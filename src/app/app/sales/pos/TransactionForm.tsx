import { Button, Group, Box, Select, NumberInput, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";

export function TransactionForm(props) {
  const form = useForm({
    initialValues: {
      invoice: props.invoice,
      item: "",
      qty: 0,
      price: 0,
      discount_1: 0,
      discount_2: 0,
      total: 0,
      deleted: false,
    },

    validate: {},
  });

  return (
    <Box maw={340} mx='auto'>
      <form onSubmit={form.onSubmit((values) => console.log(values))}>
        <TextInput readOnly value={props.invoice} />
        <Select
          searchable
          {...form.getInputProps("item")}
          data={props.items.map((itm) => ({ value: itm.id, label: itm.name }))}
        />
        <NumberInput label='Qty' {...form.getInputProps("qty")} />
        <NumberInput label='Price' {...form.getInputProps("price")} />
        <NumberInput label='discount_1' {...form.getInputProps("discount_1")} />
        <NumberInput label='discount_2' {...form.getInputProps("discount_2")} />
        <NumberInput readOnly label='total' />
        <Group justify='flex-end' mt='md'>
          <Button type='submit'>Submit</Button>
        </Group>
      </form>
    </Box>
  );
}
