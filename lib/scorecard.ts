import { FY_LABEL } from './constants';
import { prisma } from './db';
import {
  getEmployeeCycleScores,
  maskOpenCycle,
  monthsLogged as countMonthsLogged,
  pointsFromCycleScores,
  priorFiscalYear,
  yearAverage as computeYearAverage,
} from './employee-year';
import type { MonthPoint } from './types';

/* ---------------------------------------------------------------------------
   Scorecard — one employee, the full year on record. Types and pure display
   logic live here; getScorecardData() is the one place that reads the DB for
   this screen.
   --------------------------------------------------------------------------- */

const FISCAL_YEAR = '2025-26';

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

export function coverageBand(months: number): CoverageBand {
  if (months >= 11) return 'complete';
  if (months >= 8) return 'partial';
  return 'insufficient';
}

/** Steady under 8, Variable 8–15, Erratic above. Suppressed under 6 months. */
export function consistencyLabel(sd: number | null, months: number): string {
  if (sd === null || months < 6) return '—';
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

/**
 * Numerals are coloured only for exceptions — below 70% and above 120%, the
 * two bands that require a context note.
 */
export function matrixCellColour(value: number): string {
  if (value < 70) return 'var(--red)';
  if (value > 120) return 'var(--green)';
  return 'var(--navy)';
}

export type KraMonthRow = {
  kra: string;
  unit: string;
  weight: number;
  /** Achievement percentage per locked month, Apr → Jan, in order. */
  closed: (number | null)[];
  /** null when none of the locked months has an actual on record for this KPI. */
  average: number | null;
};

export type ScorecardSubject = {
  id: string;
  name: string;
  identity: string;
  points: MonthPoint[];
  monthsLogged: number;
  /** Present only when the record is deep enough to publish a matrix. */
  matrix?: KraMonthRow[];
  weightedByMonth?: (number | null)[];
  yearAverage: number;
  record?: {
    monthsLocked: number;
    openMonthLabel: string;
    currentMonthState: string;
    lastSubmitted: string;
    priorRating: string;
  };
  missingMonths?: string;
  missingNote?: string;
};

export type ScorecardData = {
  employee: { id: string; name: string; title: string };
  /** null means the employee exists but has nothing submitted yet. */
  subject: ScorecardSubject | null;
};

function formatDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Returns null only when the employee does not exist.
 *
 * `maskOpenCycleData`: for the employee self-service 'after-lock' visibility
 * policy — discards whatever the still-open cycle carries, real or not, so
 * it reads as not yet available. Never set this for a Manager or HR view.
 */
export async function getScorecardData(
  employeeId: string,
  options: { maskOpenCycleData?: boolean } = {},
): Promise<ScorecardData | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { department: true, lead: true },
  });
  if (!employee) return null;

  const base = { id: employee.id, name: employee.name, title: employee.title };

  const [rawScores, kpis] = await Promise.all([
    getEmployeeCycleScores(employeeId, FISCAL_YEAR),
    prisma.kpi.findMany({
      where: { employeeId, fiscalYear: FISCAL_YEAR },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);
  const scores = options.maskOpenCycleData ? maskOpenCycle(rawScores) : rawScores;

  const months = countMonthsLogged(scores);
  if (months === 0) return { employee: base, subject: null };

  const points = pointsFromCycleScores(scores);
  const average = computeYearAverage(scores) as number;

  const identityParts = [
    `${employee.title}, ${employee.department.name}`,
    employee.id,
    ...(employee.location ? [employee.location] : []),
    ...(employee.lead ? [`Reports to ${employee.lead.name}`] : []),
    `KRA set ${FY_LABEL}`,
  ];

  const subject: ScorecardSubject = {
    id: employee.id,
    name: employee.name,
    identity: identityParts.join(' · '),
    points,
    monthsLogged: months,
    yearAverage: average,
  };

  if (coverageBand(months) === 'insufficient') {
    const missing = scores
      .filter((s) => s.state !== 'FUTURE' && s.weightedScore === null)
      .map((s) => s.label.split(' ')[0]);
    subject.missingMonths = missing.length > 0 ? missing.join(' · ') : '—';
    subject.missingNote =
      'Coverage is too thin to publish a KRA matrix or a record status. The average above is calculated on what exists, not on the year.';
    return { employee: base, subject };
  }

  const lockedScores = scores.filter((s) => s.state === 'LOCKED');
  const monthsLocked = lockedScores.filter((s) => s.weightedScore !== null).length;

  const entries = await prisma.monthlyEntry.findMany({
    where: { employeeId, cycle: { fiscalYear: FISCAL_YEAR, state: 'LOCKED' } },
    include: { cycle: true },
  });
  const entriesByKpiAndCycle = new Map(entries.map((e) => [`${e.kpiId}:${e.cycleId}`, e]));

  subject.matrix = kpis.map((kpi) => {
    const closed = lockedScores.map((s) => {
      const entry = entriesByKpiAndCycle.get(`${kpi.id}:${s.cycleId}`);
      return entry?.achievement === null || entry?.achievement === undefined
        ? null
        : Number(entry.achievement);
    });
    const present = closed.filter((v): v is number => v !== null);
    const average = present.length === 0 ? null : present.reduce((a, b) => a + b, 0) / present.length;
    return {
      kra: kpi.name,
      unit: kpi.unit ?? kpi.basis,
      weight: Number(kpi.weight),
      closed,
      average,
    };
  });
  subject.weightedByMonth = lockedScores.map((s) => s.weightedScore);

  const openScore = scores.find((s) => s.state === 'OPEN');
  const openEntries = openScore
    ? await prisma.monthlyEntry.count({
        where: { employeeId, cycleId: openScore.cycleId, actual: { not: null } },
      })
    : 0;
  const februaryState =
    openScore?.weightedScore !== null && openScore?.weightedScore !== undefined
      ? 'Submitted'
      : openEntries > 0
        ? 'In progress'
        : 'Not started';

  const lastSubmittedAt = scores.reduce<Date | null>((latest, s) => {
    if (!s.submittedAt) return latest;
    return !latest || s.submittedAt > latest ? s.submittedAt : latest;
  }, null);

  const priorReview = await prisma.annualReview.findFirst({
    where: { employeeId, fiscalYear: priorFiscalYear(FISCAL_YEAR) },
  });
  const priorRating = priorReview?.chosenBand
    ? `Band ${priorReview.chosenBand} of 5`
    : 'Not yet rated';

  subject.record = {
    monthsLocked,
    februaryState,
    lastSubmitted: formatDate(lastSubmittedAt),
    priorRating,
  };

  return { employee: base, subject };
}
