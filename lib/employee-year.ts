import type { CycleState } from '@prisma/client';
import { now, PROGRAMME_START } from './constants';
import { deriveCycles } from './cycles';
import { prisma } from './db';
import { FY_MONTHS, type MonthPoint } from './types';

/** IST is +05:30 year-round; there is no daylight saving to account for. */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

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
 * Calendar year and month (1-12) of an instant, read in IST.
 *
 * Every scheduled date in this app is written against IST — see the ist()
 * helper in lib/cycles.ts — so the calendar month an instant falls in has to
 * be read in IST too, not in whatever zone the server happens to run in.
 * Shifting by the offset and then reading UTC parts is exact here because IST
 * has no daylight saving.
 */
function istParts(date: Date): { year: number; month: number } {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

/**
 * 1 = April of the fiscal year's start year, 12 = March of the next; a date
 * before that April clamps to 1, one beyond the following March to 12.
 *
 * This used to read date.getMonth()/getFullYear() straight off the instant and
 * compare against a locally-constructed April 1. Both are local-time
 * operations, and PROGRAMME_START is pinned to +05:30, so on any server west
 * of IST — a UTC host, which is what the deployment runs on — it localised
 * to 31 July and every eligibility figure shifted a month early: an
 * August-to-March programme measured as nine months instead of eight.
 */
function monthIndexOf(date: Date, fyStartYear: number): number {
  const { year, month } = istParts(date);
  // April of fyStartYear is index 1, so month 4 of that year is offset 0.
  const monthsSinceStart = (year - fyStartYear) * 12 + (month - 4);
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
  const programmeIndex = monthIndexOf(PROGRAMME_START, startYear);
  const joinedIndex = joinedOn ? monthIndexOf(joinedOn, startYear) : 1;
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
  const [rawCycles, submissions] = await Promise.all([
    prisma.cycle.findMany({
      where: { fiscalYear },
      orderBy: { monthIndex: 'asc' },
    }),
    prisma.submission.findMany({
      where: { employeeId, state: 'SUBMITTED', cycle: { fiscalYear } },
    }),
  ]);
  // State is derived from the clock, never read off the stored column — see
  // lib/cycles.ts. A month opens and locks on its own from here on.
  const cycles = deriveCycles(rawCycles, now());

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
 * Same shape as getEmployeeCycleScores, for many employees in one call — one
 * Cycle query and one Submission query total, not one pair per employee.
 * Every DB round trip to this Neon instance costs ~150-200ms, and opening
 * the *first* few concurrent connections a request needs costs seconds, not
 * milliseconds (that cost is paid once the pool has grown to size, not
 * again after) — so a manager's team of N reports calling
 * getEmployeeCycleScores once each, as getManagerTeam used to, was N
 * redundant identical Cycle queries and N-way concurrency for no reason.
 * Used by getManagerTeam.
 */
export async function getEmployeeCycleScoresBatch(
  employeeIds: string[],
  fiscalYear: string,
): Promise<{ scoresByEmployee: Map<string, CycleScore[]>; cycles: Awaited<ReturnType<typeof prisma.cycle.findMany>> }> {
  const [rawCycles, submissions] = await Promise.all([
    prisma.cycle.findMany({
      where: { fiscalYear },
      orderBy: { monthIndex: 'asc' },
    }),
    prisma.submission.findMany({
      where: { employeeId: { in: employeeIds }, state: 'SUBMITTED', cycle: { fiscalYear } },
    }),
  ]);
  const cycles = deriveCycles(rawCycles, now());

  const byEmployee = new Map<string, Map<string, (typeof submissions)[number]>>();
  for (const s of submissions) {
    if (!byEmployee.has(s.employeeId)) byEmployee.set(s.employeeId, new Map());
    byEmployee.get(s.employeeId)!.set(s.cycleId, s);
  }

  const scoresByEmployee = new Map<string, CycleScore[]>();
  for (const employeeId of employeeIds) {
    const byCycle = byEmployee.get(employeeId);
    scoresByEmployee.set(
      employeeId,
      cycles.map((cycle) => {
        const submission = byCycle?.get(cycle.id);
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
      }),
    );
  }

  return { scoresByEmployee, cycles };
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

/**
 * Eligible months that have actually begun — everything except the ones still
 * in the future.
 *
 * This is the denominator for anything an employee reads about their own
 * record. `eligibleMonthCount()` counts the whole remaining year, which is the
 * right base for "can this be rated yet" but the wrong one for "how am I
 * doing": in August of an August-to-March programme it turns a complete record
 * into "1 of 8", i.e. seven months the person appears to be missing but which
 * have not happened. Coverage against elapsed months reads 1 of 1.
 */
export function elapsedEligibleMonths(scores: CycleScore[], fromIndex = 1): number {
  return scores.filter((s) => s.monthIndex >= fromIndex && s.state !== 'FUTURE').length;
}

/** "August 2026" -> "August". Cycle labels carry the year; prose rarely wants it. */
export function monthNameOf(cycleLabel: string): string {
  return cycleLabel.split(' ')[0];
}

export function monthsLogged(scores: CycleScore[], fromIndex = 1): number {
  return scores.filter((s) => s.monthIndex >= fromIndex && s.weightedScore !== null).length;
}

export function yearAverage(scores: CycleScore[]): number | null {
  const logged = scores.filter((s) => s.weightedScore !== null).map((s) => s.weightedScore as number);
  if (logged.length === 0) return null;
  return logged.reduce((a, b) => a + b, 0) / logged.length;
}
