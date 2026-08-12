import { prisma } from './db';

/* ---------------------------------------------------------------------------
   An employee confirming they've seen a locked month — read by Profile, and
   by whoever is viewing that person's Scorecard (self, their manager, HR).
   The write side (creating one) lives in app/scorecard/actions.ts, next to
   the page that has the button.
   --------------------------------------------------------------------------- */

export type AcknowledgementItem = {
  cycleId: string;
  cycleLabel: string;
  acknowledgedAt: Date;
  acknowledgedAtLabel: string;
};

function formatAcknowledgedAt(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function getAcknowledgements(employeeId: string): Promise<AcknowledgementItem[]> {
  const rows = await prisma.acknowledgement.findMany({
    where: { employeeId },
    include: { cycle: true },
    orderBy: { acknowledgedAt: 'desc' },
  });

  return rows.map((a) => ({
    cycleId: a.cycleId,
    cycleLabel: a.cycle.label,
    acknowledgedAt: a.acknowledgedAt,
    acknowledgedAtLabel: formatAcknowledgedAt(a.acknowledgedAt),
  }));
}

/** For "is this specific month already acknowledged" lookups without a full list. */
export async function getAcknowledgedCycleIds(employeeId: string): Promise<Set<string>> {
  const rows = await prisma.acknowledgement.findMany({
    where: { employeeId },
    select: { cycleId: true },
  });
  return new Set(rows.map((r) => r.cycleId));
}
