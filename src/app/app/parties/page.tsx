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

const mockdata = [
  { title: "Customers", icon: IconUser, color: "green", target:"customers"},
  { title: "Suppliers", icon: IconBriefcase, color: "pink", target:"suppliers"},
];

export default function ActionsGrid(props) {
  const theme = useMantineTheme();
  const router = useRouter()
  const items = mockdata.map((item) => (
    <Grid.Col span="content" key={item.title}>
      <UnstyledButton onClick={()=>router.push(`/app/parties/${item.target}`)} className={classes.item}>
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
      <Grid style={{height:"100vh"}} justify='center' align='center'>
        {items}
      </Grid>
    </Card>
  );
}
