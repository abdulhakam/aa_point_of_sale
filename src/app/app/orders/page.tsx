"use client";
import { Card, Text,  UnstyledButton,  useMantineTheme, Grid } from "@mantine/core";
import {
  IconReport,
  IconTag,
} from "@tabler/icons-react";
import classes from "./page.module.css";
import { useRouter } from "next/navigation";

const mockdata = [
  { title: "Purchase", icon: IconTag, color: "pink", target: "orders/purchase" },
  { title: "Sale", icon: IconReport, color: "lime", target: "orders/sales" },
];

export default function ActionsGrid(props) {
  const theme = useMantineTheme();
  const router = useRouter();
  const items = mockdata.map((item) => (
    <Grid.Col span={2} key={item.title}>
      <UnstyledButton onClick={() => router.push(`/app/${item.target}`)} className={classes.item}>
        <item.icon color={theme.colors[item.color][6]} size='4rem' />
        <Text size='s' mt={7}>
          {item.title}
        </Text>
      </UnstyledButton>
    </Grid.Col>
  ));

  return (
    <Card className={classes.card} radius={"md"} withBorder>
      <Text className={classes.title}>ORDERS</Text>
      <Grid justify='flex-start' align='center'>
        {items}
      </Grid>
    </Card>
  );
}
