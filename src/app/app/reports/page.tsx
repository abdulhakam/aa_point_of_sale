"use client";
import { Card, Text,  UnstyledButton,  useMantineTheme, Grid } from "@mantine/core";
import {
  IconChartArea,
  IconChartBar,
  IconChartLine,
  IconReportMoney, IconTrolley,
} from "@tabler/icons-react";
import classes from "./page.module.css";
import { useRouter } from "next/navigation";
import Link from "next/link";

const mockdata = [
  { title: "Unified Payments Report", icon: IconReportMoney, color: "blue", target: "reports/payments" },
  { title: "Stock Report", icon: IconTrolley, color: "green", target: "reports/stockreport" },
  { title: "General Ledger", icon: IconChartLine, color: "grape", target: "reports/ledgerreport" },
  { title: "Unified Item Sales Report", icon: IconChartBar, color: "pink", target: "reports/transactions" },
  { title: "Payments By Company", icon: IconChartArea, color: "red", target: "reports/paymentsbycompany" },
];

export default function ActionsGrid(props) {
  const theme = useMantineTheme();
  const router = useRouter();
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
      <Text className={classes.title}>REPORTS</Text>
      <Grid justify='flex-start' align='center'>
        {items}
      </Grid>
    </Card>
  );
}
