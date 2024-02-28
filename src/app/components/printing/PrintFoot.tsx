import { Flex, Group, Stack, Text } from "@mantine/core";
import React from "react";
import styles from "./styles.module.css";

export default function PrintFoot() {
  return (
    <footer className={styles.showOnPrint}>
      <Flex justify={"space-between"} align={"center"} pr={"xl"}>
        <div>
          <Text>{process.env.NEXT_PUBLIC_NAME}</Text>
        </div>
        <div>
          <Text> {process.env.NEXT_PUBLIC_PHONE}</Text>
        </div>
      </Flex>
    </footer>
  );
}
