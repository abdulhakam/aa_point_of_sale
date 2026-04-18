import { Anchor, Stack } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/management/")({
  component: RouteComponent,
});

const links = ["sections"];

function RouteComponent() {
  return (
    <Stack>
      {links.map((link) => (
        <Anchor key={link} href={`/app/management/${link}`}>
          {link}
        </Anchor>
      ))}
    </Stack>
  );
}
