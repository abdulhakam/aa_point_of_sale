import { useEffect } from "react";
import pb from "./pocketbase";
import { useRouter, usePathname } from "next/navigation";
import { Button,Text } from "@mantine/core";

export default function RouteProtector({ children }) {
  const currentPath = usePathname().split("/").pop();
  const router = useRouter();

  if (!pb.authStore.isValid && currentPath !== "auth") {
    return (
      <>
        <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
          <h1>
            Please
            <Button size="compact-md" variant='transparent' onClick={() => router.push("/auth")}>
              <Text span size="xl" fw={700}>Log in</Text>
            </Button>
            to continue.
          </h1>
        </div>
      </>
    );
  } else return <>{children}</>;
}
