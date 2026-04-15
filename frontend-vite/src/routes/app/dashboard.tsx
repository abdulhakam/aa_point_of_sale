import { createFileRoute } from '@tanstack/react-router'
import { Card, Text, UnstyledButton, useMantineTheme, Grid } from "@mantine/core";
import {
  IconReport,
  IconShoppingBag,
  IconSettings,
  IconCoinEuroFilled,
  IconTrolley,
} from "@tabler/icons-react";
import classes from "./dashboard.module.css";
import { Link } from '@tanstack/react-router';

const mockdata = [
  { title: "Reports", icon: IconReport, color: "pink", target: "reports" },
  { title: "Orders", icon: IconTrolley, color: "green", target: "invoices/orders" },
  { title: "Invoices", icon: IconShoppingBag, color: "orange", target: "invoices" },
  { title: "Cash Memo", icon: IconCoinEuroFilled, color: "blue", target: "cashmemo" },
  { title: "Management", icon: IconSettings, color: "gray", target: "management" },
];

function ActionsGrid() {
  const theme = useMantineTheme();
  const items = mockdata.map((item) => (
    <Grid.Col span={2} key={item.title}>
      <Link to={`/app/${item.target}`} style={{textDecoration:'none'}}>
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

export const Route = createFileRoute('/app/dashboard')({
  component: ActionsGrid,
})