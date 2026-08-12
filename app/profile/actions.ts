'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

const BCRYPT_ROUNDS = 12;

export type PasswordState = { error: string | null; ok: boolean };

const schema = z
  .object({
    current: z.string(),
    next: z.string().min(8, 'New password must be at least 8 characters.'),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    message: 'The two new passwords do not match.',
  });

/** Voluntary self-service change — distinct from the forced first-login flow at /set-password. */
export async function changePassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const session = await auth();
  if (!session?.user) return { error: 'Not signed in.', ok: false };

  const parsed = schema.safeParse({
    current: String(formData.get('current') ?? ''),
    next: String(formData.get('next') ?? ''),
    confirm: String(formData.get('confirm') ?? ''),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form.', ok: false };
  }

  const user = await prisma.user.findUnique({
    where: { employeeId: session.user.employeeId },
  });
  if (!user) return { error: 'Account not found.', ok: false };

  if (user.passwordHash !== null) {
    const ok = await bcrypt.compare(parsed.data.current, user.passwordHash);
    if (!ok) return { error: 'Current password is not correct.', ok: false };
  }

  if (user.passwordHash && (await bcrypt.compare(parsed.data.next, user.passwordHash))) {
    return { error: 'That is already your password.', ok: false };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(parsed.data.next, BCRYPT_ROUNDS),
        mustSetPassword: false,
      },
    }),
    prisma.activityLog.create({
      data: {
        actorId: session.user.employeeId,
        employeeId: session.user.employeeId,
        kind: 'PASSWORD_CHANGED',
        summary: 'Changed their own password',
      },
    }),
  ]);

  revalidatePath('/profile');
  return { error: null, ok: true };
}
