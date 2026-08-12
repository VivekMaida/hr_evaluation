import type { CycleState } from '@prisma/client';
import { prisma } from './db';
import { FY_MONTHS, type MonthPoint } from './types';

/** One fiscal year's twelve cycles for one employee, scores where submitted. */
export type CycleScore = {
  cycleId: string;
  monthIndex: number;
  label: string;
  state: CycleState;
  weightedScore: number | null;
  submittedAt: Date | null;
};

/** Prior fiscal year in the same "2025-26" shape, for looking up last year's rating. */
export function priorFiscalYear(fiscalYear: string): string {
  const [start, end] = fiscalYear.split('-').map(Number);
  return `${start - 1}-${String((end - 1 + 100) % 100).padStart(2, '0')}`;
}

/**
 * All twelve cycles for the year, joined to whatever this employee has
 * actually submitted. A cycle with no submission — locked or open — carries
 * a null score; nothing here is invented.
 */
export async function getEmployeeCycleScores(
  employeeId: string,
  fiscalYear: string,
): Promise<CycleScore[]> {
  const [cycles, submissions] = await Promise.all([
    prisma.cycle.findMany({
      where: { fiscalYear },
      orderBy: { monthIndex: 'asc' },
    }),
    prisma.submission.findMany({
      where: { employeeId, state: 'SUBMITTED', cycle: { fiscalYear } },
    }),
  ]);

  const byCycle = new Map(submissions.map((s) => [s.cycleId, s]));

  return cycles.map((cycle) => {
    const submission = byCycle.get(cycle.id);
    return {
      cycleId: cycle.id,
      monthIndex: cycle.monthIndex,
      label: cycle.label,
      state: cycle.state,
      weightedScore:
        submission?.weightedScore === undefined || submission.weightedScore === null
          ? null
          : Number(submission.weightedScore),
      submittedAt: submission?.submittedAt ?? null,
    };
  });
}

/** Same "always all twelve slots" convention as lib/data.ts's buildYear, driven by real Cycle.state. */
export function pointsFromCycleScores(scores: CycleScore[]): MonthPoint[] {
  return scores.map((s) => {
    const month = FY_MONTHS[s.monthIndex - 1];
    if (s.state === 'FUTURE') return { month, status: 'future' as const };
    if (s.weightedScore !== null) return { month, status: 'scored' as const, score: s.weightedScore };
    return { month, status: s.state === 'OPEN' ? ('open' as const) : ('not-logged' as const) };
  });
}

/**
 * For the employee self-service 'after-lock' visibility policy: discards
 * whatever the still-open cycle carries, real or not, so it reads as not yet
 * available rather than showing a manager's in-progress or just-submitted
 * number. The caller decides whether that policy applies — this is generic
 * and used by other callers (Profile, LeadHome, TeamRail) that must never
 * have it applied.
 */
export function maskOpenCycle(scores: CycleScore[]): CycleScore[] {
  return scores.map((s) => (s.state === 'OPEN' ? { ...s, weightedScore: null, submittedAt: null } : s));
}

export function monthsLogged(scores: CycleScore[]): number {
  return scores.filter((s) => s.weightedScore !== null).length;
}

export function yearAverage(scores: CycleScore[]): number | null {
  const logged = scores.filter((s) => s.weightedScore !== null).map((s) => s.weightedScore as number);
  if (logged.length === 0) return null;
  return logged.reduce((a, b) => a + b, 0) / logged.length;
}
