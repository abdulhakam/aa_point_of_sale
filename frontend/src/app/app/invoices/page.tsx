"use client";
import { Card, Text,  UnstyledButton,  useMantineTheme, Grid } from "@mantine/core";
import {
  IconArrowBack,
  IconChartArrows,
  IconChartArrowsVertical,
  IconPrinter,
  IconReceipt,
  IconReport,
  IconTag,
  IconYinYang,
} from "@tabler/icons-react";
import classes from "./page.module.css";
import { useRouter } from "next/navigation";
import Link from "next/link";

const mockdata = [
  { title: "Purchase", icon: IconTag, color: "pink", target: "invoices/purchase" },
  { title: "Sale", icon: IconReport, color: "lime", target: "invoices/sale" },
  { title: "Print Invoices", icon: IconPrinter, color: "green", target: "invoices/printinvoice" },
  { title: "Return", icon: IconArrowBack, color: "red", target: "invoices/return" },
  { title: "Difference", icon: IconChartArrows, color: "orange", target: "invoices/difference" },
];

export default function ActionsGrid(props) {
  const theme = useMantineTheme();
  const router = useRouter();
  const items = mockdata.map((item) => (
    <Grid.Col span={2} key={item.title}>
      <Link style={{textDecoration:'none'}} href={`/app/${item.target}`} prefetch className={classes.item}>
        <item.icon color={theme.colors[item.color][6]} size='4rem' />
        <Text size='s' mt={7}>
          {item.title}
        </Text>
      </Link>
    </Grid.Col>
  ));

  return (
    <Card className={classes.card} radius={"md"} withBorder>
      <Text className={classes.title}>INVOICES</Text>
      <Grid justify='flex-start' align='center'>
        {items}
      </Grid>
    </Card>
  );
}
