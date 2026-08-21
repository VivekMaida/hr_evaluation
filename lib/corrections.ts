import type { RequestState } from '@prisma/client';
import { FISCAL_YEAR, now } from './constants';
import { deriveCycles } from './cycles';
import { prisma } from './db';

/* ---------------------------------------------------------------------------
   Correction requests — the only way a locked month can be changed.

   A manager raises one against a report's locked month with a reason; HR
   approves or declines, also with a reason. An approved request reopens that
   month for that one employee until the corrected month is resubmitted,
   which resolves the request and re-locks it.

   `getActiveReopen()` is the single authority on "is this month writable for
   this person right now" — the entries API asks it, and nothing else decides.
   --------------------------------------------------------------------------- */

export type ActiveReopen = {
  correctionId: string;
  reason: string;
  approvedAtLabel: string;
};

function dateLabel(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * The approved, unresolved correction that currently reopens this month for
 * this employee — or null if there isn't one. A locked month is writable only
 * while this returns non-null.
 */
export async function getActiveReopen(
  employeeId: string,
  cycleId: string,
): Promise<ActiveReopen | null> {
  const row = await prisma.correctionRequest.findFirst({
    where: { employeeId, cycleId, state: 'APPROVED', resolvedAt: null },
    orderBy: { decidedAt: 'desc' },
  });
  if (!row) return null;
  return {
    correctionId: row.id,
    reason: row.reason,
    approvedAtLabel: row.decidedAt ? dateLabel(row.decidedAt) : '—',
  };
}

/**
 * Every cycle this employee currently has reopened. Used by the record views
 * to mark a month as reopened without a query per month.
 */
export async function getReopenedCycleIds(employeeId: string): Promise<Set<string>> {
  const rows = await prisma.correctionRequest.findMany({
    where: { employeeId, state: 'APPROVED', resolvedAt: null },
    select: { cycleId: true },
  });
  return new Set(rows.map((r) => r.cycleId));
}

/**
 * Cycles that have ever been reopened and corrected for this employee. Kept
 * distinct from the set above: once a correction is resolved the month is
 * locked again, but the fact that it was corrected is part of the record and
 * stays visible.
 */
export async function getCorrectedCycleIds(employeeId: string): Promise<Set<string>> {
  const rows = await prisma.correctionRequest.findMany({
    where: { employeeId, state: 'APPROVED', resolvedAt: { not: null } },
    select: { cycleId: true },
  });
  return new Set(rows.map((r) => r.cycleId));
}

/**
 * Marks any reopen for this employee's month as resolved. Called from the
 * entries API the moment a reopened month is resubmitted — that submission is
 * the correction, so the month re-locks immediately rather than staying open.
 */
export async function resolveReopen(employeeId: string, cycleId: string): Promise<void> {
  await prisma.correctionRequest.updateMany({
    where: { employeeId, cycleId, state: 'APPROVED', resolvedAt: null },
    data: { resolvedAt: new Date() },
  });
}

export type CorrectionItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  cycleId: string;
  cycleLabel: string;
  reason: string;
  raisedByName: string;
  raisedAtLabel: string;
  state: RequestState;
  decisionNote: string | null;
  decidedByName: string | null;
  decidedAtLabel: string | null;
  /** True while this approved request still has the month open. */
  reopenInForce: boolean;
};

type CorrectionRow = Awaited<ReturnType<typeof prisma.correctionRequest.findMany>>[number];

async function toItems(rows: CorrectionRow[]): Promise<CorrectionItem[]> {
  if (rows.length === 0) return [];

  const personIds = Array.from(
    new Set([
      ...rows.map((r) => r.employeeId),
      ...rows.map((r) => r.raisedById),
      ...rows.map((r) => r.decidedById).filter((id): id is string => Boolean(id)),
    ]),
  );
  const [people, cycles] = await Promise.all([
    prisma.employee.findMany({ where: { id: { in: personIds } }, select: { id: true, name: true } }),
    prisma.cycle.findMany({ where: { id: { in: rows.map((r) => r.cycleId) } } }),
  ]);
  const nameById = new Map(people.map((p) => [p.id, p.name]));
  const cycleById = new Map(cycles.map((c) => [c.id, c]));

  return rows.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    employeeName: nameById.get(r.employeeId) ?? r.employeeId,
    cycleId: r.cycleId,
    cycleLabel: cycleById.get(r.cycleId)?.label ?? '—',
    reason: r.reason,
    raisedByName: nameById.get(r.raisedById) ?? r.raisedById,
    raisedAtLabel: dateLabel(r.raisedAt),
    state: r.state,
    decisionNote: r.decisionNote,
    decidedByName: r.decidedById ? (nameById.get(r.decidedById) ?? r.decidedById) : null,
    decidedAtLabel: r.decidedAt ? dateLabel(r.decidedAt) : null,
    reopenInForce: r.state === 'APPROVED' && r.resolvedAt === null,
  }));
}

/** Everything awaiting an HR decision, oldest first. */
export async function getPendingCorrections(): Promise<CorrectionItem[]> {
  return toItems(
    await prisma.correctionRequest.findMany({ where: { state: 'PENDING' }, orderBy: { raisedAt: 'asc' } }),
  );
}

/** Recently decided requests, for HR's own audit view. */
export async function getDecidedCorrections(take = 20): Promise<CorrectionItem[]> {
  return toItems(
    await prisma.correctionRequest.findMany({
      where: { state: { in: ['APPROVED', 'REJECTED'] } },
      orderBy: { decidedAt: 'desc' },
      take,
    }),
  );
}

/** One manager's own requests across their team, newest first. */
export async function getCorrectionsRaisedBy(raisedById: string, take = 20): Promise<CorrectionItem[]> {
  return toItems(
    await prisma.correctionRequest.findMany({
      where: { raisedById },
      orderBy: { raisedAt: 'desc' },
      take,
    }),
  );
}

/** Requests against one employee, newest first — shown on their record. */
export async function getCorrectionsForEmployee(employeeId: string): Promise<CorrectionItem[]> {
  return toItems(
    await prisma.correctionRequest.findMany({ where: { employeeId }, orderBy: { raisedAt: 'desc' } }),
  );
}

export type CorrectableCycle = { id: string; label: string };

/**
 * The locked months a correction could be raised against, per employee —
 * locked by the clock, and not already waiting on a decision or reopened.
 * Batched: one Cycle query and one CorrectionRequest query for the whole
 * team, not a pair per report.
 */
export async function getCorrectableCyclesForEmployees(
  employeeIds: string[],
): Promise<Map<string, CorrectableCycle[]>> {
  const byEmployee = new Map<string, CorrectableCycle[]>();
  if (employeeIds.length === 0) return byEmployee;

  const [rawCycles, busyRows] = await Promise.all([
    prisma.cycle.findMany({ where: { fiscalYear: FISCAL_YEAR }, orderBy: { monthIndex: 'asc' } }),
    prisma.correctionRequest.findMany({
      where: {
        employeeId: { in: employeeIds },
        OR: [{ state: 'PENDING' }, { state: 'APPROVED', resolvedAt: null }],
      },
      select: { employeeId: true, cycleId: true },
    }),
  ]);

  const locked = deriveCycles(rawCycles, now()).filter((c) => c.state === 'LOCKED');
  const busyByEmployee = new Map<string, Set<string>>();
  for (const r of busyRows) {
    if (!busyByEmployee.has(r.employeeId)) busyByEmployee.set(r.employeeId, new Set());
    busyByEmployee.get(r.employeeId)!.add(r.cycleId);
  }

  for (const employeeId of employeeIds) {
    const busy = busyByEmployee.get(employeeId) ?? new Set<string>();
    byEmployee.set(
      employeeId,
      locked.filter((c) => !busy.has(c.id)).map((c) => ({ id: c.id, label: c.label })),
    );
  }
  return byEmployee;
}

/** Single-employee convenience over getCorrectableCyclesForEmployees. */
export async function getCorrectableCycles(employeeId: string): Promise<CorrectableCycle[]> {
  return (await getCorrectableCyclesForEmployees([employeeId])).get(employeeId) ?? [];
}
