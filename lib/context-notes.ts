import { prisma } from './db';

/* ---------------------------------------------------------------------------
   The context notes a manager wrote against an employee's monthly entries —
   read by both Reviews and Scorecard, so it lives here rather than in either.
   --------------------------------------------------------------------------- */

export type ContextNote = {
  when: string;
  headline: string;
  tone: 'green' | 'red';
  body: string;
};

export async function getContextNotes(employeeId: string, fiscalYear: string): Promise<ContextNote[]> {
  const notedEntries = await prisma.monthlyEntry.findMany({
    where: {
      employeeId,
      contextNote: { not: null },
      cycle: { fiscalYear },
    },
    include: { cycle: true, kpi: true },
    orderBy: { cycle: { monthIndex: 'asc' } },
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
      };
    });
}
