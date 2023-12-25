//TODO: Proper routing needed
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
    if (pb.authStore.isValid) {
      router.push("/auth");
    } else {
      router.push("/app/dashboard");
    }
  });
  return (
    <>
      <h1>Proper Routings are Work In Progress</h1>
      <h1>you are logged in</h1>
      <Button color='red' onClick={logout}>
        Logout
      </Button>
    </>
  );
}
//TODO: NEED PROPER INVIOCING SYSTEM
//TODO: USE IDGENERATOR
//TODO: REMAKE REPORTING TABLES
//TODO: MAKE REPORT GENERATION FILTERS
