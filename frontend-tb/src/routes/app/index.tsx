import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, Text, Grid } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";

const MODULES = [
  { name: "Management", icon: IconSettings, key: "management" },
];

function AppDashboard() {
  return (
    <Grid>
      {MODULES.map((module) => {
        const route = `/app/${module.key}`;
        return (
          <Grid.Col span={3} key={module.name}>
            <Link to={route} style={{ textDecoration: "none" }}>
              <Card shadow='sm' padding='lg' radius='md' withBorder>
                <Card.Section withBorder inheritPadding py='xs'>
                  <module.icon size={48} />
                </Card.Section>
                <Text fw={500} size='lg' mt='md'>
                  {module.name}
                </Text>
              </Card>
            </Link>
          </Grid.Col>
        );
      })}
    </Grid>
  );
}

export const Route = createFileRoute("/app/")({
  component: AppDashboard,
});