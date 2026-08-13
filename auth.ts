import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authConfig } from './auth.config';
import type { Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      role: Role;
      employeeId: string;
      /** True until the person replaces the pilot default (or a reset) password. */
      mustSetPassword: boolean;
    } & DefaultSession['user'];
  }
  interface User {
    role: Role;
    employeeId: string;
    mustSetPassword: boolean;
  }
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      credentials: {
        email: { label: 'Work email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { employee: true },
        });

        // No such account. HR pre-creates the pilot users; nobody self-registers.
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.employee.name,
          role: user.role,
          employeeId: user.employeeId,
          mustSetPassword: user.mustSetPassword,
        };
      },
    }),
  ],

  callbacks: {
    // Brings in authConfig's `authorized` and its edge-safe `session`. The
    // fuller `session` / `jwt` below are declared after the spread, so they
    // win here — this Node instance refreshes role and mustSetPassword from DB.
    ...authConfig.callbacks,

    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.employeeId = user.employeeId;
        token.mustSetPassword = user.mustSetPassword;
        return token;
      }

      // Re-read on each Node JWT refresh so HR role changes and password-reset
      // flags apply without a second sign-in. Middleware still sees the cookie
      // until this runs once and the Set-Cookie lands (one-request lag).
      if (token.employeeId) {
        const dbUser = await prisma.user.findUnique({
          where: { employeeId: token.employeeId as string },
          select: { role: true, mustSetPassword: true },
        });
        if (!dbUser) {
          // Account gone (deleted employee, stale cookie) — returning null
          // here is what @auth/core treats as "no session": the session()
          // callback below is skipped, every `auth()` caller gets `null`
          // instead of a half-populated user, and the session cookie is
          // cleared wherever the response can carry a Set-Cookie header.
          return null;
        }
        token.role = dbUser.role;
        token.mustSetPassword = dbUser.mustSetPassword;
      }

      return token;
    },
    session({ session, token }) {
      session.user.role = token.role as Role;
      session.user.employeeId = token.employeeId as string;
      session.user.mustSetPassword = Boolean(token.mustSetPassword);
      return session;
    },
  },
});
