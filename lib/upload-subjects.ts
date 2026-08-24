import type { Role } from '@prisma/client';
import { prisma } from './db';
import { lockedMonthMessage } from './entries';
import { getKpiSetForCycleBatch } from './kpi';
import type { SubjectContext, TemplateSubject, UploadContext } from './upload';

/* ---------------------------------------------------------------------------
   Who an actor may write in one upload, and what their month currently holds.

   The scope here is the same one canAccessEmployee() encodes for a single
   record, applied to a set: a manager gets their own direct reports and
   nobody else, HR gets everyone who has a KPI set. Both the template download
   and the upload read it, so the sheet a manager is handed can never contain
   a row the upload would then refuse as "not your team".
   --------------------------------------------------------------------------- */

export type Actor = { employeeId: string; role: Role };

export type UploadScope = UploadContext & {
  /** Ordered for the template and its on-screen preview. */
  template: TemplateSubject[];
  /** True when the cycle is closed for every subject — the whole upload is refused. */
  lockedForEveryone: boolean;
};

/**
 * `cycle` is the month being written. It is passed in rather than looked up
 * so the caller's derived state (see lib/cycles.ts — state comes from the
 * clock, never from the stored column) is the one that decides the lock.
 */
export async function getUploadScope(
  actor: Actor,
  fiscalYear: string,
  cycle: { id: string; label: string; state: string; monthIndex: number },
): Promise<UploadScope> {
  // A manager's reports; for HR, everyone carrying a KPI set this year. HR has
  // no leadId relationship to anyone, so "their team" has to mean the roster.
  const [scopedEmployees, allEmployees] = await Promise.all([
    actor.role === 'HR'
      ? prisma.employee.findMany({
          where: { kpis: { some: { fiscalYear } } },
          orderBy: { id: 'asc' },
          select: { id: true, name: true },
        })
      : prisma.employee.findMany({
          where: { leadId: actor.employeeId },
          orderBy: { id: 'asc' },
          select: { id: true, name: true },
        }),
    prisma.employee.findMany({ select: { id: true } }),
  ]);

  const ids = scopedEmployees.map((e) => e.id);
  const otherEmployeeIds = new Set(
    allEmployees.map((e) => e.id).filter((id) => !ids.includes(id)),
  );

  if (ids.length === 0) {
    return { subjects: new Map(), otherEmployeeIds, template: [], lockedForEveryone: false };
  }

  const [kpisByEmployee, entries, reopens] = await Promise.all([
    getKpiSetForCycleBatch(ids, fiscalYear, cycle.monthIndex),
    prisma.monthlyEntry.findMany({
      where: { employeeId: { in: ids }, cycleId: cycle.id },
      select: { employeeId: true, kpiId: true, actual: true, contextNote: true },
    }),
    // Only a closed month needs asking. An open one is writable for everyone.
    cycle.state === 'OPEN'
      ? Promise.resolve([])
      : prisma.correctionRequest.findMany({
          where: {
            employeeId: { in: ids },
            cycleId: cycle.id,
            state: 'APPROVED',
            resolvedAt: null,
          },
          select: { employeeId: true },
        }),
  ]);

  const reopened = new Set(reopens.map((r) => r.employeeId));
  const entriesByEmployee = new Map<string, SubjectContext['existing']>();
  for (const e of entries) {
    const list = entriesByEmployee.get(e.employeeId) ?? [];
    list.push({ kpiId: e.kpiId, actual: e.actual, contextNote: e.contextNote });
    entriesByEmployee.set(e.employeeId, list);
  }

  const subjects = new Map<string, SubjectContext>();
  const template: TemplateSubject[] = [];
  let writableCount = 0;

  for (const employee of scopedEmployees) {
    const kpis = kpisByEmployee.get(employee.id) ?? [];
    // Nobody without a KRA set for this month: there is no row to write and
    // no row to put in the template.
    if (kpis.length === 0) continue;

    const locked =
      cycle.state === 'OPEN' || reopened.has(employee.id)
        ? null
        : lockedMonthMessage(cycle.label, cycle.state);
    if (!locked) writableCount += 1;

    subjects.set(employee.id, {
      name: employee.name,
      kpis,
      existing: entriesByEmployee.get(employee.id) ?? [],
      lockedMessage: locked,
    });
    template.push({ employeeId: employee.id, employeeName: employee.name, kpis });
  }

  return {
    subjects,
    otherEmployeeIds,
    template,
    lockedForEveryone: subjects.size > 0 && writableCount === 0,
  };
}
