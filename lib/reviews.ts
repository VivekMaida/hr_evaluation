import type { ReviewState } from '@prisma/client';
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
import type { MonthPoint } from './types';

/* ---------------------------------------------------------------------------
   Reviews — the annual rating. Ratings appear here and nowhere else; every
   other surface deals in weighted achievement percentages.
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

export function impliedBand(yearAverage: number): Band {
  return (
    BANDS.find((b) => yearAverage >= b.from && (b.to === null || yearAverage <= b.to)) ??
    BANDS[0]
  );
}

/** A written justification is required at two bands or more from the record. */
export const JUSTIFICATION_MIN_CHARS = 40;

/**
 * Cohort chrome for the header — where this employee sits in the lead's
 * submission queue this cycle. Not wired to a roster count yet; still a
 * placeholder, but no longer the source of anyone's actual record.
 */
export const REVIEW_CONTEXT = {
  cycle: `Annual appraisal ${FY_LABEL}`,
  closes: 'lead submissions close Saturday, 24 April 2027',
  submitted: 2,
  total: 7,
  position: 'Employee 3 of 7',
};

export type { ContextNote };

export type ReviewSubject = {
  id: string;
  name: string;
  identity: string;
  points: MonthPoint[];
  monthsLogged: number;
  /** How many of the twelve months this person is actually eligible for — see eligibleFromMonthIndex(). */
  eligibleMonths: number;
  yearAverage: number;
  contextNotes: ContextNote[];
  evidence: {
    monthsLogged: string;
    contextNotes: number;
    above120: number;
    below70: number;
  };
};

/**
 * The lead's decision on this year's rating — separate from ReviewSubject,
 * which is the record the decision is made against. A missing AnnualReview
 * row reads the same as NOT_STARTED; nothing has been decided yet either way.
 */
export type ReviewRecord = {
  state: ReviewState;
  chosenBand: number | null;
  justification: string | null;
  reviewerComment: string | null;
  submittedAtLabel: string | null;
};

const NOT_STARTED: ReviewRecord = {
  state: 'NOT_STARTED',
  chosenBand: null,
  justification: null,
  reviewerComment: null,
  submittedAtLabel: null,
};

/** An employee's own rating is visible only once a lead (or HR) has finalized it. */
export function isFinalized(state: ReviewState): boolean {
  return state === 'SUBMITTED' || state === 'CALIBRATED';
}

export type ReviewData = {
  employee: { id: string; name: string; title: string };
  /** null means the employee exists but has nothing submitted yet. */
  subject: ReviewSubject | null;
  review: ReviewRecord;
};

/** Returns null only when the employee does not exist. */
export async function getReviewData(employeeId: string): Promise<ReviewData | null> {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return null;

  const annualReview = await prisma.annualReview.findUnique({
    where: { employeeId_fiscalYear: { employeeId, fiscalYear: FISCAL_YEAR } },
  });
  const review: ReviewRecord = annualReview
    ? {
        state: annualReview.state,
        chosenBand: annualReview.chosenBand,
        justification: annualReview.justification,
        reviewerComment: annualReview.reviewerComment,
        submittedAtLabel: annualReview.submittedAt
          ? annualReview.submittedAt.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : null,
      }
    : NOT_STARTED;

  const base = { id: employee.id, name: employee.name, title: employee.title };

  const fromIndex = eligibleFromMonthIndex(employee.joinedOn, FISCAL_YEAR);
  const eligibleMonths = eligibleMonthCount(fromIndex);

  const scores = await getEmployeeCycleScores(employeeId, FISCAL_YEAR);
  const months = countMonthsLogged(scores, fromIndex);
  if (months === 0) return { employee: base, subject: null, review };

  const points = pointsFromCycleScores(scores, fromIndex);
  const average = computeYearAverage(scores) as number;
  const above120 = scores.filter(
    (s) => s.monthIndex >= fromIndex && s.weightedScore !== null && s.weightedScore > 120,
  ).length;
  const below70 = scores.filter(
    (s) => s.monthIndex >= fromIndex && s.weightedScore !== null && s.weightedScore < 70,
  ).length;

  const contextNotes = await getContextNotes(employeeId, FISCAL_YEAR);

  const subject: ReviewSubject = {
    id: employee.id,
    name: employee.name,
    identity: `${employee.title} · ${employee.id}`,
    points,
    monthsLogged: months,
    eligibleMonths,
    yearAverage: average,
    contextNotes,
    evidence: {
      monthsLogged: `${months} of ${eligibleMonths}`,
      contextNotes: contextNotes.length,
      above120,
      below70,
    },
  };

  return { employee: base, subject, review };
}
