'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar, type SessionUser } from './Sidebar';
import styles from './AppShell.module.css';

/**
 * Routes that render without the application chrome — no sidebar, no nav
 * links of any kind.
 *
 * /set-password belongs here as much as /login does, and for a reason that is
 * easy to miss: the person is signed in, so `user` is set and the shell would
 * otherwise render, but they cannot actually go anywhere until they have
 * chosen a password — middleware bounces every other route straight back here.
 * Rendering the sidebar there put up to seven prefetchable nav links on the
 * screen, Next prefetched each one, and middleware answered each with a
 * redirect to /set-password. One page load became a burst of requests at a
 * single path from a single IP, which Vercel's DDoS mitigation blocked with a
 * 403 — and a blocked Server Action POST is what surfaced as "An unexpected
 * response was received from the server".
 *
 * Both screens draw their own full-viewport layout, so they need no chrome.
 */
const BARE = ['/login', '/set-password'];

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
