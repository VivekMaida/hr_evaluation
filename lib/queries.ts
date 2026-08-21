import { prisma } from './db';

/* ---------------------------------------------------------------------------
   An employee's questions about a specific month, and their manager's
   answers. Read by Scorecard for whoever can view that record; the write
   side (raising / responding) lives in app/scorecard/actions.ts.
   --------------------------------------------------------------------------- */

export type QueryItem = {
  id: string;
  cycleId: string;
  cycleLabel: string;
  /** 1 = April … 12 = March. Sorting on cycleLabel would order "April" before
   *  "August" alphabetically, which is not the order they happened in. */
  monthIndex: number;
  question: string;
  askedAtLabel: string;
  state: 'OPEN' | 'ANSWERED';
  response: string | null;
  respondedAtLabel: string | null;
};

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export async function getQueriesForEmployee(employeeId: string): Promise<QueryItem[]> {
  const rows = await prisma.monthQuery.findMany({
    where: { employeeId },
    include: { cycle: true },
    orderBy: { askedAt: 'desc' },
  });

  return rows.map((q) => ({
    id: q.id,
    cycleId: q.cycleId,
    cycleLabel: q.cycle.label,
    monthIndex: q.cycle.monthIndex,
    question: q.question,
    askedAtLabel: formatDateTime(q.askedAt),
    state: q.state,
    response: q.response,
    respondedAtLabel: q.respondedAt ? formatDateTime(q.respondedAt) : null,
  }));
}
