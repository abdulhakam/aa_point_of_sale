//TODO: implement middleware for proper routing
"use client";
import { useRouter } from "next/navigation";
import { useUserAuthContext } from "./context/AuthContext";
import { Button } from "@mantine/core";
import pb from "./pocketbase";
import { useEffect } from "react";
export default function Home() {
  const { logout } = useUserAuthContext();
  const router = useRouter();
  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.push("/auth");
    } else {
      router.push("/app/dashboard");
    }
  });
  return (
    <>
      <h1>
        If you are seeing this screen it means something is not right, either you have manually entered the wrong
        url or programs routing system is not working properly.
      </h1>
    </>
  );
}
