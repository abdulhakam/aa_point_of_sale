import { createFileRoute, Link } from "@tanstack/react-router";
import { IconList, IconSettings } from "@tabler/icons-react";
import { ShortcutsGrid } from "../../Components/Dashboard/ShortcutsGrid";
import { BasicInfoGrid } from "../../Components/Dashboard/BasicInfoGrid";

const MODULES = [{ name: "Management", icon: IconSettings, key: "management" }];
const ENTITIES = [
  { name: "Areas", key: "areas" },
  { name: "Companies", key: "companies" },
  { name: "Parties", key: "parties" },
  { name: "Sections", key: "sections" },
  { name: "Order Bookers", key: "order_bookers" },
  { name: "Categories", key: "categories" },
  { name: "Products", key: "products" },
];
function AppDashboard() {
  return (
    <>
      <ShortcutsGrid modules={MODULES} />;
      <BasicInfoGrid entities={ENTITIES} type='display' />
    </>
  );
}

export const Route = createFileRoute("/app/")({
  component: AppDashboard,
});
