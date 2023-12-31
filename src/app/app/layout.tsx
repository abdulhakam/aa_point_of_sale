"use client";

import { ActionIcon, AppShell, Burger, Button, Container, Flex, Group, Skeleton } from "@mantine/core";
import { TimeDisplay } from "./TimeDisplay";
import NavbarMinimal from "./NavbarMinimal";
import { useDisclosure } from "@mantine/hooks";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  return (
    <AppShell
      header={{ height: "32" }}
      navbar={{
        width: 80,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding='0'
    >
      <AppShell.Header>
        <Flex justify={"space-between"} pr={"lg"}>
          <ActionIcon variant='subtle' onClick={toggleDesktop} size={'md'}>
            AA
          </ActionIcon>
          <TimeDisplay />
        </Flex>
      </AppShell.Header>
      <AppShell.Navbar>
        <NavbarMinimal />
      </AppShell.Navbar>
      <AppShell.Main>
        <Flex justify={"stretch"}>
          <Container w={"100%"} fluid>
            {children}
          </Container>
        </Flex>
      </AppShell.Main>
    </AppShell>
  );
}
