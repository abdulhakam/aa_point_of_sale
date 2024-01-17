"use client";
import { Group, Text } from "@mantine/core";
export default function NumberAddress() {
  return (
    <>
      <Group gap={'4rem'}>
        <Text size='xs'> {process.env.NEXT_PUBLIC_ADDRESS} </Text>
        <Text size='xs'> {process.env.NEXT_PUBLIC_PHONE} </Text>
      </Group>
    </>
  );
}
