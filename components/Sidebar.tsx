'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/app/login/actions';
import { EMPLOYEE_RECORD_VISIBILITY, FY_LABEL } from '@/lib/constants';
import type { Role } from '@/lib/types';
import styles from './Sidebar.module.css';

export type SessionUser = {
  name: string;
  role: Role;
  employeeId: string;
};

/**
 * How a link decides it is the current page.
 *
 * Scorecard and Reviews appear in both sections for anyone who holds a team,
 * pointing at two different things — the team index at /scorecard and their
 * own record at /scorecard/<their id> — so "starts with /scorecard" would
 * light up both entries at once. `team` claims the index and every other
 * person's record under it; `record` claims exactly one id, the viewer's own.
 */
type Match = 'exact' | 'prefix' | 'team' | 'record';

type NavItem = {
  label: string;
  href: string;
  match: Match;
  /** For `team` and `record`, the route both entries share. */
  root?: string;
  /** Roles that can see this item. Omit to show it to everyone. */
  visibleTo?: Role[];
};

/**
 * Whoever holds a team sees their reports and their own record as two
 * separate things. Everyone else has one list and no headings, because a
 * heading over a single group is noise.
 */
function managesTeam(role: Role): boolean {
  return role === 'MANAGER' || role === 'HR';
}

/**
 * The team section. Scorecard and Reviews are unconditional here: they open
 * the index of everyone the viewer can see, and that page speaks for itself
 * when the list is empty. They used to be dropped entirely unless a report
 * existed to deep-link to, because the link needed an id in it — so a manager
 * with no team lost two links and got no explanation for their absence.
 */
const TEAM_GROUP: NavItem[] = [
  { label: 'Home', href: '/', match: 'exact' },
  { label: 'My Team', href: '/my-team', match: 'prefix', visibleTo: ['MANAGER'] },
  { label: 'Performance Log', href: '/performance-log', match: 'prefix', visibleTo: ['MANAGER', 'HR'] },
  { label: 'Scorecard', href: '/scorecard', match: 'team', root: '/scorecard' },
  { label: 'Reviews', href: '/reviews', match: 'team', root: '/reviews' },
  { label: 'Corrections', href: '/corrections', match: 'prefix', visibleTo: ['MANAGER', 'HR'] },
];

/**
 * Someone's own two record links, by id.
 *
 * There is no bare own-record route any more — /scorecard is the team index —
 * so these carry the signed-in person's employee id, which the session
 * already holds. Nothing about the sidebar needs a database read.
 *
 * Always present for anyone who manages a team, with no condition on whether
 * they have a KRA set: a manager has to be able to see that they have no
 * record, and the pages behind these two links say so themselves.
 */
function recordGroup(employeeId: string): NavItem[] {
  return [
    { label: 'Scorecard', href: `/scorecard/${employeeId}`, match: 'record', root: '/scorecard' },
    { label: 'Reviews', href: `/reviews/${employeeId}`, match: 'record', root: '/reviews' },
  ];
}

/** The single, unheaded list an employee sees: their own record, no team. */
function employeeGroup(employeeId: string): NavItem[] {
  return [{ label: 'Home', href: '/', match: 'exact' }, ...recordGroup(employeeId)];
}

const SECONDARY: NavItem[] = [{ label: 'Admin', href: '/admin', match: 'prefix', visibleTo: ['HR'] }];

function isActive(pathname: string, item: NavItem, employeeId: string): boolean {
  switch (item.match) {
    case 'exact':
    case 'record':
      return pathname === item.href;
    case 'team':
      // The index itself, or anyone's record under it except the viewer's
      // own — that one belongs to the "My record" entry on the same root.
      return (
        pathname === item.root ||
        (pathname.startsWith(`${item.root}/`) && pathname !== `${item.root}/${employeeId}`)
      );
    default:
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
}

const SELF_SERVICE_ROOTS = ['/scorecard', '/reviews'];

function visibleToUser(item: NavItem, role: Role): boolean {
  if (item.visibleTo && !item.visibleTo.includes(role)) return false;
  // The self-service surface is hidden end to end for the pilot default —
  // no point linking to a page that will just redirect back to Profile.
  if (
    item.match === 'record' &&
    SELF_SERVICE_ROOTS.includes(item.root ?? item.href) &&
    role === 'EMPLOYEE' &&
    EMPLOYEE_RECORD_VISIBILITY === 'hidden'
  ) {
    return false;
  }
  return true;
}

const ROLE_LABEL: Record<Role, string> = {
  HR: 'HR · Performance',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
};

function NavLink({
  item,
  pathname,
  employeeId,
}: {
  item: NavItem;
  pathname: string;
  employeeId: string;
}) {
  const active = isActive(pathname, item, employeeId);
  return (
    <Link
      href={item.href}
      className={`${styles.link} ${active ? styles.linkActive : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      {item.label}
    </Link>
  );
}

function Group({
  heading,
  items,
  user,
  pathname,
}: {
  heading?: string;
  items: NavItem[];
  user: SessionUser;
  pathname: string;
}) {
  const visible = items.filter((item) => visibleToUser(item, user.role));
  if (visible.length === 0) return null;

  return (
    <div className={styles.group}>
      {heading ? <div className={styles.sectionLabel}>{heading}</div> : null}
      {visible.map((item) => (
        <NavLink
          key={`${heading ?? ''}${item.href}`}
          item={item}
          pathname={pathname}
          employeeId={user.employeeId}
        />
      ))}
    </div>
  );
}

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const split = managesTeam(user.role);

  return (
    <nav className={styles.nav} aria-label="Primary">
      <div className={styles.brand}>
        <span className={styles.mark} aria-hidden="true" />
        <span className={styles.wordmark}>Perform</span>
      </div>

      <div className={styles.fy}>{FY_LABEL}</div>

      {split ? (
        <>
          <Group heading="My team" items={TEAM_GROUP} user={user} pathname={pathname} />
          <Group
            heading="My record"
            items={recordGroup(user.employeeId)}
            user={user}
            pathname={pathname}
          />
        </>
      ) : (
        <Group items={employeeGroup(user.employeeId)} user={user} pathname={pathname} />
      )}

      <div className={styles.divider} />

      <div className={styles.groupSecondary}>
        {SECONDARY.filter((item) => visibleToUser(item, user.role)).map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} employeeId={user.employeeId} />
        ))}
      </div>

      <div className={styles.spacer} />

      <Link href="/profile" className={styles.user} style={{ textDecoration: 'none' }}>
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
