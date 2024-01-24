"use client";
import { Flex, Group, Stack, Text } from "@mantine/core";
export default function NumberAddress() {
  return (
      <Group w={"100%"} h={'5rem'} justify="space-around">
        <Stack>
          <Text size='xs'> {process.env.NEXT_PUBLIC_PHONE} </Text>
        </Stack>
        <Stack gap={0}>
          <Text size='xl' fw={700}>
            {process.env.NEXT_PUBLIC_NAME}
          </Text>
          <Text size='xs'> {process.env.NEXT_PUBLIC_ADDRESS} </Text>
        </Stack>
      </Group>
  );
}
