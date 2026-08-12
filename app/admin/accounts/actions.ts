'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { BCRYPT_ROUNDS, PILOT_DEFAULT_PASSWORD } from '@/lib/pilot-auth';

export type ResetState = { error: string | null; message: string | null };

const schema = z.object({ employeeId: z.string().min(1) });

/**
 * Puts an account back on the shared pilot default password and forces
 * /set-password on their next sign-in.
 *
 * There is no email infrastructure in the pilot, so reset is HR-initiated by
 * design — HR resets it, tells the person the default password in person, the
 * person signs in and immediately picks their own.
 */
export async function resetPassword(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const session = await auth();
  if (!session?.user) return { error: 'Not signed in.', message: null };
  if (session.user.role !== 'HR') {
    return { error: 'Only HR can reset a password.', message: null };
  }

  const parsed = schema.safeParse({ employeeId: String(formData.get('employeeId') ?? '') });
  if (!parsed.success) return { error: 'Bad request.', message: null };

  const user = await prisma.user.findUnique({
    where: { employeeId: parsed.data.employeeId },
    include: { employee: { select: { name: true } } },
  });
  if (!user) return { error: 'No such account.', message: null };

  const passwordHash = await bcrypt.hash(PILOT_DEFAULT_PASSWORD, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustSetPassword: true },
    }),
    prisma.activityLog.create({
      data: {
        actorId: session.user.employeeId,
        employeeId: user.employeeId,
        kind: 'PASSWORD_RESET',
        summary: `Password reset by ${session.user.name ?? 'HR'}`,
        meta: { email: user.email },
      },
    }),
  ]);

  revalidatePath('/admin/accounts');
  return {
    error: null,
    message: `${user.employee.name}'s password is back to the default (${PILOT_DEFAULT_PASSWORD}). Tell them directly — they'll be asked to choose their own the moment they sign in.`,
  };
}
