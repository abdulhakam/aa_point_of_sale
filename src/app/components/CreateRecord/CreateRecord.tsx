import { ActionIcon, Modal, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { IconPlus } from "@tabler/icons-react";

export default function CreateRecord() {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Modal opened={opened} onClose={close} title='Authentication'>
        {/* Modal content */}
      </Modal>
      <Tooltip label={"Create"}>
        <ActionIcon>
          <IconPlus />
        </ActionIcon>
      </Tooltip>
    </>
  );
}
