import FormGenerator from "@/app/components/FormGenerator";
import { Button, Modal, Table } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";


export default function InfoViewModal(props) {
  const [opened, { open, close }] = useDisclosure(false);
  const data = props.data;
  const formStructure = props.formStructure
  return (
    <>
      <Modal centered opened={opened} onClose={close}>
        <FormGenerator formStructure={formStructure}/>
      </Modal>
      {props.component === "button" ? (
        <Button onClick={open}>{props.children}</Button>
      ) : (
        <Table.Tr onClick={open}>{props.children}</Table.Tr>
      )}
    </>
  );
}