import type { CycleState } from '@prisma/client';
import { PROGRAMME_START } from './constants';
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

/** 1 = April of the fiscal year's start year, 12 = March of the next; a date on
 *  or before that April 1 clamps to 1, a date beyond the following March 31 to 12. */
function monthIndexOf(date: Date, fyStart: Date): number {
  if (date <= fyStart) return 1;
  const monthsSinceStart =
    (date.getFullYear() - fyStart.getFullYear()) * 12 + (date.getMonth() - fyStart.getMonth());
  return Math.min(12, Math.max(1, monthsSinceStart + 1));
}

/**
 * The single "when did this person's record actually start" answer, used
 * everywhere coverage is computed. Eligibility requires both the programme
 * to have started (see `PROGRAMME_START` in lib/constants.ts) and the person
 * to have joined — whichever of the two lands later in the fiscal year wins,
 * since neither clause can make a month eligible on its own. A February
 * joiner in a programme that started in August is eligible from February
 * (11), not August (5): they joined after the programme was already
 * running, so only their own join date is the binding constraint.
 */
export function eligibleFromMonthIndex(joinedOn: Date | null, fiscalYear: string): number {
  const [startYear] = fiscalYear.split('-').map(Number);
  const fyStart = new Date(startYear, 3, 1);
  const programmeIndex = monthIndexOf(PROGRAMME_START, fyStart);
  const joinedIndex = joinedOn ? monthIndexOf(joinedOn, fyStart) : 1;
  return Math.max(programmeIndex, joinedIndex);
}

/** How many of the fiscal year's twelve months this person is actually eligible for. */
export function eligibleMonthCount(fromIndex: number): number {
  return 12 - fromIndex + 1;
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

/**
 * Always all twelve slots, regardless of how many Cycle rows actually exist
 * for the fiscal year — a month before `fromIndex`, or one with no matching
 * Cycle row at all, renders `not-applicable` rather than being dropped, so
 * the year strip never silently shrinks.
 */
export function pointsFromCycleScores(scores: CycleScore[], fromIndex = 1): MonthPoint[] {
  const byMonthIndex = new Map(scores.map((s) => [s.monthIndex, s]));
  return FY_MONTHS.map((month, i) => {
    const monthIndex = i + 1;
    if (monthIndex < fromIndex) return { month, status: 'not-applicable' as const };
    const s = byMonthIndex.get(monthIndex);
    if (!s) return { month, status: 'not-applicable' as const };
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

export function monthsLogged(scores: CycleScore[], fromIndex = 1): number {
  return scores.filter((s) => s.monthIndex >= fromIndex && s.weightedScore !== null).length;
}

export function yearAverage(scores: CycleScore[]): number | null {
  const logged = scores.filter((s) => s.weightedScore !== null).map((s) => s.weightedScore as number);
  if (logged.length === 0) return null;
  return logged.reduce((a, b) => a + b, 0) / logged.length;
}
