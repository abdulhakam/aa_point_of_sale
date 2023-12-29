"use client";
import { Card, Text, SimpleGrid, UnstyledButton, Group, useMantineTheme, Grid } from "@mantine/core";
import {
  IconReport,
  IconUser,
  IconTag,
  IconBriefcase,
  IconTrolley,
  IconShoppingBag,
  IconSettings,
} from "@tabler/icons-react";
import classes from "./page.module.css";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getFullList } from "@/app/api/useAPI";

const mockdata = [
  { title: "Customers", icon: IconUser, color: "cyan", target:"parties/customers"},
  { title: "Items", icon: IconTag, color: "yellow", target:"items"},
  { title: "Suppliers", icon: IconBriefcase, color: "blue", target:"parties/suppliers"},
  { title: "Reports", icon: IconReport, color: "pink", target:"reports"},
  { title: "Recievings", icon: IconTrolley, color: "green", target:"recievings"},
  { title: "Sales", icon: IconShoppingBag, color: "orange", target:"sales"},
  { title: "Management", icon: IconSettings, color: "lime", target:"management"},
];

export default function ActionsGrid(props) {
  const theme = useMantineTheme();
  const router = useRouter()
  const items = mockdata.map((item) => (
    <Grid.Col span="auto" key={item.title}>
      <UnstyledButton onClick={()=>router.push(`/app/${item.target}`)} className={classes.item}>
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
