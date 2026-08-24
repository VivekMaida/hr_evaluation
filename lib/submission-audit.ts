import { prisma } from './db';
import { buildRows, weightedScoreOf } from './entries';
import { getKpiSetForCycle } from './kpi';

/* ---------------------------------------------------------------------------
   The data-integrity check behind lib/submission-write.ts.

   That module holds one invariant: a SUBMITTED month's weightedScore is always
   the score of the entries it currently has. This is the audit that says
   whether it actually holds across the whole record — it recomputes every
   submitted month from its own MonthlyEntry rows, through the same buildRows /
   weightedScoreOf the writers use, and reports any month whose stored figure
   disagrees.

   It exists because the record diverged once and nothing noticed: a month kept
   its old score while its entries changed underneath, so the KRA matrix and
   the headline said two different things. Read-only, and safe to run against
   production whenever that assurance is wanted.
   --------------------------------------------------------------------------- */

export type SubmissionDivergence = {
  employeeId: string;
  cycleId: string;
  cycleLabel: string;
  /** What the Submission row claims. */
  storedScore: number | null;
  /** What the month's entries actually come to. */
  entriesScore: number | null;
};

/**
 * weightedScore is Decimal(7,2), so a stored figure is the computed one
 * rounded to two places — a gap of up to half a hundredth is the column, not a
 * divergence. A real one is orders of magnitude larger (the bug this came from
 * was 85.70 against 90.63), so nothing meaningful hides under this.
 */
const ROUNDING_TOLERANCE = 0.01;

function agrees(stored: number | null, computed: number | null): boolean {
  if (stored === null || computed === null) return stored === computed;
  return Math.abs(stored - computed) <= ROUNDING_TOLERANCE;
}

/**
 * Every submitted month whose stored score disagrees with its own entries.
 *
 * `checked` is reported alongside so an empty result reads as "nothing is
 * wrong across N months" rather than the ambiguous "nothing was looked at".
 */
export async function findDivergedSubmittedMonths(): Promise<{
  checked: number;
  diverged: SubmissionDivergence[];
}> {
  const submitted = await prisma.submission.findMany({
    where: { state: 'SUBMITTED' },
    include: { cycle: true },
    orderBy: [{ employeeId: 'asc' }, { cycleId: 'asc' }],
  });

  const diverged: SubmissionDivergence[] = [];

  for (const submission of submitted) {
    // The KPI set as it stood for this month specifically — the same
    // effective-dated lookup the writers scored it against, so an edited KRA
    // does not read as a divergence.
    const [kpis, entries] = await Promise.all([
      getKpiSetForCycle(submission.employeeId, submission.cycle.fiscalYear, submission.cycle.monthIndex),
      prisma.monthlyEntry.findMany({
        where: { employeeId: submission.employeeId, cycleId: submission.cycleId },
      }),
    ]);

    const entriesScore = weightedScoreOf(buildRows(kpis, entries));
    const storedScore = submission.weightedScore === null ? null : Number(submission.weightedScore);

    if (!agrees(storedScore, entriesScore)) {
      diverged.push({
        employeeId: submission.employeeId,
        cycleId: submission.cycleId,
        cycleLabel: submission.cycle.label,
        storedScore,
        entriesScore,
      });
    }
  }

  return { checked: submitted.length, diverged };
}

/** One line per divergence, for a test failure message or a console. */
export function describeDivergences(diverged: SubmissionDivergence[]): string {
  return diverged
    .map(
      (d) =>
        `${d.employeeId} ${d.cycleLabel}: submission says ${d.storedScore ?? '—'}, ` +
        `its entries come to ${d.entriesScore === null ? '—' : d.entriesScore.toFixed(2)}`,
    )
    .join('\n');
}
