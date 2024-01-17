"use client";

import { ActionIcon, AppShell, Burger, Button, Container, Flex, Group, Skeleton, Text } from "@mantine/core";
import { TimeDisplay, useDate } from "./TimeDisplay";
import NavbarMinimal from "./NavbarMinimal";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isPrinting = useMediaQuery('print');
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const { date, time } = useDate();
  return (
    <AppShell
      withBorder={false}
      header={{ height: "32" }}
      navbar={{
        width: 80,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened, desktop: isPrinting? true : !desktopOpened },
      }}
      padding='0'
    >
      <AppShell.Header>
        <Flex justify={"space-between"} align={"center"} px={"md"}>
          <Button color='black' p={0} m={0} variant='transparent' onClick={toggleDesktop} size={"compact-xl"}>
            {process.env.NEXT_PUBLIC_NAME}
          </Button>
          <Text size='xs'> {`TIME: ${time} - ${date}`} </Text>
        </Flex>
      </AppShell.Header>
      <AppShell.Navbar
      >
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
