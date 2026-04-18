import { Anchor, Stack } from "@mantine/core";
import { createFileRoute, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/app/management/")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const thisRoute = "app/management";

  // Find the management route and get its children
  const managementRouteLinks = router.routeTree.children
    .filter((route) => route.path.includes(thisRoute))
    .slice(1);
  return (
    <Stack>
      {managementRouteLinks.map((link) => (
        <Anchor key={link.path} href={`/${link.path}`}>
          {link.path.split("/").slice(2)[0]}
        </Anchor>
      ))}
    </Stack>
  );
}
