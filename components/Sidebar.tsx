'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from './RoleContext';
import { CURRENT_USER, FY_LABEL } from '@/lib/data';
import styles from './Sidebar.module.css';

type NavItem = {
  label: string;
  href: string;
  /** Restricted to HR. Shown to a lead, dimmed, with an HR tag. */
  hrOnly?: boolean;
};

const PRIMARY: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'My Team', href: '/my-team' },
  { label: 'Performance Log', href: '/performance-log' },
  { label: 'Scorecard', href: '/scorecard' },
  { label: 'Reviews', href: '/reviews' },
];

const SECONDARY: NavItem[] = [
  { label: 'Calibration', href: '/calibration', hrOnly: true },
  { label: 'Reports', href: '/reports', hrOnly: true },
  { label: 'Admin', href: '/admin', hrOnly: true },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { role, setRole } = useRole();
  const user = CURRENT_USER[role];

  return (
    <nav className={styles.nav} aria-label="Primary">
      <div className={styles.brand}>
        <span className={styles.mark} aria-hidden="true" />
        <span className={styles.wordmark}>Perform</span>
      </div>

      <div className={styles.fy}>{FY_LABEL}</div>

      <div className={styles.group}>
        {PRIMARY.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.link} ${
              isActive(pathname, item.href) ? styles.linkActive : ''
            }`}
            aria-current={isActive(pathname, item.href) ? 'page' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className={styles.divider} />

      <div className={styles.groupSecondary}>
        {SECONDARY.map((item) =>
          role === 'hr' ? (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.link} ${
                isActive(pathname, item.href) ? styles.linkActive : ''
              }`}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ) : (
            <span
              key={item.href}
              className={styles.linkLocked}
              title="HR only"
              aria-disabled="true"
            >
              {item.label}
              <span className={styles.tag}>HR</span>
            </span>
          ),
        )}
      </div>

      <div className={styles.spacer} />

      <div className={styles.user}>
        <div className={styles.userName}>{user.name}</div>
        <div className={styles.userRole}>{user.title}</div>
      </div>

      <div className={styles.roleSwitch} role="group" aria-label="Preview as">
        <button
          type="button"
          className={`${styles.roleSwitchOption} ${
            role === 'lead' ? styles.roleSwitchActive : ''
          }`}
          onClick={() => setRole('lead')}
        >
          Lead
        </button>
        <button
          type="button"
          className={`${styles.roleSwitchOption} ${
            role === 'hr' ? styles.roleSwitchActive : ''
          }`}
          onClick={() => setRole('hr')}
        >
          HR
        </button>
      </div>
    </nav>
  );
}
