import { useDate } from "@/app/app/TimeDisplay";
import { Flex, Text, Stack } from "@mantine/core";
import React from "react";
import styles from "./styles.module.css";

export default function PrintHead() {
  const { date, time } = useDate();
  return (
    <Flex className={styles.showOnPrint} justify={"space-between"} align={"center"} px={"xs"}>
      <Stack gap={0} align="center"></Stack>
      <Stack gap={0} align='center'>
        <Text size='xl' fw={700}>
          {process.env.NEXT_PUBLIC_NAME}
        </Text>
        <Text size='xs'>{process.env.NEXT_PUBLIC_ADDRESS}</Text>
        <Text size='xs'>Contact: {process.env.NEXT_PUBLIC_PHONE}</Text>
      </Stack>
      <Stack gap={0} align="center">
        <Text size='0.5rem'>PRINT TIME:</Text>
        <Text size='0.5rem'> {time} </Text>
        <Text size='0.5rem'>{date}</Text>
      </Stack>
    </Flex>
  );
}
