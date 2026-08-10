import type { MonthPoint } from './types';
import { TEAM, buildYear } from './data';
import { LATE_RUNS } from './hr-data';

/* ---------------------------------------------------------------------------
   Scorecard — one employee, the full year on record.
   --------------------------------------------------------------------------- */

/** Coverage decides what the record may be used for. */
export type CoverageBand = 'complete' | 'partial' | 'insufficient';

export const COVERAGE_BANDS: {
  band: CoverageBand;
  range: string;
  label: string;
  tone: 'green' | 'navy' | 'red';
}[] = [
  { band: 'complete', range: '11–12', label: 'complete', tone: 'green' },
  {
    band: 'partial',
    range: '8–10',
    label: 'partial — rateable, flagged in Calibration',
    tone: 'navy',
  },
  {
    band: 'insufficient',
    range: '7 or fewer',
    label: 'insufficient — derived metrics suppressed, rating blocked',
    tone: 'red',
  },
];

export function coverageBand(monthsLogged: number): CoverageBand {
  if (monthsLogged >= 11) return 'complete';
  if (monthsLogged >= 8) return 'partial';
  return 'insufficient';
}

/** Steady under 8, Variable 8–15, Erratic above. Suppressed under 6 months. */
export function consistencyLabel(sd: number | null, monthsLogged: number): string {
  if (sd === null || monthsLogged < 6) return '—';
  if (sd < 8) return 'Steady';
  if (sd <= 15) return 'Variable';
  return 'Erratic';
}

/** Trend needs comparable halves; suppressed when one half is empty. */
export function trendLabel(delta: number | null): string {
  if (delta === null) return '—';
  if (delta > 5) return 'Rising';
  if (delta < -5) return 'Falling';
  return 'Holding';
}

export type KraMonthRow = {
  kra: string;
  unit: string;
  weight: number;
  /** Achievement percentage per month, Apr → Jan. */
  closed: number[];
  average: number;
};

export type ScorecardSubject = {
  id: string;
  name: string;
  identity: string;
  points: MonthPoint[];
  monthsLogged: number;
  /** Present only when the record is deep enough to publish a matrix. */
  matrix?: KraMonthRow[];
  weightedByMonth?: number[];
  yearAverage: number;
  record?: {
    monthsLocked: number;
    februaryState: string;
    lastSubmitted: string;
    priorRating: string;
  };
  missingMonths?: string;
  missingNote?: string;
};

export const ROHIT: ScorecardSubject = {
  id: 'EMP-10233',
  name: 'Rohit Verma',
  identity:
    'Senior Manager, Sales · EMP-10233 · Gurugram · Reports to Ananya Mehra · KRA set FY 2025–26 v2',
  points: buildYear([108, 96, 101, 110, 99, 104, 115, 102, 94, 107]),
  monthsLogged: 10,
  yearAverage: 103.6,
  weightedByMonth: [108, 96, 101, 110, 99, 104, 115, 102, 94, 107],
  record: {
    monthsLocked: 10,
    februaryState: 'In progress',
    lastSubmitted: '2 Feb 2026',
    priorRating: 'Exceeds · 4 of 5',
  },
  matrix: [
    {
      kra: 'Booking value achieved',
      unit: '₹ Cr',
      weight: 30,
      closed: [124, 102, 110, 124, 104, 112, 130, 108, 104, 116],
      average: 113.4,
    },
    {
      kra: 'Units sold',
      unit: 'count',
      weight: 20,
      closed: [112, 100, 105, 113, 100, 108, 125, 105, 94, 113],
      average: 107.5,
    },
    {
      kra: 'Collection against demand raised',
      unit: '%',
      weight: 20,
      closed: [96, 92, 94, 98, 95, 97, 102, 98, 96, 99],
      average: 96.7,
    },
    {
      kra: 'Site visit to booking conversion',
      unit: '%',
      weight: 15,
      closed: [88, 84, 90, 92, 86, 89, 95, 90, 68, 91],
      average: 87.3,
    },
    {
      kra: 'Lead response TAT',
      unit: 'hours · lower is better',
      weight: 15,
      closed: [105, 98, 101, 107, 102, 104, 109, 103, 97, 106],
      average: 103.2,
    },
  ],
};

/**
 * Six elapsed months were never logged. The average is calculated on what
 * exists, not on the year — it is not a basis for an annual rating.
 */
export const VARUN: ScorecardSubject = {
  id: 'EMP-12207',
  name: 'Varun Sethi',
  identity:
    'Assistant Manager, Projects & Construction · EMP-12207 · Gurugram · Reports to Rakesh Khanna',
  points: buildYear([null, null, null, 92.4, null, 85.1, null, null, 90.6, 87.1]),
  monthsLogged: 4,
  yearAverage: 88.8,
  missingMonths: 'Apr · May · Jun · Aug · Oct · Nov',
  missingNote:
    'Lead at the time: Rakesh Khanna. Back-entry needs HR approval under Admin → Exception approvals.',
};

export const SCORECARDS: Record<string, ScorecardSubject> = {
  [ROHIT.id]: ROHIT,
  [VARUN.id]: VARUN,
};

/**
 * Every employee id the UI links to. The static export has no server to render
 * an unknown id on demand, so each one needs a page emitted at build time —
 * otherwise a roster link 404s on GitHub Pages but works in `npm run dev`.
 */
export const LINKED_EMPLOYEE_IDS: string[] = Array.from(
  new Set([
    ...Object.keys(SCORECARDS),
    ...TEAM.map((m) => m.id),
    ...LATE_RUNS.map((r) => r.id),
  ]),
);

/**
 * Numerals are coloured only for exceptions — below 70% and above 120%, the
 * two bands that require a context note. Everything else stays navy.
 */
export function matrixCellColour(value: number): string {
  if (value < 70) return 'var(--red)';
  if (value > 120) return 'var(--green)';
  return 'var(--navy)';
}
