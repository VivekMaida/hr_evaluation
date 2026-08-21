import { getAcknowledgedCycleIds } from './acknowledgements';
import { prisma } from './db';
import {
  eligibleFromMonthIndex,
  eligibleMonthCount,
  elapsedEligibleMonths,
  getEmployeeCycleScores,
  maskOpenCycle,
  monthNameOf,
  monthsLogged,
  yearAverage as computeYearAverage,
  pointsFromCycleScores,
} from './employee-year';
import { FY_MONTHS, type MonthKey, type MonthPoint } from './types';

/* ---------------------------------------------------------------------------
   Home's own-record view for an EMPLOYEE — the year strip, the headline
   numbers, and whichever locked month is the reason for the "now available"
   notification. Never used for a Manager or HR's own Home.
   --------------------------------------------------------------------------- */

export type EmployeeHomeData = {
  employee: { id: string; name: string };
  points: MonthPoint[];
  monthsLogged: number;
  /** How many of the twelve months this person is actually eligible for — see eligibleFromMonthIndex(). */
  eligibleMonths: number;
  /**
   * Eligible months that have already begun. Coverage an employee reads about
   * themselves is measured against this, not `eligibleMonths` — see
   * elapsedEligibleMonths().
   */
  elapsedMonths: number;
  /** Every month with a score, oldest first — the basis for the headline figures. */
  loggedMonths: { month: MonthKey; name: string; score: number }[];
  yearAverage: number | null;
  /** The most recently locked month, for the year-strip ring and the notification. */
  latestLocked: {
    cycleId: string;
    label: string;
    month: MonthKey;
    acknowledged: boolean;
  } | null;
};

/**
 * `maskOpenCycleData`: for the 'after-lock' visibility policy — see
 * lib/scorecard.ts's getScorecardData for the same option on the same terms.
 */
export async function getEmployeeHomeData(
  employeeId: string,
  fiscalYear: string,
  options: { maskOpenCycleData?: boolean } = {},
): Promise<EmployeeHomeData | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, name: true, joinedOn: true },
  });
  if (!employee) return null;

  const fromIndex = eligibleFromMonthIndex(employee.joinedOn, fiscalYear);
  const eligibleMonths = eligibleMonthCount(fromIndex);

  const rawScores = await getEmployeeCycleScores(employeeId, fiscalYear);
  const scores = options.maskOpenCycleData ? maskOpenCycle(rawScores) : rawScores;
  const points = pointsFromCycleScores(scores, fromIndex);

  const lockedScores = scores.filter((s) => s.monthIndex >= fromIndex && s.state === 'LOCKED');
  const latestLockedScore =
    lockedScores.length === 0
      ? null
      : lockedScores.reduce((a, b) => (a.monthIndex > b.monthIndex ? a : b));

  let latestLocked: EmployeeHomeData['latestLocked'] = null;
  if (latestLockedScore) {
    const acknowledgedIds = await getAcknowledgedCycleIds(employeeId);
    latestLocked = {
      cycleId: latestLockedScore.cycleId,
      label: latestLockedScore.label,
      month: FY_MONTHS[latestLockedScore.monthIndex - 1],
      acknowledged: acknowledgedIds.has(latestLockedScore.cycleId),
    };
  }

  const loggedMonths = scores
    .filter((s) => s.monthIndex >= fromIndex && s.weightedScore !== null)
    .sort((a, b) => a.monthIndex - b.monthIndex)
    .map((s) => ({
      month: FY_MONTHS[s.monthIndex - 1],
      name: monthNameOf(s.label),
      score: s.weightedScore as number,
    }));

  return {
    employee,
    points,
    monthsLogged: monthsLogged(scores, fromIndex),
    eligibleMonths,
    elapsedMonths: elapsedEligibleMonths(scores, fromIndex),
    loggedMonths,
    yearAverage: computeYearAverage(scores),
    latestLocked,
  };
}
