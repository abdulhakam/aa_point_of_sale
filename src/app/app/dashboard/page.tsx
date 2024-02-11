"use client";
import { Card, Text, SimpleGrid, UnstyledButton, Group, useMantineTheme, Grid } from "@mantine/core";
import {
  IconReport,
  IconUser,
  IconTag,
  IconShoppingBag,
  IconSettings,
  IconCoinEuro,
  IconBuildingWarehouse,
  IconTrolley,
  IconBasketDollar,
} from "@tabler/icons-react";
import classes from "./page.module.css";
import { useRouter } from "next/navigation";
import Link from "next/link";

const mockdata = [
  { title: "Parties", icon: IconBuildingWarehouse, color: "blue", target: "parties" },
  { title: "Reports", icon: IconReport, color: "pink", target: "reports" },
  { title: "Orders", icon: IconTrolley, color: "green", target: "invoices/orders" },
  { title: "Invoices", icon: IconShoppingBag, color: "orange", target: "invoices" },
  { title: "Payments", icon: IconCoinEuro, color: "grape", target: "payments" },
  { title: "Expenses", icon: IconBasketDollar, color: "red", target: "expenses" },
  { title: "Management", icon: IconSettings, color: "gray", target: "management" },
];

export default function ActionsGrid(props) {
  const theme = useMantineTheme();
  const router = useRouter();
  const items = mockdata.map((item) => (
    <Grid.Col span={2} key={item.title}>
      <Link  style={{textDecoration:'none'}} href={`/app/${item.target}`}>
        <UnstyledButton className={classes.item}>
          <item.icon color={theme.colors[item.color][6]} size='4rem' />
          <Text size='sm' mt={7}>
            {item.title}
          </Text>
        </UnstyledButton>
      </Link>
    </Grid.Col>
  ));

  return (
    <Card className={classes.card} radius={"md"} withBorder>
      <Text className={classes.title}>Dashboard</Text>
      <Grid justify='flex-start' align='center'>
        {items}
      </Grid>
    </Card>
  );
}
