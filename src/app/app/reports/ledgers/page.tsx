"use client";
import { Card, Text,  useMantineTheme, Grid } from "@mantine/core";
import {
  IconMap2,
  IconReportAnalytics,
  IconReportMoney, 
} from "@tabler/icons-react";
import classes from "./page.module.css";
import Link from "next/link";

const mockdata = [
  { title: "General", icon: IconReportMoney, color: "yellow", target: "reports/ledgers/general" },
  { title: "Party", icon: IconReportAnalytics, color: "orange", target: "reports/ledgers/party" },
  { title: "Area", icon: IconMap2, color: "green", target: "reports/ledgers/area" },
];

export default function ActionsGrid(props) {
  const theme = useMantineTheme();
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
