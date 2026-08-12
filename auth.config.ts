import type { NextAuthConfig } from 'next-auth';
import type { Role } from '@prisma/client';

/**
 * Edge-safe half of the Auth.js config, used by middleware.
 *
 * Middleware runs on the edge runtime, where bcrypt and Prisma cannot. So the
 * providers list stays empty here — this half only answers "is there a valid
 * session cookie, and does its role clear the route table below?". The full
 * config in auth.ts adds the credentials provider and runs in Node.
 */

const ALL: Role[] = ['EMPLOYEE', 'MANAGER', 'HR'];

/**
 * Route (or route prefix) to the roles allowed on it. Checked top to bottom;
 * the first prefix match wins. A path that matches nothing is refused — this
 * table is a allowlist, not a denylist, so a new route needs an explicit row
 * before anyone can reach it.
 */
const ROUTE_RULES: { path: string; roles: Role[] }[] = [
  { path: '/my-team', roles: ['MANAGER'] },
  { path: '/performance-log', roles: ['MANAGER', 'HR'] },
  { path: '/scorecard', roles: ALL },
  { path: '/reviews', roles: ['MANAGER', 'HR'] },
  { path: '/calibration', roles: ['HR'] },
  { path: '/reports', roles: ['HR'] },
  { path: '/admin', roles: ['HR'] },
  { path: '/profile', roles: ALL },
  { path: '/activity', roles: ['HR'] },
];

function isLoginRoute(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/login/');
}

function isSetPasswordRoute(pathname: string): boolean {
  return pathname === '/set-password' || pathname.startsWith('/set-password/');
}

function matches(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Home is every role, content differs inside — everything else is deny by default. */
function isAllowedRoute(pathname: string, role: Role): boolean {
  if (pathname === '/') return true;
  const rule = ROUTE_RULES.find((r) => matches(pathname, r.path));
  return rule ? rule.roles.includes(role) : false;
}

export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      // Sign-in is public. /set-password requires a session but skips the
      // role allowlist so every role can complete first-login / post-reset.
      if (isLoginRoute(pathname)) return true;

      if (isSetPasswordRoute(pathname)) {
        return Boolean(auth?.user);
      }

      if (!auth?.user) return false;

      // No other app route until the pilot default (or a reset) is replaced.
      if (auth.user.mustSetPassword) {
        return Response.redirect(new URL('/set-password', request.nextUrl));
      }

      return isAllowedRoute(pathname, auth.user.role);
    },

    /**
     * Edge-safe projection of the JWT onto the session. auth.ts defines a
     * fuller version (role, employeeId, mustSetPassword) for the Node instance;
     * that one wins there because it's declared after this spread. This one
     * exists so middleware — which only ever constructs this edge config —
     * can see role and mustSetPassword without touching Prisma or bcrypt.
     */
    session({ session, token }) {
      if (token.role) session.user.role = token.role as Role;
      if (token.employeeId) session.user.employeeId = token.employeeId as string;
      if (typeof token.mustSetPassword === 'boolean') {
        session.user.mustSetPassword = token.mustSetPassword;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
