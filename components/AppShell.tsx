'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar, type SessionUser } from './Sidebar';
import styles from './AppShell.module.css';

/** Routes that render without the application chrome. */
const BARE = ['/login'];

export function AppShell({
  user,
  children,
}: {
  user: SessionUser | null;
  children: ReactNode;
}) {
  const pathname = usePathname();

  const bare =
    BARE.some((route) => pathname === route || pathname.startsWith(`${route}/`)) || !user;

  if (bare) return <>{children}</>;

  return (
    <div className={styles.shell}>
      <Sidebar user={user} />
      <div className={styles.main}>{children}</div>
    </div>
  );
}
