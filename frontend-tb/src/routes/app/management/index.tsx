import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { Card, Text, Grid, Loader } from "@mantine/core";
import {
  IconMap,
  IconBuilding,
  IconUsers,
  IconList,
  IconUser,
  IconTag,
  IconPackage,
} from "@tabler/icons-react";
import { areasCollection } from "../../../collections/areas";
import { companiesCollection } from "../../../collections/companies";
import { partiesCollection } from "../../../collections/parties";
import { sectionsCollection } from "../../../collections/sections";
import { orderBookersCollection } from "../../../collections/order_bookers";
import { categoriesCollection } from "../../../collections/categories";
import { productsCollection } from "../../../collections/products";

import { useQueries } from "@tanstack/react-query";

const ENTITIES = [
  { name: "Areas", icon: IconMap, key: "areas" },
  { name: "Companies", icon: IconBuilding, key: "companies" },
  { name: "Parties", icon: IconUsers, key: "parties" },
  { name: "Sections", icon: IconList, key: "sections" },
  { name: "Order Bookers", icon: IconUser, key: "order_bookers" },
  { name: "Categories", icon: IconTag, key: "categories" },
  { name: "Products", icon: IconPackage, key: "products" },
];

function Management() {
  // 1. Map entities to query objects
  const results = useQueries({
    queries: ENTITIES.map((entity) => ({
      queryKey: ["count", entity.key],
      queryFn: async () =>
        await fetch(`http://localhost:4000/api/records/v1/${entity.key}`)
          .then((res) => res.json())
          .then((res) => res.records),
      // Optimization: If you only need length, ensure your API has a /count endpoint
      // to avoid downloading the entire array.
    })),
  });

  return (
    <Grid>
      {ENTITIES.map((entity, index) => {
        const { data, isLoading } = results[index];
        const route = `/app/management/${entity.key}`;
        return (
          <Grid.Col span={3} key={entity.name}>
            <Link to={route} style={{ textDecoration: "none" }}>
              <Card shadow='sm' padding='lg' radius='md' withBorder>
                <Card.Section withBorder inheritPadding py='xs'>
                  <entity.icon size={48} />
                </Card.Section>
                <Text fw={500} size='lg' mt='md'>
                  {entity.name}
                </Text>
                <Text mt='xs' c='dimmed' size='sm'>
                  {isLoading ? <Loader size='sm' /> : `${data?.length ?? 0} items`}
                </Text>
              </Card>
            </Link>
          </Grid.Col>
        );
      })}
    </Grid>
  );
}

export const Route = createFileRoute("/app/management/")({
  component: Management,
});
