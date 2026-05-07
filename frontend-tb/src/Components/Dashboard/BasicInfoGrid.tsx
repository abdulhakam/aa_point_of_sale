import { Link } from "@tanstack/react-router";
import { Card, Text, Loader, Grid, Badge, Stack, SimpleGrid, Flex } from "@mantine/core";
import { useQueries } from "@tanstack/react-query";
import { trailbaseClient } from "../../trailbaseClient";

interface BasicInfoGridProps {
  entities: Array<{ name: string; key: string; icon?: any }>;
  type?: "links" | "display";
}

export function BasicInfoGrid({ entities, type = "display" }: BasicInfoGridProps) {
  const results = useQueries({
    queries: entities.map((entity) => ({
      queryKey: [entity.key, "all"],
      queryFn: async () => {
        const response = await trailbaseClient.records(entity.key).list({
          pagination: { limit: 0 },
          count: true,
        });
        return response.total_count;
      },
    })),
  });

  return (
    <SimpleGrid cols={7}>
      {entities.map((entity, index) => {
        const { data, isLoading } = results[index];
        const route = `/app/management/${entity.key}`;
        if (type === "links") {
          return (
            <Link key={entity.name} to={route} style={{ textDecoration: "none" }}>
              <Card shadow='sm' padding='lg' radius='md' withBorder>
                {entity.icon && (
                  <Card.Section inheritPadding py='xs'>
                    <Flex justify='center'>
                      <entity.icon size={48} />
                    </Flex>
                  </Card.Section>
                )}
                <Text fw={500} size='lg' mt='md'>
                  {entity.name}
                </Text>
                <Text mt='xs' c='dimmed' size='sm'>
                  {isLoading ? <Loader size='sm' /> : `${data ?? 0} items`}
                </Text>
              </Card>
            </Link>
          );
        } else {
          return (
            <Card key={entity.name} h={"10rem"} shadow='sm' withBorder>
              <Stack align='end'>
                <Badge mt={0} size='xl'>
                  {isLoading ? <Loader size='sm' /> : `${data ?? "?"}`}
                </Badge>
              </Stack>
              <Text fw={500} size='xl' mt='md' ta='center'>
                {entity.name}
              </Text>
            </Card>
          );
        }
      })}
    </SimpleGrid>
  );
}
