'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth, unstable_update } from '@/auth';
import { prisma } from '@/lib/db';
import { BCRYPT_ROUNDS, PILOT_DEFAULT_PASSWORD } from '@/lib/pilot-auth';

export type SetPasswordState = { error: string | null };

const schema = z
  .object({
    next: z.string().min(8, 'Password must be at least 8 characters.'),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    message: 'The two passwords do not match.',
  })
  .refine((v) => v.next !== PILOT_DEFAULT_PASSWORD, {
    message: 'Choose a password that is not the default.',
  });

export async function setPassword(
  _prev: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  const session = await auth();
  if (!session?.user) return { error: 'Not signed in.' };

  const parsed = schema.safeParse({
    next: String(formData.get('next') ?? ''),
    confirm: String(formData.get('confirm') ?? ''),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form.' };
  }

  const user = await prisma.user.findUnique({
    where: { employeeId: session.user.employeeId },
  });
  if (!user) return { error: 'Account not found.' };

  if (!user.mustSetPassword) {
    redirect('/');
  }

  const passwordHash = await bcrypt.hash(parsed.data.next, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustSetPassword: false,
      },
    }),
    prisma.activityLog.create({
      data: {
        actorId: session.user.employeeId,
        employeeId: session.user.employeeId,
        kind: 'PASSWORD_CHANGED',
        summary: 'Set a personal password on first sign-in',
      },
    }),
  ]);

  // Refresh the JWT in-place so middleware stops forcing /set-password —
  // no second sign-in.
  await unstable_update({
    user: { mustSetPassword: false },
  });

  redirect('/');
}
