import { getAcknowledgedCycleIds } from './acknowledgements';
import { prisma } from './db';
import {
  eligibleFromMonthIndex,
  eligibleMonthCount,
  getEmployeeCycleScores,
  maskOpenCycle,
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

  return {
    employee,
    points,
    monthsLogged: monthsLogged(scores, fromIndex),
    eligibleMonths,
    yearAverage: computeYearAverage(scores),
    latestLocked,
  };
}
