"use client";
import { Button } from "@mantine/core";
import { useRouter } from "next/navigation";

export default function ManagementPage() {
  const router = useRouter();
  const buttons = [
    { text: "areas", path: "management/areas" },
    { text: "bookers", path: "management/bookers" },
    { text: "categories", path: "management/categories" },
    { text: "invoices", path: "management/invoices" },
    { text: "transactions", path: "management/transactions" },
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
