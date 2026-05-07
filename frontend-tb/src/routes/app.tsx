import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQueries, useIsFetching } from "@tanstack/react-query";
import { trailbaseClient } from "../trailbaseClient";
import { Group, Text } from "@mantine/core";

const entities = [
  { key: "sections" },
  { key: "areas" },
  { key: "categories" },
  { key: "companies" },
  { key: "parties" },
  { key: "products" },
  { key: "order_bookers" },
];

const AppLayout = () => {
  const isFetching = useIsFetching();
  return (
    <>
      <div className='p-2 flex gap-2'>
        <Group>
          <Link to='/app' className='[&.active]:font-bold'>
            Dashboard
          </Link>{" "}
          <Link to='/app/management' className='[&.active]:font-bold'>
            Management
          </Link>
          <Text fw={800} c={isFetching > 0 ? "red" : "green"}>
            {isFetching}
          </Text>
        </Group>
      </div>
      <Outlet />
    </>
  );
};
export const Route = createFileRoute("/app")({ component: AppLayout });
