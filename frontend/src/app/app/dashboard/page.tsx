'use client';
import { Card, Text, UnstyledButton, useMantineTheme, Grid } from "@mantine/core";
import {
  IconReport,
  IconShoppingBag,
  IconSettings,
  IconCoinEuro,
  IconCoinEuroFilled,
  IconTrolley,
  IconBasketDollar,
} from "@tabler/icons-react";
import classes from "./page.module.css";
import Link from "next/link";

const mockdata = [
  // { title: "Parties", icon: IconBuildingWarehouse, color: "blue", target: "parties" },
  { title: "Reports", icon: IconReport, color: "pink", target: "reports" },
  { title: "Orders", icon: IconTrolley, color: "green", target: "invoices/orders" },
  { title: "Invoices", icon: IconShoppingBag, color: "orange", target: "invoices" },
  // { title: "Payments", icon: IconCoinEuro, color: "grape", target: "payments" },
  // { title: "Expenses", icon: IconBasketDollar, color: "red", target: "expenses" },
  { title: "Cash Memo", icon: IconCoinEuroFilled, color: "blue", target: "cashmemo" },
  { title: "Management", icon: IconSettings, color: "gray", target: "management" },
];

export default function ActionsGrid(props) {
  const theme = useMantineTheme();
  const items = mockdata.map((item) => (
    <Grid.Col span={2} key={item.title}>
      <Link prefetch style={{textDecoration:'none'}} href={`/app/${item.target}`}>
        <UnstyledButton className={classes.item}>
          <item.icon color={theme.colors[item.color][4]} size='4rem' />
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
