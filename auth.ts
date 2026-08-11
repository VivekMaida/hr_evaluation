import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import type { Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      role: Role;
      employeeId: string;
      /** True on the request where the account was just claimed. */
      justClaimed?: boolean;
    } & DefaultSession['user'];
  }
  interface User {
    role: Role;
    employeeId: string;
    justClaimed?: boolean;
  }
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const BCRYPT_ROUNDS = 12;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  trustHost: true,

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
        if (!user) return null;

        let justClaimed = false;

        if (user.passwordHash === null) {
          // First login: the person chooses their own password and the account
          // is theirs from here. Whoever signs in first claims it — acceptable
          // for a closed pilot on an invite-only list, not for general rollout.
          const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash, mustSetPassword: false, lastLoginAt: new Date() },
          });
          justClaimed = true;
        } else {
          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) return null;
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.employee.name,
          role: user.role,
          employeeId: user.employeeId,
          justClaimed,
        };
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.employeeId = user.employeeId;
        token.justClaimed = user.justClaimed;
      }
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role as Role;
      session.user.employeeId = token.employeeId as string;
      session.user.justClaimed = token.justClaimed as boolean | undefined;
      return session;
    },
  },
});
