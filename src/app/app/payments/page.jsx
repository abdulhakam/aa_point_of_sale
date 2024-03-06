"use client";
import { CreatePayment } from "@/app/components/Modals/CreatePayment";
import PaymentsView from "./PaymentsView";
import { useDisclosure } from "@mantine/hooks";
import { Modal, Tooltip, ActionIcon } from "@mantine/core";
import { IconCashBanknote } from "@tabler/icons-react";

export default function Payments() {
  const [opened, { close, open }] = useDisclosure(false);
  return (
    <>
      <Modal size={"auto"} opened={opened} onClose={close} title='Create New Payment'>
        <CreatePayment close={close} />
      </Modal>
      <Tooltip label={`New Payment`}>
        <ActionIcon mx={"0.3rem"} mb={"0.3rem"} size={"xl"} onClick={open}>
          <IconCashBanknote />
        </ActionIcon>
      </Tooltip>

      {/* <NewPayment /> */}
      <PaymentsView />
    </>
  );
}
