"use client";
import { Button } from "@mantine/core";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ManagementPage() {
  const router = useRouter();
  const buttons = [
    { text: "sections", path: "management/sections" },
    { text: "areas", path: "management/areas" },
    { text: "parties", path: "management/parties" },
    { text: "companies", path: "management/categories" },
    { text: "bookers", path: "management/bookers" },
    { text: "items", path: "management/items" },
  ];
  const links = [
    { text: "sections", path: "management/sections" },
    { text: "areas", path: "management/areas" },
    { text: "parties", path: "management/parties" },
    { text: "companies", path: "management/categories" },
    { text: "bookers", path: "management/bookers" },
    { text: "items", path: "management/items" },
  ];
  return (
    <>
      <h1>Manage</h1>
      {links.map((link) => (
        <Link key={`link_${link.text}`} href={`${link.path}`}>
          <Button component='div' m={"sm"} variant='subtle'>{`${link.text}`}</Button>
        </Link>
      ))}
      {/* {buttons.map((button) => (
        <Button
          key={`button_${button.text}`}
          onClick={() => router.push(`${button.path}`)}
          variant={"subtle"}
        >
          {`${button.text}`}
        </Button>
      ))} */}
    </>
  );
}
