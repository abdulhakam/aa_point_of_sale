"use client";
import { ActionIcon, Modal, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import FormGeneratorBasic from "../FormGeneratorBasic";

/**
 * Creates a record using the given form structure and optional label.
 *
 * @param {Object} formStructure - The structure of the form.
 * @param {string} [label] - The optional label for the record.
 * @return {JSX.Element} The JSX element representing the created record.
 */
export default function CreateRecord({ formStructure, label = undefined }) {
  const [opened, { open, close }] = useDisclosure(false);
  const nlabel =
    formStructure.collectionName.charAt(0).toUpperCase() + formStructure.collectionName.slice(0, -1).slice(1);
  return (
    <>
      <Modal centered opened={opened} onClose={close} title={label || `Create New ${nlabel}`}>
        <FormGeneratorBasic formStructure={formStructure} editable={true} close={close} />
      </Modal>
      <Tooltip label={label || `Create New ${nlabel}`}>
        <ActionIcon mx={"0.3rem"} mb={"0.3rem"} size={"md"} onClick={open}>
          <IconPlus />
        </ActionIcon>
      </Tooltip>
    </>
  );
}
