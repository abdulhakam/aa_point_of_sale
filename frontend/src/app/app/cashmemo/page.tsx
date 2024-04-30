"use client";
import { Card, Text,  UnstyledButton,  useMantineTheme, Grid } from "@mantine/core";
import {
  IconArrowDownBar,
  IconArrowUpBar,
  IconBasketDollar,
  IconCoinEuro,
  IconTrolley,
} from "@tabler/icons-react";
import classes from "./page.module.css";
// import { useRouter } from "next/navigation";
import Link from "next/link";

const mockdata = [
  { title: "DA Entry - Purchases", icon: IconTrolley, color: "blue", target: "cashmemo/da_entry" },
  { title: "CRV - Cash Recieve Voucher", icon: IconArrowDownBar, color: "green", target: "cashmemo/cash_recieve_vouchers" },
  { title: "CPV - Cash Payment Voucher", icon: IconArrowUpBar, color: "red", target: "cashmemo/cash_payment_vouchers" },
  { title: "Payments", icon: IconCoinEuro, color: "grape", target: "cashmemo/payments" },
  { title: "Expenses", icon: IconBasketDollar, color: "red", target: "cashmemo/expenses" },
];

export default function ActionsGrid(props) {
  const theme = useMantineTheme();
  // const router = useRouter();
  const items = mockdata.map((item) => (
    <Grid.Col m={'sm'} span={2} key={item.title}>
      <Link style={{textDecoration:'none'}} href={`/app/${item.target}`} className={classes.item}>
        <item.icon color={theme.colors[item.color][6]} size='4rem' />
        <Text size='s' mt={7}>
          {item.title}
        </Text>
      </Link>
    </Grid.Col>
  ));

  return (
    <Card className={classes.card} radius={"md"} withBorder>
      <Text className={classes.title}>CASH MEMO</Text>
      <Grid justify='flex-start' align='center'>
        {items}
      </Grid>
    </Card>
  );
}
