import { Avatar, Text, Button, Paper } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Modal} from '@mantine/core';

export function CustomerView(props) {
  const data = props.data
  return (
    <Paper radius="md" withBorder p="lg" bg="var(--mantine-color-body)">
      <Avatar
        src=""
        size={120}
        radius={120}
        mx="auto"
      />
      <Text ta="center" fz="lg" fw={500} mt="md">
        {data.name}
      </Text>
      <Text ta="center" c="dimmed" fz="sm">
        {data.number}
      </Text>
      <Text ta="center" c="dimmed" fz="sm">
        {data.address}
      </Text>
      <Button variant="default" fullWidth mt="md">
        Edit
      </Button>
    </Paper>
  );
}


export function CustomerViewModal(props) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Modal opened={opened} onClose={close} title="Authentication" centered>
        <CustomerView {...props}/>
      </Modal>

      <Button onClick={open}>View</Button>
    </>
  );
}

