import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe half of the Auth.js config, used by middleware.
 *
 * Middleware runs on the edge runtime, where bcrypt and Prisma cannot. So the
 * providers list stays empty here — this half only answers "is there a valid
 * session cookie?". The full config in auth.ts adds the credentials provider
 * and runs in Node.
 */
export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const signedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;

      // The sign-in page is the one place a signed-out person belongs.
      if (pathname === '/login' || pathname.startsWith('/login/')) return true;

      return signedIn;
    },
  },
} satisfies NextAuthConfig;
