"use client";
import { useEffect } from "react";
import pb from "./pocketbase";
import { useRouter, usePathname } from "next/navigation";
import { Container, Flex, Text } from "@mantine/core";
import Link from "next/link";

export default function RouteProtector({ children }) {
  const currentPath = usePathname();
  console.log(currentPath);
  // useEffect(() => {
  if (!pb.authStore.isValid && currentPath.split("/").pop() !== "auth") {
    return (
      <Container h={"100vh"} p={0}>
        <Flex align={"center"} justify={"center"} h={"100%"}>
          <Text size={"lg"} fw={700}>
            Please <Link href={`/auth?redirection=${currentPath}`}>log in</Link> to continue
          </Text>
        </Flex>
      </Container>
    );
  }
  // },[]);
  return <>{children}</>;
}
