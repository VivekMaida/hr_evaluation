/* ---------------------------------------------------------------------------
   Reports. Both reports inform the calibration conversation. Neither adjusts
   anyone's score, rating or record.
   --------------------------------------------------------------------------- */

export const REPORT_FILTERS = {
  scope: 'All departments',
  period: 'Apr 2025 – Jan 2026',
  coverage: 'Coverage 8 months or more',
  included: 1947,
  total: 2090,
  excluded: 143,
};

/* --- Report 01 · Consistency analysis ------------------------------------- */

export const SCATTER_AXES = {
  xMin: 60,
  xMax: 130,
  yMin: 0,
  yMax: 24,
  /** Target line. Right of it is at or above target. */
  xDivider: 100,
  /** Steady below this standard deviation. */
  yDivider: 8,
};

export type ScatterPoint = {
  /** Year average score. */
  x: number;
  /** Standard deviation of the twelve monthly scores. */
  y: number;
  label?: string;
  /** Last quarter more than 15 points above the year. */
  lateRun?: boolean;
};

export const SCATTER: ScatterPoint[] = [
  { x: 97.9, y: 8.4 },
  { x: 89.6, y: 5.2 },
  { x: 80.2, y: 6.9 },
  { x: 77.9, y: 10.6 },
  { x: 103.2, y: 5.9 },
  { x: 86.7, y: 4.6 },
  { x: 96.4, y: 3.8 },
  { x: 101.7, y: 7.2 },
  { x: 108.4, y: 4.1 },
  { x: 99.1, y: 9.3 },
  { x: 112.6, y: 6.4 },
  { x: 94.8, y: 11.7 },
  { x: 106.2, y: 2.9 },
  { x: 72.4, y: 19.8, label: 'Vikram Sethi' },
  { x: 118.3, y: 5.5, label: 'Sneha Pillai' },
  { x: 88.2, y: 7.8 },
  { x: 68.9, y: 13.2 },
  { x: 102.8, y: 3.4, label: 'Ritu Malhotra' },
  { x: 96.1, y: 21.3, label: 'Ashok Nair' },
  { x: 93.0, y: 10.1 },
  { x: 83.4, y: 8.8 },
  { x: 110.8, y: 5.0 },

  // The five late-run people — the same five listed on HR Home.
  { x: 89.6, y: 14.2, lateRun: true },
  { x: 85.2, y: 18.6, lateRun: true, label: 'Nikhil Bansal' },
  { x: 81.4, y: 15.4, lateRun: true },
  { x: 91.9, y: 14.8, lateRun: true },
  { x: 93.5, y: 12.1, lateRun: true },
];

export const CONSISTENCY_RUN = {
  medianSd: 7.4,
  steadyAtOrAbove: 41,
  variableBelow: 12,
  lateRunPeople: 64,
};

/* --- Report 02 · Rating spread by lead ------------------------------------ */

export type SpreadPattern =
  | 'Nothing below 4'
  | 'Nothing above 4'
  | 'Everyone rated 3'
  | 'Uses the full scale'
  | 'In line with the org';

export type LeadSpread = {
  lead: string;
  department: string;
  team: number;
  /** Lowest and highest rating this lead actually used, on the 1–5 scale. */
  low: number;
  high: number;
  average: number;
  pattern: SpreadPattern;
};

export const ORG_RATING_AVERAGE = 3.4;
export const TOTAL_LEADS = 196;

/** Sorted by lead average, high to low. */
export const LEAD_SPREADS: LeadSpread[] = [
  { lead: 'Shruti Kapoor', department: 'Marketing', team: 6, low: 4, high: 5, average: 4.5, pattern: 'Nothing below 4' },
  { lead: 'Rakesh Khanna', department: 'Projects & Construction', team: 12, low: 4, high: 5, average: 4.3, pattern: 'Nothing below 4' },
  { lead: 'Farhan Ali', department: 'Customer Relationship Management', team: 11, low: 3, high: 5, average: 3.9, pattern: 'In line with the org' },
  { lead: 'Ananya Mehra', department: 'Sales', team: 7, low: 3, high: 5, average: 3.6, pattern: 'In line with the org' },
  { lead: 'Sunil Grover', department: 'Finance & Accounts', team: 8, low: 2, high: 5, average: 3.5, pattern: 'Uses the full scale' },
  { lead: 'Ritu Malhotra', department: 'Legal & Liaison', team: 5, low: 3, high: 3, average: 3.0, pattern: 'Everyone rated 3' },
  { lead: 'Vikram Sethi', department: 'Projects & Construction', team: 10, low: 1, high: 4, average: 2.9, pattern: 'Uses the full scale' },
  { lead: 'Meera Joshi', department: 'Procurement', team: 9, low: 2, high: 4, average: 2.7, pattern: 'Nothing above 4' },
];

/**
 * The bar takes its colour from the pattern, not from the raw width: a lead
 * who never leaves the top of the scale is the finding, however wide the band
 * happens to look.
 */
export function patternTone(pattern: SpreadPattern): 'navy' | 'amber' | 'red' {
  if (pattern === 'Everyone rated 3') return 'red';
  if (pattern === 'Nothing below 4' || pattern === 'Nothing above 4') return 'amber';
  return 'navy';
}

/** Position on the 1–5 track, as a percentage. */
export function ratingPct(rating: number): number {
  return ((rating - 1) / 4) * 100;
}
