import {  Tooltip, UnstyledButton, Stack, rem } from '@mantine/core';
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
} from '@tabler/icons-react';
import classes from './NavbarMinimal.module.css';
import { useUserAuthContext } from '../context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import pb from '../pocketbase';
interface NavbarLinkProps {
  icon: typeof IconHome2;
  label: string;
  active?: boolean;
  href?: string;
}

function NavbarLink({ icon: Icon, label, active, href }: NavbarLinkProps) {
  return (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <UnstyledButton component='a' href={href} className={classes.link} data-active={active || undefined}>
        <Icon style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  );
}

const mockdata = [
  { label: "Main", icon: IconDashboard, color: "blue", target:"dashboard"},
    { label: "Parties", icon: IconBuildingWarehouse, color: "blue", target:"parties"},
    { label: "Reports", icon: IconReport, color: "pink", target:"reports"},
    { label: "Orders", icon: IconTrolley, color: "green", target:"invoices/orders"},
    { label: "Invoices", icon: IconShoppingBag, color: "orange", target:"invoices"},
    { label: "Payments", icon: IconCoinEuro, color:'red', target:"payments"},
    { label: "Expenses", icon: IconBasketDollar, color: "grape", target:"expenses"},
    { label: "Management", icon: IconSettings, color: "gray", target:"management"},
  ];

export default function NavbarMinimal(props) {
  const pathname = usePathname().split('/').pop()
  const router = useRouter()
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
        <Stack justify="center" gap={0}>
          {links}
        </Stack>
      </div>

      <Stack justify="center" gap={0}>
        <NavbarLink icon={IconLogout} label="Logout" onClick={()=>{pb.authStore.clear();router.push('/auth')}} />
      </Stack>
    </nav>
  );
}