import { prisma } from './db';
import { getEmployeeCycleScores } from './employee-year';
import { getQueriesForEmployee, type QueryItem } from './queries';

/* ---------------------------------------------------------------------------
   One row per locked month, for Scorecard's acknowledge/query section —
   combines real Submission scores, real Acknowledgement rows, and real
   MonthQuery rows for whichever employeeId the page passes in.
   --------------------------------------------------------------------------- */

export type LockedMonthRow = {
  cycleId: string;
  label: string;
  weightedScore: number | null;
  acknowledgedAtLabel: string | null;
  queries: QueryItem[];
};

export async function getLockedMonthRows(employeeId: string, fiscalYear: string): Promise<LockedMonthRow[]> {
  const [scores, ackRows, queries] = await Promise.all([
    getEmployeeCycleScores(employeeId, fiscalYear),
    prisma.acknowledgement.findMany({ where: { employeeId }, select: { cycleId: true, acknowledgedAt: true } }),
    getQueriesForEmployee(employeeId),
  ]);

  const ackByCycle = new Map(ackRows.map((a) => [a.cycleId, a.acknowledgedAt]));
  const queriesByCycle = new Map<string, QueryItem[]>();
  for (const q of queries) {
    queriesByCycle.set(q.cycleId, [...(queriesByCycle.get(q.cycleId) ?? []), q]);
  }

  return scores
    .filter((s) => s.state === 'LOCKED')
    .map((s) => {
      const acknowledgedAt = ackByCycle.get(s.cycleId);
      return {
        cycleId: s.cycleId,
        label: s.label,
        weightedScore: s.weightedScore,
        acknowledgedAtLabel: acknowledgedAt
          ? acknowledgedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : null,
        queries: queriesByCycle.get(s.cycleId) ?? [],
      };
    });
}
