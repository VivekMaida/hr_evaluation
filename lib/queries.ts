import { now } from './constants';
import { prisma } from './db';

/* ---------------------------------------------------------------------------
   An employee's questions about a specific month, and their manager's
   answers. Read by Scorecard for whoever can view that record; the write
   side (raising / responding) lives in app/scorecard/actions.ts.

   The open-query summaries below exist because nothing else told anyone a
   question had been asked. A query is answerable only from the subject's own
   Scorecard, so before these a manager had to already be looking at that one
   person's record to discover it — an employee could ask and wait forever.
   Both summaries are one MonthQuery read for the whole set, never one per
   person, so they are cheap enough to sit on a landing page.
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

/** One unanswered question, flattened for the summary views. */
export type OpenQuery = {
  id: string;
  employeeId: string;
  employeeName: string;
  /**
   * Whoever owes the reply — the asker's own lead, since respondToQuery
   * accepts nobody else. HR needs this to know who to chase; a manager
   * looking at their own team is always this person, so their view omits it.
   * null when the asker has no lead on record, which makes the query
   * unanswerable by anyone and is worth showing as exactly that.
   */
  managerName: string | null;
  cycleLabel: string;
  monthIndex: number;
  question: string;
  askedAtLabel: string;
  /** Whole days since it was asked, for "waiting N days". */
  daysWaiting: number;
};

/**
 * Oldest first — the one that has been waiting longest is the one that needs
 * answering, so it belongs at the top of a list somebody skims.
 */
async function openQueriesWhere(
  where: { employeeId?: { in: string[] } },
): Promise<OpenQuery[]> {
  const rows = await prisma.monthQuery.findMany({
    where: { ...where, state: 'OPEN' },
    include: {
      employee: { select: { id: true, name: true, leadId: true } },
      cycle: { select: { label: true, monthIndex: true } },
    },
    orderBy: { askedAt: 'asc' },
  });
  if (rows.length === 0) return [];

  // One lookup for every lead named across the whole set, rather than a
  // nested include per row — see lib/org.ts on why a nested include is not
  // the single join it reads as.
  const leadIds = Array.from(
    new Set(rows.map((r) => r.employee.leadId).filter((id): id is string => Boolean(id))),
  );
  const leads = leadIds.length
    ? await prisma.employee.findMany({ where: { id: { in: leadIds } }, select: { id: true, name: true } })
    : [];
  const leadNameById = new Map(leads.map((l) => [l.id, l.name]));

  const today = now().getTime();
  return rows.map((r) => ({
    id: r.id,
    employeeId: r.employee.id,
    employeeName: r.employee.name,
    managerName: r.employee.leadId ? (leadNameById.get(r.employee.leadId) ?? null) : null,
    cycleLabel: r.cycle.label,
    monthIndex: r.cycle.monthIndex,
    question: r.question,
    askedAtLabel: formatDateTime(r.askedAt),
    daysWaiting: Math.max(0, Math.floor((today - r.askedAt.getTime()) / 86_400_000)),
  }));
}

/**
 * Open queries raised by these employees. Callers pass their own reports'
 * ids, which is the same scope guarantee getManagerTeam() relies on: there is
 * no external employeeId here to validate against.
 */
export async function getOpenQueriesForEmployees(employeeIds: string[]): Promise<OpenQuery[]> {
  if (employeeIds.length === 0) return [];
  return openQueriesWhere({ employeeId: { in: employeeIds } });
}

/** Every open query in the pilot — HR only; the route table is the gate. */
export async function getAllOpenQueries(): Promise<OpenQuery[]> {
  return openQueriesWhere({});
}

/** employeeId → how many open queries they have, for a per-person marker. */
export function openQueryCountByEmployee(queries: OpenQuery[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const q of queries) counts.set(q.employeeId, (counts.get(q.employeeId) ?? 0) + 1);
  return counts;
}
