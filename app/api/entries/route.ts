import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { canAccessEmployee } from '@/lib/access';
import { FISCAL_YEAR, now } from '@/lib/constants';
import { getActiveReopen, resolveReopen } from '@/lib/corrections';
import { deriveCycle } from '@/lib/cycles';
import { prisma } from '@/lib/db';
import { blockers, buildRows, lockedMonthMessage, weightedScoreOf } from '@/lib/entries';
import { getEmployeeCycleScores, pointsFromCycleScores } from '@/lib/employee-year';
import { getKpiSetForCycle } from '@/lib/kpi';

export const runtime = 'nodejs';
// Always hit the database; a cached month is a wrong month.
export const dynamic = 'force-dynamic';

const readQuery = z.object({
  employeeId: z.string().min(1),
  monthIndex: z.coerce.number().int().min(1).max(12),
});

const saveBody = z.object({
  employeeId: z.string().min(1),
  monthIndex: z.number().int().min(1).max(12),
  rows: z
    .array(
      z.object({
        kpiId: z.string().min(1),
        actual: z.number().finite().nullable(),
        contextNote: z.string().max(2000).nullable(),
      }),
    )
    .min(1),
  /** Draft save by default; true commits the month. */
  submit: z.boolean().default(false),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = readQuery.safeParse({
    employeeId: url.searchParams.get('employeeId'),
    monthIndex: url.searchParams.get('monthIndex'),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad request', detail: parsed.error.issues }, { status: 400 });
  }
  const { employeeId, monthIndex } = parsed.data;

  if (!(await canAccessEmployee(session.user, employeeId, false))) {
    return NextResponse.json({ error: 'Not your team' }, { status: 403 });
  }

  const [employee, rawCycle, kpis] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, title: true, leadId: true },
    }),
    prisma.cycle.findUnique({
      where: { fiscalYear_monthIndex: { fiscalYear: FISCAL_YEAR, monthIndex } },
    }),
    // The KPI set as it stood for *this* month specifically — not whichever
    // rows currently exist, which with effective-dated versions could be a
    // later (or not-yet-live) edit than what this month was actually scored
    // against.
    getKpiSetForCycle(employeeId, FISCAL_YEAR, monthIndex),
  ]);

  if (!employee || !rawCycle) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const cycle = deriveCycle(rawCycle, now());

  const [entries, submission, cycleScores, reopened] = await Promise.all([
    prisma.monthlyEntry.findMany({ where: { employeeId, cycleId: cycle.id } }),
    prisma.submission.findFirst({
      where: { employeeId, cycleId: cycle.id, state: { in: ['DRAFT', 'SUBMITTED'] } },
      orderBy: { updatedAt: 'desc' },
    }),
    getEmployeeCycleScores(employeeId, FISCAL_YEAR),
    cycle.state === 'OPEN' ? Promise.resolve(null) : getActiveReopen(employeeId, cycle.id),
  ]);

  const rows = buildRows(kpis, entries);

  return NextResponse.json({
    employee,
    cycle: { id: cycle.id, label: cycle.label, monthIndex: cycle.monthIndex, state: cycle.state },
    rows,
    weightedScore: weightedScoreOf(rows),
    ...blockers(rows),
    submission: submission
      ? {
          state: submission.state,
          weightedScore:
            submission.weightedScore === null ? null : Number(submission.weightedScore),
          submittedAt: submission.submittedAt,
        }
      : null,
    // A locked month is editable only while an approved correction reopens it.
    editable: cycle.state === 'OPEN' || Boolean(reopened),
    /** Set while this month is only writable because of an approved correction. */
    reopened: reopened ? { reason: reopened.reason, approvedAtLabel: reopened.approvedAtLabel } : null,
    /** This employee's real twelve-month record, Apr → Mar, for the side panel. */
    points: pointsFromCycleScores(cycleScores),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const parsed = saveBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad request', detail: parsed.error.issues }, { status: 400 });
  }
  const { employeeId, monthIndex, rows: input, submit } = parsed.data;

  if (!(await canAccessEmployee(session.user, employeeId, true))) {
    return NextResponse.json({ error: 'Not your team' }, { status: 403 });
  }

  const rawCycle = await prisma.cycle.findUnique({
    where: { fiscalYear_monthIndex: { fiscalYear: FISCAL_YEAR, monthIndex } },
  });
  if (!rawCycle) return NextResponse.json({ error: 'No such cycle' }, { status: 404 });
  const cycle = deriveCycle(rawCycle, now());

  // Locked months are read-only — unless HR has approved a correction request
  // for this employee and this month, which reopens it for them alone until
  // the corrected month is resubmitted. See lib/corrections.ts.
  const reopened = cycle.state === 'OPEN' ? null : await getActiveReopen(employeeId, cycle.id);
  if (cycle.state !== 'OPEN' && !reopened) {
    return NextResponse.json(
      { error: lockedMonthMessage(cycle.label, cycle.state) },
      { status: 409 },
    );
  }

  const kpis = await getKpiSetForCycle(employeeId, FISCAL_YEAR, monthIndex);
  const known = new Set(kpis.map((k) => k.id));
  const unknown = input.filter((r) => !known.has(r.kpiId));
  if (unknown.length > 0) {
    return NextResponse.json(
      { error: 'Unknown KPI in payload', kpiIds: unknown.map((r) => r.kpiId) },
      { status: 400 },
    );
  }

  const rows = buildRows(kpis, input);
  const score = weightedScoreOf(rows);
  const check = blockers(rows);

  if (submit && check.blocked) {
    return NextResponse.json(
      { error: 'Cannot submit yet', ...check, rows },
      { status: 422 },
    );
  }

  const actorId = session.user.employeeId;

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      await tx.monthlyEntry.upsert({
        where: { kpiId_cycleId: { kpiId: row.kpiId, cycleId: cycle.id } },
        update: {
          actual: row.actual,
          contextNote: row.contextNote,
          achievement: row.achievement,
          updatedById: actorId,
        },
        create: {
          employeeId,
          cycleId: cycle.id,
          kpiId: row.kpiId,
          actual: row.actual,
          contextNote: row.contextNote,
          achievement: row.achievement,
          updatedById: actorId,
        },
      });
    }

    const existing = await tx.submission.findFirst({
      where: { employeeId, cycleId: cycle.id, state: { in: ['DRAFT', 'SUBMITTED'] } },
    });

    if (submit) {
      // Supersede rather than overwrite, so what was claimed when survives.
      if (existing?.state === 'SUBMITTED') {
        await tx.submission.update({
          where: { id: existing.id },
          data: { state: 'SUPERSEDED' },
        });
        await tx.submission.create({
          data: {
            employeeId,
            cycleId: cycle.id,
            weightedScore: score,
            state: 'SUBMITTED',
            source: 'FORM',
            submittedAt: new Date(),
            submittedById: actorId,
            supersedesId: existing.id,
          },
        });
      } else if (existing) {
        await tx.submission.update({
          where: { id: existing.id },
          data: {
            weightedScore: score,
            state: 'SUBMITTED',
            submittedAt: new Date(),
            submittedById: actorId,
          },
        });
      } else {
        await tx.submission.create({
          data: {
            employeeId,
            cycleId: cycle.id,
            weightedScore: score,
            state: 'SUBMITTED',
            source: 'FORM',
            submittedAt: new Date(),
            submittedById: actorId,
          },
        });
      }
    } else if (existing) {
      if (existing.state === 'DRAFT') {
        await tx.submission.update({
          where: { id: existing.id },
          data: { weightedScore: score },
        });
      }
    } else {
      await tx.submission.create({
        data: {
          employeeId,
          cycleId: cycle.id,
          weightedScore: score,
          state: 'DRAFT',
          source: 'FORM',
        },
      });
    }

    await tx.activityLog.create({
      data: {
        actorId,
        employeeId,
        cycleId: cycle.id,
        kind: submit ? 'MONTH_SUBMITTED' : 'ENTRY_SAVED',
        summary: submit
          ? `${cycle.label} submitted${score === null ? '' : `, ${score.toFixed(1)}`}`
          : `${cycle.label} draft saved`,
        meta: { weightedScore: score, rowCount: rows.length },
      },
    });
  });

  // Submitting a reopened month *is* the correction, so the reopen ends here
  // and the month locks again. A draft save leaves it open to keep working.
  if (reopened && submit) {
    await resolveReopen(employeeId, cycle.id);
    await prisma.activityLog.create({
      data: {
        actorId,
        employeeId,
        cycleId: cycle.id,
        kind: 'CORRECTION_APPLIED',
        summary: `${cycle.label} corrected and resubmitted${score === null ? '' : `, ${score.toFixed(1)}`}`,
        meta: { correctionId: reopened.correctionId, weightedScore: score },
      },
    });
  }

  return NextResponse.json({
    ok: true,
    saved: rows.length,
    weightedScore: score,
    submitted: submit,
    /** Set while this month is only writable because of an approved correction. */
    reopened: reopened ? { reason: reopened.reason, approvedAtLabel: reopened.approvedAtLabel } : null,
    ...check,
    rows,
  });
}
