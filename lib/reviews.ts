import { getContextNotes, type ContextNote } from './context-notes';
import { FISCAL_YEAR, FY_LABEL } from './constants';
import { prisma } from './db';
import {
  eligibleFromMonthIndex,
  eligibleMonthCount,
  getEmployeeCycleScores,
  monthsLogged as countMonthsLogged,
  pointsFromCycleScores,
  yearAverage as computeYearAverage,
} from './employee-year';
import { consistency, halves, trend } from './score';
import { coverageBand, consistencyLabel, trendLabel, type CoverageBand } from './scorecard';
import type { MonthPoint } from './types';

/* ---------------------------------------------------------------------------
   Reviews — the annual figure.

   This is not a year-end step. There is no draft, no submission and no
   sign-off: the aggregate *is* the rating, recomputed from whatever months
   have locked so far every time the screen is opened. A manager looking in
   November sees the year to date; the same screen in March simply has more
   months in it.

   Consequently nothing here reads or writes AnnualReview. The rating cannot
   drift from the record because it is never stored separately from it.
   --------------------------------------------------------------------------- */

export type Band = {
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
  from: number;
  /** null means open-ended at the top. */
  to: number | null;
  range: string;
};

export const BANDS: Band[] = [
  { value: 1, label: 'Below expectations', from: -Infinity, to: 69.999, range: 'Under 70' },
  { value: 2, label: 'Partially meets', from: 70, to: 84.999, range: '70 – 84' },
  { value: 3, label: 'Meets expectations', from: 85, to: 99.999, range: '85 – 99' },
  { value: 4, label: 'Exceeds expectations', from: 100, to: 114.999, range: '100 – 114' },
  { value: 5, label: 'Outstanding', from: 115, to: null, range: '115 and above' },
];

/** The band the record itself lands in. With no year-end override, this is the rating. */
export function bandFor(yearAverage: number): Band {
  return (
    BANDS.find((b) => yearAverage >= b.from && (b.to === null || yearAverage <= b.to)) ?? BANDS[0]
  );
}

export type { ContextNote };

export type ReviewSubject = {
  id: string;
  name: string;
  identity: string;
  points: MonthPoint[];
  monthsLogged: number;
  /** How many of the twelve months this person is actually eligible for — see eligibleFromMonthIndex(). */
  eligibleMonths: number;
  /** Mean of the logged months only — never a projection over the eligible ones. */
  yearAverage: number;
  /** The band `yearAverage` falls in. The rating, as things stand. */
  band: Band;

  /* The aggregate, recomputed on every read. */
  consistencySd: number | null;
  consistency: string;
  trendDelta: number | null;
  trend: string;
  trendHalves: { first: number; second: number } | null;
  coverage: CoverageBand;
  lowest: number | null;
  highest: number | null;

  /**
   * The basis, made explicit so nobody reads the figure as a full-year one.
   * `includedMonths` are exactly the months in `yearAverage`; `pendingMonths`
   * are eligible months that have not been logged (open, missed or still to
   * come) and are in nothing.
   */
  includedMonths: string[];
  pendingMonths: string[];
  /** True while months remain that could still change the figure. */
  stillAccruing: boolean;

  contextNotes: ContextNote[];
  evidence: {
    monthsLogged: string;
    contextNotes: number;
    above120: number;
    below70: number;
  };
};

export type ReviewData = {
  employee: { id: string; name: string; title: string };
  /** null means the employee exists but no month has been logged yet. */
  subject: ReviewSubject | null;
};

/** Short month label — "August 2026" becomes "Aug". */
function shortMonth(label: string): string {
  return label.split(' ')[0]?.slice(0, 3) ?? label;
}

/** Returns null only when the employee does not exist. */
export async function getReviewData(employeeId: string): Promise<ReviewData | null> {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return null;

  const base = { id: employee.id, name: employee.name, title: employee.title };

  const fromIndex = eligibleFromMonthIndex(employee.joinedOn, FISCAL_YEAR);
  const eligibleMonths = eligibleMonthCount(fromIndex);

  const scores = await getEmployeeCycleScores(employeeId, FISCAL_YEAR);
  const eligible = scores.filter((s) => s.monthIndex >= fromIndex);
  const months = countMonthsLogged(scores, fromIndex);
  if (months === 0) return { employee: base, subject: null };

  const points = pointsFromCycleScores(scores, fromIndex);
  const average = computeYearAverage(scores) as number;

  const logged = eligible.filter((s) => s.weightedScore !== null);
  const above120 = logged.filter((s) => (s.weightedScore as number) > 120).length;
  const below70 = logged.filter((s) => (s.weightedScore as number) < 70).length;
  const loggedValues = logged.map((s) => s.weightedScore as number);

  const contextNotes = await getContextNotes(employeeId, FISCAL_YEAR);

  const sd = consistency(points);
  const delta = trend(points);

  const subject: ReviewSubject = {
    id: employee.id,
    name: employee.name,
    identity: `${employee.title} · ${employee.id}`,
    points,
    monthsLogged: months,
    eligibleMonths,
    yearAverage: average,
    band: bandFor(average),

    consistencySd: sd,
    consistency: consistencyLabel(sd, months),
    trendDelta: delta,
    trend: trendLabel(delta),
    trendHalves: halves(points),
    coverage: coverageBand(months, eligibleMonths),
    lowest: loggedValues.length ? Math.min(...loggedValues) : null,
    highest: loggedValues.length ? Math.max(...loggedValues) : null,

    includedMonths: logged.map((s) => shortMonth(s.label)),
    pendingMonths: eligible.filter((s) => s.weightedScore === null).map((s) => shortMonth(s.label)),
    stillAccruing: months < eligibleMonths,

    contextNotes,
    evidence: {
      monthsLogged: `${months} of ${eligibleMonths}`,
      contextNotes: contextNotes.length,
      above120,
      below70,
    },
  };

  return { employee: base, subject };
}

/** Header chrome — the fiscal year, not a submission deadline. */
export const REVIEW_CONTEXT = {
  cycle: `Annual figure ${FY_LABEL}`,
};
