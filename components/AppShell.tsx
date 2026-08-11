'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import styles from './AppShell.module.css';

/** Routes that render without the application chrome. */
const BARE = ['/login'];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (BARE.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return <>{children}</>;
  }

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>{children}</div>
    </div>
  );
}
