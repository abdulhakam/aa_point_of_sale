"use client";
import { Button } from "@mantine/core";
import Link from "next/link";

export default function ManagementPage() {
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
        <Link prefetch key={`link_${link.text}`} href={`${link.path}`}>
          <Button component='div' m={"sm"} variant='subtle'>{`${link.text}`}</Button>
        </Link>
      ))}
    </>
  );
}
