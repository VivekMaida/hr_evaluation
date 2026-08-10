import { FY_MONTHS, type MonthPoint } from './types';

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

export const REVIEW_CONTEXT = {
  cycle: 'Annual appraisal FY 2025–26',
  closes: 'lead submissions close Friday, 24 April 2026',
  submitted: 2,
  total: 7,
  position: 'Employee 3 of 7',
};

export type ContextNote = {
  when: string;
  headline: string;
  tone: 'green' | 'red';
  body: string;
};

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

/**
 * Rohit Verma's completed year. Every month within 94–115, so the record is
 * unusually flat — which is exactly the case where a lead is most tempted to
 * depart from it.
 */
const ROHIT_YEAR = [108, 96, 101, 110, 99, 104, 115, 102, 94, 107, 98, 104.4];

export const REVIEW_SUBJECT: ReviewSubject = {
  id: 'EMP-10233',
  name: 'Rohit Verma',
  identity:
    'Senior Manager, Sales · EMP-10233 · With M3M since June 2019 · FY 2024–25 rating: Exceeds · 4 of 5',
  points: FY_MONTHS.map((month, i) => ({
    month,
    status: 'scored' as const,
    score: ROHIT_YEAR[i],
  })),
  monthsLogged: 12,
  yearAverage: 103.2,
  evidence: {
    monthsLogged: '12 of 12',
    contextNotes: 3,
    above120: 0,
    below70: 0,
  },
  contextNotes: [
    {
      when: 'Jul 2025 · Booking value 124%',
      tone: 'green',
      headline: 'Jul 2025',
      body: 'Launch month for M3M Golf Hills; inventory released two weeks early.',
    },
    {
      when: 'Oct 2025 · Booking value 130%',
      tone: 'green',
      headline: 'Oct 2025',
      body: "Two bulk deals in the Noida channel closed in October; both pulled forward at the customer's request.",
    },
    {
      when: 'Dec 2025 · Conversion 68%',
      tone: 'red',
      headline: 'Dec 2025',
      body: 'Site access shut for two weeks under the NGT dust order; walk-ins diverted to Sector 79.',
    },
  ],
};
