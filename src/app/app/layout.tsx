"use client";

import { Container, Flex } from "@mantine/core";
import HeaderSimple from "./HeaderSimple";
import NavbarMinimal from "./NavbarMinimal";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <Flex justify={'stretch'}>
      <NavbarMinimal />
      <Container w={'100%'} fluid>
        <HeaderSimple />
        {children}
      </Container>
    </Flex>
  );
}
