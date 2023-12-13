"use client";
import {
  Card,
  Text,
  SimpleGrid,
  UnstyledButton,
  Anchor,
  Group,
  useMantineTheme,
  Container,
} from "@mantine/core";
import {
  IconShoppingCart,
  IconBuildingStore,
  IconReport,
  IconCashBanknote,
  IconUser,
  IconBuildingWarehouse,
  IconListCheck,
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
    <UnstyledButton key={item.title} className={classes.item}>
      <item.icon color={theme.colors[item.color][6]} size='4rem' />
      <Text size='s' mt={7}>
        {item.title}
      </Text>
    </UnstyledButton>
  ));

  return (
    <Card className={classes.card} radius={"md"} withBorder>
      <Group justify='space-between'>
        <Text className={classes.title}>Dashboard</Text>
      </Group>
      <div style={{height:'100vh', display:'grid', placeItems:'center', columns:3}}>
        <SimpleGrid cols={3}>{items}</SimpleGrid>
      </div>
    </Card>
  );
}
