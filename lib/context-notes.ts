import { prisma } from './db';

/* ---------------------------------------------------------------------------
   The context notes a manager wrote against an employee's monthly entries.

   This is the evidence trail the appraisal conversation runs on, so Reviews
   renders every one of them in month order. Scorecard does not repeat them —
   it only marks which cells in the KRA matrix carry a note, and points at
   Reviews for the words. That split is why the two screens are not the same
   screen.
   --------------------------------------------------------------------------- */

export type ContextNote = {
  /** Composed label — "August 2026 · Payroll input errors 40%". */
  when: string;
  headline: string;
  tone: 'green' | 'red';
  body: string;
  /** 1 = April … 12 = March, so callers can sort or group by month. */
  monthIndex: number;
  monthLabel: string;
  kpiName: string;
  /** Achievement on the KRA the note was written against, if one was recorded. */
  achievement: number | null;
};

export async function getContextNotes(employeeId: string, fiscalYear: string): Promise<ContextNote[]> {
  const notedEntries = await prisma.monthlyEntry.findMany({
    where: {
      employeeId,
      contextNote: { not: null },
      cycle: { fiscalYear },
    },
    include: { cycle: true, kpi: true },
    orderBy: [{ cycle: { monthIndex: 'asc' } }, { kpi: { sortOrder: 'asc' } }],
  });

  return notedEntries
    .filter((e) => (e.contextNote ?? '').trim().length > 0)
    .map((e) => {
      const achievement = e.achievement === null ? null : Number(e.achievement);
      const tone: ContextNote['tone'] = achievement !== null && achievement > 100 ? 'green' : 'red';
      const achievementLabel = achievement === null ? '' : ` ${achievement.toFixed(0)}%`;
      return {
        when: `${e.cycle.label} · ${e.kpi.name}${achievementLabel}`,
        headline: e.cycle.label,
        tone,
        body: e.contextNote as string,
        monthIndex: e.cycle.monthIndex,
        monthLabel: e.cycle.label,
        kpiName: e.kpi.name,
        achievement,
      };
    });
}

/**
 * Which (kpiId, cycleId) pairs carry a note — for the Scorecard matrix's note
 * markers. Keyed `${kpiId}:${cycleId}`, matching how the matrix looks entries
 * up. Cheaper than getContextNotes when only the presence of a note matters.
 */
export async function getNotedEntryKeys(
  employeeId: string,
  fiscalYear: string,
): Promise<Set<string>> {
  const rows = await prisma.monthlyEntry.findMany({
    where: { employeeId, contextNote: { not: null }, cycle: { fiscalYear } },
    select: { kpiId: true, cycleId: true, contextNote: true },
  });
  return new Set(
    rows
      .filter((r) => (r.contextNote ?? '').trim().length > 0)
      .map((r) => `${r.kpiId}:${r.cycleId}`),
  );
}
