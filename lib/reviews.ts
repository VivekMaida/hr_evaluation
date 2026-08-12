import { getContextNotes, type ContextNote } from './context-notes';
import { prisma } from './db';
import { getEmployeeCycleScores, monthsLogged as countMonthsLogged, pointsFromCycleScores, yearAverage as computeYearAverage } from './employee-year';
import type { MonthPoint } from './types';

/* ---------------------------------------------------------------------------
   Reviews — the annual rating. Ratings appear here and nowhere else; every
   other surface deals in weighted achievement percentages.
   --------------------------------------------------------------------------- */

const FISCAL_YEAR = '2025-26';

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
  cycle: 'Annual appraisal FY 2025–26',
  closes: 'lead submissions close Friday, 24 April 2026',
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
  yearAverage: number;
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
  /** null means the employee exists but has nothing submitted yet. */
  subject: ReviewSubject | null;
};

/** Returns null only when the employee does not exist. */
export async function getReviewData(employeeId: string): Promise<ReviewData | null> {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return null;

  const base = { id: employee.id, name: employee.name, title: employee.title };

  const scores = await getEmployeeCycleScores(employeeId, FISCAL_YEAR);
  const months = countMonthsLogged(scores);
  if (months === 0) return { employee: base, subject: null };

  const points = pointsFromCycleScores(scores);
  const average = computeYearAverage(scores) as number;
  const above120 = scores.filter((s) => s.weightedScore !== null && s.weightedScore > 120).length;
  const below70 = scores.filter((s) => s.weightedScore !== null && s.weightedScore < 70).length;

  const contextNotes = await getContextNotes(employeeId, FISCAL_YEAR);

  const subject: ReviewSubject = {
    id: employee.id,
    name: employee.name,
    identity: `${employee.title} · ${employee.id}`,
    points,
    monthsLogged: months,
    yearAverage: average,
    contextNotes,
    evidence: {
      monthsLogged: `${months} of 12`,
      contextNotes: contextNotes.length,
      above120,
      below70,
    },
  };

  return { employee: base, subject };
}
