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
  { icon: IconGauge, label: 'Dashboard' },
  { icon: IconUser, label: 'Customers' },
  { icon: IconTag, label: 'Items' },
  { icon: IconBriefcase, label: 'Suppliers' },
  { icon: IconReport, label: 'Reports' },
  { icon: IconTrolley, label: 'Recievings' },
  { icon: IconShoppingBag, label: 'Sales' },
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
      onClick={()=>router.push(`/app/${link.label.toLowerCase()}`)}
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