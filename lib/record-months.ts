import { prisma } from './db';
import { getEmployeeCycleScores } from './employee-year';
import { getQueriesForEmployee, type QueryItem } from './queries';

/* ---------------------------------------------------------------------------
   One row per month that has a score on record, for the acknowledge/query
   section — real Submission scores, real Acknowledgement rows and real
   MonthQuery rows for whichever employeeId the page passes in.

   The open month is included. Acknowledging is a "seen it" marker, not a
   sign-off gate: it is not mandatory, it blocks nothing, and a month locks
   and counts toward the year whether or not anyone ever ticks it. Restricting
   it to already-locked months made it unreachable for the only month the
   pilot has, which is the opposite of the intent.

   A month with no score is not listed. There is nothing to have seen, and
   "acknowledge that nothing was logged" is not a statement anyone needs to
   make — those gaps surface as missing coverage instead.
   --------------------------------------------------------------------------- */

export type RecordMonthRow = {
  cycleId: string;
  label: string;
  monthIndex: number;
  weightedScore: number;
  /** LOCKED is closed for good; OPEN is this month, still being logged. */
  state: 'OPEN' | 'LOCKED';
  acknowledgedAtLabel: string | null;
  queries: QueryItem[];
};

export async function getRecordMonthRows(
  employeeId: string,
  fiscalYear: string,
): Promise<RecordMonthRow[]> {
  const [scores, ackRows, queries] = await Promise.all([
    getEmployeeCycleScores(employeeId, fiscalYear),
    prisma.acknowledgement.findMany({
      where: { employeeId },
      select: { cycleId: true, acknowledgedAt: true },
    }),
    getQueriesForEmployee(employeeId),
  ]);

  const ackByCycle = new Map(ackRows.map((a) => [a.cycleId, a.acknowledgedAt]));
  const queriesByCycle = new Map<string, QueryItem[]>();
  for (const q of queries) {
    queriesByCycle.set(q.cycleId, [...(queriesByCycle.get(q.cycleId) ?? []), q]);
  }

  return scores
    .filter(
      (s) => (s.state === 'LOCKED' || s.state === 'OPEN') && s.weightedScore !== null,
    )
    .map((s) => {
      const acknowledgedAt = ackByCycle.get(s.cycleId);
      return {
        cycleId: s.cycleId,
        label: s.label,
        monthIndex: s.monthIndex,
        weightedScore: s.weightedScore as number,
        state: s.state as 'OPEN' | 'LOCKED',
        acknowledgedAtLabel: acknowledgedAt
          ? acknowledgedAt.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : null,
        queries: queriesByCycle.get(s.cycleId) ?? [],
      };
    });
}
