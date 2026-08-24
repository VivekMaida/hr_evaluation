import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { FISCAL_YEAR, now } from '@/lib/constants';
import { deriveCycles } from '@/lib/cycles';
import { prisma } from '@/lib/db';
import { resolveReopen } from '@/lib/corrections';
import { blockers, buildRows, lockedMonthMessage, weightedScoreOf } from '@/lib/entries';
import { parseTemplate, validate, type AcceptedRow, type UploadReport } from '@/lib/upload';
import { getUploadScope } from '@/lib/upload-subjects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* ---------------------------------------------------------------------------
   Validate a filled template, and — only on a second, explicit call — commit
   it.

   `commit: false` parses and validates and writes nothing. `commit: true`
   parses and validates *again*, against freshly read data, and writes exactly
   what that second pass accepts. The report goes back either way, so the
   confirmation screen shows what actually happened rather than what was
   predicted a minute earlier: if the month locked, or a KRA set changed, or
   someone else submitted in between, the second report says so and those rows
   are not written.

   There is deliberately no endpoint that writes without producing a report.
   --------------------------------------------------------------------------- */

const body = z.object({
  csv: z.string().min(1).max(2_000_000),
  fileName: z.string().max(255).default('upload.csv'),
  commit: z.boolean().default(false),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  if (session.user.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Not yours to log' }, { status: 403 });
  }

  const parsedBody = body.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const { csv, fileName, commit } = parsedBody.data;

  const cycles = deriveCycles(
    await prisma.cycle.findMany({ where: { fiscalYear: FISCAL_YEAR }, orderBy: { monthIndex: 'asc' } }),
    now(),
  );
  // The month being written is whichever is open, exactly as the form decides
  // it — an upload cannot pick a different month than the screen shows. When
  // nothing is open, the month the manager was working on is the one that has
  // just locked; answering about that one lets the refusal below name a real
  // month and point at corrections, instead of a bare "no cycle is open".
  const openCycle = cycles.find((c) => c.state === 'OPEN') ?? null;
  const lastLocked =
    cycles
      .filter((c) => c.state === 'LOCKED')
      .sort((a, b) => b.monthIndex - a.monthIndex)[0] ?? null;
  const cycle = openCycle ?? lastLocked;

  if (!cycle) {
    return NextResponse.json({ error: 'No cycle is open for entry.' }, { status: 409 });
  }

  const parsed = parseTemplate(csv);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 422 });
  }

  const scope = await getUploadScope(session.user, FISCAL_YEAR, cycle);

  // The lock refuses the whole upload before any row is considered, with the
  // same message and the same 409 the form API gives — uploading is not a way
  // around a closed month. Individually reopened months are the exception the
  // corrections flow already grants, and those rows are allowed through.
  if (scope.lockedForEveryone) {
    return NextResponse.json(
      { error: lockedMonthMessage(cycle.label, cycle.state), correctionsHref: '/corrections' },
      { status: 409 },
    );
  }

  const report = validate(parsed.rows, scope);

  if (!commit) {
    return NextResponse.json({
      stage: 'validated',
      cycle: { id: cycle.id, label: cycle.label, monthIndex: cycle.monthIndex },
      ...report,
    });
  }

  const committed = await commitAccepted(report, scope, cycle, session.user.employeeId);

  await prisma.uploadBatch.create({
    data: {
      cycleId: cycle.id,
      fileName,
      uploadedById: session.user.employeeId,
      rowsTotal: parsed.rows.length,
      rowsCommitted: report.accepted.length,
      rowsRejected: report.rejected.length,
      rejections: report.rejected.length > 0 ? report.rejected : undefined,
      committedAt: new Date(),
    },
  });

  return NextResponse.json({
    stage: 'committed',
    cycle: { id: cycle.id, label: cycle.label, monthIndex: cycle.monthIndex },
    ...report,
    committed,
  });
}

export type CommittedEmployee = {
  employeeId: string;
  employeeName: string;
  rowsWritten: number;
  submitted: boolean;
  weightedScore: number | null;
};

/**
 * Writes the accepted rows, one transaction per employee, using the same
 * upsert / supersede / activity-log shape as the form's POST — a month
 * committed here is indistinguishable in the record from one typed in, except
 * that its Submission carries source UPLOAD.
 */
async function commitAccepted(
  report: UploadReport,
  scope: Awaited<ReturnType<typeof getUploadScope>>,
  cycle: { id: string; label: string; state: string },
  actorId: string,
): Promise<CommittedEmployee[]> {
  const byEmployee = new Map<string, AcceptedRow[]>();
  for (const row of report.accepted) {
    byEmployee.set(row.employeeId, [...(byEmployee.get(row.employeeId) ?? []), row]);
  }

  const committed: CommittedEmployee[] = [];

  for (const [employeeId, rows] of byEmployee) {
    const subject = scope.subjects.get(employeeId);
    if (!subject) continue;

    const outcome = report.employees.find((e) => e.employeeId === employeeId);
    const willSubmit = outcome?.willSubmit ?? false;

    // The score is recomputed from the merged month, not from the uploaded
    // rows alone — see outcomes() in lib/upload.ts.
    const merged = new Map(subject.existing.map((e) => [e.kpiId, e]));
    for (const row of rows) {
      merged.set(row.kpiId, { kpiId: row.kpiId, actual: row.actual, contextNote: row.contextNote });
    }
    const built = buildRows(subject.kpis, [...merged.values()]);
    const score = weightedScoreOf(built);
    const check = blockers(built);
    const submit = willSubmit && !check.blocked;

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const achievement = built.find((b) => b.kpiId === row.kpiId)?.achievement ?? null;
        await tx.monthlyEntry.upsert({
          where: { kpiId_cycleId: { kpiId: row.kpiId, cycleId: cycle.id } },
          update: {
            actual: row.actual,
            contextNote: row.contextNote,
            achievement,
            updatedById: actorId,
          },
          create: {
            employeeId,
            cycleId: cycle.id,
            kpiId: row.kpiId,
            actual: row.actual,
            contextNote: row.contextNote,
            achievement,
            updatedById: actorId,
          },
        });
      }

      const existing = await tx.submission.findFirst({
        where: { employeeId, cycleId: cycle.id, state: { in: ['DRAFT', 'SUBMITTED'] } },
      });

      if (submit) {
        if (existing?.state === 'SUBMITTED') {
          await tx.submission.update({ where: { id: existing.id }, data: { state: 'SUPERSEDED' } });
          await tx.submission.create({
            data: {
              employeeId,
              cycleId: cycle.id,
              weightedScore: score,
              state: 'SUBMITTED',
              source: 'UPLOAD',
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
              source: 'UPLOAD',
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
              source: 'UPLOAD',
              submittedAt: new Date(),
              submittedById: actorId,
            },
          });
        }
      } else if (existing) {
        if (existing.state === 'DRAFT') {
          await tx.submission.update({
            where: { id: existing.id },
            data: { weightedScore: score, source: 'UPLOAD' },
          });
        }
      } else {
        await tx.submission.create({
          data: {
            employeeId,
            cycleId: cycle.id,
            weightedScore: score,
            state: 'DRAFT',
            source: 'UPLOAD',
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
            ? `${cycle.label} submitted from a spreadsheet${score === null ? '' : `, ${score.toFixed(1)}`}`
            : `${cycle.label} draft saved from a spreadsheet`,
          meta: { weightedScore: score, rowCount: rows.length, source: 'UPLOAD' },
        },
      });
    });

    // Submitting a reopened month is the correction, exactly as on the form.
    if (submit && cycle.state !== 'OPEN') {
      await resolveReopen(employeeId, cycle.id);
      await prisma.activityLog.create({
        data: {
          actorId,
          employeeId,
          cycleId: cycle.id,
          kind: 'CORRECTION_APPLIED',
          summary: `${cycle.label} corrected and resubmitted from a spreadsheet${
            score === null ? '' : `, ${score.toFixed(1)}`
          }`,
          meta: { weightedScore: score, source: 'UPLOAD' },
        },
      });
    }

    committed.push({
      employeeId,
      employeeName: subject.name,
      rowsWritten: rows.length,
      submitted: submit,
      weightedScore: score,
    });
  }

  return committed.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}
