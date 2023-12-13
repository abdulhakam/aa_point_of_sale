"use client";
import { Card, Text, SimpleGrid, UnstyledButton, Group, useMantineTheme, Grid } from "@mantine/core";
import {
  IconReport,
  IconUser,
  IconTag,
  IconBriefcase,
  IconTrolley,
  IconShoppingBag,
} from "@tabler/icons-react";
import classes from "./page.module.css";

const mockdata = [
  { title: "Customers", icon: IconUser, color: "cyan" },
  { title: "Items", icon: IconTag, color: "yellow" },
  { title: "Suppliers", icon: IconBriefcase, color: "blue" },
  { title: "Reports", icon: IconReport, color: "pink" },
  { title: "Recievings", icon: IconTrolley, color: "green" },
  { title: "Sales", icon: IconShoppingBag, color: "orange" },
];

export default function ActionsGrid() {
  const theme = useMantineTheme();

  const items = mockdata.map((item) => (
    <Grid.Col span="auto" key={item.title}>
      <UnstyledButton className={classes.item}>
        <item.icon color={theme.colors[item.color][6]} size='4rem' />
        <Text size='s' mt={7}>
          {item.title}
        </Text>
      </UnstyledButton>
    </Grid.Col>
  ));

  return (
    <Card className={classes.card} radius={"md"} withBorder>
      <Text className={classes.title}>Dashboard</Text>
      <Grid justify='center' align='center'>
        {items}
      </Grid>
    </Card>
  );
}
