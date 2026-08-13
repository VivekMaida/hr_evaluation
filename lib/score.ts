import type { Kra, MonthPoint } from './types';

/**
 * Vertical scale is fixed at 0–130% across every instance of the year strip,
 * so two strips are always comparable. Above 130% clips to the top of the
 * track; the numeral still prints the true figure.
 */
export const STRIP_CEILING = 130;

export type Band = 'strong' | 'recorded' | 'shortfall';

/**
 * Navy in the middle band is deliberate: most months are unremarkable and
 * should not be coloured. Green and red are earned.
 */
export function band(score: number): Band {
  if (score >= 90) return 'strong';
  if (score >= 70) return 'recorded';
  return 'shortfall';
}

export function bandColour(score: number): string {
  switch (band(score)) {
    case 'strong':
      return 'var(--green)';
    case 'recorded':
      return 'var(--navy)';
    case 'shortfall':
      return 'var(--red)';
  }
}

/** Chip tone for a score, matching the band. */
export function bandChip(score: number): 'green' | 'navy' | 'red' {
  switch (band(score)) {
    case 'strong':
      return 'green';
    case 'recorded':
      return 'navy';
    case 'shortfall':
      return 'red';
  }
}

/** Fraction of the fixed track a score occupies, clipped at the ceiling. */
export function trackFraction(score: number): number {
  return Math.max(0, Math.min(score, STRIP_CEILING)) / STRIP_CEILING;
}

/**
 * Achievement against target, as a percentage. Uncapped — 130% shows as 130%
 * and pulls the weighted score up.
 *
 * "Lower is better" KRAs (TAT, escalations) invert the maths: target ÷ actual.
 */
export function achievement(kra: Kra): number | null {
  if (kra.actual === null) return null;
  if (kra.lowerIsBetter) {
    if (kra.actual === 0) return null;
    return (kra.target / kra.actual) * 100;
  }
  if (kra.target === 0) return null;
  return (kra.actual / kra.target) * 100;
}

/**
 * Weighted achievement percentage out of the employee's KRA weights — not a
 * 1–5 rating. Ratings only appear in Reviews.
 *
 * Returns null when nothing has been entered. KRAs still awaiting an actual
 * are excluded from both the numerator and the weight base, so a part-entered
 * month reads as a score of what has been logged rather than a collapse.
 */
export function weightedScore(kras: Kra[]): number | null {
  let weighted = 0;
  let weightBase = 0;
  for (const kra of kras) {
    const pct = achievement(kra);
    if (pct === null) continue;
    weighted += pct * kra.weight;
    weightBase += kra.weight;
  }
  if (weightBase === 0) return null;
  return weighted / weightBase;
}

export function yearAverage(points: MonthPoint[]): number | null {
  const scores = points
    .filter((p) => p.status === 'scored' && typeof p.score === 'number')
    .map((p) => p.score as number);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Population standard deviation of the logged months. Reported as
 * "consistency" — a low spread means the year is steady.
 */
export function consistency(points: MonthPoint[]): number | null {
  const scores = points
    .filter((p) => p.status === 'scored' && typeof p.score === 'number')
    .map((p) => p.score as number);
  if (scores.length < 2) return null;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
  return Math.sqrt(variance);
}

/**
 * Direction of travel across the logged months, split into halves — the H1 → H2
 * figures the Scorecard and Reviews print. With an odd count the middle month
 * is dropped so the halves stay comparable.
 */
export function halves(
  points: MonthPoint[],
): { first: number; second: number } | null {
  const scores = points
    .filter((p) => p.status === 'scored' && typeof p.score === 'number')
    .map((p) => p.score as number);
  if (scores.length < 4) return null;
  const size = Math.floor(scores.length / 2);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return { first: mean(scores.slice(0, size)), second: mean(scores.slice(-size)) };
}

/** H2 minus H1, in percentage points. */
export function trend(points: MonthPoint[]): number | null {
  const h = halves(points);
  return h === null ? null : h.second - h.first;
}

/** Longest run of consecutive closed months with nothing entered. */
export function consecutiveMissed(points: MonthPoint[]): number {
  let longest = 0;
  let run = 0;
  for (const point of points) {
    if (point.status === 'not-logged') {
      run += 1;
      longest = Math.max(longest, run);
    } else if (point.status === 'scored') {
      run = 0;
    }
  }
  return longest;
}

/* --- Formatting ----------------------------------------------------------- */

export function pct(value: number | null, digits = 1): string {
  if (value === null) return '—';
  return `${value.toFixed(digits)}%`;
}

export function num(value: number | null, digits = 2): string {
  if (value === null) return '—';
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function signed(value: number | null, digits = 1): string {
  if (value === null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}`;
}
