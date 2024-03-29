"use client";

import {
  AppShell,
  Button,
  Container,
  Flex,
  Stack,
  Text,
} from "@mantine/core";
import { useDate } from "./TimeDisplay";
import NavbarMinimal from "./NavbarMinimal";
import { useDisclosure } from "@mantine/hooks";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // const isPrinting = useMediaQuery('print');
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure(false);
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const { date, time } = useDate();
  return (
    <AppShell
      withBorder={true}
      header={{ height: "52" }}
      navbar={{
        width: 80,
        breakpoint: "md",
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding='0'
    >
      <AppShell.Header>
        <Flex justify={"space-between"} align={"center"} px={"md"}>
            <Text size='xl' fw={700} onClick={toggleDesktop} >
            {process.env.NEXT_PUBLIC_NAME}
          </Text>
          <Stack gap={0} align={"center"}>
            <Text size='xs'>{time} </Text>
            <Text size='xs'>{date}</Text>
          </Stack>
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
