import { FISCAL_YEAR, FY_LABEL } from './constants';
import { prisma } from './db';
import {
  eligibleFromMonthIndex,
  eligibleMonthCount,
  getEmployeeCycleScores,
  maskOpenCycle,
  monthsLogged as countMonthsLogged,
  pointsFromCycleScores,
  priorFiscalYear,
  yearAverage as computeYearAverage,
} from './employee-year';
import { getNotedEntryKeys } from './context-notes';
import { getKpiIdsByLineage, getKpiSetForCycle } from './kpi';
import type { MonthPoint } from './types';

/* ---------------------------------------------------------------------------
   Scorecard — one employee, the full year on record. Types and pure display
   logic live here; getScorecardData() is the one place that reads the DB for
   this screen.
   --------------------------------------------------------------------------- */

/** Coverage decides what the record may be used for. */
export type CoverageBand = 'complete' | 'partial' | 'insufficient';

/**
 * Proportional to eligible months, not an absolute count — a full year is
 * 12 eligible months, but a mid-year joiner or a programme's own truncated
 * first year might have as few as 1. The historical 11/12 and 8/12 splits
 * are preserved as fractions, so a full 12-month year reads exactly as it
 * always did; the same ratio, applied to a shorter window, is what makes a
 * perfect record on a shorter window reach "complete" instead of being
 * permanently capped at "partial".
 */
export const COVERAGE_BANDS: {
  band: CoverageBand;
  range: string;
  label: string;
  tone: 'green' | 'navy' | 'red';
}[] = [
  { band: 'complete', range: '92% or more of eligible months', label: 'complete', tone: 'green' },
  {
    band: 'partial',
    range: '67–91% of eligible months',
    label: 'partial — rateable, flagged in Calibration',
    tone: 'navy',
  },
  {
    band: 'insufficient',
    range: 'under 67% of eligible months',
    label: 'insufficient — derived metrics suppressed, rating blocked',
    tone: 'red',
  },
];

/** Months needed to clear "insufficient" and count as at least partial. */
export function partialThresholdMonths(eligibleMonths: number): number {
  return Math.ceil((eligibleMonths * 2) / 3);
}

export function coverageBand(monthsLogged: number, eligibleMonths: number): CoverageBand {
  if (monthsLogged >= Math.ceil((eligibleMonths * 11) / 12)) return 'complete';
  if (monthsLogged >= partialThresholdMonths(eligibleMonths)) return 'partial';
  return 'insufficient';
}

/**
 * Fewer than this and a standard deviation is noise rather than a signal, so
 * consistency is not reported at all.
 */
export const CONSISTENCY_MIN_MONTHS = 6;

/** Steady under 8, Variable 8–15, Erratic above; nothing under 6 months. */
export function consistencyLabel(sd: number | null, months: number): string {
  if (sd === null || months < CONSISTENCY_MIN_MONTHS) return '—';
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
  /** How the KRA is measured, in words — the subtitle under its name. */
  basis: string;
  /** "%", "count", "days" … Printed against the target, not on its own. */
  unit: string | null;
  weight: number;
  /** The annual target this KRA is measured against. */
  target: number;
  /** TAT/error-count KRAs invert the maths — target ÷ actual. */
  lowerIsBetter: boolean;
  /**
   * Twelve slots, April → March, aligned with `points`. null means this KRA
   * has no actual on record for that month — which is a different thing from
   * the month itself being future or before the person started; read the
   * month's own status off `points[i]` for that.
   */
  months: (number | null)[];
  /** Twelve slots — the manager wrote a context note on that month's entry. */
  notes: boolean[];
  /** null when no month on record has an actual for this KPI. */
  average: number | null;
};

export type ScorecardSubject = {
  id: string;
  name: string;
  identity: string;
  /**
   * This person's own manager, the only place a query can route to. null when
   * they have no lead on record, in which case the query box is not offered
   * at all (raiseQuery would refuse it anyway). Held as its own field rather
   * than parsed back out of `identity`, which is a display string.
   */
  managerName: string | null;
  points: MonthPoint[];
  monthsLogged: number;
  /** How many of the twelve months this person is actually eligible for — see eligibleFromMonthIndex(). */
  eligibleMonths: number;
  /**
   * One row per KRA, always — the matrix is the substance of the Scorecard and
   * is published from the first month on record, not held back until coverage
   * is deep enough. It is empty only when the employee has no KPI set at all.
   */
  matrix: KraMonthRow[];
  /** Twelve slots, April → March, aligned with `points` and each row's `months`. */
  weightedByMonth: (number | null)[];
  /**
   * 1-based month index of the cycle still open for entry, if any. Not
   * derivable from `points`: a month that already has a score reads as
   * 'scored' there whether or not it has locked, so the matrix needs telling
   * which column can still change.
   */
  openMonthIndex?: number;
  yearAverage: number;
  record?: {
    monthsLocked: number;
    openMonthLabel: string;
    currentMonthState: string;
    lastSubmitted: string;
    priorRating: string;
  };
  /**
   * Eligible months that have already closed with nothing logged — a real hole
   * in the record. Undefined when there are none.
   */
  missingMonths?: string;
  missingNote?: string;
  /**
   * Eligible months still ahead (open or future). Kept separate from
   * `missingMonths` because "not logged yet" and "closed empty" are different
   * facts, and conflating them made a healthy early-year record read as a
   * failing one.
   */
  monthsToCome: number;
};

export type ScorecardData = {
  employee: { id: string; name: string; title: string };
  /** null means the employee exists but has nothing submitted yet. */
  subject: ScorecardSubject | null;
  /**
   * Whether a KRA set exists for this person this fiscal year at all.
   *
   * Distinguishes the two reasons a record can be empty, which read very
   * differently to the person looking at it: nothing logged yet against a set
   * that exists, or no set to log against. Derived from the data every time,
   * so a record starts reading normally the moment someone publishes a set —
   * there is no flag to flip and nothing to redeploy.
   */
  hasKpiSet: boolean;
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
  // department/lead as their own parallel queries rather than a nested
  // `include` — that isn't a SQL join here, it's two more sequential round
  // trips hidden behind one line. Department has only a couple of rows;
  // fetching all of them is cheaper than the include either way.
  const [employee, departments] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId } }),
    prisma.department.findMany(),
  ]);
  if (!employee) return null;
  const department = departments.find((d) => d.id === employee.departmentId);
  const lead = employee.leadId
    ? await prisma.employee.findUnique({ where: { id: employee.leadId }, select: { name: true } })
    : null;

  const base = { id: employee.id, name: employee.name, title: employee.title };

  // Month 12 (March) rather than an unscoped "all rows for this fiscalYear"
  // query — with effective-dated KPI versions, an edited KPI now has more
  // than one row for the year, and the unscoped query would double it. Month
  // 12 always resolves to whichever version is currently active, since a
  // pending edit can never be scheduled past the fiscal year's last month.
  const [rawScores, kpis] = await Promise.all([
    getEmployeeCycleScores(employeeId, FISCAL_YEAR),
    getKpiSetForCycle(employeeId, FISCAL_YEAR, 12),
  ]);
  const scores = options.maskOpenCycleData ? maskOpenCycle(rawScores) : rawScores;

  const fromIndex = eligibleFromMonthIndex(employee.joinedOn, FISCAL_YEAR);
  const eligibleMonths = eligibleMonthCount(fromIndex);

  const months = countMonthsLogged(scores, fromIndex);
  if (months === 0) {
    // `kpis` is resolved as of month 12; a set whose every KRA was removed
    // earlier in the year would read as empty there but is still a set that
    // existed, so fall back to counting the year's rows before saying nobody
    // has one. Only on this path, which is the rare one.
    const hasKpiSet =
      kpis.length > 0 ||
      (await prisma.kpi.count({ where: { employeeId, fiscalYear: FISCAL_YEAR } })) > 0;
    return { employee: base, subject: null, hasKpiSet };
  }

  const points = pointsFromCycleScores(scores, fromIndex);
  const average = computeYearAverage(scores) as number;

  const identityParts = [
    `${employee.title}, ${department?.name ?? '—'}`,
    employee.id,
    ...(employee.location ? [employee.location] : []),
    ...(lead ? [`Reports to ${lead.name}`] : []),
    `KRA set ${FY_LABEL}`,
  ];

  const subject: ScorecardSubject = {
    id: employee.id,
    name: employee.name,
    identity: identityParts.join(' · '),
    managerName: lead?.name ?? null,
    points,
    monthsLogged: months,
    eligibleMonths,
    yearAverage: average,
    matrix: [],
    weightedByMonth: [],
    monthsToCome: scores.filter(
      (s) => s.monthIndex >= fromIndex && (s.state === 'FUTURE' || (s.state === 'OPEN' && s.weightedScore === null)),
    ).length,
  };

  // Every month that has a record to read — locked *and* the currently open
  // one. The matrix is published from month one: withholding it until coverage
  // was deep enough hid the only content that answers "which KRAs are strong,
  // which are weak, which are moving", which is the point of the screen. Thin
  // coverage is called out in the banner instead of blanking the grid.
  const recordScores = scores.filter((s) => s.monthIndex >= fromIndex && s.state !== 'FUTURE');
  const monthsLocked = scores.filter(
    (s) => s.monthIndex >= fromIndex && s.state === 'LOCKED' && s.weightedScore !== null,
  ).length;

  const openScore = scores.find((s) => s.state === 'OPEN');
  // Under the 'after-lock' policy the open month is withheld, so its entries
  // must not reach the matrix either — masking the weighted score while
  // leaving the per-KRA cells visible would leak exactly what it hides.
  const readableScores = options.maskOpenCycleData
    ? recordScores.filter((s) => s.state !== 'OPEN')
    : recordScores;

  const readableCycleIds = readableScores.map((s) => s.cycleId);
  const [entries, idsByLineage, notedKeys] = await Promise.all([
    readableCycleIds.length
      ? prisma.monthlyEntry.findMany({ where: { employeeId, cycleId: { in: readableCycleIds } } })
      : Promise.resolve([]),
    getKpiIdsByLineage(employeeId, FISCAL_YEAR),
    getNotedEntryKeys(employeeId, FISCAL_YEAR),
  ]);
  const entriesByKpiAndCycle = new Map(entries.map((e) => [`${e.kpiId}:${e.cycleId}`, e]));

  // monthIndex → cycleId, for the twelve-slot walk below. A month with no
  // Cycle row, or one outside this person's eligible window, has no entry to
  // find and reads as an empty cell.
  const cycleIdByMonth = new Map(readableScores.map((s) => [s.monthIndex, s.cycleId]));

  subject.matrix = kpis.map((kpi) => {
    // A month's entry was recorded against whichever version of this KRA was
    // live that month — not necessarily `kpi`, the current one, if it has
    // since been renamed or reweighted. Every id this lineage has ever used is
    // tried; exactly one can match a given cycle, since versions' effective
    // ranges never overlap.
    const lineageIds = idsByLineage.get(kpi.lineageId) ?? [kpi.id];
    const monthsRow: (number | null)[] = [];
    const notesRow: boolean[] = [];

    for (let monthIndex = 1; monthIndex <= 12; monthIndex += 1) {
      const cycleId = cycleIdByMonth.get(monthIndex);
      if (!cycleId) {
        monthsRow.push(null);
        notesRow.push(false);
        continue;
      }
      const matchedId = lineageIds.find((id) => entriesByKpiAndCycle.has(`${id}:${cycleId}`));
      const entry = matchedId ? entriesByKpiAndCycle.get(`${matchedId}:${cycleId}`) : undefined;
      monthsRow.push(
        entry?.achievement === null || entry?.achievement === undefined
          ? null
          : Number(entry.achievement),
      );
      notesRow.push(matchedId ? notedKeys.has(`${matchedId}:${cycleId}`) : false);
    }

    const present = monthsRow.filter((v): v is number => v !== null);
    const average = present.length === 0 ? null : present.reduce((a, b) => a + b, 0) / present.length;
    return {
      kra: kpi.name,
      basis: kpi.basis,
      unit: kpi.unit,
      weight: Number(kpi.weight),
      target: Number(kpi.target),
      lowerIsBetter: kpi.lowerIsBetter,
      months: monthsRow,
      notes: notesRow,
      average,
    };
  });

  // Twelve slots, aligned with `points` and every matrix row.
  const scoreByMonth = new Map(readableScores.map((s) => [s.monthIndex, s.weightedScore]));
  subject.weightedByMonth = Array.from(
    { length: 12 },
    (_unused, i) => scoreByMonth.get(i + 1) ?? null,
  );
  if (openScore && !options.maskOpenCycleData) subject.openMonthIndex = openScore.monthIndex;

  // Only months that have actually closed empty. A month still to come is not
  // a gap, so it never lands here — see `monthsToCome`.
  const missed = scores
    .filter((s) => s.monthIndex >= fromIndex && s.state === 'LOCKED' && s.weightedScore === null)
    .map((s) => s.label.split(' ')[0]);
  if (missed.length > 0) {
    subject.missingMonths = missed.join(' · ');
    subject.missingNote =
      'The average above is calculated on what exists, not on the year. The matrix below still shows every month on record.';
  }

  const openMonthLabel = openScore?.label.split(' ')[0] ?? 'This month';
  const openEntries =
    options.maskOpenCycleData || !openScore
      ? 0
      : await prisma.monthlyEntry.count({
          where: { employeeId, cycleId: openScore.cycleId, actual: { not: null } },
        });
  const currentMonthState = options.maskOpenCycleData
    ? 'Not yet available'
    : openScore?.weightedScore !== null && openScore?.weightedScore !== undefined
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
    openMonthLabel,
    currentMonthState,
    lastSubmitted: formatDate(lastSubmittedAt),
    priorRating,
  };

  return { employee: base, subject, hasKpiSet: kpis.length > 0 };
}
