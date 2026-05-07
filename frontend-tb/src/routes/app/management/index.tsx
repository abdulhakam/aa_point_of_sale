import { createFileRoute } from "@tanstack/react-router";
import {
  IconMap,
  IconBuilding,
  IconUsers,
  IconList,
  IconUser,
  IconTag,
  IconPackage,
} from "@tabler/icons-react";

import { BasicInfoGrid } from "../../../Components/Dashboard/BasicInfoGrid";

const ENTITIES = [
  { name: "Areas", icon: IconMap, key: "areas" },
  { name: "Companies", icon: IconBuilding, key: "companies" },
  { name: "Parties", icon: IconUsers, key: "parties" },
  { name: "Sections", icon: IconList, key: "sections" },
  { name: "Order Bookers", icon: IconUser, key: "order_bookers" },
  { name: "Categories", icon: IconTag, key: "categories" },
  { name: "Products", icon: IconPackage, key: "products" },
];

function Management() {
  return <BasicInfoGrid entities={ENTITIES} type='links' />;
}

export const Route = createFileRoute("/app/management/")({
  component: Management,
});
