import { Button, Modal, Table } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";

//TODO: complete modal generation
export default function InfoViewModal(props) {
  const [opened, { open, close }] = useDisclosure(false);
  const data = props.data;
  const formStructure = props.formStructure
  return (
    <>
      <Modal centered opened={opened} onClose={close}>
        <FormGenerator formStructure={props.formStructure}/>
      </Modal>
      {props.component === "button" ? (
        <Button onClick={open}>{props.children}</Button>
      ) : (
        <Table.Tr onClick={open}>{props.children}</Table.Tr>
      )}
    </>
  );
}


const FormGenerator = ({ formStructure }) => {
  const form = useForm({
    initialValues: formStructure.items.reduce((acc, item) => {
      acc[item.name] = item.defaultValue;
      return acc;
    }, {}),
  });
 
  console.log(form)
  const handleSubmit = () => {
    // Handle form submission here
    console.log('Form submitted with values:', form.values);
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      {formStructure.items.map((item) => (
        // Render form fields based on the item type
        <div key={item.name}>
          <label htmlFor={item.name}>{item.label}</label>
          {item.type === 'number' ? (
            <input
              type="number"
              id={item.name}
              {...form.getInputProps(item.name)}
            />
          ) : (
            <input
              type="text"
              id={item.name}
              {...form.getInputProps(item.name)}
            />
          )}
        </div>
      ))}

      <button type="submit">Submit</button>
    </form>
  );
};