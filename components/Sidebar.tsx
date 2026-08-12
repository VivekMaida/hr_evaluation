'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/app/login/actions';
import { FY_LABEL } from '@/lib/data';
import type { Role } from '@/lib/types';
import styles from './Sidebar.module.css';

export type SessionUser = {
  name: string;
  role: Role;
  employeeId: string;
};

type NavItem = {
  label: string;
  href: string;
  /** Roles that can see this item. Omit to show it to everyone. */
  visibleTo?: Role[];
};

const PRIMARY: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Performance Log', href: '/performance-log', visibleTo: ['MANAGER', 'HR'] },
  { label: 'Scorecard', href: '/scorecard' },
  { label: 'Reviews', href: '/reviews' },
];

const SECONDARY: NavItem[] = [
  { label: 'Reports', href: '/reports', visibleTo: ['HR'] },
  { label: 'Admin', href: '/admin', visibleTo: ['HR'] },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function visibleToUser(item: NavItem, role: Role): boolean {
  return !item.visibleTo || item.visibleTo.includes(role);
}

const ROLE_LABEL: Record<Role, string> = {
  HR: 'HR · Performance',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
};

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  return (
    <Link
      key={item.href}
      href={item.href}
      className={`${styles.link} ${isActive(pathname, item.href) ? styles.linkActive : ''}`}
      aria-current={isActive(pathname, item.href) ? 'page' : undefined}
    >
      {item.label}
    </Link>
  );
}

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Primary">
      <div className={styles.brand}>
        <span className={styles.mark} aria-hidden="true" />
        <span className={styles.wordmark}>Perform</span>
      </div>

      <div className={styles.fy}>{FY_LABEL}</div>

      <div className={styles.group}>
        {PRIMARY.filter((item) => visibleToUser(item, user.role)).map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>

      <div className={styles.divider} />

      <div className={styles.groupSecondary}>
        {SECONDARY.filter((item) => visibleToUser(item, user.role)).map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>

      <div className={styles.spacer} />

      <Link href="/account" className={styles.user} style={{ textDecoration: 'none' }}>
        <div className={styles.userName}>{user.name}</div>
        <div className={styles.userRole}>{ROLE_LABEL[user.role]}</div>
      </Link>

      <form action={signOutAction} className={styles.signOut}>
        <button type="submit" className={styles.signOutButton}>
          Sign out
        </button>
      </form>
    </nav>
  );
}
