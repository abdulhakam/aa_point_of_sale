"use client";
import { useRouter } from "next/navigation";
import { useUserAuthContext } from "./context/AuthContext";
import { Button } from "@mantine/core";
import pb from './pocketbase'
export default function Home() {
  const { logout } = useUserAuthContext();
  const router = useRouter();
  !pb.authStore.isValid ? router.push("/auth") : "";
  return (
    <>
      <h1>you are logged in</h1>
      <Button color='red' onClick={logout}>
        Logout
      </Button>
    </>
  );
}
