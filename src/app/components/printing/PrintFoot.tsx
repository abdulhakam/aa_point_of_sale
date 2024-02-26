import { useDate } from "@/app/app/TimeDisplay";
import { Flex, Text, Stack } from "@mantine/core";
import React from "react";
import styles from "./styles.module.css";

export default function PrintFoot() {
  const { date, time } = useDate();
  return (
    <footer className={styles.showOnPrint}>
      <div className={styles.printFooter}>
        <hr />
        <Text size='6pt'>
          {process.env.NEXT_PUBLIC_NAME} {process.env.NEXT_PUBLIC_PHONE}{" "}
        </Text>
      </div>
    </footer>
  );
}
