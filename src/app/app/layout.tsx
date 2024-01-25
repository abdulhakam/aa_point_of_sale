"use client";

import {
  ActionIcon,
  AppShell,
  Burger,
  Button,
  Container,
  Flex,
  Group,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { TimeDisplay, useDate } from "./TimeDisplay";
import NavbarMinimal from "./NavbarMinimal";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import NumberAddress from "../components/NumberAddress/NumberAddress";

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
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding='0'
    >
      <AppShell.Header>
        <Flex justify={"space-between"} align={"center"} px={"md"}>
          <Button
            style={{ height: "3rem" }}
            color='black'
            p={0}
            m={0}
            variant='transparent'
            onClick={toggleDesktop}
            size={"compact-xl"}
          >
            <Text size='xl' fw={700}>
            {process.env.NEXT_PUBLIC_NAME}
          </Text>
          </Button>
          <Stack gap={0} align={"center"}>
            {/* <Text size='xs'>TIME:</Text> */}
            <Text size='xs'> {time} </Text>
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
