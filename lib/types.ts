/** Fiscal-year months in order. April first, always all twelve slots. */
export const FY_MONTHS = [
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
  'Jan',
  'Feb',
  'Mar',
] as const;

export type MonthKey = (typeof FY_MONTHS)[number];

/**
 * The track is always drawn. A missing month must read as a hole in the year,
 * never as a zero and never as absent.
 *
 * - `scored`         — cycle closed, a weighted score exists
 * - `not-logged`     — cycle closed, nothing entered
 * - `open`           — this month, still being logged
 * - `future`         — not yet reached
 * - `not-applicable` — before this person's (or the programme's) own start;
 *                      there was never anything to log here and never will
 *                      be — visually distinct from `not-logged`, which means
 *                      a month that should have been logged and wasn't
 */
export type MonthStatus = 'scored' | 'not-logged' | 'open' | 'future' | 'not-applicable';

export type MonthPoint = {
  month: MonthKey;
  status: MonthStatus;
  /** Weighted achievement percentage. Present only when status is `scored`. */
  score?: number;
};

/** Key result area — the grouping a KRA rolls up into. */
export type KraArea =
  | 'Revenue'
  | 'Collections'
  | 'Customer'
  | 'Process'
  | 'People';

export type Kra = {
  id: string;
  name: string;
  area: KraArea;
  /** Share of the employee's total score, in percent. Weights sum to 100. */
  weight: number;
  target: number;
  actual: number | null;
  unit: string;
  /**
   * TAT and escalation KRAs invert the achievement maths — target ÷ actual.
   * Flagged in the table so leads aren't confused.
   */
  lowerIsBetter?: boolean;
};

export type Employee = {
  id: string;
  name: string;
  title: string;
  department: string;
  location: string;
  leadId: string | null;
  joined: string;
};

/** State of one employee's entry for one monthly cycle. */
export type EntryState = 'not-started' | 'in-progress' | 'submitted' | 'locked';

export type MonthlyEntry = {
  employeeId: string;
  month: MonthKey;
  state: EntryState;
  kras: Kra[];
  /** A lead's note explaining an unusual month. Required below 70%. */
  contextNote?: string;
  submittedOn?: string;
  submittedBy?: string;
};

export type RatingBand = {
  code: string;
  label: string;
  from: number;
  to: number | null;
  tone: 'green' | 'navy' | 'amber' | 'red';
};

export type AnnualReview = {
  employeeId: string;
  /** Computed from the year's logged months. */
  yearAverage: number | null;
  monthsOnRecord: number;
  suggestedBand: string | null;
  chosenBand: string | null;
  justification?: string;
  state: 'not-started' | 'draft' | 'submitted' | 'calibrated';
};

/** Mirrors the Prisma `Role` enum. */
export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR';

/** Mirrors the Prisma `KpiType` enum. */
export type KpiType = 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER' | 'MILESTONE' | 'QUALITATIVE';

export const KPI_TYPE_LABEL: Record<KpiType, string> = {
  HIGHER_IS_BETTER: 'Higher is better',
  LOWER_IS_BETTER: 'Lower is better',
  MILESTONE: 'Milestone',
  QUALITATIVE: 'Qualitative',
};
