import { useDate } from "@/app/app/TimeDisplay";
import { Flex, Text, Stack } from "@mantine/core";
import React from "react";
import styles from "./styles.module.css"

export default function PrintHead() {
  const { date, time } = useDate();
  return (
    <Flex className={styles.showOnPrint} justify={"space-between"} align={"center"} px={"md"}>
      <Text size='xs'>{process.env.NEXT_PUBLIC_PHONE}</Text>
      <Stack gap={0} align="center">
        <Text size='xl' fw={700}>
          {process.env.NEXT_PUBLIC_NAME}
        </Text>
        <Text size='xs'>{process.env.NEXT_PUBLIC_ADDRESS}</Text>
      </Stack>
      <Stack gap={0} align={"center"}>
        <Text size='xs'>PRINT TIME:</Text>
        <Text size='xs'> {time} </Text>
        <Text size='xs'>{date}</Text>
      </Stack>
    </Flex>
  );
}
