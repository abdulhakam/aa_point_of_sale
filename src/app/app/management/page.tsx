"use client";
import { Button } from "@mantine/core";
import { useRouter } from "next/navigation";

export default function ManagementPage() {
  const router = useRouter();
  const buttons = [
    { text: "sections", path: "management/sections" },
    { text: "areas", path: "management/areas" },
    { text: "bookers", path: "management/bookers" },
    { text: "companies", path: "management/categories" },
    { text: "items", path: "management/items" },
  ];
  return (
    <>
      <h1>Manage</h1>
      {buttons.map(button=>
      <Button key={`button_${button.text}`} onClick={() => router.push(`${button.path}`)} variant={"subtle"}>
        {`${button.text}`}
      </Button>)}
    </>
  );
}
