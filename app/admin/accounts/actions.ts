'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export type ResetState = { error: string | null; message: string | null };

const schema = z.object({ employeeId: z.string().min(1) });

/**
 * Puts an account back into first-login state: the password is cleared and the
 * next person to sign in as that email sets a new one.
 *
 * There is no email infrastructure in the pilot, so reset is HR-initiated by
 * design — HR clears it, tells the person, the person picks a new password.
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

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: null, mustSetPassword: true },
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
    message: `${user.employee.name} can now set a new password by signing in.`,
  };
}
