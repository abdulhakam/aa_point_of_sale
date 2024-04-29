import { Tooltip, UnstyledButton, Stack, rem } from "@mantine/core";
import {
  IconHome2,
  IconSettings,
  IconLogout,
  IconReport,
  IconTrolley,
  IconShoppingBag,
  IconDashboard,
  IconCoinEuro,
  IconBuildingWarehouse,
  IconBasketDollar,
  IconCoinEuroFilled,
} from "@tabler/icons-react";
import classes from "./NavbarMinimal.module.css";
import { usePathname, useRouter } from "next/navigation";
import pb from "../pocketbase";
import Link from "next/link";
interface NavbarLinkProps {
  icon: typeof IconHome2;
  label: string;
  active?: boolean;
  href?: string;
}

function NavbarLink({ icon: Icon, label, active, href }: NavbarLinkProps) {
  return (
    <Tooltip label={label} position='right' transitionProps={{ duration: 0 }}>
      <Link href={href} prefetch className={classes.link} data-active={active || undefined}>
        <Icon style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
      </Link>
    </Tooltip>
  );
}

const mockdata = [
  { label: "Main", icon: IconDashboard, color: "blue", target: "dashboard" },
  { label: "Reports", icon: IconReport, color: "pink", target: "reports" },
  { label: "Orders", icon: IconTrolley, color: "green", target: "invoices/orders" },
  { label: "Invoices", icon: IconShoppingBag, color: "orange", target: "invoices" },
  { label: "Payments", icon: IconCoinEuro, color: "red", target: "payments" },
  { label: "Cash Memo", icon: IconCoinEuroFilled, color: "blue", target: "cashmemo" },
  { label: "Expenses", icon: IconBasketDollar, color: "grape", target: "expenses" },
  { label: "Management", icon: IconSettings, color: "gray", target: "management" },
];

export default function NavbarMinimal(props) {
  const router = useRouter();
  const pathname = usePathname().split("/").pop();
  const links = mockdata.map((link) => (
    <NavbarLink
      {...link}
      key={link.label}
      active={link.label.toLowerCase() === pathname}
      href={`/app/${link.target}`}
    />
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        <Stack justify='center' gap={0}>
          {links}
        </Stack>
      </div>

      <Stack justify='center' gap={0}>
        <Tooltip label={"Logout"} position='right' transitionProps={{ duration: 0 }}>
          <UnstyledButton onClick={() => {pb.authStore.clear();router.push('/auth');}} className={classes.link} >
            <IconLogout style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
          </UnstyledButton>
        </Tooltip>
      </Stack>
    </nav>
  );
}
