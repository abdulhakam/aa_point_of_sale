import { useState } from 'react';
import { Center, Tooltip, UnstyledButton, Stack, rem } from '@mantine/core';
import {
  IconHome2,
  IconGauge,
  IconDeviceDesktopAnalytics,
  IconFingerprint,
  IconCalendarStats,
  IconUser,
  IconSettings,
  IconLogout,
  IconSwitchHorizontal,
  IconTag,
  IconBriefcase,
  IconReport,
  IconTrolley,
  IconShoppingBag,
  IconDashboard,
  IconCoinEuro,
} from '@tabler/icons-react';
import classes from './NavbarMinimal.module.css';
import { useUserAuthContext } from '../context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
interface NavbarLinkProps {
  icon: typeof IconHome2;
  label: string;
  active?: boolean;
  onClick?(): void;
}

function NavbarLink({ icon: Icon, label, active, onClick }: NavbarLinkProps) {
  return (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <UnstyledButton onClick={onClick} className={classes.link} data-active={active || undefined}>
        <Icon style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  );
}

const mockdata = [
  { label: "Dashboard", icon: IconDashboard, target:"/dashboard"},
  { label: "Customers", icon: IconUser, target:"parties/customers"},
  { label: "Items", icon: IconTag,  target:"items"},
  { label: "Suppliers", icon: IconBriefcase, target:"parties/suppliers"},
  { label: "Reports", icon: IconReport, target:"reports"},
  { label: "Orders", icon: IconTrolley, target:"orders"},
  { label: "Sales", icon: IconShoppingBag,  target:"invoices/sales"},
  { label: "Purchases", icon: IconShoppingBag, target:"invoices/purchase"},
  { label: "Payments", icon: IconCoinEuro, target:"payments"},
  { label: "Management", icon: IconSettings, target:"management"},
];

export default function NavbarMinimal(props) {
  const pathname = usePathname().split('/').pop()
  const router = useRouter()
  const {logout} = useUserAuthContext()
  const links = mockdata.map((link) => (
    <NavbarLink
      {...link}
      key={link.label}
      active={link.label.toLowerCase() === pathname}
      onClick={()=>router.push(`/app/${link.target}`)}
    />
  ));

  return (
    <nav className={classes.navbar}>
      <Center>
        AA
      </Center>

      <div className={classes.navbarMain}>
        <Stack justify="center" gap={0}>
          {links}
        </Stack>
      </div>

      <Stack justify="center" gap={0}>
        <NavbarLink icon={IconLogout} label="Logout" onClick={logout} />
      </Stack>
    </nav>
  );
}