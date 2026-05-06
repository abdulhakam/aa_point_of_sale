import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { Card, Text, Grid, Loader } from "@mantine/core";
import { IconMap, IconBuilding, IconUsers, IconList, IconUser, IconTag, IconPackage } from "@tabler/icons-react";
import { areasCollection } from "../../../collections/areas";
import { companiesCollection } from "../../../collections/companies";
import { partiesCollection } from "../../../collections/parties";
import { sectionsCollection } from "../../../collections/sections";
import { orderBookersCollection } from "../../../collections/order_bookers";
import { categoriesCollection } from "../../../collections/categories";
import { productsCollection } from "../../../collections/products";

const entities = [
  { name: "Areas", icon: IconMap, collection: areasCollection, route: "/app/management/areas" },
  { name: "Companies", icon: IconBuilding, collection: companiesCollection, route: "/app/management/companies" },
  { name: "Parties", icon: IconUsers, collection: partiesCollection, route: "/app/management/parties" },
  { name: "Sections", icon: IconList, collection: sectionsCollection, route: "/app/management/sections" },
  { name: "Order Bookers", icon: IconUser, collection: orderBookersCollection, route: "/app/management/order_bookers" },
  { name: "Categories", icon: IconTag, collection: categoriesCollection, route: "/app/management/categories" },
  { name: "Products", icon: IconPackage, collection: productsCollection, route: "/app/management/products" },
];

function Management() {
  const { data: areas, isLoading: areasLoading } = useLiveQuery((q) => q.from({ area: areasCollection }));
  const { data: companies, isLoading: companiesLoading } = useLiveQuery((q) => q.from({ company: companiesCollection }));
  const { data: parties, isLoading: partiesLoading } = useLiveQuery((q) => q.from({ party: partiesCollection }));
  const { data: sections, isLoading: sectionsLoading } = useLiveQuery((q) => q.from({ section: sectionsCollection }));
  const { data: orderBookers, isLoading: orderBookersLoading } = useLiveQuery((q) => q.from({ orderBooker: orderBookersCollection }));
  const { data: categories, isLoading: categoriesLoading } = useLiveQuery((q) => q.from({ category: categoriesCollection }));
  const { data: products, isLoading: productsLoading } = useLiveQuery((q) => q.from({ product: productsCollection }));

  const counts = [
    { ...entities[0], count: areas?.length || 0, isLoading: areasLoading },
    { ...entities[1], count: companies?.length || 0, isLoading: companiesLoading },
    { ...entities[2], count: parties?.length || 0, isLoading: partiesLoading },
    { ...entities[3], count: sections?.length || 0, isLoading: sectionsLoading },
    { ...entities[4], count: orderBookers?.length || 0, isLoading: orderBookersLoading },
    { ...entities[5], count: categories?.length || 0, isLoading: categoriesLoading },
    { ...entities[6], count: products?.length || 0, isLoading: productsLoading },
  ];

  return (
    <Grid>
      {counts.map((entity) => (
        <Grid.Col span={3} key={entity.name}>
          <Link to={entity.route} style={{ textDecoration: "none" }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Card.Section withBorder inheritPadding py="xs">
                <entity.icon size={48} />
              </Card.Section>
              <Text fw={500} size="lg" mt="md">
                {entity.name}
              </Text>
              <Text mt="xs" c="dimmed" size="sm">
                {entity.isLoading ? <Loader size="sm" /> : `${entity.count} items`}
              </Text>
            </Card>
          </Link>
        </Grid.Col>
      ))}
    </Grid>
  );
}

export const Route = createFileRoute("/app/management/")({
  component: Management,
});