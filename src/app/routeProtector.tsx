"use client";
import { useEffect } from "react";
import pb from "./pocketbase";
import { useRouter, usePathname } from "next/navigation";

export default function RouteProtector({ children }) {
  const currentPath = usePathname();
  const router = useRouter();
  console.log(currentPath);
  useEffect(() => {
    if (!pb.authStore.isValid && currentPath.split("/").pop() !== "auth") {
      router.push("/auth" + "?redirection=" + currentPath === "/" ? "/app/dashboard" : currentPath + "");
    }
  });
  return <>{children}</>;
}
