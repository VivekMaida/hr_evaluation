'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { canAccessEmployee } from '@/lib/access';
import { now } from '@/lib/constants';
import { deriveCycle } from '@/lib/cycles';
import { prisma } from '@/lib/db';

export type CorrectionState = { error: string | null; ok: boolean };

const REASON_MIN = 20;

const raiseSchema = z.object({
  employeeId: z.string().min(1, 'Choose whose month needs correcting.'),
  cycleId: z.string().min(1, 'Choose which month needs correcting.'),
  reason: z
    .string()
    .trim()
    .min(REASON_MIN, `Give a reason of at least ${REASON_MIN} characters — it goes on the record.`)
    .max(2000),
});

/**
 * A manager asking for one of their reports' locked months to be reopened.
 * Write access is checked with canAccessEmployee, so a manager can only ever
 * raise one against their own direct report and never against themselves; HR
 * may raise one for anyone.
 */
export async function raiseCorrection(
  _prev: CorrectionState,
  formData: FormData,
): Promise<CorrectionState> {
  const session = await auth();
  if (!session?.user) return { error: 'Not signed in.', ok: false };

  const parsed = raiseSchema.safeParse({
    employeeId: String(formData.get('employeeId') ?? ''),
    cycleId: String(formData.get('cycleId') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form.', ok: false };
  }
  const { employeeId, cycleId, reason } = parsed.data;

  if (!(await canAccessEmployee(session.user, employeeId, true))) {
    return { error: "That isn't someone whose record you can correct.", ok: false };
  }

  const rawCycle = await prisma.cycle.findUnique({ where: { id: cycleId } });
  if (!rawCycle) return { error: 'No such month.', ok: false };
  const cycle = deriveCycle(rawCycle, now());

  // Only a locked month needs a correction request — an open one can just be
  // edited, and a future one has nothing in it to correct.
  if (cycle.state !== 'LOCKED') {
    return {
      error: `${cycle.label} is ${cycle.state.toLowerCase()}, not locked — no correction request is needed.`,
      ok: false,
    };
  }

  const existing = await prisma.correctionRequest.findFirst({
    where: {
      employeeId,
      cycleId,
      OR: [{ state: 'PENDING' }, { state: 'APPROVED', resolvedAt: null }],
    },
  });
  if (existing) {
    return {
      error:
        existing.state === 'PENDING'
          ? `A request for ${cycle.label} is already waiting on HR.`
          : `${cycle.label} is already reopened — edit it in the Performance Log.`,
      ok: false,
    };
  }

  await prisma.$transaction([
    prisma.correctionRequest.create({
      data: { employeeId, cycleId, reason, raisedById: session.user.employeeId, state: 'PENDING' },
    }),
    prisma.activityLog.create({
      data: {
        actorId: session.user.employeeId,
        employeeId,
        cycleId,
        kind: 'CORRECTION_REQUESTED',
        summary: `Correction requested for ${cycle.label}`,
        meta: { reason },
      },
    }),
  ]);

  revalidatePath('/corrections');
  revalidatePath(`/scorecard/${employeeId}`);
  return { error: null, ok: true };
}

const decideSchema = z.object({
  correctionId: z.string().min(1),
  decision: z.enum(['APPROVED', 'REJECTED']),
  decisionNote: z
    .string()
    .trim()
    .min(REASON_MIN, `Give a reason of at least ${REASON_MIN} characters — it goes on the record.`)
    .max(2000),
});

/** HR approving or declining. A reason is required either way. */
export async function decideCorrection(
  _prev: CorrectionState,
  formData: FormData,
): Promise<CorrectionState> {
  const session = await auth();
  if (!session?.user) return { error: 'Not signed in.', ok: false };
  if (session.user.role !== 'HR') {
    return { error: 'Only HR can decide a correction request.', ok: false };
  }

  const parsed = decideSchema.safeParse({
    correctionId: String(formData.get('correctionId') ?? ''),
    decision: String(formData.get('decision') ?? ''),
    decisionNote: String(formData.get('decisionNote') ?? ''),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form.', ok: false };
  }
  const { correctionId, decision, decisionNote } = parsed.data;

  const request = await prisma.correctionRequest.findUnique({ where: { id: correctionId } });
  if (!request) return { error: 'No such request.', ok: false };
  if (request.state !== 'PENDING') {
    return { error: 'That request has already been decided.', ok: false };
  }

  const cycle = await prisma.cycle.findUnique({ where: { id: request.cycleId } });

  await prisma.$transaction([
    prisma.correctionRequest.update({
      where: { id: correctionId },
      data: {
        state: decision,
        decisionNote,
        decidedById: session.user.employeeId,
        decidedAt: new Date(),
      },
    }),
    prisma.activityLog.create({
      data: {
        actorId: session.user.employeeId,
        employeeId: request.employeeId,
        cycleId: request.cycleId,
        kind: decision === 'APPROVED' ? 'CORRECTION_APPROVED' : 'CORRECTION_REJECTED',
        summary:
          decision === 'APPROVED'
            ? `${cycle?.label ?? 'Month'} reopened for correction by ${session.user.name ?? 'HR'}`
            : `Correction for ${cycle?.label ?? 'month'} declined by ${session.user.name ?? 'HR'}`,
        meta: { decisionNote },
      },
    }),
  ]);

  revalidatePath('/corrections');
  revalidatePath('/performance-log');
  revalidatePath(`/scorecard/${request.employeeId}`);
  return { error: null, ok: true };
}
