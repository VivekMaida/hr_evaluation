'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { now } from '@/lib/constants';
import { deriveCycle } from '@/lib/cycles';
import { prisma } from '@/lib/db';

export type ScorecardActionState = { error: string | null; ok: boolean };

/**
 * Self-only — an employee marking their own month as seen.
 *
 * Acknowledging is a courtesy marker, not a gate: it is never required, it
 * blocks nothing, and the month locks and counts toward the year whether or
 * not it is ever ticked. Nothing chases the employee for it.
 *
 * It is allowed on the open month as well as a locked one — all that is
 * required is a score to have seen. Restricting it to LOCKED made it
 * unreachable for a month still in progress, which is exactly when someone
 * would first look at their figure. There is deliberately no way to un-see a
 * month: disagreement goes through raiseQuery below, which keeps the question
 * and the manager's reply against that month.
 */
export async function acknowledgeMonth(
  _prev: ScorecardActionState,
  formData: FormData,
): Promise<ScorecardActionState> {
  const session = await auth();
  if (!session?.user) return { error: 'Not signed in.', ok: false };

  const cycleId = String(formData.get('cycleId') ?? '');
  if (!cycleId) return { error: 'Bad request.', ok: false };

  const employeeId = session.user.employeeId;

  const rawCycle = await prisma.cycle.findUnique({ where: { id: cycleId } });
  if (!rawCycle) return { error: 'No such cycle.', ok: false };
  const cycle = deriveCycle(rawCycle, now());
  if (cycle.state === 'FUTURE') {
    return { error: 'That month has not started yet.', ok: false };
  }

  // There has to be something to have seen. Without this an employee could
  // acknowledge a month that was never scored, which would read on the
  // manager's view as agreement with a figure that does not exist.
  const submission = await prisma.submission.findFirst({
    where: { employeeId, cycleId, state: 'SUBMITTED' },
    select: { id: true },
  });
  if (!submission) {
    return { error: 'That month has no score on record yet.', ok: false };
  }

  await prisma.$transaction([
    prisma.acknowledgement.upsert({
      where: { employeeId_cycleId: { employeeId, cycleId } },
      update: {},
      create: { employeeId, cycleId },
    }),
    prisma.activityLog.create({
      data: {
        actorId: employeeId,
        employeeId,
        cycleId,
        kind: 'MONTH_ACKNOWLEDGED',
        summary: `${cycle.label} acknowledged`,
      },
    }),
  ]);

  revalidatePath('/');
  revalidatePath('/scorecard');
  revalidatePath(`/scorecard/${employeeId}`);
  revalidatePath('/reviews');
  revalidatePath(`/reviews/${employeeId}`);
  revalidatePath(`/profile/${employeeId}`);
  return { error: null, ok: true };
}

const raiseQuerySchema = z.object({
  cycleId: z.string().min(1),
  question: z.string().trim().min(1, 'Enter a question.').max(2000),
});

/** Self-only. Routes to the employee's own manager, never to HR. */
export async function raiseQuery(
  _prev: ScorecardActionState,
  formData: FormData,
): Promise<ScorecardActionState> {
  const session = await auth();
  if (!session?.user) return { error: 'Not signed in.', ok: false };

  const parsed = raiseQuerySchema.safeParse({
    cycleId: String(formData.get('cycleId') ?? ''),
    question: String(formData.get('question') ?? ''),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form.', ok: false };

  const cycle = await prisma.cycle.findUnique({ where: { id: parsed.data.cycleId } });
  if (!cycle) return { error: 'No such cycle.', ok: false };

  const employeeId = session.user.employeeId;
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { leadId: true },
  });
  if (!employee?.leadId) {
    return { error: 'You have no manager on record to route this to.', ok: false };
  }

  await prisma.$transaction([
    prisma.monthQuery.create({
      data: { employeeId, cycleId: parsed.data.cycleId, question: parsed.data.question },
    }),
    prisma.activityLog.create({
      data: {
        actorId: employeeId,
        employeeId,
        cycleId: parsed.data.cycleId,
        kind: 'QUERY_RAISED',
        summary: `Query raised on ${cycle.label}`,
      },
    }),
  ]);

  revalidatePath('/scorecard');
  revalidatePath(`/scorecard/${employeeId}`);
  revalidatePath('/reviews');
  revalidatePath(`/reviews/${employeeId}`);
  return { error: null, ok: true };
}

const respondSchema = z.object({
  queryId: z.string().min(1),
  response: z.string().trim().min(1, 'Enter a response.').max(2000),
});

/** Manager-only, and only the employee's actual manager — not HR. */
export async function respondToQuery(
  _prev: ScorecardActionState,
  formData: FormData,
): Promise<ScorecardActionState> {
  const session = await auth();
  if (!session?.user) return { error: 'Not signed in.', ok: false };
  if (session.user.role !== 'MANAGER') {
    return { error: "Only this person's manager can respond.", ok: false };
  }

  const parsed = respondSchema.safeParse({
    queryId: String(formData.get('queryId') ?? ''),
    response: String(formData.get('response') ?? ''),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form.', ok: false };

  const query = await prisma.monthQuery.findUnique({
    where: { id: parsed.data.queryId },
    include: { employee: { select: { leadId: true } }, cycle: true },
  });
  if (!query) return { error: 'No such query.', ok: false };
  if (query.employee.leadId !== session.user.employeeId) {
    return { error: "Only this person's manager can respond.", ok: false };
  }

  await prisma.$transaction([
    prisma.monthQuery.update({
      where: { id: parsed.data.queryId },
      data: {
        response: parsed.data.response,
        state: 'ANSWERED',
        respondedById: session.user.employeeId,
        respondedAt: new Date(),
      },
    }),
    prisma.activityLog.create({
      data: {
        actorId: session.user.employeeId,
        employeeId: query.employeeId,
        cycleId: query.cycleId,
        kind: 'QUERY_ANSWERED',
        summary: `Query on ${query.cycle.label} answered by ${session.user.name ?? 'their manager'}`,
      },
    }),
  ]);

  revalidatePath(`/scorecard/${query.employeeId}`);
  revalidatePath(`/reviews/${query.employeeId}`);
  revalidatePath('/reviews');
  return { error: null, ok: true };
}
